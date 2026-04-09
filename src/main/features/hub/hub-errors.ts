/**
 * Hub API Error Types
 *
 * Standardized error types for Hub API operations.
 * Provides structured error handling across all Hub services.
 */

/**
 * Error thrown by Hub API operations.
 * Contains HTTP status code and optional error code for programmatic handling.
 */
export class HubApiError extends Error {
  public readonly statusCode: number;
  public readonly code?: string;

  constructor(statusCode: number, message: string, code?: string) {
    super(message);
    this.name = 'HubApiError';
    this.statusCode = statusCode;
    this.code = code;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, HubApiError.prototype);
  }

  /**
   * Check if error is an authentication error (401).
   */
  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if error is a forbidden error (403).
   */
  isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Check if error is a not found error (404).
   */
  isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Check if error is a rate limit error (429).
   */
  isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if error is a server error (5xx).
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if the error is retryable.
   */
  isRetryable(): boolean {
    return this.isRateLimited() || this.isServerError();
  }
}

/**
 * Error thrown when Hub is not configured.
 */
export class HubNotConfiguredError extends Error {
  constructor(message = 'Hub not configured') {
    super(message);
    this.name = 'HubNotConfiguredError';
    Object.setPrototypeOf(this, HubNotConfiguredError.prototype);
  }
}

/**
 * Error thrown when Hub connection is not available.
 */
export class HubConnectionError extends Error {
  constructor(message = 'Hub connection unavailable') {
    super(message);
    this.name = 'HubConnectionError';
    Object.setPrototypeOf(this, HubConnectionError.prototype);
  }
}
