import { readFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
export function previewConfig() {
  const file = existsSync('.local/backend.env') ? parseEnv(readFileSync('.local/backend.env', 'utf8')) : {};
  const value = name => process.env[name] ?? file[name];
  const templates = existsSync('.local/e2b-templates.json') ? JSON.parse(readFileSync('.local/e2b-templates.json', 'utf8')) : {};
  return { apiKey: value('E2B_API_KEY'), templates,
    secrets: [...Object.entries(file), ...Object.entries(process.env)].filter(([name, text]) => name.endsWith('_API_KEY') && text).map(([, text]) => text),
    appOrigin: value('PREVIEW_APP_ORIGIN') || 'http://127.0.0.1:5173',
    uri: value('PREVIEW_SPACETIME_URI') || 'http://127.0.0.1:3000', database: value('PREVIEW_SPACETIME_DATABASE') || 'complix-local',
    port: Number(value('PREVIEW_CONTROLLER_PORT') || 3001) };
}
