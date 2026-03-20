import { env } from '@/server/env';

export function isAuthorizedInternalJobRequest(request: Request): boolean {
  const expected = env.BOOKING_API_AUTH_SECRET;
  const provided = request.headers.get('x-internal-job-secret');
  return Boolean(expected && provided && provided === expected);
}
