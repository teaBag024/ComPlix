import { parse } from '@babel/parser';
import type { WorkspaceFile } from './stackAdapters';

export const INSTRUCTION_IDLE_MS = 2000;
export type EditorInstruction = { path: string; text: string; line: number; key: string };

/** Identity deliberately excludes revision and position, so moving a comment does not replay it. */
export function instructionKey(path: string, text: string) { return JSON.stringify([path.toLowerCase(), text]); }

function instruction(path: string, source: string, value: string, offset: number): EditorInstruction[] {
  const match = /^\s*@complix\s+([^]*?)\s*$/.exec(value);
  const text = match?.[1].trim();
  if (!text || text.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) return [];
  return [{ path, text, line: source.slice(0, offset).split('\n').length, key: instructionKey(path, text) }];
}

/** Razor subset: Razor `@* *@` and HTML `<!-- -->` comments in markup, outside tags and script/style content.
 * Stop at executable Razor transitions rather than trying to parse arbitrary C# strings.
 * Comments before a trailing @code block remain supported. */
function razorInstructions(path: string, source: string): EditorInstruction[] {
  const found: EditorInstruction[] = [];
  let i = 0;
  while (i < source.length) {
    if (source.startsWith('@*', i)) {
      const end = source.indexOf('*@', i + 2);
      if (end < 0) break;
      found.push(...instruction(path, source, source.slice(i + 2, end), i));
      i = end + 2;
    } else if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      if (end < 0) break;
      found.push(...instruction(path, source, source.slice(i + 4, end), i));
      i = end + 3;
    } else if (source[i] === '<') {
      const start = i++;
      let quote = '';
      for (; i < source.length; i++) {
        const char = source[i];
        if (quote) { if (char === quote) quote = ''; }
        else if (char === '"' || char === "'") quote = char;
        else if (char === '>') { i++; break; }
      }
      const raw = /^<\s*(script|style)\b/i.exec(source.slice(start, i));
      if (raw) {
        const end = source.toLowerCase().indexOf('</' + raw[1].toLowerCase(), i);
        if (end < 0) break;
        i = end;
      }
    } else if (source.startsWith('@@', i)) { i += 2; }
    else if (source[i] === '@') {
      const directive = /^@(using|namespace|inject|typeparam|page|inherits|implements|attribute|rendermode)\b[^\r\n]*/.exec(source.slice(i));
      if (!directive || source.slice(0, i).split('\n').pop()!.trim()) break;
      i += directive[0].length;
    } else i++;
  }
  return found;
}

export function detectEditorInstructions(files: WorkspaceFile[]): EditorInstruction[] {
  const found: EditorInstruction[] = [];
  for (const { path, content } of files) {
    if (path.toLowerCase().endsWith('.razor')) found.push(...razorInstructions(path, content));
    else if (/\.(tsx|ts|jsx|js)$/i.test(path)) {
      try {
        // .ts files must not use the JSX plugin: `<T>value` casts would misparse.
        const plugins: Array<'typescript' | 'jsx'> = /\.ts$/i.test(path) ? ['typescript'] : /\.js$/i.test(path) ? ['jsx'] : /\.jsx$/i.test(path) ? ['jsx'] : ['typescript', 'jsx'];
        const ast = parse(content, { sourceType: 'module', plugins, attachComment: false });
        for (const comment of ast.comments ?? []) {
          // Babel verifies these are actual comments (JSX `{/* */}`, `/* */` or `//`), not strings, templates or regexes.
          if (comment.start == null) continue;
          found.push(...instruction(path, content, comment.value, comment.start));
        }
      } catch { /* Incomplete/invalid source is never an executable instruction. */ }
    }
  }
  // Identical markers are ambiguous; neither one executes automatically.
  return found.filter(item => found.filter(other => other.key === item.key).length === 1);
}
