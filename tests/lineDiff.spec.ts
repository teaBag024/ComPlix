import { test, expect } from '@playwright/test';
import { diffFiles, diffLines } from '../src/lineDiff';

test('line diff shows changed lines with nearby context and collapses the rest', () => {
  const before = Array.from({ length: 20 }, (_, index) => `line ${index}`).join('\n');
  const after = before.replace('line 10', 'line ten').replace('line 2\n', 'line 2\nnew line\n');
  const result = diffLines(before, after);
  expect(result).toMatchObject({ added: 2, removed: 1 });
  expect(result.lines.filter(line => line.kind === 'added').map(line => line.text)).toEqual(['new line', 'line ten']);
  expect(result.lines.filter(line => line.kind === 'added').map(line => line.newLine)).toEqual([3, 11]);
  expect(result.lines.filter(line => line.kind === 'removed').map(line => line.text)).toEqual(['line 10']);
  expect(result.lines.some(line => line.kind === 'gap')).toBe(true);
  expect(result.lines.find(line => line.text === 'line 15')).toBeUndefined();
});

test('file diff omits unchanged files, marks new files and matches paths case-insensitively', () => {
  const before = [{ path: 'Common/Button.tsx', content: 'a\nb\n' }, { path: 'README.md', content: 'docs' }];
  const after = [{ path: 'common/button.tsx', content: 'a\nc\n' }, { path: 'README.md', content: 'docs' }, { path: 'examples/Preview.tsx', content: 'x\ny\n' }];
  const diffs = diffFiles(before, after);
  expect(diffs.map(diff => [diff.path, diff.created, diff.added, diff.removed])).toEqual([['common/button.tsx', false, 1, 1], ['examples/Preview.tsx', true, 2, 0]]);
});

test('very large rewrites stay bounded', () => {
  const before = Array.from({ length: 3000 }, (_, index) => `a${index}`).join('\n');
  const after = Array.from({ length: 3000 }, (_, index) => `b${index}`).join('\n');
  expect(diffLines(before, after)).toMatchObject({ added: 3000, removed: 3000 });
});
