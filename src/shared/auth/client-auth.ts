const GENERIC_AUTH_ERROR = 'Unable to sign you in with those credentials.';

type AuthErrorLike = {
  message?: string;
};

const AUTH_ERROR_MAP: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /invalid login credentials/i, message: GENERIC_AUTH_ERROR },
  { pattern: /email not confirmed/i, message: 'Please verify your email before signing in.' },
  { pattern: /user already registered/i, message: 'An account already exists for that email address.' },
  { pattern: /password should be at least/i, message: 'Your password does not meet the minimum requirements.' },
  { pattern: /rate limit/i, message: 'Too many attempts. Please wait a moment and try again.' }
];

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function getPublicAuthErrorMessage(error: AuthErrorLike | null | undefined, fallback = GENERIC_AUTH_ERROR): string {
  const source = typeof error?.message === 'string' ? error.message : '';

  for (const entry of AUTH_ERROR_MAP) {
    if (entry.pattern.test(source)) {
      return entry.message;
    }
  }

  return fallback;
}

export function validateSignupInput(params: {
  fullName: string;
  email: string;
  password: string;
}): string | null {
  const fullName = params.fullName.trim();
  const email = normalizeEmail(params.email);

  if (fullName.length < 2) {
    return 'Please enter your full name.';
  }

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address.';
  }

  if (params.password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  return null;
}

export function validateLoginInput(params: { email: string; password: string }): string | null {
  const email = normalizeEmail(params.email);

  if (!isValidEmail(email)) {
    return 'Please enter a valid email address.';
  }

  if (params.password.length === 0) {
    return 'Please enter your password.';
  }

  return null;
}

export const AUTH_MESSAGES = {
  genericError: GENERIC_AUTH_ERROR
};
