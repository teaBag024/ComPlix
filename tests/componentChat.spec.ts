import { test, expect } from '@playwright/test';
import { GEMINI_MODEL, runComponentChat } from '../shared/componentChat';

const config = { snapshot: JSON.stringify({ request: 'Refine Button', technologies: { framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' }, candidateFiles: [{ path: 'Button.razor', content: '<button>Manual edit</button>' }] }), geminiKey: 'synthetic-gemini-key', geminiModel: GEMINI_MODEL, nvidiaKey: 'synthetic-nvidia-key', nvidiaModel: 'nvidia/nemotron-test' };
const response = (parts: unknown[], finishReason = 'STOP') => ({ status: 200, body: JSON.stringify({ candidates: [{ finishReason, content: { role: 'model', parts } }] }) });
const tool = { functionCall: { name: 'generate_component_changes', id: 'call-one', args: { instructions: 'Make the selected button compact.', filePaths: ['Button.razor'] } }, thoughtSignature: 'opaque-signature' };
const generated = { status: 200, body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'Unverified Button draft.', files: [{ path: 'Button.razor', content: '<button>Compact</button>' }] }) } }] }) };

test('Gemini answers discussion without a Nemotron call or exposing thoughts', () => {
  let calls = 0;
  const result = JSON.parse(runComponentChat(config, (url, body: any, key, timeout) => {
    calls++;
    expect(url).toContain('gemini-3.8-flash:generateContent'); expect(key).toBe(config.geminiKey);
    expect(timeout).toBe(15000); expect(body.generationConfig.thinkingConfig.thinkingLevel).toBe('LOW');
    expect(JSON.stringify(body)).not.toContain(config.nvidiaKey);
    return response([{ text: 'Private reasoning', thought: true }, { text: 'Which button variant should we refine?' }]);
  }, () => { throw new Error('No tool expected'); }));
  expect(calls).toBe(1); expect(result).toEqual({ reply: 'Which button variant should we refine?', files: [] });
});
test('Gemini delegates once to Nemotron with immutable selected context and returns the tool result with signatures', () => {
  let calls = 0; let checks = 0;
  const result = JSON.parse(runComponentChat(config, (url, body: any, key, timeout) => {
    calls++;
    expect(JSON.stringify(body)).not.toContain(config.geminiKey);
    expect(JSON.stringify(body)).not.toContain(config.nvidiaKey);
    if (calls === 1) return response([tool]);
    if (calls === 2) {
      expect(url).toContain('nvidia.com'); expect(key).toBe(config.nvidiaKey); expect(timeout).toBe(35000);
      const context = JSON.parse(body.messages[1].content);
      expect(context.candidateFiles[0].content).toContain('Manual edit'); expect(context.generationInstructions).toContain('compact');
      return generated;
    }
    expect(body.contents[1].parts[0]).toEqual(tool);
    expect(body.contents[2].parts[0].functionResponse.id).toBe('call-one');
    expect(body.toolConfig.functionCallingConfig.mode).toBe('NONE');
    return response([{ text: 'I prepared an unverified compact Button draft.' }]);
  }, () => { checks++; }));
  expect(calls).toBe(3); expect(checks).toBe(2); expect(result.files[0].path).toBe('Button.razor');
  expect(JSON.stringify(result)).not.toContain('opaque-signature');
});
test('tool routing rejects arbitrary operations, extra scope, multiple calls and unsupported stacks before generation', () => {
  for (const parts of [
    [{ functionCall: { name: 'run_shell', args: {} } }],
    [{ functionCall: { ...tool.functionCall, args: { instructions: 'edit', projectId: 'other' } } }],
    [tool, tool],
  ]) {
    let calls = 0;
    expect(() => runComponentChat(config, () => { calls++; return response(parts); }, () => {})).toThrow('unsupported tool');
    expect(calls).toBe(1);
  }
  expect(() => runComponentChat({ ...config, snapshot: JSON.stringify({ technologies: { framework: 'Angular', language: '', styling: '', libraries: '', versions: '' } }) }, () => response([tool]), () => {})).toThrow('Unsupported target stack');
  expect(() => runComponentChat(config, () => response([tool]), () => { throw new Error('Cancelled'); })).toThrow('Cancelled');
});
test('provider failures, truncation, credential echoes and repeated tools fail without returning candidate changes', () => {
  for (const result of [response([{ text: 'Partial' }], 'MAX_TOKENS'), response([{ text: config.nvidiaKey }]), { status: 429, body: config.geminiKey }]) {
    expect(() => runComponentChat(config, () => result, () => {})).toThrow();
  }
  let calls = 0;
  expect(() => runComponentChat(config, () => { calls++; return calls === 2 ? generated : response([tool]); }, () => {})).toThrow('tool limit');
  expect(calls).toBe(3);
  calls = 0;
  expect(() => runComponentChat(config, () => { calls++; return calls === 1 ? response([tool]) : { status: 401, body: config.nvidiaKey }; }, () => {})).toThrow('NVIDIA rejected');
  expect(calls).toBe(2);
});

test('Gemini billing, unavailable models and outages return actionable errors without provider bodies or retries', () => {
  for (const [status, expected] of [[402, 'billing or credits'], [404, 'model is unavailable'], [500, 'temporarily unavailable'], [503, 'temporarily unavailable'], [504, 'temporarily unavailable']] as const) {
    let calls = 0;
    let failure: unknown;
    try { runComponentChat(config, () => { calls++; return { status, body: config.geminiKey }; }, () => { throw new Error('No generation expected'); }); }
    catch (cause) { failure = cause; }
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toContain(expected);
    expect((failure as Error).message).not.toContain(config.geminiKey);
    expect(calls).toBe(1);
  }
});


test('transport failures identify the provider and never expose exception details or retry', () => {
  let calls = 0;
  expect(() => runComponentChat(config, () => { calls++; throw new Error(config.geminiKey); }, () => {})).toThrow('Gemini request failed or timed out. No automatic retry was made.');
  expect(calls).toBe(1);
  calls = 0;
  expect(() => runComponentChat(config, () => { calls++; if (calls === 1) return response([tool]); throw new Error(config.nvidiaKey); }, () => {})).toThrow('NVIDIA request failed or timed out. No automatic retry was made.');
  expect(calls).toBe(2);
});


test('Gemini plans only changed files and the application preserves unchanged source, docs and manual edits', () => {
  const snapshot = JSON.stringify({ ...JSON.parse(config.snapshot), candidateFiles: [
    { path: 'Button.razor', content: '<button>Manual edit</button>' },
    { path: 'README.md', content: '# Deliberate manual docs' },
    { path: 'Examples/Preview.razor', content: '<Button />' },
  ] });
  let calls = 0;
  const result = JSON.parse(runComponentChat({ ...config, snapshot }, (url, body: any) => {
    calls++;
    if (calls === 1) {
      expect(body.systemInstruction.parts[0].text).toContain('TOTAL 4096-token output budget');
      expect(body.tools[0].functionDeclarations[0].parameters.required).toContain('filePaths');
      return response([tool]);
    }
    if (calls === 2) {
      const context = JSON.parse(body.messages[1].content);
      expect(context.generationPlan).toEqual({ filePaths: ['Button.razor'], maxOutputTokens: 4096 });
      expect(body.messages[0].content).toContain('Do not repeat unchanged files');
      return generated;
    }
    return response([{ text: 'The selected Button draft was updated.' }]);
  }, () => {}));
  expect(result.files).toEqual([{ path: 'Button.razor', content: '<button>Compact</button>' }, { path: 'README.md', content: '# Deliberate manual docs' }, { path: 'Examples/Preview.razor', content: '<Button />' }]);
  expect(calls).toBe(3);
});

test('Gemini receives an incomplete-tool result without partial files, a Nemotron retry or telling users to rewrite prompts', () => {
  for (const finish_reason of ['length', 'content_filter']) {
    let calls = 0; let checks = 0;
    const result = JSON.parse(runComponentChat(config, (url, body: any) => {
      calls++;
      if (calls === 1) return response([tool]);
      if (calls === 2) return { status: 200, body: JSON.stringify({ choices: [{ finish_reason, message: { content: 'partial untrusted code' } }] }) };
      expect(body.toolConfig.functionCallingConfig.mode).toBe('NONE');
      expect(body.contents[1].parts[0]).toEqual(tool);
      expect(body.contents[2].parts[0].functionResponse.response).toEqual({ status: 'generation_incomplete', reason: finish_reason === 'length' ? 'output_limit' : 'incomplete_output', filesApplied: false, savedDraftPreserved: true });
      expect(JSON.stringify(body)).not.toContain('partial untrusted code');
      return response([{ text: 'I could not complete the component change. Your saved draft is intact.' }]);
    }, () => { checks++; }));
    expect(result.files).toEqual([]);
    expect(result.reply).toContain('saved draft is intact');
    expect(calls).toBe(3); expect(checks).toBe(2);
  }
});

test('the coordinator rejects unsafe, oversized and dependency-edit plans before spending on generation', () => {
  for (const filePaths of [[], ['../escape'], ['Button.razor', 'button.razor'], Array.from({ length: 7 }, (_, i) => 'File' + i + '.razor')]) {
    let calls = 0;
    expect(() => runComponentChat(config, () => { calls++; return response([{ functionCall: { ...tool.functionCall, args: { instructions: 'edit', filePaths } } }]); }, () => {})).toThrow('unsupported tool');
    expect(calls).toBe(1);
  }
  const snapshot = JSON.stringify({ ...JSON.parse(config.snapshot), commonContracts: [{ name: 'Input', rootPath: 'Common/Input' }] });
  expect(() => runComponentChat({ ...config, snapshot }, () => response([{ functionCall: { ...tool.functionCall, args: { instructions: 'edit', filePaths: ['Common/Input/Input.razor'] } } }]), () => {})).toThrow('unsupported tool');
});

test('unplanned or missing generator files fail without accepting a partial change set', () => {
  for (const files of [[{ path: 'Other.razor', content: '<p>Wrong scope</p>' }], []]) {
    let calls = 0;
    expect(() => runComponentChat(config, () => { calls++; return calls === 1 ? response([tool]) : { status: 200, body: JSON.stringify({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ reply: 'Changed', files }) } }] }) }; }, () => {})).toThrow('did not match');
    expect(calls).toBe(2);
  }
});


test('merging changes never evicts existing files to fit the draft limits', () => {
  const snapshot = JSON.stringify({ ...JSON.parse(config.snapshot), candidateFiles: Array.from({ length: 20 }, (_, i) => ({ path: 'Keep' + i + '.md', content: 'Manual content' })) });
  let calls = 0;
  expect(() => runComponentChat({ ...config, snapshot }, () => { calls++; return calls === 1 ? response([tool]) : generated; }, () => {})).toThrow('invalid or oversized draft');
  expect(calls).toBe(2);
});
