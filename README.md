# ComPlix

ComPlix builds reusable UI component libraries. The current increment supports private and shared multi-project workspaces with open-ended requested technologies. React + TypeScript is the builder stack; generated output profiles remain **React + TypeScript + Tailwind + shadcn/ui** and **Blazor + Bootstrap**.

Implemented: mock generation job/Library inspection flow (not real AI/build execution), project reference uploads/plain-text previews, autosaved technical/style questionnaire and project design guidance, verified profile capture, organization creation/switching, multiple personally owned projects with optional organization sharing, editable technology details, in-app invitations, owner/admin management, editor/viewer grants, shared live edits, access revocation and an explicit transfer path for old local projects. Component generation, generated-library exports and executable component previews remain outside this increment.

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
- src/ProjectReferences.tsx and shared/referenceFiles.ts: scoped reference intake UI and shared validation.
- src/ProjectSetup.tsx: project intake questionnaire and saved design guidance used by generation.
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

**Design guidance document** shows a plain-text Markdown representation of current answers, including unsaved text. It has no separately editable copy and does not claim generated code implements these preferences. Formal preference statuses/history, contradiction detection, binary-document extraction, exports and generation remain future work.

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

The workspace follows [the frontend design guide](./docs/frontend-design-guide.html)
with separate URL-backed pages rather than tabs. Sign-in opens `/projects`;
opening a project enters `/projects/:id/components`, with dedicated
`/projects/:id/settings` and `/projects/:id/guidance` pages. Reference
management and sharing are separate project pages linked from Settings.
Organizations and invitations have their own `/organizations` and `/invitations`
pages. Browser back/forward navigation is supported. Project pages keep a project
picker and clear navigation back to the project grid. Light mode is the default;
the header theme toggle saves the preference for future visits.

## Workspace ownership and shared spaces

Projects shows **Projects you own** separately from **Projects shared with you**. Each card shows that project's requested stack, ownership and private/organization-space context. Shared projects can be filtered by organization. Opening a card enters that project's component workspace.

Organizations are optional: you may have none or belong to many. The Organizations page lists your spaces and the multiple projects you can access in each. Selecting an organization's project opens that project; it does not merge stacks, transfer ownership or expose ungranted projects. Counts are limited to projects visible to you. Existing organization-owned projects are labeled accordingly.

## Upload project references

With the local server running, publish the updated module and reload the frontend:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
npm.cmd run backend:generate
npm.cmd run backend:publish
npm.cmd run dev -- --port 5173 --strictPort
```

If the frontend is already running, reload http://127.0.0.1:5173 instead of starting another instance. Start the server in a separate terminal with `npm.cmd run backend:start` if necessary. No additional service, dependency or credentials are required. The publish helper targets only local complix-local and forbids data deletion.

Select a project, open **Settings** → **Manage references**, choose a purpose and file, then **Upload reference**. Markdown/text and selected source files must be valid readable UTF-8, contain 1 byte to 128 KiB, and use an allowed extension. There are at most 20 references per project, with case-insensitive unique filenames. The picker lists allowed extensions; PDFs, images, archives, environment files and URL retrieval are not supported. Never upload API keys/credentials.

Saved originals, decoded text and metadata are private SpacetimeDB records. Collaborators with project access see updates live; editors can upload/remove, viewers can read. Preview displays plain text, including HTML/Markdown source, and never executes uploaded code. Ready means text is readable, not that AI has interpreted it. Existing guidance and library code are not modified. Failed uploads retain existing references; removal requires confirmation and has no undo. Original bytes are retained in the authorized data view, with no separate original-download UI yet.

Check using `npm.cmd run build` and `npm.cmd test`. Limits and file rules live in shared/referenceFiles.ts; UI in src/ProjectReferences.tsx; authorization/storage in the module. Larger/binary formats, extraction workers, semantic indexing, AI generation and reference precedence are future work. Workspace subscriptions currently load references for all accessible projects; pagination and lazy content loading are not implemented.

## Library: mocked generation workflow

Select a project and open **Library**. This milestone runs locally with **no NVIDIA/E2B account or API key**. Queue a mock component request; all saved references in that project are included automatically in its snapshot. Watch subscription-driven progress; inspect Source, Documentation, Validation and the interactive fixture Preview. Choose a mock failure outcome to exercise failure handling. Reloading preserves history; resume/cancel an interrupted job explicitly. A failed attempt leaves earlier candidates and saved project content unchanged.

The preview is a trusted HTML fixture in an opaque-origin sandboxed iframe with restrictive CSP, not generated framework code and not an E2B sandbox. Build/test stages are simulated. No output is marked current, validated or export-ready. No host command, dependency installation, provider call or real component build runs. Any requested project stack can be recorded; no generation support is claimed by the fixture.

With the local backend running:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
npm.cmd run backend:generate
npm.cmd run backend:publish
npm.cmd run dev -- --port 5173 --strictPort
```

Reload the existing frontend if it is already running. Publish targets local complix-local and forbids data deletion. The local helper defaults GENERATION_MODE to mock; set `$env:GENERATION_MODE = 'disabled'` before publication to disable job creation/advancement. This is a backend setting, never a client-controlled validation switch. No new dependency was installed.

Job context captures saved technology details/guidance and all references saved to that project, capped at 64 KiB. References are attached automatically; users cannot select a subset per request. A request is rejected before job creation/provider calls if the full snapshot exceeds 64 KiB; no reference is silently omitted. Requests allow 4000 characters; developer mock history has 20 mock jobs/project; real chat has no lifetime turn cap. One active job per project is allowed. Editors create/run/cancel/delete; viewers inspect authorized history. Terminal job deletion removes saved context/mock artifacts and frees a history slot. Removing a source reference does not remove its copies in existing job history. Context changes stop an active attempt rather than silently validating stale inputs.

Run `npm.cmd run build` and `npm.cmd test`. Provider adapters under generation/ have mocked tests only. NVIDIA draft generation is now available as described below. E2B SDK provisioning/protected-preview routing, toolchain preparation, compiler/interaction checks, artifact promotion and recovery remain future integration work. See docs/generation-sandbox-plan.md for the proposed live boundary.


## Built-in ComPlix chat (operator setup)

Users sign in, open a project, and use **Chat with ComPlix** in **Components**. Users never provide API keys or choose a provider. Chat replies and draft files are saved privately in SpacetimeDB and shared only with authorized project collaborators. Editors can send; viewers can read. All saved project references, saved guidance/technologies, the latest draft file set and up to six recent successful turns provide context. Chat can discuss requirements without returning code. Generated files remain unverified; no actual build, executable preview or promotion is connected yet.

Gemini coordinates discussion and calls Nemotron only when files need changing. As the ComPlix operator, enter both provider keys once in the ignored file `.local/backend.env` (a blank template has been created). Keep it private:

```dotenv
GEMINI_API_KEY=<your-operator-Gemini-key>
GEMINI_MODEL=gemini-3.8-flash
NVIDIA_API_KEY=<your-operator-NVIDIA-key>
NVIDIA_MODEL=nvidia/nemotron-3.5-super-vl-120b-a12b
```

The placeholder above is documentation only; replace it inside the private file. Never put the key in frontend configuration, VITE_ variables, source code, screenshots or chat. The backend publish helper reads this file only for local publication and forwards only GEMINI_API_KEY, GEMINI_MODEL, NVIDIA_API_KEY and NVIDIA_MODEL through the CLI process environment, without printing their values. SpacetimeDB retains the operator secret in its protected database environment; it is not an ordinary application row or client parameter. Database operators and local machine administrators are trusted. An existing process environment value takes precedence over the file.

Start the backend if it is not already running:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
npm.cmd run backend:start
```

In another terminal, publish the configuration and start the frontend:

```powershell
$env:PATH = (Join-Path (Get-Location) '.tools/node-v24.22.2-win-x64') + ';' + $env:PATH
npm.cmd run backend:publish
npm.cmd run dev -- --port 5173 --strictPort
```

Reload an existing frontend instead of starting a second copy. Use http://127.0.0.1:5173 for the configured sign-in callback. Publishing targets only local complix-local, forbids data deletion, and preserves unspecified stored configuration. Without both configured keys, chat shows an operator-configuration message and disables sending. No E2B account is needed for chat. Setting `$env:NVIDIA_ENABLED = 'false'` before publication disables live chat. Removing the key from the private file alone does not delete the stored database value; revoke it with its provider or explicitly unset GEMINI_API_KEY/NVIDIA_API_KEY through SpacetimeDB administration.

Gemini receives the authorized project snapshot when an editor sends a message. Nemotron receives that snapshot plus bounded change instructions only if Gemini requests the generation tool for a supported adapter. Each turn uses at most two Gemini calls and one Nemotron call; discussion uses one Gemini call. Both providers spend the operator's quota. Defaults: five new requests per identity per minute, one active job per project, 4000-character messages, 64 KiB context, 2048 output tokens per Gemini call, 4096 Nemotron output tokens, 15-second Gemini and 35-second Nemotron HTTP deadlines, no automatic retry. Gemini defaults to Flash with LOW thinking for Gemini 3 models. Usage counters survive deletion of history. The developer mock workflow retains a 20-mock-job/project limit. Saved chat turns, generated drafts and component starters do not consume mock slots or impose a lifetime chat cap. History is retained unless explicitly deleted; retention/pagination remains future work. These limits are not a global billing ceiling. Interrupted requests may require cancellation; cancellation discards late results but cannot refund or guarantee stopping provider usage.

Provider credentials and models are backend configuration only. generateProjectChat is the coordinated entry point; the former direct generateNvidiaDraft procedure has been removed, with historical NVIDIA job data retained. The procedure accepts project ID, request ID and message, and resolves all saved references on the server for that project. Gemini and Nemotron receive the same authorized reference snapshot. It enforces project permissions before provider use and before accepting a result. Only sanitized errors and bounded source files/replies reach clients. Mock tools remain under **Developer mock workflow**, clearly separate from built-in chat.

Validation commands:

```powershell
npm.cmd run build
npm.cmd run backend:build
npm.cmd test
```

Tests use synthetic operator credentials and a transport-instrumented ignored module copy; production source has no mock endpoint switch. Released SpacetimeDB blocks outbound loopback HTTP, so these checks do not prove real Gemini/NVIDIA responses or production transport. The operator's live account/model test remains to be run. E2B builds, protected previews, dependency/toolchain support, durable orchestration, artifact promotion/recovery and exports remain future work.

If another test process owns the default ports, run an isolated check without stopping it:

```powershell
$env:COMPLIX_TEST_FRONTEND_PORT = '52173'
$env:COMPLIX_TEST_BACKEND_PORT = '52100'
$env:COMPLIX_TEST_DATABASE = 'complix-chat-check'
npm.cmd test
```

These variables affect test processes only. Choose other unused ports if these are occupied.

Slow replies: chat currently displays a complete response, not streamed tokens. It shows elapsed waiting time and Cancel reply. The coordinated path has at most 65 seconds of provider HTTP budgets; client confirmation stops waiting after 75 seconds, and a private backend job deadline marks abandoned active requests failed at 90 seconds. Deadlines run without a browser while the server is running. Reloading also cleans up older stale jobs created before this recovery fix. A deadline/cancel never automatically sends another paid request and cannot refund or guarantee interrupting upstream usage. Gemini 3 uses LOW thinking; Nemotron reasoning is disabled. Real response time still depends on both providers and request size.


### Editing generated drafts

Open a generated candidate under Components, choose Code and select a file. Editors can change any existing source, documentation or example file; changes autosave after a short pause to a project-scoped, versioned draft. Wait for Draft saved before closing the browser. Viewers and illustrative/mock fixtures are read-only. The current editor is a plain text multi-file editor; it does not provide IDE completion or execute code.

Chat uses the selected candidate's saved edits and waits for autosave before sending. A new response creates another candidate; failures and stale responses never overwrite the edited source candidate. Conflicts preserve local text and offer retry for save failures or an explicitly labeled discard/load action. Navigation waits for draft save and stays in place on errors; browser closing warns about unsaved edits. Drafts are still unverified: the Gemini coordinator is connected in source, but actual React/Blazor builds/previews and promotion remain unconnected.

The module/bindings change requires the usual data-preserving local backend publication before reloading this frontend (`npm.cmd run backend:publish`). Development tests publish only to disposable isolated test databases; no application publication is implied.

Gemini REST function calls are limited to `generate_component_changes({instructions})`. Project/draft identity and file access come from the authorized server snapshot, never tool arguments. No generated command is executed. Cancellation/access/source revision are rechecked before the generator, before final summarization and before saving. Thought signatures are returned to Gemini in memory for the tool round trip and are not persisted or shown as conversation. Unknown/multiple/repeated tools, truncated output, credential echoes and provider errors fail safely. Unsupported targets can be discussed but cannot invoke generation through a generic fallback.

Official references: [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling), [Flash model](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [thinking levels](https://ai.google.dev/gemini-api/docs/thinking). Account/model availability and live responses remain unverified.

### Component previews (sandbox-hosted)

Open **Preview** on a saved draft. Each confirmed save rebuilds automatically once edits settle; a loading overlay covers the last successful render until the new revision is ready, and build errors appear below it. The draft is built and served inside an isolated, offline E2B sandbox; ComPlix runs no preview server of its own. Operator setup: put `E2B_API_KEY` in `.local/backend.env` and run `npm.cmd run backend:publish` (template IDs come from `.local/e2b-templates.json`). Details, limits and the opt-in paid live check are in [docs/preview-runtime.md](docs/preview-runtime.md). The old `npm run preview:start` controller and `VITE_PREVIEW_CONTROLLER_URL` are no longer used.
