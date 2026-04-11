import { NextRequest } from "next/server";                                                                              
  import { createHash } from "crypto";
  import { prisma } from "@/server/db/prisma";                                                                            
                  
  /**
   * 요청 쿠키의 세션 토큰을 검증하고 현재 로그인한 유저를 반환.
   * 토큰이 없거나 만료된 경우 null 반환.
   */
  export async function getAuthUser(req: NextRequest) {
    // 쿠키에서 세션 토큰 추출
    const token = req.cookies.get("session_token")?.value;
    if (!token) return null;

    // DB에는 토큰 원본이 아닌 SHA-256 해시값으로 저장되어 있으므로 동일하게 해싱
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // 해시값으로 세션 조회 + 유저 정보 함께 로드
    const session = await prisma.auth_sessions.findUnique({
      where: { token_hash: tokenHash },
      include: { users: true },
    });

    // 세션 없음 또는 만료된 경우
    if (!session || session.expires_at < new Date()) return null;

    // 로그인한 유저 객체 반환
    return session.users;
  }