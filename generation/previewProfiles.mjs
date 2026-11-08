import { readFileSync } from 'node:fs';
import path from 'node:path';

const reactPackages = JSON.parse(readFileSync(new URL('./templates/react/package.json', import.meta.url), 'utf8'));
export const previewProfiles = {
  'react-tailwind-shadcn': { id: 'react-tailwind-shadcn', kind: 'react', entry: 'examples/Preview.tsx',
    image: 'node:24.22.2-bookworm', cpuCount: 2, memoryMB: 2048,
    dependencies: { ...reactPackages.dependencies, ...reactPackages.devDependencies },
    versions: 'React 19.3.1, TypeScript 7.0.2, Tailwind 4.3.5, Vite 8.3.6; shadcn-compatible Radix utilities' },
  'blazor-bootstrap': { id: 'blazor-bootstrap', kind: 'blazor', entry: 'Examples/Preview.razor',
    image: 'mcr.microsoft.com/dotnet/sdk:10.0.403-noble', cpuCount: 2, memoryMB: 4096,
    dependencies: { 'Microsoft.AspNetCore.Components.WebAssembly': '10.0.14' },
    versions: '.NET SDK 10.0.403, Blazor WebAssembly 10.0.14, Bootstrap 5.3.8' },
};
export function profileFor(target) {
  const eq = (value, choices) => choices.includes((value || '').trim().toLowerCase());
  if (eq(target.framework, ['react']) && eq(target.language, ['typescript']) && eq(target.styling, ['tailwind', 'tailwind css']) && eq(target.libraries, ['shadcn/ui'])) return previewProfiles['react-tailwind-shadcn'];
  if (eq(target.framework, ['blazor']) && eq(target.language, ['c#', 'csharp']) && eq(target.styling, ['bootstrap']) && !target.libraries.trim()) return previewProfiles['blazor-bootstrap'];
  throw new Error('Unsupported target stack. No preview adapter matches this project.');
}
export function validatePreviewFiles(files, profile, secrets = []) {
  if (!Array.isArray(files) || !files.length || files.length > 20) throw new Error('Preview requires 1–20 saved draft files.');
  const seen = new Set(); let bytes = 0;
  for (const file of files) {
    if (typeof file?.path !== 'string' || typeof file.content !== 'string' || !file.path || file.path.length > 180 || file.path.startsWith('/') || /[\\:\u0000-\u001f\u007f]/.test(file.path) || file.path.split('/').some(part => !part || part === '.' || part === '..' || part.toLowerCase().startsWith('.env') || part === 'node_modules' || part === '.git') || seen.has(file.path.toLowerCase())) throw new Error('Unsafe preview file manifest.');
    if (secrets.some(secret => secret && file.content.includes(secret))) throw new Error('Remove credentials from draft files before previewing.');
    seen.add(file.path.toLowerCase()); bytes += Buffer.byteLength(file.content);
    if (bytes > 256 * 1024) throw new Error('Preview source exceeds 256 KiB.');
    if (file.path.endsWith('package.json') && profile.kind === 'react') {
      let manifest; try { manifest = JSON.parse(file.content); } catch { throw new Error('Invalid package manifest.'); }
      for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
        if (![profile.dependencies[name], '^' + profile.dependencies[name], '~' + profile.dependencies[name]].includes(version)) throw new Error(`Dependency needs a verified preview environment: ${name}.`);
      }
    }
    if (/\.(csproj|props|targets)$/i.test(file.path) && profile.kind === 'blazor') {
      for (const [tag] of file.content.matchAll(/<PackageReference\b[^>]*>/gi)) {
        const name = /\bInclude="([^"]+)"/i.exec(tag)?.[1];
        const version = /\bVersion="([^"]+)"/i.exec(tag)?.[1];
        if (!name || !version) throw new Error('Preview requires explicit pinned NuGet dependencies.');
        if (profile.dependencies[name] !== version) throw new Error(`Dependency needs a verified preview environment: ${name}.`);
      }
      if (/<TargetFramework>\s*(?!net10\.0\s*<)[^<]+</.test(file.content)) throw new Error('This preview environment currently targets net10.0.');
    }
  }
  if (!files.some(file => file.path === profile.entry)) throw new Error(`Add a runnable preview entry: ${profile.entry}.`);
  return files.map(file => ({ ...file }));
}
export const templateContext = profile => path.resolve('generation/templates', profile.kind);
