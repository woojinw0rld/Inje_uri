export * from './user';
export * from './interest';
export * from './chat';
export * from './story';
export * from './keywords';

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export type MainTab = 'match' | 'chat' | 'self-date' | 'my';
