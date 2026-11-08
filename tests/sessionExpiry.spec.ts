import { test, expect } from '@playwright/test';
import { sessionExpiry } from '../src/sessionExpiry';
const token = (payload: unknown) => 'header.' + Buffer.from(JSON.stringify(payload)).toString('base64url') + '.signature';
test('session scheduling uses the credential expiry and fails closed for malformed credentials', () => {
  expect(sessionExpiry(token({ exp: 100 }), 500)).toBe(100);
  expect(sessionExpiry(token({ exp: 500 }), 100)).toBe(100);
  expect(sessionExpiry(token({ exp: 100 }))).toBe(100);
  for (const value of [undefined, 'invalid', token({}), token({ exp: '500' })]) expect(sessionExpiry(value, 500)).toBe(0);
});
