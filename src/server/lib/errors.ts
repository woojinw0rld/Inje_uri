// 전체 API에서 공통으로 사용하는 에러 코드 상수                                                                        
  export const ERROR = {
    // 로그인 안 된 상태에서 인증이 필요한 API 호출                                                                       
    UNAUTHORIZED: "UNAUTHORIZED",

    // 로그인은 됐지만 해당 리소스에 접근 권한 없음
    FORBIDDEN: "FORBIDDEN",

    // 요청한 리소스가 DB에 없음
    NOT_FOUND: "NOT_FOUND",

    // 차단 관계인 유저와 채팅방 생성 시도
    BLOCKED_RELATION: "BLOCKED_RELATION",

    // 만료된 채팅방에 메시지 전송 시도
    ROOM_EXPIRED: "ROOM_EXPIRED",

    // 채팅방 상태가 active가 아닌데 쓰기 시도 (blocked, closed 등)
    ROOM_NOT_ACTIVE: "ROOM_NOT_ACTIVE",

    // 두 유저 간 이미 active 채팅방이 존재하는데 또 생성 시도
    DUPLICATE_ACTIVE_ROOM: "DUPLICATE_ACTIVE_ROOM",

    // 나간 채팅방 기준 7일이 지나지 않아 재매칭 불가
    REMATCH_TOO_SOON: "REMATCH_TOO_SOON",

    // sourceType이 interest/comment 둘 다 아닌 경우
    INVALID_SOURCE: "INVALID_SOURCE",
  } as const;

  // ERROR 객체의 값들만 타입으로 추출 (예: "UNAUTHORIZED" | "FORBIDDEN" | ...)
  // API 응답이나 함수 파라미터에서 에러 코드 타입 지정할 때 사용
  export type ErrorCode = (typeof ERROR)[keyof typeof ERROR];