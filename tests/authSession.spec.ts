import { test, expect } from '@playwright/test';
import { safeReturnPath } from '../src/authSession';

test('only same-origin app paths are restored after sign-in', () => {
  expect(safeReturnPath('/projects/12/settings?x=1')).toBe('/projects/12/settings?x=1');
  for (const value of ['//evil.example/path', '/\\evil.example', 'https://evil.example/', '/callback?code=1', '', undefined, 42, null]) {
    expect(safeReturnPath(value)).toBe('/projects');
  }
});
