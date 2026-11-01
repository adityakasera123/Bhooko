export interface ApiErrorResponse {
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

export interface ApiErrorOptions {
  code?: string;
  details?: unknown;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    status: number,
    options?: ApiErrorOptions,
  ) {
    super(message);

    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
