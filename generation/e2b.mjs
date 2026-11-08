// Trusted-controller adapter contract. Inject the pinned E2B SDK when accounts are configured.
// This module is never imported by the frontend or a generated sandbox.
export async function prepareE2BPreview({ Sandbox, apiKey, templateId, files, runner }) {
  if (!Sandbox || !apiKey || !templateId || !runner || !Number.isInteger(runner.port) || runner.port < 1024 || runner.port > 49151) throw new Error('Sandbox runtime configuration is incomplete.');
  if (!Array.isArray(files) || !files.length || files.length > 20) throw new Error('Invalid candidate file manifest.');
  const names = new Set(); let size = 0;
  for (const file of files) {
    if (typeof file.path !== 'string' || typeof file.content !== 'string' || file.path.length > 180 || file.path.startsWith('/') || /[\\:\u0000-\u001f]/.test(file.path) || file.path.split('/').some(part => !part || part === '.' || part === '..' || part.toLowerCase().startsWith('.env')) || names.has(file.path.toLowerCase()) || file.content.includes(apiKey)) throw new Error('Invalid candidate file manifest.');
    names.add(file.path.toLowerCase()); size += new TextEncoder().encode(file.content).length;
  }
  if (size > 256 * 1024) throw new Error('Candidate files exceed 256 KiB.');
  if (['build', 'test', 'start'].some(key => typeof runner[key] !== 'string' || !runner[key].trim())) throw new Error('Sandbox runtime configuration is incomplete.');
  let sandbox;
  try {
    sandbox = await Sandbox.create(templateId, { apiKey, timeoutMs: 300000, allowInternetAccess: false, network: { allowPublicTraffic: false } });
    await sandbox.files.makeDir('/home/user/project');
    for (const file of files) await sandbox.files.write('/home/user/project/' + file.path, file.content);
    // Commands belong to an operator-reviewed runner configuration, not model output.
    for (const phase of ['build', 'test']) {
      const result = await sandbox.commands.run(runner[phase], { cwd: '/home/user/project', envs: {}, timeoutMs: 120000, retainOutput: false });
      if (result.exitCode !== 0) throw new Error('Failed check');
    }
    await sandbox.commands.run(runner.start, { cwd: '/home/user/project', envs: {}, timeoutMs: 10000, background: true, retainOutput: false });
    const host = sandbox.getHost(runner.port);
    if (!/^[a-zA-Z0-9.-]+\.e2b\.app$/.test(host) || typeof sandbox.trafficAccessToken !== 'string' || !sandbox.trafficAccessToken) throw new Error('Missing protected preview');
    // This handle is controller-only. Never put trafficAccessToken in a DB view or iframe URL.
    return { internalURL: 'https://' + host, trafficAccessToken: sandbox.trafficAccessToken,
      dispose: async () => { try { await sandbox.kill(); } catch { throw new Error('Sandbox cleanup could not be confirmed.'); } } };
  } catch {
    if (sandbox) { try { await sandbox.kill(); } catch { /* TTL bounds orphan lifetime. */ } }
    throw new Error('Sandbox preparation failed. No preview is authorized.');
  }
}
