import { test, expect } from '@playwright/test';
import { validateDraftFiles, MAX_DRAFT_BYTES } from '../shared/draftFiles';

test('draft storage accepts stack-neutral files and rejects unsafe, duplicate and excessive manifests', () => {
  const files = [{ path: 'Common/Button.razor', content: '<button>@Text</button>' }, { path: 'Library.csproj', content: '<Project />' }, { path: 'README.md', content: '# Usage' }];
  expect(validateDraftFiles(files)).toEqual(files);
  for (const path of ['../escape', '/absolute', 'C:drive', 'folder\\file', '.env', 'src/.env.local', 'src//file', 'src/./file', 'bad\u0000file']) {
    expect(() => validateDraftFiles([{ path, content: '' }])).toThrow('unsafe');
  }
  expect(() => validateDraftFiles([{ path: 'A.razor', content: '' }, { path: 'a.razor', content: '' }])).toThrow('duplicate');
  expect(() => validateDraftFiles([])).toThrow('1–20');
  expect(() => validateDraftFiles([{ path: 'a', content: 'é'.repeat(MAX_DRAFT_BYTES / 2 + 1) }])).toThrow('256 KiB');
});
