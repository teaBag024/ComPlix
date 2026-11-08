import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { profileFor } from './previewProfiles.mjs';
import { safeDiagnostic } from './e2bRuntime.mjs';
import { openArtifactGateway } from './previewGateway.mjs';

export function createPreviewController({ authorizer, build, appOrigin = 'http://127.0.0.1:5173', configuredProfiles = [], secrets = [] }) {
  const sessions = new Map(); let building = false;
  const json = (res, status, data) => { if (res.destroyed) return; res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': appOrigin, Vary: 'Origin' }); res.end(JSON.stringify(data)); };
  const server = http.createServer(async (req, res) => {
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host || req.headers.origin !== appOrigin) { json(res, 403, { error: 'Preview origin is not allowed.' }); return; }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': appOrigin, 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', Vary: 'Origin' }); res.end(); return;
    }
    if (req.method === 'GET' && req.url === '/health') { json(res, 200, { stacks: configuredProfiles }); return; }
    const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) { json(res, 401, { error: 'Sign in to build a preview.' }); return; }
    if (req.method === 'DELETE' && /^\/sessions\/[a-f0-9-]{36}$/.test(req.url)) {
      const session = sessions.get(req.url.slice('/sessions/'.length));
      try {
        if (!session) { json(res, 200, {}); return; }
        const access = await authorizer.access(token, session.projectId);
        if (access.owner !== session.owner) throw new Error();
        session.gateway.dispose(); sessions.delete(session.id); json(res, 200, {});
      } catch { json(res, 403, { error: 'Preview access denied.' }); }
      return;
    }
    if (req.method !== 'POST' || req.url !== '/build') { json(res, 404, { error: 'Unknown preview operation.' }); return; }
    if (building || sessions.size >= 4) { json(res, 429, { error: 'Preview controller is busy. Close an earlier preview or wait for it to expire.' }); return; }
    building = true;
    const abort = new AbortController();
    res.on('close', () => { if (!res.writableEnded) abort.abort(); });
    try {
      let text = '';
      for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 4096) throw new Error('Preview request is too large.'); }
      const request = JSON.parse(text);
      if (Object.keys(request).some(key => !['projectId', 'jobId', 'revision'].includes(key))) throw new Error('Preview requests cannot supply files, commands or runtime configuration.');
      const source = await authorizer.source(token, request);
      const profile = profileFor(source.target);
      if (!configuredProfiles.includes(profile.id)) throw new Error('This stack has no provisioned preview template.');
      const artifact = await build({ source, profile, signal: abort.signal, secrets: [token] });
      const current = await authorizer.source(token, request);
      if (JSON.stringify({ target: source.target, files: source.files }) !== JSON.stringify({ target: current.target, files: current.files })) throw new Error('Project or draft inputs changed. Rebuild the saved draft.');
      if (abort.signal.aborted) throw new Error('Preview build cancelled.');
      const id = randomUUID();
      const gateway = await openArtifactGateway({ ...artifact, appOrigin, expiresAt: source.expiresAt,
        authorize: async () => {
          const access = await authorizer.access(token, source.projectId);
          if (access.owner !== source.owner) throw new Error('Preview access denied.');
        } });
      const session = { id, gateway, owner: source.owner, projectId: source.projectId };
      sessions.set(id, session);
      const timer = setTimeout(() => { gateway.dispose(); sessions.delete(id); }, Math.max(1, source.expiresAt - Date.now())); timer.unref();
      json(res, 200, { id, url: gateway.url, versions: artifact.versions, expiresAt: source.expiresAt, revision: source.revision });
    } catch (cause) {
      json(res, 400, { error: safeDiagnostic(cause?.message || 'Preview build could not complete.', [token, ...secrets]) });
    } finally { building = false; }
  });
  return { server, close: async () => {
    for (const session of sessions.values()) session.gateway.dispose();
    sessions.clear(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  } };
}
