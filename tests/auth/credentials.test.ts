import { describe, expect, it } from 'vitest';
import {
  getPublicAuthErrorMessage,
  normalizeEmail,
  validateLoginInput,
  validateSignupInput
} from '@/shared/auth/client-auth';

describe('auth credential validation', () => {
  it('normalizes emails for consistent auth lookup', () => {
    expect(normalizeEmail('  USER@Example.COM ')).toBe('user@example.com');
  });

  it('rejects weak signup payloads', () => {
    expect(validateSignupInput({ fullName: 'A', email: 'bad-email', password: '123' })).toBe(
      'Please enter your full name.'
    );
    expect(validateSignupInput({ fullName: 'Alex Doe', email: 'bad-email', password: '12345678' })).toBe(
      'Please enter a valid email address.'
    );
    expect(validateSignupInput({ fullName: 'Alex Doe', email: 'alex@example.com', password: '1234567' })).toBe(
      'Password must be at least 8 characters.'
    );
  });

  it('accepts valid signup payload and maps sensitive auth errors', () => {
    expect(
      validateSignupInput({
        fullName: 'Alex Doe',
        email: 'alex@example.com',
        password: '12345678'
      })
    ).toBeNull();

    expect(getPublicAuthErrorMessage({ message: 'Invalid login credentials' })).toBe(
      'Unable to sign you in with those credentials.'
    );
  });

  it('requires login password and valid email format', () => {
    expect(validateLoginInput({ email: 'oops', password: 'secret' })).toBe(
      'Please enter a valid email address.'
    );
    expect(validateLoginInput({ email: 'user@example.com', password: '' })).toBe(
      'Please enter your password.'
    );
    expect(validateLoginInput({ email: 'user@example.com', password: 'password123' })).toBeNull();
  });
});
