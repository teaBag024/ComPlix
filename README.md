# ComPlix

ComPlix creates reusable UI component libraries. This first milestone implements a local project workspace: create, retrieve and rename one saved project per development identity, with live updates and server-enforced ownership.

The builder uses React + TypeScript and a SpacetimeDB TypeScript module. The output choices describe future generated libraries: React + TypeScript + Tailwind + shadcn/ui, or Blazor + Bootstrap. Component generation, uploads, workers, exports and generated-code previews are not implemented.

## Prerequisites and setup

Verified on Windows x64 with PowerShell, Node and npm. Downloaded tools and dependencies stay in this repository. No system installation, Spacetime account, credits, Docker or .NET SDK is needed for this milestone.

Stop existing dev/test processes before setup (Windows locks loaded native addons). From the repository root:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/setup-local.ps1
```

Setup downloads portable Node **24.22.2** (verified against official SHA-256 checksums) and SpacetimeDB **2.14.1** if missing, then runs npm ci for the frontend and module. SDK/server/CLI versions match; exact versions and both lockfiles are retained. The execution-policy option applies only to that PowerShell process.

In **each new terminal**, select the downloaded Node runtime for this session:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
```

The machine's Node 24.21.0 is below this SDK's supported patch range. Use npm.cmd to avoid the blocked PowerShell npm.ps1 shim. Do not run the Node archive's system installer or install-tools script.

## Start locally

Terminal 1:

```powershell
npm.cmd run backend:start
```

The standalone server listens on **127.0.0.1:3000**, persists data under .local/data, and generates an ES256 signing keypair under .local/keys on first start. Existing keys are preserved. Stop with Ctrl+C. Do not delete/replace keys or CLI credentials when restarting.

Terminal 2, with the same session PATH setting:

```powershell
npm.cmd run backend:publish
npm.cmd run backend:generate
npm.cmd run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173**. Keep that exact origin when reopening the project. Publication targets only the local server, saves local publisher credentials in .local/cli, and explicitly forbids deleting existing data. Repeat publish/generate after changing the module. No hosted database is created.

## Verify

```powershell
npm.cmd run backend:build
npm.cmd run build
```

The frontend build runs strict frontend and module TypeScript checks before bundling. Install the project-local test browser once:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = (Join-Path (Get-Location) '.tools/playwright')
node node_modules/@playwright/test/cli.js install chromium
npm.cmd test
```

Tests start their own server on **3100**, publish a separate test module, and start Vite on **4173**. These ports must be free. Each run uses a unique directory under .local/e2e and never deletes or republishes the normal development database. Tests exercise real reducer calls, subscriptions and Chromium UI behavior, including server restart recovery. Test data stays ignored for diagnosis. Screenshots, video and network traces are disabled to avoid recording bearer credentials.

Manual check: create a project, reload, then open a second tab on the same origin and rename in the first tab. Both should show the saved name. A separate browser profile/incognito context starts with another identity and an empty workspace. Stopping the server should show an error; restart and click **Retry connection** to recover.

## Identity, access and storage

This is a **local development identity**, not an account login. Spacetime issues a bearer token stored in browser local storage, preserving identity across reloads. There is no password, OIDC sign-in, recovery, cross-device access or logout/identity-management UI. Initialize the first tab before opening additional tabs; simultaneous first-time tabs are not coordinated yet.

Clearing browser storage, changing the origin, or using another browser gives another identity. Clearing storage loses access to the old project; it does not delete it. Anyone holding the token can act as its identity. Do not expose these local servers publicly or use this authentication mode for real clients.

The private project table has a unique owner constraint. Owner comes from caller context, never a client argument. The public my_project view returns only the caller's row. Create and rename reducers validate inputs; rename checks ownership. Subscriptions push committed changes to the UI without polling. Application rules run in the module; no separate application API server or additional database is used.

Keep .local and .tools out of source control. They contain runtime keys, publisher credentials, databases and downloaded executables. Back up keys and data together if keeping local work. Browser storage is not a database backup. The database owner/local machine administrator is trusted; isolation checks concern ordinary clients.

## Files and next step

- spacetimedb/src/index.ts: authoritative schema, validation, ownership and view.
- src/main.tsx: browser identity, connection and subscription lifecycle.
- src/Workspace.tsx: project form and loading/empty/error/saved states.
- src/module_bindings/: CLI-generated client bindings; regenerate, do not edit.
- tests/foundation.spec.ts: backend and browser acceptance checks.
- docs/decisions.md and docs/progress.md: decisions, evidence and remaining limits.

Selecting a profile does not implement component generation. Recommended next milestone: recoverable OIDC identity and project access before hosted/multi-device use; generation still requires its separate design and validation decisions.
