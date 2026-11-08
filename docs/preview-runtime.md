# Local adapter preview runtime

The same multi-file Code, Docs and Preview workspace serves every stack. React and Blazor currently have explicit build profiles; other requested stacks display unsupported status. Browser compilation is optional for future adapters. This implementation builds remotely and displays copied static output in a separate-origin sandboxed iframe.

## Operator setup

Use the project's Node 24.22.2 toolchain. Keep `E2B_API_KEY` in ignored `.local/backend.env`. Template provisioning writes private mappings to `.local/e2b-templates.json`; the initial React and Blazor templates have already been provisioned for this workspace.

1. Start the local SpacetimeDB backend and frontend normally.
2. Run `npm run preview:start` in a separate terminal.
3. Add `VITE_PREVIEW_CONTROLLER_URL=http://127.0.0.1:3001` to the ignored frontend `.env.local`, then restart Vite. This URL is public configuration, never a credential.
4. Select a real generated draft, edit its files, and choose **Build preview**. Builds consume E2B credits; opening the Preview tab alone does not provision a sandbox.

Defaults are frontend `http://127.0.0.1:5173`, SpacetimeDB `http://127.0.0.1:3000`, database `complix-local`, controller port `3001`. Override with backend-only `PREVIEW_APP_ORIGIN`, `PREVIEW_SPACETIME_URI`, `PREVIEW_SPACETIME_DATABASE`, `PREVIEW_CONTROLLER_PORT` when your local setup differs. The frontend origin must match exactly.

For an explicitly authorized template update, run `npm run preview:template -- react` and then `npm run preview:template -- blazor` sequentially. These provision remote resources and incur costs. `npm run preview:verify` runs short paid verification sandboxes for both trusted fixtures, clicks their rendered buttons, checks parent-frame isolation, and saves evidence under ignored `.local/`. No model call is involved. Template polling stops after 15 minutes; a remote build can continue after polling stops, so inspect its status before retrying.

## Build conventions

- React: `examples/Preview.tsx` exports the default demonstration component. Other component files remain in the same saved file set. The host provides React 19.3.1, TypeScript 7.0.2, Tailwind 4.3.5 and Vite 8.3.6 with the pinned Radix/shadcn-compatible utilities listed in `generation/templates/react/package.json`. Unsupported dependencies fail explicitly.
- Blazor: `Examples/Preview.razor` uses namespace `ComPlixPreview.Library.Examples`. The internal host uses standalone Blazor WebAssembly, .NET SDK 10.0.403/runtime 10.0.14 and Bootstrap 5.3.8. This is how the preview runs in a browser; it does not require consuming applications to adopt that render mode. Additional NuGet dependencies are not automatically downloaded.

Trusted hosts and dependency caches are baked into templates. Candidate files cannot replace the runner or host configuration. Compilation runs as a non-root user with internet disabled, no application/provider credentials, a 180-second sandbox lifetime and bounded source/artifact sizes. The sandbox is killed after artifact collection or failure. Only copied static bytes reach the browser; generated servers never receive application requests.

## Authorization and limits

The loopback controller accepts a user's bearer token and project/job/revision identifiers. SpacetimeDB verifies identity and edit access; the controller reads authorized saved source and checks it again after compilation. It accepts no browser-supplied files or commands. Asset requests recheck access, and previews expire after at most five minutes or token expiry. One build runs at a time and at most four preview leases are retained.

Each artifact gets a dedicated loopback host and ephemeral port, capability path and restrictive CSP. The iframe allows scripts and its own origin so framework assets can load, while the separate host isolates application cookies/storage and parent DOM access. Previously used hosts are recorded privately and never reused; a stale address-allocation lock fails closed. This local HTTP service is a development integration, not hosted production preview delivery. CSP and iframe isolation are not a complete browser malware containment guarantee.

Autosave precedes build; changed source requires an explicit rebuild. Failed replacements retain the previous preview and saved draft. A compiled preview does not promote the draft, establish comprehensive component tests, synchronize exports or implement recovery. Trusted validation/promotion authority and production routing remain future work.
