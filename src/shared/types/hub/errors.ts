/**
 * Hub Protocol — API Error Types
 */

export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export type ApiErrorCode =
  | 'INVALID_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';
