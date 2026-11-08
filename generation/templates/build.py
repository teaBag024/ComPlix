"""Trusted fixed-command runner. This file is root-owned in the template, outside candidate paths."""
import os, shutil, subprocess, sys
from pathlib import Path

profile = sys.argv[1]
root = Path('/workspace/build')
shutil.copytree('/opt/complix/host', root, dirs_exist_ok=True, ignore=shutil.ignore_patterns('fixture', 'node_modules', 'Library', 'obj', 'bin'))
shutil.copytree('/workspace/candidate', root / 'Library', dirs_exist_ok=True)
env = { 'PATH': os.environ['PATH'], 'HOME': '/home/complix', 'DOTNET_CLI_HOME': '/tmp/dotnet-home',
        'DOTNET_CLI_TELEMETRY_OPTOUT': '1', 'DOTNET_NOLOGO': '1', 'NUGET_PACKAGES': '/opt/complix/packages' }
if profile == 'react':
    os.symlink('/opt/complix/host/node_modules', root / 'node_modules')
    commands = [['node', '/opt/complix/host/node_modules/typescript/bin/tsc', '--noEmit'],
                ['node', '/opt/complix/host/node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native', '--config', str(root / 'vite.config.mjs')]]
elif profile == 'blazor':
    commands = [['dotnet', 'restore', 'PreviewHost.csproj', '--configfile', 'NuGet.Config', '--locked-mode', '-p:NuGetAudit=false'],
                ['dotnet', 'publish', 'PreviewHost.csproj', '-c', 'Release', '--no-restore', '-o', '/workspace/publish', '-p:NuGetAudit=false']]
else:
    raise RuntimeError('Unknown adapter')
with open('/workspace/build.log', 'wb') as log:
    for command in commands:
        result = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=110)
        if result.returncode:
            log.flush()
            with open('/workspace/build.log', 'rb') as content:
                content.seek(max(0, os.path.getsize('/workspace/build.log') - 6000))
                print(content.read().decode('utf-8', errors='replace'))
            sys.exit(1)
if profile == 'blazor':
    shutil.copytree('/workspace/publish/wwwroot', '/workspace/output', dirs_exist_ok=True)
print('COMPLIX_BUILD_OK')
