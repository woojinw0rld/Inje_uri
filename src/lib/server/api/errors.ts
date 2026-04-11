export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BLOCKED_RELATION'
  | 'INTERNAL_ERROR'
  | 'CHAT_ROOM_EXPIRED'
  | 'RECOMMENDATION_ALREADY_SELECTED'
  | 'FEED_ALREADY_ACTIVE'
  | 'FEED_COMMENT_ALREADY_EXISTS';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const apiErrors = {
  unauthorized(message = '인증이 필요합니다.'): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401);
  },
  forbidden(message = '접근 권한이 없습니다.'): ApiError {
    return new ApiError('FORBIDDEN', message, 403);
  },
  validation(message = '요청 값을 확인해주세요.'): ApiError {
    return new ApiError('VALIDATION_ERROR', message, 400);
  },
  notFound(message = '대상을 찾을 수 없습니다.'): ApiError {
    return new ApiError('NOT_FOUND', message, 404);
  },
  conflict(message = '이미 처리된 요청입니다.'): ApiError {
    return new ApiError('CONFLICT', message, 409);
  },
  blockedRelation(message = '차단 관계에서는 요청할 수 없습니다.'): ApiError {
    return new ApiError('BLOCKED_RELATION', message, 403);
  },
  internal(message = '서버 내부 오류가 발생했습니다.'): ApiError {
    return new ApiError('INTERNAL_ERROR', message, 500);
  },
};

