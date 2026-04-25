//쌍방 호감 판정 후 C파트 채팅방 생성 요청

import prisma from "@/server/db/prisma";
import {
  findReversePendingInterest,
  confirmMatch,
  rollbackMatch,
} from "@/server/repositories/interest.repository";

export interface MatchResult {
  matched: boolean;
  chat_room_id: number | null;
}

/**
 * 쌍방 호감 여부를 판정하고, 매칭 시 C파트 채팅방 생성 API를 호출한다.
 *
 * @param myUserId     호감을 보낸 유저
 * @param targetUserId 호감을 받은 유저
 * @param myInterestId 방금 생성된 Interest.id
 */
export async function checkAndCreateMatch(
  myUserId: number,
  targetUserId: number,
  myInterestId: number,
): Promise<MatchResult> {
  // 역방향 pending 호감 조회 (상대가 나에게 보낸 호감)
  const reverseInterest = await findReversePendingInterest(targetUserId, myUserId);

  if (!reverseInterest) {
    return { matched: false, chat_room_id: null };
  }

  // 먼저 보낸 사람 판정: created_at 비교
  const myInterestRow = await prisma.$queryRaw<{ created_at: Date }[]>`
    SELECT created_at FROM interests WHERE id = ${myInterestId} LIMIT 1
  `;
  const myCreatedAt = myInterestRow[0]?.created_at ?? new Date();
  const sourceInterestId =
    reverseInterest.created_at <= myCreatedAt
      ? reverseInterest.id
      : myInterestId;

  // 양쪽 Interest matched_at 업데이트
  await confirmMatch(myInterestId, reverseInterest.id);

  // C파트 채팅방 생성 API 호출
  try {
    const chatRoomId = await callCreateChatRoom({
      targetUserId,
      sourceInterestId,
      sourceType: "interest",
    });

    return { matched: true, chat_room_id: chatRoomId };
  } catch (err) {
    // C파트 미구현 또는 실패 → 매칭은 유지하되 chat_room_id null 반환
    console.warn("[matching.service] 채팅방 생성 실패, 매칭은 유지됨:", err);
    return { matched: true, chat_room_id: null };
  }
}

/**
 * C파트 채팅방 생성 API 호출
 * C파트 구현 완료 후 실제 fetch로 교체 예정
 */
async function callCreateChatRoom(params: {
  targetUserId: number;
  sourceInterestId: number;
  sourceType: string;
}): Promise<number> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/chat-rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // TODO: 인증 방식 확정 후 실제 토큰으로 교체
      "x-internal-call": "true",
    },
    body: JSON.stringify(params),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.code ?? "CHAT_ROOM_CREATION_FAILED");
  }

  return json.data.chat_room_id as number;
}
