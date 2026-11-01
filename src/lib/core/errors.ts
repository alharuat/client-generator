export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "INVALID_TRANSITION"
  | "APPROVAL_REQUIRED"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UPSTREAM"
  | "NOT_CONFIGURED";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  DUPLICATE: 409,
  INVALID_TRANSITION: 409,
  APPROVAL_REQUIRED: 409,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  UPSTREAM: 502,
  NOT_CONFIGURED: 503,
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
  get httpStatus() {
    return STATUS[this.code];
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;
