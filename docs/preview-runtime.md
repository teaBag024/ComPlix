# Sandbox-hosted preview runtime

Constraint (owner, November 8, 2026): the application runs only SpacetimeDB and the frontend server. No other ComPlix server process exists. Previews therefore build **and are served** inside E2B sandboxes.

## Flow

1. The Preview view watches the selected draft. When a save is confirmed and edits have settled for about 1 second, the browser calls the SpacetimeDB procedure `build_component_preview(jobId, expectedRevision)`.
2. The procedure checks the caller's edit access, the stack adapter and the exact saved revision, then reads the draft files from SpacetimeDB. Using the operator's `E2B_API_KEY` from protected module configuration, it either:
   - extends a live sandbox's idle timeout and pushes the new files to it, or
   - creates a sandbox from the stack's template (no outbound internet; public inbound traffic only), claims the in-sandbox agent once (receiving a write key and a random capability path), then pushes the files.
3. The private `component_preview` table stores the lease. The write key and sandbox ID never leave it. The `visible_component_previews` view gives authorized project members only the capability URL, revision and expiry.
4. The agent (`generation/templates/agent.py`) builds in the background with the trusted fixed-command runner (`build.py`) and serves the latest successful output at `https://8080-<sandbox>.e2b.app/<capability>/` with a restrictive CSP whose `frame-ancestors` is the app origin. The browser polls `<capability>/__status` and shows a loading overlay over the previous render, then reloads the iframe when the new revision is built. Failed builds keep the previous render and show the build log.

Rebuilds reuse the same sandbox, so toolchain caches stay warm. Measured live on November 8, 2026: React's first build took about 12 s and a rebuild about 3 s; Blazor's took about 41 s and 14 s. Sandboxes expire 10 minutes after the last save. Nothing else needs cleanup.

## Operator setup

1. Keep `E2B_API_KEY` (and optionally `PREVIEW_APP_ORIGIN`, default `http://127.0.0.1:5173`) in ignored `.local/backend.env`.
2. Template IDs are read from `.local/e2b-templates.json` (`agentTemplateId`). Both agent templates were provisioned on November 8, 2026. Re-provisioning (`npm run preview:template -- react`, then `-- blazor`) is paid.
3. Run `npm run backend:publish`. The publisher passes `E2B_API_KEY`, `PREVIEW_APP_ORIGIN`, `E2B_REACT_TEMPLATE` and `E2B_BLAZOR_TEMPLATE` into the module environment. No frontend configuration is needed.
4. The live opt-in check, `npm run preview:verify`, builds, clicks, rebuilds and checks parent isolation for both stacks. It uses credits.

## Build conventions

- **React:** `examples/Preview.tsx` default-exports the demo. The host has React 19.3.1, TypeScript 7.0.2, Tailwind 4.3.5, Vite 8.3.6 and the pinned Radix/shadcn-compatible utilities in `generation/templates/react/package.json`.
- **Blazor:** `Examples/Preview.razor` uses namespace `ComPlixPreview.Library.Examples`. The host is standalone Blazor WebAssembly on .NET SDK 10.0.403 with Bootstrap 5.3.8. This is preview-only and does not dictate the consuming app's render mode.
- **Other stacks:** each new stack needs its own template plus an adapter/profile entry. Until then it is shown as unsupported.

## Security and limits

- **Sandbox:** the agent runs as a non-root user. Outbound internet is blocked; this was verified live. The sandbox holds no provider or application credentials. Source is limited to 256 KiB / 40 files, and paths are validated by both the procedure and the agent.
- **Capability URL:** the preview URL is a secret link. Anyone holding it can view the preview until the sandbox expires, because there is no per-request access recheck. Generated code is served from E2B's origin, so it cannot reach application cookies, storage or the parent page.
- **Not validation:** a successful preview does not promote the draft, establish component tests or synchronize exports.
- **Concurrency:** two concurrent first builds for the same draft can briefly create two sandboxes. The later one wins and the other expires on its idle timeout.

The earlier loopback Node controller and gateway (`npm run preview:start`) were removed by this change; see decisions.md.
