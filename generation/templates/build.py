"""Trusted fixed-command runner. Root-owned in the template, outside candidate paths.

Usage: build.py <react|blazor> <candidate-dir> <output-dir>
The build directory persists between rebuilds so toolchain caches (e.g. Blazor obj/) stay warm;
the candidate Library folder is replaced on every build so deleted files do not linger.
"""
import os, shutil, subprocess, sys
from pathlib import Path

profile, candidate, output = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
root = Path('/workspace/build')
if not root.exists():
    shutil.copytree('/opt/complix/host', root, ignore=shutil.ignore_patterns('fixture', 'node_modules', 'Library', 'obj', 'bin'))
    if profile == 'react':
        os.symlink('/opt/complix/host/node_modules', root / 'node_modules')
shutil.rmtree(root / 'Library', ignore_errors=True)
shutil.copytree(candidate, root / 'Library')
env = {'PATH': os.environ['PATH'], 'HOME': '/home/complix', 'DOTNET_CLI_HOME': '/tmp/dotnet-home',
       'DOTNET_CLI_TELEMETRY_OPTOUT': '1', 'DOTNET_NOLOGO': '1', 'NUGET_PACKAGES': '/opt/complix/packages'}
if profile == 'react':
    commands = [['node', '/opt/complix/host/node_modules/typescript/bin/tsc', '--noEmit'],
                ['node', '/opt/complix/host/node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native',
                 '--config', str(root / 'vite.config.mjs'), '--outDir', str(output), '--emptyOutDir']]
elif profile == 'blazor':
    shutil.rmtree('/workspace/publish', ignore_errors=True)
    commands = [['dotnet', 'restore', 'PreviewHost.csproj', '--configfile', 'NuGet.Config', '--locked-mode', '-p:NuGetAudit=false'],
                ['dotnet', 'publish', 'PreviewHost.csproj', '-c', 'Release', '--no-restore', '-o', '/workspace/publish', '-p:NuGetAudit=false']]
else:
    raise SystemExit('Unknown adapter')
log_path = Path('/workspace/build.log')
with open(log_path, 'wb') as log:
    for command in commands:
        result = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=150)
        if result.returncode:
            log.flush()
            with open(log_path, 'rb') as content:
                content.seek(max(0, log_path.stat().st_size - 6000))
                print(content.read().decode('utf-8', errors='replace'))
            sys.exit(1)
if profile == 'blazor':
    shutil.copytree('/workspace/publish/wwwroot', output, dirs_exist_ok=True)
for compressed in output.rglob('*'):
    if compressed.suffix in ('.br', '.gz', '.map') and compressed.is_file():
        compressed.unlink()
print('COMPLIX_BUILD_OK')
