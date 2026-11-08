// Provider transport only. Credentials are arguments, never persisted or logged.
export const NVIDIA_MODEL = 'nvidia/nemotron-3.5-super-vl-120b-a12b';
const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MAX_RESPONSE_BYTES = 1024 * 1024;
export async function requestNemotron({ apiKey, messages, signal }, fetcher = fetch) {
  if (typeof apiKey !== 'string' || apiKey.length < 16 || apiKey.length > 512 || /\s/.test(apiKey)) throw new Error('Enter a valid NVIDIA API key.');
  if (!Array.isArray(messages) || !messages.length || messages.some(message => !['system', 'user', 'assistant'].includes(message.role) || typeof message.content !== 'string')) throw new Error('Invalid generation messages.');
  const timeout = AbortSignal.timeout(60000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response;
  try {
    response = await fetcher(endpoint, { method: 'POST', redirect: 'error', signal: combined,
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ model: NVIDIA_MODEL, messages, max_tokens: 4096, temperature: 1, top_p: 0.95, reasoning_effort: 'low', stream: false }),
    });
  } catch { throw new Error(combined.aborted ? 'NVIDIA request timed out or was cancelled.' : 'Could not reach NVIDIA.'); }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    const errors = { 401: 'NVIDIA rejected the API key.', 403: 'NVIDIA denied access to this model.', 429: 'NVIDIA rate or quota limit reached. Try later.' };
    throw new Error(errors[response.status] ?? 'NVIDIA could not complete the request.');
  }
  let payload;
  try {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Missing response');
    const chunks = []; let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) { await reader.cancel(); throw new Error('Oversized response'); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.byteLength; }
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
  } catch { throw new Error('NVIDIA returned an unreadable or oversized response.'); }
  const choice = payload?.choices?.[0];
  if (choice?.finish_reason !== 'stop') throw new Error('Generation was incomplete. Reduce the request before retrying.');
  const text = choice.message?.content;
  if (typeof text !== 'string' || !text.trim() || text.includes(apiKey)) throw new Error('NVIDIA returned unusable output.');
  const usage = payload.usage;
  return { model: NVIDIA_MODEL, text, usage: usage && ['prompt_tokens', 'completion_tokens', 'total_tokens'].every(key => Number.isSafeInteger(usage[key]) && usage[key] >= 0)
    ? { promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens } : undefined };
}
