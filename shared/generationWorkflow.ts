export const isChatMode = (mode: string) => mode === 'nvidia' || mode === 'gemini';
export const generationStages = ['queued', 'generating', 'building', 'testing', 'preview_ready'] as const;
export const MAX_GENERATION_HISTORY = 20;
export const mockPreview = `<!doctype html><html><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'none'; img-src 'none'; form-action 'none'; base-uri 'none'"><style>body{font:16px system-ui;padding:24px;color:#214f3d}button{padding:12px 20px;background:#214f3d;color:white;border:0;border-radius:6px}p{line-height:1.6}</style></head><body><h2>Mock component fixture</h2><p>This is a trusted HTML fixture, not Nemotron output or an E2B build.</p><button id="demo">Clicked 0 times</button><script>let count=0;document.getElementById('demo').addEventListener('click',event=>{event.target.textContent='Clicked '+(++count)+' times'});</script></body></html>`;
export const mockArtifacts = JSON.stringify({ files: [
  { path: 'examples/mock-preview.html', content: mockPreview },
  { path: 'README.md', content: '# Mock generation result\n\nThis fixture exercises job state, file inspection and an isolated browser preview. No AI provider, compiler, dependency installation or E2B execution has run. It is not the current working library.' },
] });
