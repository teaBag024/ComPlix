"""ComPlix in-sandbox preview agent.

Started by the E2B template as the unprivileged `complix` user. SpacetimeDB claims the
sandbox once (receiving a write key and a capability path), then pushes saved draft
files. Builds run in the background with the trusted fixed-command runner; the latest
successful output is served as static files under the capability path only.
"""
import hmac, json, mimetypes, os, re, secrets, shutil, subprocess, sys, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

PROFILE = sys.argv[1] if len(sys.argv) > 1 else ''
PORT = int(os.environ.get('COMPLIX_AGENT_PORT', '8080'))
BUILD = os.environ.get('COMPLIX_BUILD_SCRIPT', '/opt/complix/build.py')  # Overridable only for local agent tests.
MAX_BODY = 512 * 1024
MAX_FILES = 40
ROOT = Path(os.environ.get('COMPLIX_AGENT_ROOT', '/workspace'))
SAFE_PART = re.compile(r'^[A-Za-z0-9_.@+-]+$')
ORIGIN = re.compile(r'^https?://[A-Za-z0-9.-]+(:\d{1,5})?$')
TYPES = {'.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
         '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml',
         '.dll': 'application/octet-stream', '.dat': 'application/octet-stream', '.blat': 'application/octet-stream',
         '.pdb': 'application/octet-stream', '.woff2': 'font/woff2', '.woff': 'font/woff', '.png': 'image/png', '.ico': 'image/x-icon'}

lock = threading.Lock()
state = {'write_key': '', 'capability': '', 'app_origin': '', 'status': 'idle', 'requested': '', 'built': '', 'log': '',
         'output': None, 'pending': None, 'worker': False, 'sequence': 0}

LOADING = """<!doctype html><html><head><meta charset="utf-8"><title>Building preview</title><style>
body{margin:0;display:grid;place-items:center;min-height:100vh;font:14px system-ui,sans-serif;color:#2f3d33;background:#f4f7f4}
.spin{width:28px;height:28px;border:3px solid #c9d6cc;border-top-color:#3d6b4f;border-radius:50%;animation:s 0.9s linear infinite;margin:0 auto 12px}
@keyframes s{to{transform:rotate(360deg)}}pre{white-space:pre-wrap;max-width:90vw;max-height:60vh;overflow:auto;background:#fff;padding:12px;border:1px solid #d5ddd6}
</style></head><body><div id="box"><div class="spin"></div><p>Building preview…</p></div>
<script src="__loading.js"></script></body></html>"""
LOADING_JS = """(function poll(){fetch('__status',{cache:'no-store'}).then(r=>r.json()).then(s=>{
if(s.status==='ready'){location.reload();return}
if(s.status==='failed'){var b=document.getElementById('box');b.innerHTML='<p>Preview build failed.</p><pre></pre>';b.querySelector('pre').textContent=s.log||'';}
setTimeout(poll,1000)}).catch(()=>setTimeout(poll,2000))})();"""


def valid_files(files):
    if not isinstance(files, list) or not 1 <= len(files) <= MAX_FILES:
        raise ValueError('Preview requires 1-40 files.')
    seen, total = set(), 0
    for item in files:
        path, content = item.get('path') if isinstance(item, dict) else None, item.get('content') if isinstance(item, dict) else None
        if not isinstance(path, str) or not isinstance(content, str) or len(path) > 180:
            raise ValueError('Unsafe preview file manifest.')
        parts = path.split('/')
        if any(not SAFE_PART.match(p) or p in ('.', '..') or p.lower().startswith('.env') or p in ('node_modules', '.git', 'bin', 'obj') for p in parts) or path.lower() in seen:
            raise ValueError('Unsafe preview file manifest.')
        seen.add(path.lower())
        total += len(content.encode('utf-8'))
        if total > 256 * 1024:
            raise ValueError('Preview source exceeds 256 KiB.')
    return files


def run_builds():
    while True:
        with lock:
            job = state['pending']
            state['pending'] = None
            if job is None:
                state['worker'] = False
                return
            state['sequence'] += 1
            sequence = state['sequence']
            state['status'] = 'building'
        revision, files = job
        candidate = ROOT / f'candidate-{sequence}'
        output = ROOT / f'output-{sequence}'
        try:
            for item in files:
                target = candidate / item['path']
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(item['content'], encoding='utf-8')
            result = subprocess.run([sys.executable, BUILD, PROFILE, str(candidate), str(output)],
                                    capture_output=True, text=True, timeout=170)
            log = (result.stdout + result.stderr)[-6000:]
            ok = result.returncode == 0 and (output / 'index.html').is_file()
        except Exception as error:  # Build infrastructure failure; no generated output is served.
            ok, log = False, f'Preview build failed: {type(error).__name__}'
        shutil.rmtree(candidate, ignore_errors=True)
        with lock:
            superseded = state['pending'] is not None
            if ok:
                previous, state['output'], state['built'] = state['output'], output, revision
                if previous:
                    shutil.rmtree(previous, ignore_errors=True)
            else:
                shutil.rmtree(output, ignore_errors=True)
            state['log'] = '' if ok else log
            if not superseded:
                state['status'] = 'ready' if ok else 'failed'


class Handler(BaseHTTPRequestHandler):
    server_version = 'ComPlixPreview'
    sys_version = ''

    def log_message(self, *_):
        pass

    def send(self, code, body=b'', content_type='application/json', extra=None):
        self.send_response(code)
        headers = {'Content-Type': content_type, 'Content-Length': str(len(body)), 'Cache-Control': 'no-store',
                   'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'}
        headers.update(extra or {})
        for name, value in headers.items():
            self.send_header(name, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def json(self, code, value, extra=None):
        self.send(code, json.dumps(value).encode(), 'application/json', extra)

    def body(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > MAX_BODY:
            raise ValueError('Request body is missing or too large.')
        return json.loads(self.rfile.read(length))

    def authorized(self):
        supplied = (self.headers.get('Authorization') or '').removeprefix('Bearer ')
        return bool(state['write_key']) and hmac.compare_digest(supplied, state['write_key'])

    def do_POST(self):
        try:
            if self.path == '/__claim':
                payload = self.body()
                origin = payload.get('appOrigin', '')
                if not isinstance(origin, str) or not ORIGIN.match(origin):
                    return self.json(400, {'error': 'Invalid application origin.'})
                with lock:
                    if state['write_key']:
                        return self.json(409, {'error': 'Sandbox already claimed.'})
                    state.update(write_key=secrets.token_urlsafe(32), capability=secrets.token_urlsafe(24), app_origin=origin)
                    return self.json(200, {'writeKey': state['write_key'], 'capability': state['capability']})
            if self.path == '/__build':
                if not self.authorized():
                    return self.json(403, {'error': 'Forbidden.'})
                payload = self.body()
                revision = str(payload.get('revision', ''))[:64]
                files = valid_files(payload.get('files'))
                with lock:
                    state['pending'] = (revision, files)
                    state['requested'] = revision
                    state['status'] = 'building'
                    start = not state['worker']
                    state['worker'] = True
                if start:
                    threading.Thread(target=run_builds, daemon=True).start()
                return self.json(202, {'status': 'building', 'revision': revision})
            self.json(404, {'error': 'Not found.'})
        except (ValueError, json.JSONDecodeError) as error:
            self.json(400, {'error': str(error) if isinstance(error, ValueError) else 'Invalid JSON.'})

    def do_GET(self):
        capability = state['capability']
        raw = self.path.split('?', 1)[0]
        if not capability or not raw.startswith(f'/{capability}/') or '..' in raw or '%' in raw:
            return self.send(404)
        name = raw[len(capability) + 2:]
        cors = {'Access-Control-Allow-Origin': '*'}
        if name == '__status':
            with lock:
                return self.json(200, {'status': state['status'], 'requested': state['requested'], 'built': state['built'], 'log': state['log']}, cors)
        if name == '__loading.js':
            return self.send(200, LOADING_JS.encode(), TYPES['.js'], self.policy())
        output = state['output']
        if output is None:
            return self.send(200, LOADING.encode(), TYPES['.html'], self.policy())
        target = (output / (name or 'index.html')).resolve()
        if not str(target).startswith(str(output.resolve()) + os.sep) or not target.is_file():
            if '.' in name.rsplit('/', 1)[-1]:
                return self.send(404)
            target = output / 'index.html'  # Client-side routes fall back to the entry document.
        content_type = TYPES.get(target.suffix.lower()) or mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
        self.send(200, target.read_bytes(), content_type, self.policy())

    do_HEAD = do_GET

    def policy(self):
        ancestors = state['app_origin'] or "'none'"
        return {'Content-Security-Policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; "
                f"connect-src 'self'; img-src 'self' data:; font-src 'self'; worker-src 'self' blob:; base-uri 'self'; form-action 'none'; frame-ancestors {ancestors}",
                'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), usb=(), payment=()', 'Cross-Origin-Resource-Policy': 'cross-origin'}


if __name__ == '__main__':
    if PROFILE not in ('react', 'blazor'):
        raise SystemExit('Unknown preview profile.')
    ThreadingHTTPServer(('0.0.0.0', PORT), Handler).serve_forever()
