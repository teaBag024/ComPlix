import { test, expect } from '@playwright/test';
import { GEMINI_MODEL, runComponentChat } from '../shared/componentChat';

const config = { snapshot: JSON.stringify({ request: 'Refine Button', technologies: { framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', versions: '' }, candidateFiles: [{ path: 'Button.razor', content: '<button>Manual edit</button>' }] }), geminiKey: 'synthetic-gemini-key', geminiModel: GEMINI_MODEL, nvidiaKey: 'synthetic-nvidia-key', nvidiaModel: 'nvidia/nemotron-test' };
const response = (parts: unknown[], finishReason = 'STOP') => ({ status: 200, body: JSON.stringify({ candidates: [{ finishReason, content: { role: 'model', parts } }] }) });
const tool = { functionCall: { name: 'generate_component_changes', id: 'call-one', args: { instructions: 'Make the selected button compact.' } }, thoughtSignature: 'opaque-signature' };
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
