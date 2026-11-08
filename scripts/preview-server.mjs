import { Sandbox } from 'e2b';
import { previewConfig } from './preview-config.mjs';
import { createPreviewAuthorizer } from '../generation/previewAuthorization.mjs';
import { createPreviewController } from '../generation/previewController.mjs';
import { buildE2BArtifact } from '../generation/e2bRuntime.mjs';

const config = previewConfig();
if (!config.apiKey || !Number.isInteger(config.port) || config.port < 1024 || config.port > 49151) throw new Error('Configure the private E2B preview controller before starting it.');
const controller = createPreviewController({ appOrigin: config.appOrigin, secrets: config.secrets,
  configuredProfiles: Object.keys(config.templates), authorizer: createPreviewAuthorizer(config),
  build: ({ source, profile, signal, secrets }) => buildE2BArtifact({ Sandbox, apiKey: config.apiKey,
    templateId: config.templates[profile.id]?.templateId, profile, files: source.files, signal, secrets: [...secrets, ...config.secrets] }),
});
controller.server.listen(config.port, '127.0.0.1', () => console.log(`Preview controller listening on http://127.0.0.1:${config.port}; builds require an authorized editor session.`));
controller.server.on('error', () => { console.error('Preview controller could not bind its configured port.'); process.exitCode = 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void controller.close().then(() => process.exit(0)); });
