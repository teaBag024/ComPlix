export type DiffLine = { kind: 'context' | 'added' | 'removed' | 'gap'; text: string; newLine?: number };
export type FileDiff = { path: string; added: number; removed: number; lines: DiffLine[]; created: boolean };
type File = { path: string; content: string };

// Bound the O(n·m) table; larger rewrites are shown as the new file's opening lines.
const MAX_CELLS = 2_000_000;

/** Line diff via longest common subsequence, trimmed to changed hunks with `context` lines around them. */
export function diffLines(before: string, after: string, context = 2): Omit<FileDiff, 'path' | 'created'> {
  const a = before.split('\n'); const b = after.split('\n');
  let start = 0; while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length, endB = b.length; while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  const midA = a.slice(start, endA); const midB = b.slice(start, endB);
  const ops: DiffLine[] = [];
  if (midA.length * midB.length > MAX_CELLS) {
    for (const text of midA) ops.push({ kind: 'removed', text });
    for (const text of midB) ops.push({ kind: 'added', text });
  } else {
    const table = Array.from({ length: midA.length + 1 }, () => new Uint32Array(midB.length + 1));
    for (let i = midA.length - 1; i >= 0; i--) for (let j = midB.length - 1; j >= 0; j--)
      table[i][j] = midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    let i = 0, j = 0;
    while (i < midA.length || j < midB.length) {
      if (i < midA.length && j < midB.length && midA[i] === midB[j]) { ops.push({ kind: 'context', text: midA[i] }); i++; j++; }
      else if (j < midB.length && (i === midA.length || table[i][j + 1] >= table[i + 1][j])) ops.push({ kind: 'added', text: midB[j++] });
      else ops.push({ kind: 'removed', text: midA[i++] });
    }
  }
  const all: DiffLine[] = [...a.slice(0, start).map(text => ({ kind: 'context' as const, text })), ...ops, ...a.slice(endA).map(text => ({ kind: 'context' as const, text }))];
  let newLine = 0;
  for (const line of all) if (line.kind !== 'removed') line.newLine = newLine++;
  // Keep only changed lines plus nearby context; collapse the rest into gap markers.
  const keep = all.map((line, index) => line.kind !== 'context' || all.slice(Math.max(0, index - context), index + context + 1).some(near => near.kind !== 'context'));
  const lines: DiffLine[] = [];
  all.forEach((line, index) => {
    if (keep[index]) lines.push(line);
    else if (lines.length && lines[lines.length - 1].kind !== 'gap') lines.push({ kind: 'gap', text: '' });
  });
  if (lines[lines.length - 1]?.kind === 'gap') lines.pop();
  return { added: all.filter(line => line.kind === 'added').length, removed: all.filter(line => line.kind === 'removed').length, lines };
}

/** Per-file changes between two draft file sets; unchanged files are omitted. */
export function diffFiles(before: File[], after: File[]): FileDiff[] {
  const previous = new Map(before.map(file => [file.path.toLowerCase(), file.content]));
  return after.flatMap((file): FileDiff[] => {
    const old = previous.get(file.path.toLowerCase());
    if (old === file.content) return [];
    if (old === undefined) {
      const lines = file.content.replace(/\n$/, '').split('\n').map(text => ({ kind: 'added' as const, text }));
      return [{ path: file.path, created: true, added: lines.length, removed: 0, lines }];
    }
    return [{ path: file.path, created: false, ...diffLines(old, file.content) }];
  });
}
