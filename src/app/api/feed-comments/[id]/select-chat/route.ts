import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * D-08: 댓글 선택 → 채팅방 생성 API
 *
 * 피드 작성자가 특정 댓글을 선택하면 2시간짜리 채팅방을 생성한다.
 * 댓글 존재 + 미삭제, 피드 작성자 권한, 차단/banned 검증, 중복 방지를 거친 뒤
 * chat_rooms + chat_room_participants 를 트랜잭션으로 묶어 생성한다.
 *
 * @route POST /api/feed-comments/:id/select-chat
 *
 * @requires 인증 - 로그인 사용자만 (피드 작성자만 선택 가능)
 *
 * @param id - URL 경로의 댓글 ID
 *
 * @returns 200 - 성공
 * {
 *   success: true,
 *   data: { chatRoomId: number }
 * }
 *
 * @returns 400 - 에러
 * {
 *   success: false,
 *   error: { code: string, message: string }
 * }
 *
 * @see chat_rooms, chat_room_participants, feed_comments, self_date_feeds, blocks 테이블 (prisma/schema.prisma)
 * @see Analysis/d-part-detail_v2.md - D-08 상세 스펙
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params; // URL에서 댓글 ID 추출
    const commentId = Number(id); // 문자열 → 숫자 변환

    if (Number.isNaN(commentId) || !Number.isInteger(commentId)) { // 댓글 ID가 정수가 아닌 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_COMMENT_ID",
            message: "유효하지 않은 댓글 ID입니다.",
          },
        },
        { status: 400 },
      );
    }

    // TODO: 인증 미들웨어 완성 후 실제 로그인 사용자 ID로 교체
    const currentUserId = 1; // 현재는 고정값 1 사용 (테스트용)

    const comment = await prisma.feedComment.findUnique({ // 댓글 존재 + 삭제 여부 + 피드·작성자 정보 조회
      where: { id: commentId },
      select: {
        id: true,
        deleted_at: true,
        commenter_user_id: true,
        feed: { // 댓글이 달린 피드 정보
          select: {
            id: true,
            author_user_id: true,
            status: true,
          },
        },
        commenter_user: { // 댓글 작성자 상태 확인용
          select: { status: true },
        },
      },
    });

    if (!comment) { // 댓글이 존재하지 않는 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMMENT_NOT_FOUND",
            message: "존재하지 않는 댓글입니다.",
          },
        },
        { status: 400 },
      );
    }

    if (comment.deleted_at) { // 삭제된 댓글인 경우 (soft delete)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMMENT_DELETED",
            message: "삭제된 댓글입니다.",
          },
        },
        { status: 400 },
      );
    }

    if (comment.feed.author_user_id !== currentUserId) { // 피드 작성자만 댓글 선택 가능
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FEED_AUTHOR",
            message: "피드 작성자만 댓글을 선택할 수 있습니다.",
          },
        },
        { status: 400 },
      );
    }

    if (comment.feed.status !== "active") { // 활성 상태가 아닌 피드의 댓글은 선택 불가
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FEED_NOT_AVAILABLE",
            message: "활성 상태가 아닌 피드의 댓글은 선택할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    if (comment.commenter_user.status === "suspended") { // 댓글 작성자가 banned(현재 스키마: suspended)인 경우
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "COMMENTER_BANNED",
            message: "제재된 사용자의 댓글은 선택할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    const blockExists = await prisma.block.findFirst({ // 차단 관계 확인 (양방향)
      where: {
        unblocked_at: null, // 활성 차단만
        OR: [
          { blocker_user_id: currentUserId, blocked_user_id: comment.commenter_user_id }, // 내가 차단한
          { blocker_user_id: comment.commenter_user_id, blocked_user_id: currentUserId }, // 나를 차단한
        ],
      },
      select: { id: true },
    });

    if (blockExists) { // 차단 관계면 선택 불가
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "BLOCKED_RELATIONSHIP",
            message: "차단 관계인 사용자의 댓글은 선택할 수 없습니다.",
          },
        },
        { status: 400 },
      );
    }

    const existingChatRoom = await prisma.chatRoom.findFirst({ // 같은 댓글로 이미 생성된 채팅방이 있는지 확인
      where: {
        source_comment_id: commentId,
        source_type: "comment",
      },
      select: { id: true },
    });

    if (existingChatRoom) { // 이미 채팅방이 존재하면 중복 생성 방지
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CHAT_ROOM_ALREADY_EXISTS",
            message: "이미 이 댓글로 생성된 채팅방이 있습니다.",
          },
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 현재 시각 + 2시간

    const chatRoom = await prisma.$transaction(async (tx) => { // 트랜잭션: 채팅방 + 참여자 묶음 생성
      const room = await tx.chatRoom.create({ // 채팅방 생성
        data: {
          source_type: "comment", // 댓글 기반 채팅방
          created_by_user_id: currentUserId, // 피드 작성자가 생성자
          source_comment_id: commentId, // 원본 댓글 ID
          expires_at: expiresAt, // 2시간 후 만료
        },
        select: { id: true },
      });

      await tx.chatRoomParticipant.createMany({ // 참여자 2명 추가 (피드 작성자 + 댓글 작성자)
        data: [
          { chat_room_id: room.id, user_id: currentUserId }, // 피드 작성자
          { chat_room_id: room.id, user_id: comment.commenter_user_id }, // 댓글 작성자
        ],
      });

      return room;
    });

    return NextResponse.json({ // 성공 응답
      success: true,
      data: { chatRoomId: chatRoom.id },
    });
  } catch (error) {
    console.error("[POST /api/feed-comments/:id/select-chat]", error); // 서버 에러 로그

    return NextResponse.json( // 실패 응답
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "댓글 선택 처리 중 오류가 발생했습니다.",
        },
      },
      { status: 400 },
    );
  }
}
