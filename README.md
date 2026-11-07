# ComPlix

ComPlix builds reusable UI component libraries. The current increment supports private and shared multi-project workspaces with open-ended requested technologies. React + TypeScript is the builder stack; generated output profiles remain **React + TypeScript + Tailwind + shadcn/ui** and **Blazor + Bootstrap**.

Implemented: autosaved technical/style questionnaire and project design guidance, verified profile capture, organization creation/switching, multiple personally owned projects with optional organization sharing, editable technology details, in-app invitations, owner/admin management, editor/viewer grants, shared live edits, access revocation and an explicit transfer path for old local projects. Component generation, uploads, exports and previews remain outside this increment.

## Setup (Windows x64)

Use PowerShell from the repository root. Stop existing dev/test processes before setup because Windows locks loaded native addons.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/setup-local.ps1
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
```

Repeat the PATH line in each new terminal. Setup keeps Node 24.22.2 and SpacetimeDB 2.14.1 under ignored .tools and installs exact dependencies from both lockfiles. It makes no system-wide changes. The SDK/server/CLI versions match. react-oidc-context 3.3.1 and oidc-client-ts 3.5.0 provide the standard OIDC authorization-code/PKCE client.

## Run locally

Terminal 1:

```powershell
npm.cmd run backend:start
```

Terminal 2 (with the session PATH line):

```powershell
npm.cmd run backend:publish
npm.cmd run backend:generate
npm.cmd run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173**. Development requests under another origin are redirected there before sign-in, because PKCE state and the registered callback must use the same origin.

The backend helper targets only **127.0.0.1:3000 / complix-local**. It retains .local/data, .local/keys and .local/cli. Publishing forbids data deletion; --break-clients accepts the intentional new reducer signatures while preserving the original private project table. Reload old browser clients after upgrading.

SpacetimeAuth is hosted authentication, while the ComPlix application module/data and frontend remain local. The owner separately created complix-dev on Maincloud to configure authentication. These scripts do not update that hosted module.

## Auth configuration

The frontend and local publish helper default to the public client ID supplied by the owner, client_034te16H37cuA4goFM0pev, and issuer https://auth.spacetimedb.com/oidc. A public client ID is not a secret.

The registered client must allow:

- Redirect URI: http://127.0.0.1:5173/callback
- Post-logout URI: http://127.0.0.1:5173
- Authorization-code flow, public client (no browser client secret), openid profile email scopes.

The dashboard's configured Google/GitHub/email options are presented by its hosted sign-in page. Provider secrets stay in the provider/SpacetimeAuth dashboards. ComPlix requires a verified email and rejects anonymous identities for organization access; disable Anonymous login in SpacetimeAuth to avoid presenting an unusable option.

Optional frontend overrides belong in ignored .env.local; use .env.example as a template and replace its placeholder public client ID. VITE_AUTH_REDIRECT_ORIGIN must match an authorized origin. For the module, process variables AUTH_ISSUER and AUTH_CLIENT_ID override the local helper defaults before publication. There are no secrets needed in these frontend variables. Never set an OAuth client secret in a VITE_ variable.

Examples of module override commands (public values only):

```powershell
$env:AUTH_ISSUER = 'https://auth.spacetimedb.com/oidc'
$env:AUTH_CLIENT_ID = 'YOUR_SPACETIMEAUTH_PUBLIC_CLIENT_ID'
npm.cmd run backend:publish
```

A missing/untrusted issuer/client, missing verified email, or expired token denies admission and mutations. Claims are checked on each mutation as well as connection admission. The browser uses the provider's ID token, with OIDC session state kept in session storage; it clears the displayed workspace on sign-out, expiry and connection failure. Renewal requests `offline_access` and uses refresh tokens through the OIDC library. The application schedules renewal against the earlier of the ID-token and access-token expirations (Spacetime uses the ID token), retries transient failures, and checks again when the tab regains focus. Tokens and PKCE state stay in `sessionStorage`; reloads retain the tab session without storing credentials in `localStorage`. Sign out and back in once after upgrading to obtain a refresh token. Closing the tab ends its stored application session (browser tab restoration may restore session storage). Provider expiry/revocation or failed renewal can still require sign-in; expiry checks remain enforced. No tokens/profile objects are logged by application code.

Signing in again as the same provider identity restores its organizations. Automatic merging of different identities solely because they share an email is deliberately absent. Provider-side cross-provider linking and real Google/GitHub/email completion still need real-account verification; local test sessions do not prove those provider behaviors.

## Organization and project permissions

- Create multiple projects without joining an organization. New projects are personally owned; choose Private/no organization or an organization you belong to as a sharing context.
- Organization membership and admin roles do not grant access to personal projects. The project owner explicitly grants current members viewer/editor access and manages its sharing organization.
- Editors can rename, change requested technology details and save project guidance. Viewers can read but not edit. Only project ownership (or historical organizational management) allows grant management.
- Removing a grant retracts live project/guidance access. Leaving/removal from an organization deletes grants; rejoining does not restore them.
- A departing personal project owner retains their projects privately, with all sharing removed. Changing/detaching a project's sharing organization clears its grants and pending invitation project grants; it never transfers ownership.
- Existing organization-owned projects retain their old owner/admin management and grants, explicitly labeled in the UI. They are not silently converted to a creator's private project.
- Organization owners alone appoint/demote admins. They cannot leave or be removed; ownership transfer is not implemented.
- **Active project** and **Active organization** are separate: one selects the library/guidance; the other selects membership administration. Project selection remains stable across live updates and reloads in the tab.

Invitations target a verified email address, expire after seven days and can be revoked. The recipient signs in and accepts from the Invitations panel. **Invitation email delivery is not implemented**; share the app address with the recipient. Admin invitations can be issued/revoked only by the owner. There is no domain-based auto-join or import of GitHub organization memberships.

All backing tables are private. Caller-scoped views expose authorized rows, and reducers enforce privileges. The database owner/local administrator remains trusted; do not expose local tools/keys to clients.

## Preserve/import an old local project

Do not clear browser storage or .local directories. Sign in using the same browser and documented origin, then choose **Import previous local project as private** when the old token is present. No organization is required.

The browser proves possession using its old complix.local.identity.v1 token. The old identity authorizes a ten-minute handoff to the new authenticated identity; the signed-in destination identity completes it. The UI copies the original name/profile into a new personally owned private project and marks the source as transferred. Original source rows are retained; transferred rows disappear from the old identity's view and cannot be imported twice. The old browser token is removed only after successful confirmation. There is no claim-by-email shortcut or overwriting of an existing project.

If the old token or signing keys are lost, this UI cannot recover that development identity. Data from another browser origin is not automatically transferred.

## Validate

```powershell
npm.cmd run backend:build
npm.cmd run build
$env:PLAYWRIGHT_BROWSERS_PATH = (Join-Path (Get-Location) '.tools/playwright')
node node_modules/@playwright/test/cli.js install chromium
npm.cmd test
```

The test suite starts an isolated server on 3100 and Vite on 4173, using a unique ignored .local/e2e directory. Those ports must be free. It publishes both the original-schema fixture and the preceding organization-only module, seeds records/grants/guidance, then upgrades without deletion. Real SDK and Chromium checks cover authorization, invitations, grants/revocation, shared editing, organization switching, legacy transfer, reload/restart persistence, connection failure and sign-out. Test identities are locally signed verified-claim fixtures; browser OIDC sessions are seeded fixtures. They are not a backdoor in the application and do not exercise Google's/GitHub's real OAuth consent or email delivery. Test signing keys and publisher credentials never enter the bundle or checked-in files. Traces/video/automatic screenshots remain disabled.

For real-provider acceptance: sign in with Google, verify the name/email and workspace, create an organization/project, sign out and back in, and confirm access. Repeat with a separately invited account and each configured login method. This manual completion is still required before calling the entire auth milestone verified.

## Files and remaining scope

- spacetimedb/src/index.ts: schema, identity/ownership rules, invitations/grants and legacy handoff.
- src/main.tsx: OIDC entry/callback/sign-out and expiry handling.
- src/useWorkspace.ts: typed connection/subscription lifecycle.
- src/OrganizationWorkspace.tsx: organization, project and access UI.
- src/ProjectDetails.tsx: requested framework/language/styling/library/version details and revision-checked edits.
- src/ProjectGuidance.tsx: autosaved questionnaire, design document text preview and draft conflict recovery.
- src/module_bindings/: generated from the module; regenerate instead of editing.
- tests/foundation.spec.ts and tests/fixtures/: live regression tests.
- docs/decisions.md and docs/progress.md: accepted choices, evidence and open limits.

Keep .local, .tools, .env.local, keys and tokens out of source control. Back up data and runtime keys together for local work. No production hardening, formal accessibility audit, load testing, account-linking UI, ownership transfer or invitation email service is claimed. The owner has confirmed login and cross-provider invitations work. Questionnaire/design guidance is now implemented; generation remains a separate milestone.

## Try questionnaire autosave

Use the same setup/start commands above. For an existing local checkout after upgrading:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
npm.cmd run backend:build
npm.cmd run backend:publish
npm.cmd run dev -- --port 5173 --strictPort
```

Keep `npm.cmd run backend:start` running in another terminal. Publication targets only the local `complix-local` database and forbids data deletion. If Vite is already running, reload its existing tab instead of starting another instance. No new dependencies or credentials are required for this increment.

Open an organization project and fill in **Questionnaire and design guidance**. The selected output profile remains the project's target; the questions do not change the builder stack. Answers autosave after 700 ms of inactivity. Blank means undecided; each answer permits 4000 characters. This is a draft intake form, not generation-ready validation, upload processing, or API-key collection. Never paste credentials into guidance.

Editors can update answers; viewers see saved text read-only. Another clean tab receives updates through subscriptions. Concurrent edits stop with a conflict instead of silently overwriting saved text: compare the latest saved answers, copy anything to keep, then explicitly discard the draft and load latest. Invalid/rejected saves show an error and retain the draft. Unsaved drafts are kept in tab session storage when available, scoped to server/database/identity/project, so reload/reconnection can recover them; closing the tab or unavailable browser storage can lose unsaved work. Only confirmed server saves survive backend restarts. There is no offline save queue or automatic merging.

**Design guidance document** shows a plain-text Markdown representation of current answers, including unsaved text. It has no separately editable copy and does not claim generated code implements these preferences. Formal preference statuses/history, contradiction detection, uploads, exports and generation remain future work.

Validation commands remain `npm.cmd run build` and `npm.cmd test`. The integration suite covers guidance isolation, editor/viewer enforcement, stale revisions, invalid answers, shared subscription updates, autosave/reload, draft conflict/error recovery and restart persistence.

## Try private and shared projects

No new dependency or credentials are required. With the backend running, upgrade and start using the same local commands:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
npm.cmd run backend:generate
npm.cmd run backend:publish
npm.cmd run dev -- --port 5173 --strictPort
```

Run `npm.cmd run backend:start` in another terminal if needed. If Vite is already running, reload http://127.0.0.1:5173 instead of starting another instance. The helper publishes only to local complix-local with --delete-data=never. The schema upgrade removes organization uniqueness, adds defaulted ownership/technology fields and preserves existing IDs, grants and guidance. Reload all older clients after upgrading views/reducer bindings.

1. Under Your projects, create a project with Private/no organization. Optionally choose either starting-point preset, or type any requested framework(s), language(s), styling, libraries and versions. Each field allows 1000 characters; blank means undecided. These are unverified requests, not executable dependency instructions or a claim of generator support.
2. Create another project and use Active project to switch. Questionnaire/guidance is separate for each project and autosaves as before. Technology details use **Save project details** and revision checks; copy unsaved details before switching projects. They are not an offline draft queue.
3. To share, select a Project sharing organization you belong to and save that association. In Share this project, grant selected existing members viewer/editor access. If you manage the organization, you can also invite a new member with an explicit initial grant to the currently selected project; no invitation email is sent.
4. Verify a separate account sees only granted projects. Revoke a grant, remove a member, or leave the org to observe live retraction. Rejoining requires fresh project grants.

Both React/TypeScript/Tailwind/shadcn/ui and Blazor/Bootstrap remain required initial generation targets. MUI, Angular or other requested technologies can be recorded now; generation/build/preview/export support is not implemented by this milestone. Multiple organizations per project, personal ownership transfer, conversion of historical organization-owned projects, deletion, compatibility resolution and generated-code migration remain future work.

Run `npm.cmd run build` and `npm.cmd test` to validate. The suite covers no-org/multiple projects, arbitrary requested technology details, revision/input guards, organization-admin isolation, explicit grants, membership departure/rejoining, personal-owner retention, project switching, separate guidance, schema upgrade preservation and earlier authentication/recovery behavior.

## Workspace navigation

Use the workspace tabs to switch between Projects, Design guidance, Technologies,
Sharing, Organization, and Invitations. The active-project selector stays above
all tabs. Guidance and technology edits remain mounted when changing tabs, so
switching sections retains draft text and guidance autosave continues. Tabs support
arrow-key navigation and wrap on smaller screens; forms use two columns where space allows.
