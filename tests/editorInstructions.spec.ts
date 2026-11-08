import { test, expect } from '@playwright/test';
import { detectEditorInstructions } from '../shared/editorInstructions';

const react = (content: string) => detectEditorInstructions([{ path: 'Common/Button.tsx', content }]);
const razor = (content: string) => detectEditorInstructions([{ path: 'Common/Button.razor', content }]);

test('TSX instructions require complete actual JSX comments, not strings, templates or ordinary comments', () => {
  const valid = `export function Button() { return <>{/* @complix Make this green */}<button>Save</button></>; }`;
  expect(react(valid).map(row => row.text)).toEqual(['Make this green']);
  expect(react(`const example = ${JSON.stringify(valid)};`)).toEqual([]);
  expect(react('const example = `' + valid + '`;')).toEqual([]);
  expect(react('/* @complix Make this green */\nexport const Button = () => <button />;')).toEqual([]);
  expect(react('{/* @complix Make this green */}')).toEqual([]);
  expect(react(valid.replace('*/}', ''))).toEqual([]);
  expect(react(valid.replace('@complix Make this green', 'normal explanation'))).toEqual([]);
  expect(react(valid.replace('Make this green', ''))).toEqual([]);
  expect(detectEditorInstructions([{ path: 'README.md', content: valid }])).toEqual([]);
});

test('instruction identity survives movement, rejects duplicate markers and bounds text', () => {
  const source = 'export const Button = () => <>{/* @complix Green */}<button /></>;';
  const first = react(source)[0];
  expect(react('\n\n' + source)[0]).toEqual({ ...first, line: first.line + 2 });
  expect(react(source.replace('<button />', '{/* @complix Green */}<button />'))).toEqual([]);
  expect(react(source.replace('Green', 'x'.repeat(2001)))).toEqual([]);
});

test('Razor markup instructions exclude HTML comments, attributes, scripts and executable C#', () => {
  const marker = '@* @complix Make this green *@';
  expect(razor('@using System\n' + marker + '\n<button>Save</button>\n@code { string s = "' + marker + '"; }').map(row => row.text)).toEqual(['Make this green']);
  for (const source of [`<!-- ${marker} -->`, `<div title="${marker}"></div>`, `<script>const example = '${marker}'</script>`, `<style>/* ${marker} */</style>`, '@code { string s = "' + marker + '"; }', '@{ var s = "' + marker + '"; }', '@@* @complix Inert *@']) expect(razor(source)).toEqual([]);
  expect(razor('@* @complix unfinished')).toEqual([]);
  expect(razor('@if (true) {\n' + marker + '\n<button />\n}')).toEqual([]);
});
