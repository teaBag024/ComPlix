import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { allocatePreviewAddress } from './previewAddress.mjs';

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff' };

/** One ephemeral origin per artifact; no application routes, credentials, proxying or filesystem access. */
export async function openArtifactGateway({ assets, appOrigin, authorize, expiresAt }) {
  const capability = randomBytes(24).toString('hex');
  const address = await allocatePreviewAddress();
  let closed = false;
  const server = http.createServer(async (req, res) => {
    try {
      if (closed || Date.now() >= expiresAt || !['GET', 'HEAD'].includes(req.method)) { res.writeHead(410); res.end(); return; }
      const origin = `http://${address}:${server.address().port}`;
      if (req.headers.host !== new URL(origin).host) { res.writeHead(403); res.end(); return; }
      const raw = req.url.split('?')[0];
      if (!raw.startsWith(`/${capability}/`) || raw.includes('..') || /%2f|%5c|%2e/i.test(raw)) { res.writeHead(404); res.end(); return; }
      const name = decodeURIComponent(raw.slice(capability.length + 2)) || 'index.html';
      const data = assets.get(name);
      if (!data) { res.writeHead(404); res.end(); return; }
      await authorize();
      if (closed) { res.writeHead(410); res.end(); return; }
      const extension = name.slice(name.lastIndexOf('.'));
      res.writeHead(200, {
        'Content-Type': mime[extension] || 'application/octet-stream', 'Content-Length': data.length,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
        'Access-Control-Allow-Origin': '*', 'Cross-Origin-Resource-Policy': 'cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), payment=()',
        'Content-Security-Policy': `default-src 'none'; script-src ${origin} 'wasm-unsafe-eval'; style-src ${origin} 'unsafe-inline'; connect-src ${origin}; img-src ${origin} data:; font-src ${origin}; worker-src ${origin} blob:; base-uri ${origin}; form-action 'none'; frame-ancestors ${appOrigin}`,
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch { res.writeHead(403); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, address, resolve); });
  const dispose = () => { if (!closed) { closed = true; server.closeAllConnections(); server.close(); assets.clear(); } };
  const timer = setTimeout(dispose, Math.max(1, expiresAt - Date.now())); timer.unref();
  return { url: `http://${address}:${server.address().port}/${capability}/`, dispose: () => { clearTimeout(timer); dispose(); } };
}
