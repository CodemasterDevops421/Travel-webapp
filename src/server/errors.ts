import { ZodError } from 'zod';

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export class RateLimitError extends HttpError {
  constructor(message = 'Too many requests') {
    super(429, message);
    this.name = 'RateLimitError';
  }
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new HttpError(400, 'Invalid request payload');
  }
  if (error instanceof SyntaxError) {
    return new HttpError(400, 'Malformed JSON payload');
  }
  return new HttpError(500, 'Internal server error');
}
