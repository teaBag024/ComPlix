# ComPlix progress

## November 7, 2026 — repository and planning baseline

Completed documentation work only:
- Read AGENTS.md, the consolidated system plan, and all four original documents in docs/.
- Inspected README.md (empty), repository file inventory and Git status. No application source, dependency manifests, lockfiles, tests, build configuration or environment configuration exists.
- Created decisions.md and this record. No original planning files changed.
- Recorded superseded wording, status distinctions, implementation gates and a proposed project-persistence milestone in decisions.md.

Repository baseline:
- Git reports no commits on main, with origin/main marked gone. All existing project files are untracked; git ls-files is empty. No remote reachability check was performed.
- AGENYS.md shown in the IDE is absent from the disk inventory. ComPlix-planning-notes.md cited by the consolidated plan is also absent; no contents were assumed.
- No branch switch, commit, push, dependency install or application implementation performed.

## Development tools checked — historical inventory before backend revision

Read-only commands ran locally; availability does not establish compatibility with an unselected target profile.

| Tool/check | Observed result |
| --- | --- |
| Git | 2.55.0.windows.3 |
| Node / npm | 24.21.0 / 10.9.9 |
| Default python / pip | Python 3.13.1 / pip 26.2.2 via Scoop |
| Python launcher | Lists Python 3.12 as default plus uv-managed 3.14.8; differs from python on PATH |
| Python SQLite module | Runtime 3.45.3 |
| sqlite3 CLI | 3.50.4 |
| Flask / SQLAlchemy | Import specifications found in default Python; versions and application operation unverified |
| Alembic / pytest | Not found in default Python |
| uv | 0.13.1 |
| .NET SDK | dotnet absent from PATH; executable absent from standard Program Files and Program Files (x86) locations |
| Docker | CLI 29.8.1; docker info returned server version 29.8.1 |
| VS Code CLI | 1.145.2 |
| ripgrep | Available; used for repository inventory |

Missing/conditional prerequisites:
- A compatible .NET SDK is required for local real Blazor builds; choose the supported version/render mode before installing. Other custom installation locations were not exhaustively searched.
- Choose one Python interpreter and create a project-local environment when implementation is authorized. Existing global Flask/SQLAlchemy are not a reproducible dependency specification.
- Alembic is absent if that proposal is adopted; pytest is absent if selected for testing. Neither is installed or approved by this inventory.
- Frontend/output dependencies and browser automation are not configured. Target versions, lockfiles and check tools remain to be chosen; no package installs or network dependency checks were run.
- Docker daemon response does not prove generated-code isolation or a working preview environment.

## Validation and limitations

Ran Git status/file inventory and version/availability checks, Python package discovery, SQLite runtime checks, and Docker server query. No application tests/builds exist to run; no product behavior is verified.

The read-only sandbox failed to launch commands with Windows error 267; approved elevated commands were used for inspection and documentation writes. No dependency installation was attempted.

## Next steps and blockers

Historical baseline next step (superseded by the revision below): confirm backend/persistence tooling and identity/access expectations before implementing the proposed milestone. Other open decisions are staged there for generation, preview, recovery and export work.

Next: review those decisions, then authorize a small implementation increment on a feature branch. Preserve both output profiles without describing profile selection as implemented framework support. No product feature is marked complete.

## November 7, 2026 — SpacetimeDB direction revision

Completed planning/documentation work:
- Reread AGENTS.md, all original docs and both memory records; inspected Git status and repository inventory. Still no application code/manifests.
- Recorded the owner's selected SpacetimeDB backend in AGENTS.md, system-planning v1.1 and decisions.md. Preserved Flask/SQLite/PostgreSQL and SQLAlchemy/Alembic as superseded history.
- Added system-planning section 19 with official research links, documented capabilities, recommended architecture, external responsibilities, open choices and revised first increment.
- Kept React/TypeScript frontend and both required generated profiles unchanged.

Research: reviewed current official SpacetimeDB docs for module languages, authentication/claims, table permissions/views, reducers/procedures, persistence, subscriptions, files and schema migration. Live pages display 2.0.0; no SDK/server version selected. Verified in documentation only; no local integration or product behavior tests ran.

Tool check: spacetime CLI not found on PATH. Prior .NET absence remains an uncorrected prerequisite for local Blazor builds, not a fresh exhaustive search. Flask/SQLAlchemy/Alembic are no longer backend prerequisites. No install, scaffold, database publish, auth resource creation, commit or push performed.

Validation: read back edited documents; searched active backend references for consistency and reviewed the scope/status distinctions. All files remain untracked, so ordinary git diff does not validate their contents. No application build/tests are applicable.

Next decisions: module language/version/hosting, OIDC/client identity and issuer/audience rules, then private schema/views. Before generation: provider/key retention, service/worker permissions and job recovery, execution isolation, artifact storage and Blazor hosting/render mode. Recommendations are not recorded as owner-approved selections.


## November 7, 2026 — first implementation increment in progress (historical checkpoint)

Branch: feat/project-foundation (unborn repository; no commit created). Existing planning files preserved. Added root/backend package manifests and lockfiles, TypeScript configs, private project model with scoped view and create/rename reducers, generated bindings, workspace UI component/styles, and project-local tool/setup scripts.

Installed only project-local dependencies and portable tools in ignored .tools: SpacetimeDB 2.14.1, Node 24.22.2, Playwright Chromium. Node archive SHA-256 matched official checksums. No system installation, paid service or external deployment. npm ci/install uses npm.cmd because PowerShell policy blocks npm.ps1.

Evidence actually run:
- Backend TypeScript typecheck passed.
- SpacetimeDB backend build passed after backend TypeScript dependency installation.
- SpacetimeDB client generation passed; output skips the private project table and exposes my_project.
- Frontend source typecheck passed for the current UI component/bindings. There is no main browser entry point yet and no successful frontend bundle claim.
- npm install audits reported zero vulnerabilities at installation time.

Blocked/pending: owner has not yet selected local browser-retained development identities versus OIDC/hosted access after asking about their limited-credit SpacetimeDB account. Local-only backend and token identity recommended; runtime identity integration is waiting for that answer. The backend start attempt found that the portable standalone executable needs explicit local signing-key paths; provisioning remains unfinished. No successful backend startup/publication, project creation/reload, realtime UI, server-restart recovery, cross-identity denial or UI failure tests have run. The milestone is not complete.

Next: resolve identity/hosting choice, finish key provisioning and browser connection, run the real server and browser acceptance suite, then replace the provisional README status with validated start/test commands. All backend application rules for this increment are in SpacetimeDB; external workers remain outside scope. No commit, push, merge or deployment.


## November 7, 2026 — local project foundation completed

The owner approved local standalone Spacetime and browser-retained development identities. This resolves the identity/hosting blocker in the historical checkpoint above. No account access, credits or remote resources were used.

Implemented:
- React/TypeScript workspace with loading, empty, saved, mutation error and connection-error/retry states.
- SpacetimeDB 2.14.1 TypeScript module: private project table, unique owner, validated create/rename reducers and caller-scoped my_project view.
- Both required output-profile identifiers, without claiming component generation.
- Browser-retained identity and actual subscriptions (no polling), plus server data/signing-key persistence.
- Local runtime key generation, loopback-only start/publish helpers, portable setup and exact README commands.
- Isolated test server/data/publisher identity, with four real backend/browser acceptance tests.

Validation actually completed:
- npm.cmd run backend:build: passed.
- npm.cmd run backend:publish: passed against 127.0.0.1:3000; local-only database created.
- npm.cmd run backend:generate: passed; private table skipped in bindings.
- npm.cmd run build: passed strict frontend/module typechecks and Vite production build.
- npm.cmd test: 4 passed in 12.4 seconds, exit 0. Covers invalid/unsupported input, duplicate creation, private query and subscription denial, scoped query isolation, forbidden cross-owner rename, both profiles, browser reload with the same owner, two-tab subscription rename, persistent server restart and visible disconnection/retry recovery.
- Documented setup command completed successfully with both npm ci lockfile installs, reusing downloaded tools; both audits reported zero vulnerabilities.
- Live empty workspace inspected at desktop (1280px) and mobile (390px) widths. This was a visual check, not an accessibility certification.
- Confirmed .local runtime keys, .tools executables, node_modules and module build output are ignored. Read back implementation/docs and inspected repository status. No application credentials placed in source or reports.

Issues resolved during validation:
- Portable standalone needs explicit ES256 signing keys: generated once under ignored .local, preserved on restart, shared helper used by independently keyed test runs.
- Sandbox run's assertions passed but process cleanup stalled; interrupted that run and reran with approved normal process permissions. Final test command completed successfully.
- Setup recheck initially hit a Windows native-addon file lock while Vite was running; stopped owned development processes and reran successfully. README notes setup must run with dev/test processes stopped.

Current development services: local backend on 127.0.0.1:3000 and frontend on 127.0.0.1:5173 were started for handoff. Test services on 3100/4173 shut down after the passing run.

Limits:
- Development token is not recoverable OIDC login; no account recovery, cross-device access or identity-management UI. Losing browser storage loses access to the stored project.
- Simultaneous first-time tabs are not coordinated. Initialize the first tab before opening additional tabs.
- Connection loss requires explicit retry; no offline writes. Output stack is fixed after project creation.
- Verified Windows x64/Chromium only. No hosted deployment, browser matrix, formal accessibility audit, backup/restore drill or complex schema migration test.
- Generation, worker orchestration, questionnaires/style-guide processing, previews, exports and revision undo/redo remain unimplemented.

Changed areas: frontend, module/bindings, manifests/lockfiles, local tooling/tests, README, AGENTS and current planning/memory records. Original four product documents preserved. Branch remains feat/project-foundation with no commits, push, merge or deployment.

Recommended next milestone: recoverable OIDC identity and project access before hosted/multi-device use. Broader generation architecture remains a separate increment.

## November 7, 2026 — source-control handoff

The owner explicitly requested committing and pushing the completed milestone. Preparing the initial repository snapshot on feat/project-foundation, including the original planning baseline and implementation. Remote origin is https://github.com/teaBag024/ComPlix.git; the remote head check returned no branches. Reviewed all 34 candidate files and checked for private-key/JWT/GitHub-token patterns with no matches; ignored runtime credentials, local data and downloaded tools remain excluded. Prior build and four-test acceptance evidence still applies; no application changes were made for this handoff. Publication outcome is reported in the handoff message.


## November 7, 2026 — Spacetime agent integration setup

User requested the official agent setup workflow and full current misconceptions page. Read the full setup guide and misconceptions Markdown source, the Zen page, and the recommended introductory essays. Inspected existing configuration and preserved the organization-access changes already in progress.

Installed/enabled spacetimedb@spacetimedb-plugins 0.1.0 from the official clockworklabs/SpacetimeDB Git marketplace, using Codex CLI. User-level install: C:/Users/Lilian/.codex/plugins/cache/spacetimedb-plugins/spacetimedb/0.1.0. Verified bundled concepts, cli, mcp, TypeScript server/client and other language skills plus the MCP manifest. No duplicate Spacetime skills found under ~/.agents/skills. Claude CLI and ~/.cursor were absent, so no integrations were installed for those agents.

Verified existing PATH CLI 2.14.1 and spacetime mcp --help, matching the project's pinned 2.14.1 SDK. codex plugin list reports installed/enabled and codex mcp list reports the stdio registration (spacetime mcp). Existing Maincloud default and local server entry were preserved; no database scope override/project spacetime.json exists. No login, server start, publication, schema/data inspection, SQL or reducer calls were performed for setup. Application source and dependency versions were unchanged by setup.

Status: PARTIAL until Codex is reloaded. New MCP tools/skills are not exposed in the current live session, so no MCP connection/ping is claimed. After reload, confirm the intended server (ComPlix development is local; current global default is Maincloud), inspect tools and verify only ping. No write-approval bypass was configured.

Sources: https://spacetimedb.com/agent-setup.md and https://spacetimedb.com/docs/intro/misconceptions/. Future capability descriptions must use current official docs and the installed SDK/bindings, including procedures, module environment variables, scheduled work, files and typed views; an external service is not automatically required for these capabilities. Existing broader architecture recommendations remain proposals, not platform limitations.


## November 7, 2026 — sign-in and organization implementation

Implemented on feat/organization-access:
- OIDC authorization-code/PKCE integration using the supplied public SpacetimeAuth client, session storage, sign-out and expiry cleanup. No client secret or credential-debug output.
- Verified profile registration and issuer/audience/expiry/verified-email guards at admission and mutations.
- Organizations, multiple memberships, one project per organization, owner/admin management and editor/viewer grants.
- Organization switching, project creation/rename, incoming/outgoing in-app invitations, acceptance/revocation, role/access controls and member removal in the React UI.
- Private backing tables/caller views; subscription-driven sharing and immediate grant/membership revocation.
- Original-schema preservation and explicit, expiring, old-token-authorized transfer to an authenticated organization manager.
- README setup/auth/migration/test commands, public .env.example, accepted decisions and system plan v1.3. Original four product planning documents preserved.

Validation actually run:
- Backend build and binding generation passed with CLI/server/SDK 2.14.1.
- Frontend/module strict typechecks and Vite production build passed.
- Final npm.cmd test: 5 passed in 21.0 seconds, exit 0. The suite uses isolated local server/data and signed identity fixtures, plus seeded browser OIDC sessions.
- Checks include missing/unverified/expired/wrong-audience credentials, denied wrong-audience HTTP read, scoped reads, invalid/duplicate project creation, invitation recipient validation/single acceptance/revocation, owner protections, denied privilege escalation, editor sharing, viewer write denial, grant removal and membership removal with live subscription retraction.
- Migration test publishes the original schema fixture, creates a legacy project, upgrades with --delete-data=never, proves old-token possession is required, imports atomically, rejects replay and verifies persistence after server restart.
- Chromium tests include organization switching and both profile choices, same-identity reload, shared edits across separate identities, viewer UI, removal hiding data, connection failure/retry and sign-out clearing the workspace.
- git diff --check passed (line-ending notices only). Changed-file private-key/JWT/GitHub-token pattern scan found no matches; runtime keys/data remain ignored. This is a limited pattern check, not a general secret-audit guarantee.

Live configuration/route checks:
- Read only public settings with spacetime auth client get complix-dev, without --include-secret. Registered redirect/logout URIs match 127.0.0.1:5173.
- Public OIDC discovery works; rendered hosted login shows Google and GitHub icons plus email magic link. Anonymous login is also enabled there; the application rejects it for organization access. Recommend disabling it in the auth dashboard.
- Google navigation reaches accounts.google.com with no observed OAuth configuration error before login. No credentials were entered and no provider consent was granted.
- Owner reported invalid_redirect_uri on a real attempt. Registration itself was verified correct. Added a canonical origin redirect before OIDC and verified localhost redirects to 127.0.0.1 and reaches Google. Real callback completion after this fix is pending the owner's retry.

The local server/frontend had stopped during the session; restarted them and successfully published the validated module to complix-local on 127.0.0.1:3000 without deleting data. Current app: http://127.0.0.1:5173. No Maincloud application module update, paid resource creation, commit or push was performed in this increment.

Remaining/unverified:
- Full Google/GitHub/email authorization-code exchange with real accounts, callback, return sign-in, provider renewal/logout and cross-provider linking. These are not proven by seeded sessions or reaching the provider page.
- Invitation email delivery is deliberately absent; invites are in-app. Seven-day invitation and ten-minute transfer TTL boundary/expiry-clock tests are not run.
- No ownership transfer, account-merging UI, production hardening, browser matrix, formal accessibility/load audit or immediate provider-token revocation guarantee.
- The full auth milestone remains pending real-provider acceptance; local organization/access implementation is validated. Component generation, questionnaires, workers, uploads, exports and previews remain outside this increment.

## Tab session renewal — November 7, 2026

Owner confirmed successful Google login and Google-to-GitHub invitations; this supersedes the earlier pending reports for those flows. Owner then reported early logout. The frontend omitted offline_access, preventing it from requesting refresh credentials. Added that scope, kept automatic refresh, explicitly placed PKCE state in sessionStorage alongside the user session, and prevented renewal errors from discarding still-valid credentials. Backend expiry checks remain unchanged.

Validation: frontend/module typechecks and Vite production build passed. Final npm.cmd test completed successfully: 6 passed in 33.6 seconds, exit 0 (run outside the sandbox after the first run stalled during process cleanup). Checks include the new short-lived-token renewal check: same identity/workspace after original expiry, reload retained the renewed session, no OIDC localStorage entries, and a fresh browser context starts signed out. The token endpoint is mocked in this test; actual provider refresh issuance/rotation remains unverified. Public provider discovery was read successfully and advertises offline_access and refresh_token. A new real sign-in is needed to upgrade existing sessions.

## Questionnaire/design guidance — November 7, 2026

Owner confirmed login now works and authorized the next milestone. Implemented on the existing feature branch, preserving the uncommitted organization/authentication work:
- Private project guidance table, editor-only revision-checked save reducer, caller-scoped live view and regenerated bindings. Existing tables/data are preserved.
- Eight draft questionnaire/guidance fields, 700 ms autosave, saved/unsaved/saving/error states, read-only viewers and deterministic Markdown text preview.
- Conflict protection with latest-saved comparison and explicit draft discard. Rejected saves retain text; best-effort session drafts recover across reload/reconnection. Both output profiles remain unchanged.
- README commands, walkthrough, limits and decision/source records updated.

Validation run: backend compilation/binding generation and strict frontend/module typechecks plus production build passed. Full local SDK/Chromium suite: 7 passed in 34.4 seconds, exit 0. Guidance assertions cover editor save/live viewer reads, denied viewer/outsider writes, private table/scoped-view isolation, stale revisions, oversized/control-character rejection, grant-revocation retraction, browser autosave/live updates/reload, concurrent edit conflict without overwriting local text, rejected-save recovery after reload, viewer read-only UI, and server-restart persistence. Earlier organization/authentication/migration regression checks also passed. Tests use isolated locally signed identities and seeded OIDC sessions; they do not automate real provider login.

Limitations: all fields are draft text; generation readiness, compatible dependency selection, formal design-rule history/status, uploads, provider-key handling, code generation, runtime previews and exports are not implemented. Browser draft recovery requires available session storage; no offline queue, durable unsaved-work guarantee or automatic conflict merge. Next recommended milestone: settle the minimal Common inventory and one bounded generation/validation path, including AI credential and execution-isolation decisions, while retaining both required output stacks.

Local handoff: backend build and data-preserving local publication passed, adding project_guidance/visible_guidance to complix-local at 127.0.0.1:3000. Existing records were preserved. Frontend http://127.0.0.1:5173 returned HTTP 200. Final production rebuild and git diff --check passed (line-ending notices only). After adding endpoint/database to draft storage isolation, the focused guidance browser test passed again: 1 passed in 19.4 seconds, exit 0. No Maincloud update, dependency installation, commit or push in this increment.

## Guidance save failure follow-up — November 7, 2026

Owner reported rejected autosaves and no shared updates. Read local server logs without printing tokens or draft data: save_guidance returned the original Access denied message. Added safe specific diagnostics for session expiry, edit permissions, stale revisions and invalid answers instead of hiding every cause behind the same generic alert.

Fixed the renewal scheduler to use the earlier ID/access-token expiration, with transient retry and focus/visibility checks; disabled the library's separate access-token-only scheduler. Server credential expiry and project isolation checks remain intact. Updated the regression fixture so the ID token expires in five seconds but the access token in one hour, then checked renewed identity, post-expiry guidance save and delivery to a separate viewer subscription.

The frontend/module build passed and the revised module was published locally with no data deletion/schema change. Owner reloaded/retried and confirmed saving now works. The previous generic logs do not independently prove which guard rejected the user's request, so the precise original denial is not claimed as forensically established. Actual real-provider long-duration refresh remains outside the mocked-token-endpoint test.

Final regression result: npm.cmd test — 7 passed in 1.0 minute, exit 0. This includes saving after the shorter ID-token deadline and receiving that change through another authorized identity subscription. No commit, push or Maincloud deployment performed.

## Project-model clarification — November 7, 2026 (documentation only)

Owner clarified that projects can be private without an organization and can request any frameworks, languages or libraries. Multiple projects per user and sharing among organization members remain confirmed. Updated AGENTS.md, consolidated system plan v1.4, decisions and README so future work does not carry forward mandatory org ownership, one-project limits or a fixed-profile-only project model. Historical implementation decisions are preserved and explicitly superseded. Requested technology details remain distinct from verified generation capabilities; both required prototype output stacks remain required.

No application code/schema changed, migrated, published, committed or pushed for this request. Current code still enforces org-only projects, one per org and two output-profile choices. Next proposed milestone is the project-model/data-preserving migration before generation; detailed ownership/association/admin policies remain open in system-plan section 22. Validation: documentation consistency review and git diff --check; application tests are not needed/run for this documentation-only update.

## Private/shared multi-project milestone — November 7, 2026

Completed on feat/organization-access, preserving previous uncommitted work:
- Personally owned projects with no organization required, multiple projects per user/org, optional one-org sharing context and explicit viewer/editor grants. Organization admins have no automatic access to personal projects.
- Open requested framework/language/styling/library/version fields, optional presets, revision-checked edits, per-project guidance and stable project selection across live updates/reloads.
- Owner-controlled association/detachment, project-scoped grant UI, explicit initial-project invitation grants, leaving/removal cleanup and no restored grants on rejoin. Removed personal owners retain projects privately. Existing organization owners/admins retain management of historical organization-owned projects.
- Data-preserving schema upgrade removes only organizationId uniqueness and appends defaulted ownership/technology/revision fields. Existing IDs/grants/guidance and original legacy-token rows remain. Private import still requires proof of old-token possession.
- AGENTS, system plan v1.5, decisions and README updated with actual behavior, sources, commands and limits. No new dependencies.

Validation actually run:
- SpacetimeDB 2.14.1 compilation and generated bindings succeeded. Final strict frontend/module typechecks and Vite production build passed.
- Final npm.cmd test: 10 passed in 42.2 seconds, exit 0. The suite publishes original legacy and preceding org-only fixture modules, seeds records/grants/guidance, upgrades with --delete-data=never, then validates preserved IDs, organizational ownership, viewer access and guidance. Tests cover multiple projects in an existing org without expanding member visibility, arbitrary Angular/MUI requests, invalid/oversized and stale technology writes, private-project isolation from org admins, explicit sharing, viewer write denial, live retraction, leaving and rejoining without restored access, owner removal retaining projects privately, separate guidance, browser creation/switching/reload and zero browser errors in the new private-project flow. Earlier login/refresh/sign-out, connection failure, guidance conflict/recovery and restart checks remain passing.
- Earlier runs exposed a stale single-project ordering assertion and duplicate React sibling keys; fixed and reran. A later run was interrupted by development reload during the connection-retry test; the final unchanged-source run passed all checks.
- Local publication to 127.0.0.1:3000 / complix-local succeeded with --delete-data=never; CLI showed the expected constraint removal/defaulted columns/views and disconnected older clients for the changed view schema. Reload existing browser tabs.
- Attempted direct before/after record comparison through CLI SQL was denied by the verified-OIDC admission guard. Did not weaken authorization or read browser credentials to bypass it. Actual user-record counts were not independently compared; preservation is supported by the data-preserving publication and seeded upgrade acceptance test, not a claim of inspecting every real user's records.

Remaining limitations: generation/compatibility resolution, actual generated-code previews, exports, multiple-org sharing, ownership transfer/conversion and project deletion remain unimplemented. Requested technology details are text, not a validated dependency manifest. Technology edits require explicit save and are not persisted as offline drafts; copy unsaved edits before switching. Project authorization currently scans the small private project table inside caller views; scaling/index optimization is future work. Real-account multi-project acceptance is not automated by seeded sessions. No Maincloud update, paid resource, commit or push was performed.

Next recommended milestone: agree the minimal Common inventory, provider/key lifecycle and isolated build/preview approach, then implement versioned generation adapters for both required output profiles without restricting requested project technologies.

## Workspace tabs — November 7, 2026

Implemented on feat/workspace-tabs, preserving existing uncommitted work:
- Six task-focused tabs: Projects, Design guidance, Technologies, Sharing, Organization, Invitations.
- Active project/name/access stay above the tab panels; invitation counts surface pending items.
- shadcn/ui-style Radix Tabs component under src/components/ui/tabs.tsx, adapted to existing CSS. Added @radix-ui/react-tabs; no Tailwind pipeline or backend changes.
- Compact cards, two-column project creation/guidance on wider screens, wrapping mobile tabs and visible keyboard focus.
- Inactive panels remain mounted so switching tabs retains technology drafts and guidance autosave. Existing project-switch recovery limits still apply.
- Browser flows updated to navigate tabs; added assertions for a single visible panel, retained unsaved technology edits, arrow-key navigation and no horizontal page overflow at 390px.

Validation: strict frontend/module typechecks and production build passed. Vite emitted Radix use-client directive warnings. npm reported the host Node 24.21.0 is below the project's declared minimum 24.22.1; dependencies installed successfully with zero reported audit vulnerabilities. Initial test run reported all 10 cases passing but stalled in process cleanup; terminated only identified test processes and reran outside the sandbox. Final rerun result follows below. No commit, push or publication.

Final validation: npm.cmd test passed all 10 tests in 47.4 seconds, exit 0, including the new keyboard, hidden-panel, unsaved-draft and mobile-width assertions. A preceding rerun was interrupted by a frontend formatting reload during the connection-retry check; the final source-stable run passed that check. git diff --check passed (line-ending notices only). Formal accessibility audit and visual browser matrix were not performed.

## Workspace ownership/shared-space clarity - November 7, 2026

Implemented on feat/workspace-tabs, preserving existing work: ownership-first overview, owned versus shared project cards, per-project requested stack/private/space labels, selected-project context across tabs, and organization space cards listing accessible projects with direct navigation. Empty states explain that zero organizations is valid. Space counts explicitly cover only authorized projects; no backend/access changes or new dependencies.

Validation: frontend/module typechecks and production build passed, with the existing Radix use-client directive warnings. npm.cmd test: 11 passed in 47.9 seconds, exit 0. New browser acceptance uses separate owner/teammate identities, two organizations, two owned projects with different stacks and a viewer-shared project. It verifies ownership groups, stack labels, private/space status, multiple projects per space, private-project omission from space lists and direct project navigation. Existing tab keyboard/draft behavior, authentication, sharing and migration checks also pass. Reviewed fixture-only desktop project/space screenshots and a 390px mobile screenshot; mobile width assertion confirms no horizontal overflow. Formal accessibility audit/browser matrix remains unperformed. Screenshots stay in ignored .local and contain synthetic accounts only.

No backend publication, dependency installation, commit or push. Reload the running local frontend to try the revised layout.

## Reference intake preparation - November 7, 2026 (incomplete)

Preserved existing workspace changes on feat/workspace-tabs. Prepared shared filename/extension/UTF-8/readable-text/byte-limit validation rules and a storage-independent ProjectReferences upload/list/purpose/plain-text preview/removal component. The component is not mounted or connected to persistence; do not call uploads implemented.

A focused question is pending: inline private SpacetimeDB file storage (recommended, 128 KiB/file and 20 references/project) versus a separate local file service. This materially affects architecture, so persistence/schema work waits for that choice. Limits remain proposed until answered. Original bytes, permissions, durability, subscriptions and project isolation still need integration and end-to-end tests.

Frontend/module typechecks and production build passed, with existing Radix warnings. Validation helper tests exercised Unicode, filenames/path rejection, unsupported files, binary/control characters, malformed UTF-8, purpose validation and exact byte limits. Initial sandbox test run reported two passing cases but stalled in cleanup; rerun outside sandbox is recorded next. No dependency installation, backend publication, commit or push for this preparation.

Validation rerun completed: 2 passed in 7.9 seconds, exit 0. git diff --check passed. Reference intake remains incomplete pending the storage decision and persistence/permissions integration.

## Project reference intake completed - November 7, 2026

Owner explicitly approved small-file inline SpacetimeDB storage: 128 KiB/file, 20 references/project. This supersedes the pending preparation entry above. Implemented on feat/workspace-tabs while preserving existing workspace changes:
- New private project_reference table, editor-only upload/removal reducers and caller-scoped visible_references view. Original bytes, decoded UTF-8 text, filename, purpose, uploader and timestamp are saved atomically. Duplicate filenames (case-insensitive) are rejected per project; server validation enforces formats/encoding/size/count.
- References tab with purpose/file selection, reading/uploading/ready/error/empty feedback, plain-text preview, read-only viewers and explicit removal confirmation. Existing guidance/library content is unaffected. No uploaded code or HTML is executed/rendered.
- Shared validation rules, generated bindings, subscription lifecycle integration, documentation and setup/test commands. No new dependencies or separate service.

Evidence actually run:
- Backend build/binding generation and frontend/module strict typechecks plus production build passed. Existing Radix use-client directive warnings remain.
- Full regression suite: 15 passed in 56.2 seconds, exit 0. Includes all earlier auth/sharing/migration/UI checks and new helper/server/browser reference checks.
- Focused final reference suite: 2 passed in 22.4 seconds, exit 0, after adding exact 128 KiB upload and UI cross-project switching assertions. Tests verify original BOM/CRLF/Unicode bytes and text, malformed UTF-8/binary/control/path/extension/size/purpose rejection, duplicate preservation, concurrent 20-reference quota, delete freeing quota, viewer/outsider write denial, private backing-table denial/scoped read isolation, live reference updates/revocation, original/text persistence after server restart, viewer UI, reload, plain HTML/script text without execution, failure messages and removal cancel/confirm.
- Reviewed a fixture-only References screenshot under ignored .local. Preview text remains literal. Large previews are height-bounded and scrollable.
- Local publication to 127.0.0.1:3000/complix-local succeeded with --delete-data=never: only the project_reference table/view and new reducers added; existing data/schema preserved. No Maincloud update, paid resource, commit or push.

Limits: no PDF/image/archive/URL processing, AI interpretation/generation, external artifact storage or reference undo. Ready denotes synchronous readable-text decoding, not semantic extraction. Current subscription loads original/text for all authorized projects; per-project limits do not replace future pagination/lazy loading. Real-account upload acceptance and a formal accessibility/browser matrix remain manual; tests use signed/seeded local identities.

Handoff: reload http://127.0.0.1:5173, select a project and open References. Setup/start/test commands are in README. Next recommended milestone is bounded Nemotron generation using project technologies/guidance/references, after settling provider credentials and isolated validation/preview execution.

## Nemotron preparation and sandbox plan - November 7, 2026

Owner reported a successful real-account text reference upload. Owner then requested Nemotron work and selected complete build/preview sandbox planning before implementing the proposed local draft-only service.

Prepared independent bounded NVIDIA transport/context helpers; mocked checks passed: 3 tests in 2.9 seconds, exit 0. Checks cover request shape/credential placement, sanitized HTTP/network errors, incomplete/oversized/credential-bearing responses, safe usage, omission of reasoning, single-project context isolation, identity-metadata omission and context-size limits. No NVIDIA call, real key, service endpoint, job schema or generation UI was connected.

Created docs/generation-sandbox-plan.md with trust boundaries, full lifecycle, dependency/download policy, offline build containers, framework adapters, separate-origin browser preview authorization/CSP, artifacts/crash reconciliation, resources, acceptance/security probes and phased implementation. Proposals remain explicitly unapproved. Docker Desktop/Linux engine verified outside sandbox; host dotnet absent, but proposed container toolchain avoids a system install. No system changes, images pulled, containers launched, generated code executed, provider credits spent, backend publication, commit or push. Next step is review/adopt the sandbox approach and implement fixture-only isolation proof.

## Library and generation workflow with mocks - November 7, 2026

Owner authorized implementation and selected mocked providers, account setup later. Completed the first mock integration slice on feat/workspace-tabs, preserving existing work and sample files:
- Private generation jobs, scoped history/settings views, editor-only creation/advance/cancel/delete and immutable saved request/context. One active job per project, request replay protection, stale-context failure, 64 KiB context cap and 20-history limit. Current library pointers/promotion are deliberately absent; mock results are never validated/current.
- Library tab with request and selected references, visible simulated stages, success/generation/build-failure fixtures, resume/cancel, history, source/documentation/validation inspection and an interactive trusted HTML fixture preview. No arbitrary framework restriction in request intake. Existing working project content and earlier candidates are preserved on failure.
- NVIDIA transport/context helpers and an injected E2B-controller adapter with mocked tests. E2B contract requests private/offline execution, rejects candidate path escapes and cleans up failed builds; no real E2B SDK installed, provider calls made or generated code executed. Real E2B/Spacetime procedure orchestration and protected preview routing are not implemented.
- Local publisher explicitly enables mock mode; disabled/missing configuration rejects generation. No separate application server, key persistence or credential form. Browser-driven stages persist for manual resume after interruption; this is not a durable background worker.
- Plan/decisions/README revised to distinguish approved mock scope from earlier Docker/sandbox recommendations and future live work.

Validation actually run:
- Backend compilation and binding generation passed; final frontend/module typechecks and production build passed (existing Radix use-client warnings).
- Full source-stable regression: 22 passed in 43.7 seconds, exit 0. This included earlier auth/migration/reference/sharing tests, NVIDIA/E2B mocked contracts, queue/snapshot/idempotency/staleness/cancel/access guards, and Library browser flow.
- Additional final focused checks: 3 passed in 21.6 seconds, exit 0. Added actual server-restart preservation of job artifacts/history and rejection under disabled generation configuration. UI tests also exercise fixture interaction, failure preserving earlier results and parent-DOM/network isolation inside the opaque-origin CSP iframe. These prove the fixture boundary, not security of a live hosted sandbox.
- Local data-preserving publication to 127.0.0.1:3000/complix-local succeeded, adding generation_job/views/reducers. No existing tables deleted. git diff --check passed with line-ending notices only. Reviewed a synthetic-account Library screenshot in ignored .local.

Handoff: reload http://127.0.0.1:5173, choose a project, open Library, Queue mock generation then Run mock pipeline. Select Source/Documentation/Validation to inspect the fixture. No API key/account is required and no credits are spent. Setup and disable-mode commands are in README.

Remaining: real Nemotron generation, E2B provisioning/toolchains/readiness and authorization gateway, secure provider credentials, background orchestration/worker authority, actual builds/tests, artifact revision/promotion/undo/export and real-account acceptance. No current framework compatibility claims follow from the mock preview. Job context is retained until terminal job history is explicitly deleted; removing an original reference does not erase past snapshots. No live external deployment, system install, paid service, commit or push performed. Next recommended milestone is provider account configuration plus a narrowly budgeted live sandbox capability test, followed by authenticated orchestration and protected actual previews.

## Workspace layout update — November 7, 2026

Implemented the owner-confirmed workspace arrangement without adding backend capabilities:
- Sign-in lands on the project card grid. My projects and Shared projects are separate views; shared projects can be filtered by organization. Opening a project enters its Components workspace.
- The project navigation is a compact side rail on project pages. Components has a toggleable available-components list, a preview/source/documentation/validation area, and a chat panel. Current mock candidates remain clearly labeled as unverified. Chat is a non-submitting placeholder; no code changes are claimed.
- Project settings summarize requested technologies as read-only values and list saved references with a link to the existing reference-management view. Project renaming/sharing and existing project navigation remain available.
- Added docs/design-guide.md and recorded the owner-confirmed layout in decisions.md and the system plan. Existing unrelated dirty files and work were preserved.

Validation actually run:
- `npm run typecheck` passed; `npm run build` passed. Vite emitted existing Radix "use client" bundling notices.
- All 16 non-NVIDIA tests in `tests/foundation.spec.ts` passed, including project switching, ownership/sharing, settings read-only behavior, responsive overflow, references, and the mock library workflow. The separate disabled-generation settings test passed when run alone and in the final suite.
- The complete foundation suite did not fully pass: an existing NVIDIA procedure authorization test allowed a viewer call that was expected to reject; the following NVIDIA UI test was skipped. No generation backend changes were made for this layout task.
- `git diff --check` passed (Git emitted existing CRLF-to-LF notices). No commit, push or deployment performed.

Remaining: chat-to-generation integration, actual React/Blazor builds and previews, component promotion and live AI behavior are not implemented by this layout change. Refer to design-guide.md for the intended UI boundaries.


## NVIDIA key entry and draft procedure - November 7, 2026

Implemented masked per-request key/model fields in Components, subscription-driven NVIDIA job states, authorized immutable context capture, direct SpacetimeDB HTTP procedure, bounded manifest parsing and safe failures. Keys clear on submission and are not written by the app to tables/browser storage/logs. Draft files persist and are inspectable as source; generated code has no executable preview. Existing mock workflow and unrelated workspace layout changes were preserved.

Validation actually run:
- Frontend and module typechecks plus production build passed (existing Radix directive notices).
- Full regression: 26 passed in 50.2 seconds, exit 0. Includes procedure viewer/outsider denial, authorized draft storage, replay handling, sanitized 401 errors, absence of synthetic keys from authorized rows/server logs/browser storage, masked input clearing, subscription rendering/reload and no generated iframe; parser path/duplicate/size/truncation/escaped-secret rejection; prior auth/projects/references/mock/E2B contracts.
- The earlier apparent viewer authorization failure was a test matcher issue: procedure errors reject with strings rather than Error instances. String-aware assertions pass. A separate HTTP fixture attempt exposed the server's intentional loopback restriction. Final integration tests use an explicitly instrumented ignored module copy with mocked transport; production module has no fixture switch. No production NVIDIA transport or paid response is claimed tested.
- Production module publication to local 127.0.0.1:3000/complix-local passed with --delete-data=never. Model column appended with default, views replaced for new fields; no stored tables deleted. No Maincloud publication or provider quota used.

Owner acceptance remaining: enter a key in Components > Generation provider > NVIDIA Nemotron and submit a small Common Button request. Verify your account/model response; failures display sanitized diagnostics. E2B builds/previews, live generated-code validation, persistent credentials, worker recovery and promotion remain future work. Updated README contains exact local start/publish/test commands. No dependencies installed, commit or push performed.

Final review: guarded the empty-job Validation view; git diff --check passed with existing line-ending notices. The local backend was already running; a duplicate startup correctly refused its data lock. Frontend port 5173 is in use, so no existing process was stopped.

## Workspace navigation follow-up — November 7, 2026

Owner feedback explicitly rejected the previous tabbed layout. Workspace navigation now uses distinct paths for the project grid, components, settings, guidance, references, sharing, organizations, and invitations, and renders only the current page. Browser tests cover page navigation and history. Final validation: `npm run build` passed, the three focused Playwright tests for page routing, history, and component navigation passed, and `git diff --check` passed. A type mismatch encountered during earlier validation was resolved by concurrent generation-UI updates; provider behavior was not changed for this layout correction.

## Frontend visual guide implementation — November 7, 2026

Applied the owner-provided [frontend-design-guide.html](./frontend-design-guide.html): added semantic sage/forest-green light and forest-slate dark tokens, a persisted theme toggle, compact horizontal top-level/project navigation, `/projects/:id/components` as the canonical workspace path (with old project-root paths redirected), grouped read-only technology blocks, a saved-reference summary, and explicit Common/Compositions placeholders alongside clearly separate unverified candidates. Updated workspace documentation to identify the HTML guide as the visual authority.

Validation: `npm run build` passed. The full Playwright suite passed (28 tests). Focused integration coverage passed for project navigation and sharing, private project switching, light/dark theme persistence, grouped settings, responsive workspace layout, and reference management. `git diff --check` passed.


## Built-in chat correction - November 7, 2026

Owner clarified that ComPlix supplies chat and users never enter AI keys. Replaced the temporary user-key/provider/model form with connected project chat. Operator-only NVIDIA_API_KEY/NVIDIA_MODEL settings now come from protected SpacetimeDB environment configuration; the local publish helper reads ignored .local/backend.env. A blank operator template was created without reading or requesting a real credential. The generated client procedure signature contains no key/model parameters. AGENTS, README, system plan, decisions and sandbox plan record the correction; earlier key-entry work remains superseded history.

Chat saves member messages and sanitized replies in private authorized job records, supports discussion without files, carries bounded recent conversation/latest draft context, and displays optional code as escaped unverified source. Authorized collaborators receive shared updates; viewer/outsider sends are rejected. Private per-identity usage counters bound new requests to five/minute independently of deletable history. Mock tools remain under Developer mock workflow. No actual builds, generated executable previews, promotion or background worker are claimed.

Validation so far: module compilation/binding generation and frontend/module typechecks plus production build passed. Four focused browser/procedure checks passed in 26.4 seconds, covering existing mock behavior, operator credentials, permissions, conversational context, reloads and missing configuration. Local publication to complix-local passed with --delete-data=never, adding only a private usage table and updating the procedure; existing project/history data preserved. No Maincloud publication, real provider call, dependency install, commit or push.

Regression work exposed existing navigation assertions that still expected reload to return to the grid, or looked for personally owned guidance projects under Shared projects. Updated those tests to exercise the current project URLs/ownership views. Another active test process occupied the default frontend/backend ports; added optional test-only port/database overrides and reran on separate ports without stopping that process. README includes isolated-run commands.

Owner setup remaining: add the operator key privately to .local/backend.env and run npm.cmd run backend:publish, then reload the local app. Users need no provider setup. Live NVIDIA transport/account/model acceptance remains unverified; E2B and actual generated-code build/preview validation remain the next integration boundary.

Final regression: 28 passed in 1.1 minutes, exit 0, on isolated frontend 52373/backend 52300 and database complix-chat-final. All original auth/project/reference/guidance/migration checks passed alongside connected chat, discussion-only replies, persisted context, operator-key isolation, missing-config UI, access denial, safe provider failures, replay handling and rate-limit persistence after history deletion. Providers remained mocked. git diff --check passed with existing line-ending notices.

Operator configuration follow-up: owner supplied the key in the ignored backend file. Local data-preserving publication succeeded and supplied NVIDIA_API_KEY without displaying its value. No schema/data changes or NVIDIA calls. CLI readiness-view query was rejected by application admission (CLI identity is not a verified app session); signed-in browser readiness and live provider acceptance remain to be confirmed.

## Frontend guide fidelity follow-up — November 7, 2026

Adjusted the rendered project and component pages against the owner-provided HTML mockups:
- Project cards now keep the guide's three-column desktop grid instead of stretching a lone result across the page. The always-visible creation form is now opened from the Create project action, leaving the project cards in focus.
- Removed extra project-page headings from the Components route; its component list, inspection surface and chat are now the first content below project navigation. Added the guide's Button, Input, LoginForm, and FilterPanel as clearly labeled, non-persistent UI examples with source and sandboxed preview. Mock-generation controls remain available in a collapsed secondary section; examples are not presented as saved or published work.
- Removed sticky header behavior to match the guide's page layout and avoid full-page screenshot overlap. Responsive project cards and workspace columns remain covered.

Validation: `npm run build` passed. The full Playwright suite passed: 31 tests. The workspace browser test checks desktop/tablet/mobile card columns, component examples, preview/source controls, component-list toggle, and narrow-screen overflow. `git diff --check` passed.

## Create-action dialogs — November 7, 2026

Moved project, organization, and invitation creation into accessible native modal dialogs. Dialogs support Escape, backdrop and explicit close/cancel actions; save failures remain visible in the open dialog, and successful submissions close it. Existing authorization and submission logic are unchanged. Updated browser coverage for dialog opening, Escape dismissal, and successful creation flows.

Validation: `npm run build` passed. The full Playwright suite passed: 31 tests, including browser coverage for project, organization, and invitation creation dialogs plus Escape dismissal. `git diff --check` passed.


## Slow/stuck chat recovery - November 7, 2026

Owner reported Thinking at 374 seconds. Added private durable 90-second job deadlines and authorized stale-job cleanup during reconnect/new work so interrupted requests cannot remain active indefinitely while the server is running. Preserved saved projects/candidates and ignored late results. Added elapsed wait text, accessible Cancel reply, overdue guidance, client confirmation timeout and guards against cancelled old calls altering new sending state. Disabled extra reasoning for interactive requests; retained full-response mode and existing limits. Root cause of the specific live interruption and actual provider latency remain unverified. No additional live NVIDIA call was made.

Validation: backend compilation/binding generation and final frontend/module typechecks/production build passed. Five focused integration/browser tests passed in 34.1 seconds with mocked transport and synthetic keys, covering operator-key access, persisted chat, missing configuration, elapsed feedback/cancel/retry, and actual scheduled expiry with all clients disconnected. Existing UI changes were preserved; corrected a missing parenthesis encountered during concurrent frontend edits. Used isolated local ports 52573/52500 to avoid other test processes. Full regression was not repeated for this increment.

## Organization workspaces and project invitations — November 7, 2026

Implemented on the existing `feat/stack-adapters` worktree without discarding its unrelated changes. `/organizations` remains a card directory; organization cards open URL-backed Overview, Projects, Members & invitations, and Settings pages under `/organizations/:id`. Organization Projects only lists caller-visible projects and opens the standard project route. Owners/admins can rename organizations; member management retains its existing owner/admin boundaries.

Added a project-sharing invitation modal with project-only, organization-only, and organization-plus-project modes where the inviter has organization invitation authority. Project-only invitations match verified email and create only explicit project grants; they do not add membership. Grant views and management now include named project-only collaborators. Leaving/removing organization members continues to remove their grants from its projects and invalidates associated project-only invitations when the project is detached/reassigned. Online collaborator activity remains future work.

Validation: binding generation and strict frontend/module typechecks passed; `npm run build` passed before the final roster-visibility adjustment. Focused database/browser integration tests passed, including project-only invitation acceptance without organization membership, owner/admin-only organization rename, card-to-organization routes, normal project navigation, and project-only plus organization-and-project invitation modal choices. A full 36-test run passed before the final invitation-mode test assertions were added. On the final expanded run, 29 tests passed before an unrelated clock-driven multi-file editor test failed because Playwright could not fast-forward its clock; an isolated retry then timed out during the suite's 45-second backend setup hook. The expanded organization browser test passed with its longer timeout before the final roster-visibility assertion. The latest build and binding-generation attempts are now blocked by parser errors in the pre-existing untracked `shared/componentChat.ts` (line 58); that unrelated file was left untouched. Full-suite status is not green for the final worktree. `git diff --check` passed. No backend publication, commit, or push.

Local data-preserving publication succeeded, adding generation_deadline/private scheduled expire_generation. Existing data and operator configuration preserved. No Maincloud publication, commit or push. Reload the signed-in app to expire the earlier stale request, then send a fresh message explicitly.


## Follow-up chat error visibility - November 7, 2026

Owner reported a generic rejection on a follow-up. Found that ProjectLibrary deliberately replaced every procedure rejection with the same generic chat error, hiding its safe workspace diagnostic. Changed error handling to return/throw the same allowlisted message in chat; arbitrary backend text is still hidden to avoid credential/provider-detail disclosure. Existing known session, access, rate, context and timeout errors are now actionable. The actual live follow-up rejection cause remains unconfirmed pending the owner's exact new diagnostic. No backend/provider request was made for diagnosis.

Validation: frontend/module typechecks and production build passed. Three focused mocked browser/integration tests passed in 40.8 seconds, including successful persisted follow-up context, slow-reply cancel/recovery, and a rejected sixth message showing the precise safe rate error while preserving unsent text and not creating another job. git diff --check passed with existing line-ending notices. No full regression rerun, local backend publication, live NVIDIA call, commit or push for this frontend-only correction.


## Stack-independent workspace - November 7, 2026

Added shared/stackAdapters.ts with neutral files/revisions, registry, React and Blazor definitions, generation instructions, runtime delegation, gated preview startup/refresh/cleanup and draft export preparation. NVIDIA prompts select instructions from snapshot technologies. Workspace shows adapter/unsupported status and Code/Docs/Preview with multi-file selectors; StackPreview implements isolated HTTPS iframe lifecycle. Build including frontend/module typechecks passed; four adapter/E2B contract tests passed. git diff --check passed. Full browser regression not run; Source assertions updated to Code. Actual toolchains/runtime controllers, protected preview gateway, direct file editing/autosave and validated export/promotion remain unconnected. No live builds, backend publication, paid calls, commit or push. Existing dirty work preserved on feat/stack-adapters.


## Editable draft workspace - November 7, 2026

Implemented the first editor/chat increment: stack-neutral multi-file text editing and 500 ms autosave to a private component_draft table, authorized subscription view and revision-checked save reducer. Provider job artifacts remain immutable. Code/Docs inspect the same draft files. Follow-up chat flushes the selected draft, snapshots its revision/files, and rejects completion when that source changed or was deleted. Failed generation leaves existing edits intact. Viewers and mock fixtures remain read-only.

Client handles saving/errors/retry, remote edits while clean, conflicts preserving local text, explicit discard/load, bounded save confirmation, navigation/sign-out flush and browser-close warning. Draft deletion in another session retains the open local text. The current unit of editing is a candidate file set, not yet a stable individually tracked component. Gemini orchestration, real builds/previews, promotion/recovery and export downloads remain unimplemented. Existing direct Nemotron chat remains accurately labeled.

Validation: final frontend/module typechecks and production build passed; backend compilation and client binding generation passed. Seven focused integration/browser checks passed, followed by the complete 36-test regression on isolated frontend 52673/backend 52600 (complix-draft-complete). Coverage includes multi-file autosave/reload, live Docs, selected-source context, save-before-send, clean remote updates, conflict/text preservation and navigation blocking, access/revision/credential/path guards, failed/stale generation preserving edits, plus existing authentication, migration, references, mock preview and chat recovery. git diff --check passed. Interim runs encountered mismatched bindings during concurrent sharing changes, isolated-server startup/publication failures, and blocked Google Fonts requests; the functional navigation test now stubs only that external stylesheet and retains browser-error assertions. Final full regression passed. Test Vite processes needed explicit teardown; only verified test PIDs were stopped, leaving app servers untouched. All provider calls use mocked transport/synthetic operator credentials. No application backend publication, paid calls, dependency installs, commit or push. Updated README/design guide/decisions. Existing unrelated navigation/sharing work preserved. Official SDK references consulted: https://spacetimedb.com/docs/functions/procedures/ and https://spacetimedb.com/docs/clients/typescript/ .


## Gemini coordinator increment - November 7, 2026

Added shared/componentChat.ts for bounded Gemini REST discussion/tool routing, one Nemotron generation call and final summary. Preserves thought signatures in memory, omits private reasoning from replies, rejects unsafe tool operations and credential echoes, gates generation on registered stack support, and rechecks authorization/cancellation/source state between stages. generateProjectChat replaces the direct NVIDIA procedure; historical jobs remain available. Existing draft autosave/conflict checks and project isolation remain. UI uses coordinated readiness/stages, while credentials/models stay in protected backend configuration.

Owner selected Flash for development. Added blank Gemini configuration entries to ignored .local/backend.env without changing existing settings, and extended the publisher's explicit backend environment allowlist. No real provider request, application publication, dependency installation, commit or push. Gemini account/model availability and real network transport remain unverified. Final combined validation is recorded in the acceptance follow-up below.

## Organization invitation hardening and validation follow-up — November 7, 2026

Combined organization/project invitations now upgrade an existing project-only grant rather than failing on its duplicate key. Project-only collaborators retain access without membership, and leaving/removal revokes those grants. Tightened invitation visibility so project managers see project-only invitations, not organization invitations they cannot revoke; organization-only invitations discard an irrelevant project ID. The UI only offers revoke controls to actors authorized by the corresponding backend reducer.

Removed the remote Google Fonts CSS import so stylesheet loading does not depend on network access; the visual guide now specifies local Inter/JetBrains Mono with system fallbacks. The organization browser test waits for document commit and then the actual navigation controls, tolerating Vite's cold-start reload.

Validation: `npm run backend:generate`, `npm run build`, `git diff --check`, and the focused organization database/browser tests passed. The focused run covered the duplicate-grant upgrade/removal, hidden invitation visibility, and organization workspace flows (2 tests passed). The full 40-test run was attempted twice: one run exposed and led to correction of a stale `chatEnabled` expectation; a subsequent run passed 37 tests but failed the slow-chat test on its stale pre-coordinator status text, which was updated. A targeted retry then timed out in `beforeAll` because the SpacetimeDB CLI reported `tsc not found in node_modules`. The complete suite is therefore not confirmed green. No backend publication, provider call, commit or push.

## Project chat visual refresh — November 7, 2026

Updated the chat pane with left/right speaker bubbles using existing theme tokens, a concise project-chat introduction and quiet empty state, an independently scrolling transcript, and a bottom-anchored composer that grows as text is entered. Kept connection details, unavailable/read-only states, waiting/cancellation feedback, errors, and unverified-draft wording. Added browser assertions for the empty state and both message styles. Updated the design guide with the selected presentation.

Validation: `npm run build` passed, including frontend/module TypeScript checks and the Vite production build; `git diff --check` passed. The focused browser test could not complete: on the first attempt the workspace connection timed out before chat rendered; a retry failed in the SpacetimeDB `beforeAll` setup with `Connection denied`. The default and previously used frontend ports were already occupied, so isolated alternate ports were used. Browser rendering and the full suite remain unverified.


## Gemini and chat acceptance follow-up - November 7, 2026

Completed validation of the combined coordinator, editor and refreshed chat UI. Updated the remaining mock-workflow assertion to locate the new connection badge instead of the removed status element. Preserved the other workspace changes and existing commit.

## Chat history layout adjustment — November 8, 2026

Increased the workspace chat pane's viewport-relative height, bounded reference selection to a compact scroll area, reduced context-text space, and made conversation history use the remaining height as its independent scrolling region. Styled the component scope line and clear-chat button compactly and added a browser assertion for minimum transcript visibility.

Validation: `npm.cmd run build` passed (frontend/module typechecks and Vite production build; existing bundle-size warning remains). The targeted `workspace explains personal ownership, per-project stacks and multiple organization spaces` Playwright test passed with isolated ports 54371/54300 and database `complix-chat-layout`. It includes a desktop assertion that the conversation area exceeds 280 px; the generated screenshot showed the history filling most of the pane. `git diff --check` passed.

Actually run: backend compilation, strict frontend/module typechecks and production frontend build passed. Final complete Playwright regression passed: 40 tests, exit 0, using isolated frontend 52773/backend 52700 and database complix-chat-final. Covers discussion without generation, one-tool Gemini-to-Nemotron routing/signature round trip, unsafe tools/credential echoes/provider failures, selected manual edits/autosave/conflicts, project permissions and migration, chat bubbles/empty state, missing Gemini configuration without a direct-NVIDIA fallback, cancellation/deadlines and prior mock preview/reference behavior. git diff --check passed. This supersedes the earlier unverified combined-suite/chat-rendering statuses above.

All providers remained mocked with synthetic credentials. No paid call, application backend publication, dependency installation, commit or push was performed by this agent. Only verified test Vite processes were terminated for teardown; application servers were preserved. To activate the source changes locally, configure GEMINI_API_KEY privately in .local/backend.env (Flash model defaults are prepared), run npm.cmd run backend:publish and reload. Live account/model/transport acceptance and actual generated-code build/previews remain unverified.


## E2B account readiness - November 7, 2026

Owner added E2B_API_KEY to the ignored backend environment file. Verified its presence without displaying its value, then successfully authenticated a read-only GET /v2/templates request against the official E2B API. Account returned zero custom templates and no further page. The ignored .local/e2b-account-check.mjs helper prints only authentication/status/count metadata. Initial sandboxed network request failed; the same read-only check succeeded with network escalation.

No sandbox/template was created, no generated code executed, no application publication or dependency install performed, and no runtime/preview support is claimed. Existing mock E2B controller and stack interfaces still need real SDK/toolchain templates and protected preview integration. Next increment: prepare React and Blazor toolchain/runtime fixtures, then validate a bounded sandbox lifecycle and authorized iframe delivery. Live provisioning budget and the proposed Blazor preview render mode remain to be settled before relying on them.
## Real E2B adapter previews — November 8, 2026

Implemented pinned React and Blazor template builders, the real E2B 2.63.0 SDK lifecycle, private offline non-root builds, bounded artifact copying and cleanup. Added a loopback preview controller that authorizes against SpacetimeDB HTTP views, reads saved source, rejects arbitrary browser files/commands and rechecks revisions/access. Per-artifact host/port/capability gateways serve static output with CSP, short leases and asset access checks. The common workspace now supports explicit Build/Rebuild, cancellation, versions and previous-preview retention after failed builds. Updated adapter generation entry instructions. Added the e2b dependency/lockfile and operator scripts; preserved unrelated chat/style changes.

Owner-approved live work: provisioned both templates (React rebuilt once for Vite/CSS type corrections). Actual trusted fixtures for both stacks compiled in disposable E2B sandboxes, rendered and responded to clicks in Chromium, denied parent DOM access, passed non-root/no-provider-environment and blocked external HTTPS probes, and cleaned up sandboxes. Evidence/screenshots are ignored under .local; these are fixture checks, not claims that arbitrary generated components pass. No live Gemini/NVIDIA call, app backend publication, commit or push.

Validation: all 44 Playwright tests passed, followed by 3 passing focused preview tests covering the actual StackPreview UI/runtime, explicit execution and failed-rebuild retention. Frontend and module strict typechecks and production frontend build passed; build reports its 500 kB chunk warning. Initial HTTP schema parsing and synthetic-response Chromium local-network test failures were corrected and retested. Windows Vite teardown hung after tests; earlier run-specific servers were stopped, but automatic approval review failed with Bad Request for final test Vite PID 48088, leaving its teardown unresolved.

Activation and remaining scope: see [preview-runtime.md](./preview-runtime.md). Run the local controller, configure the public frontend controller URL, restart Vite, and publish updated backend source through the normal operator workflow when ready. No app deployment or persistent preview service was started. Hosted routing, authoritative full validation/promotion, synchronized exports and recovery remain outstanding. Preview success alone does not promote a draft. This supersedes the earlier account-readiness note's unprovisioned status.

## Gemini live failure diagnosis ? November 8, 2026

Owner reported "Gemini could not complete the request." Configured key/model metadata lookup succeeded (HTTP 200, gemini-3.8-flash supports generateContent). One minimal Flash generation probe with no project data, capped at 32 output tokens, returned HTTP 402 / RESOURCE_EXHAUSTED and no candidate. This indicates provider billing/credit exhaustion; account billing itself was not inspected. No Nemotron request or automatic retry occurred. Secrets and raw provider errors were not printed or persisted.

Added fixed safe messages for Gemini 402 billing, 404 unavailable model and 500/503/504 temporary outages, including the backend diagnostic allowlist. Five coordinator tests passed, including no-retry/no-credential-leak status cases; frontend/module typechecks and git diff --check passed. No backend publication performed; operator must resolve API project billing/limits and publish source for the improved message. Existing generic error hid the HTTP 402 category; this was separate from the earlier tool approval failure.


## Component-scoped chat and explorer - November 8, 2026

Implemented on feat/component-scoped-chat while preserving the pre-existing dirty working tree: private stable component records and authorized views; componentId linkage on job/draft records with default 0 for legacy data; independent message transcripts; component-local conversation/source context and Common contract retrieval for compositions. Native create/clear dialogs, categorized persisted file tree, selected URL/history/reload, component heading and transcript empty state are connected. Existing 500 ms revision-checked draft autosave and isolated preview pipeline are reused. Creation seeds documentation plus minimal source for matching React/Blazor adapters; unknown stacks get documentation only. Optional initial prompt starts after successful creation. Clear cancels an active scoped request and deletes message rows without touching drafts/jobs/identity counters.

Validation so far: focused backend and Chromium explorer tests passed, frontend/module strict typechecks, production frontend build, backend module compilation and git diff --check passed. Full regression passed: 48 Playwright tests, exit 0, isolated frontend 54573/backend 54500 and database complix-components-complete. Earlier regression failures were outdated assertions for the added starter job/message representation; these were corrected. Vite retains its existing >500 kB bundle warning. All provider transport is mocked with synthetic credentials; no live AI/E2B calls, application database publication, commit or push. Test-only databases use isolated ports and data directories.

Compatibility/limits: existing project-level jobs remain componentId=0 and inspectable, with legacy chat compatibility; they are not silently assigned to new components. The original authenticated generateProjectChat procedure now accepts componentId rather than introducing a duplicate provider flow. Initial component creation and optional provider submission are separate operations: failed provider work leaves the component available. The existing one-active-job/project, 20-job history and 64 KiB context caps remain. Clear resets chat memory; immutable job snapshots/history are retained and can still contain historical text. Actual live provider acceptance, migration of populated pre-component generation records in the operator database, and new-component build/runtime acceptance remain unverified. No promotion/export capability is claimed.

Final review reserved starter request IDs outside the client request-ID alphabet to prevent collisions. Backend build and strict frontend/module typechecks passed again; all three focused component checks passed after that change (exit 0, frontend 54673/backend 54600). Run-specific Vite processes were stopped after test completion to finish Windows teardown; application servers were preserved.


## Chat expiry and hidden provider failures - November 8, 2026

Owner clarified that session expiry is returned as a chat response while still signed in. Found per-checkpoint expiry validation of the original procedure JWT despite browser token renewal, and a 60-second renewal lead shorter than the 90-second chat deadline. Kept public entry authentication intact, switched accepted-job continuation to current identity/project/source/deadline checks, advanced browser renewal to 120 seconds and preserved the workspace during silent renewal. Gemini/NVIDIA transport failures now carry fixed provider-specific messages; known NVIDIA output/truncation/size errors survive the diagnostic allowlist.

Added synthetic transport secrecy/no-retry coverage and a delayed provider fixture crossing the application credential-expiry boundary, then checking that accepted work succeeds, new expired-session calls fail, and truncated drafts produce a specific diagnostic. The instrumented module uses a signed fixture_exp claim because the local development server normalizes its own JWT expiration; production source has no such claim override. Test delay uses bounded read transactions because procedure sleep is unavailable in the installed runtime. Production frontend build, frontend/module strict typechecks, backend compilation and git diff --check passed (existing >500 kB bundle warning). An isolated filtered renewal test failed because it depends on the earlier shared-project test; rerunning the complete serial suite provides its required setup. Regression result: 49 existing/provider tests passed in the complete 50-test run; its initial new expiry fixture failed due to runtime sleep/normalized development-token behavior. After correcting that fixture, the focused expiry test passed (exit 0, frontend 55373/backend 55300, database complix-expiry-claims). No application code changed between those checks. Run-specific Vite processes were stopped after tests to finish Windows teardown. No operator secret read, live provider call, application backend publication, commit or push.


## Remaining session-expiry follow-up - November 8, 2026

Read-only local log summary found two expiry failures at create_component, not generate_project_chat. No log bodies, tokens, keys or project content were printed. Verified the running Vite frontend already served the preceding renewal changes, then replaced profile.exp scheduling with a raw ID-token expiry helper. Added malformed-token/earliest-expiry checks and a Chromium reproduction with a short-lived ID token plus a stale long-lived stored profile; renewal now happens and replaces the stored ID token. Extended the reproduction to create a persisted component after renewal. The prior in-flight fix remains independently tested but did not explain the live creation failures.

Frontend/module typechecks and production build passed (existing bundle-size warning). Both focused scheduling/browser tests passed, including persisted component creation after renewal (exit 0, frontend 55573/backend 55500, database complix-raw-expiry-component). Typechecks and git diff --check passed again; running Vite on port 5173 was verified to serve the new helper. No application backend publication or paid provider request, no credentials read/displayed, no commit/push. Exact live browser token/profile timings remain unobserved; the reproduced scheduling gap is verified without claiming access to the user browser session.


## Gemini delegation and incomplete generation - November 8, 2026

Owner requested fixing Gemini's coordination rather than asking end users to prompt Nemotron differently. Replaced whole-draft output delegation with a bounded Gemini file-change plan, server-validated scope and changed-file merging that preserves existing source/docs/examples. Gemini now receives a structured tool failure for truncated/incomplete output and explains it without partial files, prompting the user to rewrite Nemotron instructions, or automatically retrying generation. Existing provider budgets, authorization/revision checks and unverified status remain.

Added tests for Gemini planning/budget context, preservation of untouched/manual files, incomplete length/filter responses returned to Gemini with opaque signatures intact, no extra Nemotron call, unsafe/oversized/dependency-edit plans, and missing/unplanned output rejection. All 11 focused coordinator tests passed, including merged-draft limit preservation. Frontend/module strict typechecks, frontend production build and backend compilation passed; existing frontend chunk-size warning remains. Full regression passed: 58 Playwright tests, exit 0, database complix-coordinator-checked. Corrected selection of changed source after merging preserved files. Regenerated bindings after the concurrent automatic-reference-context API update; retained those edits. Initial regressions exposed the source-selection issue and stale reference-ID bindings, which were corrected. Initial frontend port 55673 was denied by Windows; the final isolated run uses frontend 52473/backend 52400. Run-specific Vite was stopped after test completion to finish Windows teardown; application servers were preserved. All provider transport uses synthetic fixtures; no paid call, operator credential read, application publication, commit or push.

## Automatic project-reference chat context - November 8, 2026

Implemented the owner-approved behavior: every saved reference for the authorized project is included in each Gemini snapshot and the same snapshot is passed to Nemotron when code changes are requested. Removed per-message reference selection and client-supplied reference IDs; the chat shows a compact automatic-inclusion count. Requests whose complete snapshot exceeds 64 KiB are rejected before creating a job, without truncating or omitting references. Four focused Playwright tests passed, including provider context, cross-project isolation, chat status, and oversized-context rejection. `npm.cmd run build` passed both TypeScript checks and the production build; Vite reported the existing >500 kB chunk warning. `git diff --check` passed. No provider credentials or paid API calls were used.


## Live chat API mismatch diagnosis - November 8, 2026

Read-only CLI describe of the running local complix-local generate_project_chat procedure confirms it still requires reference_ids. Current source and generated frontend bindings have removed that argument for automatic project-reference context. Safe log categorization found two generate_project_chat argument-decoding failures, distinct from the two earlier create_component expiry failures. This explains the frontend generic confirmation error before AI execution; it is not evidence of denied project access or provider failure.

The prepared source passed the preceding 58-test regression and builds. No source fix or provider retry is needed for this mismatch; local backend publication must align the deployed API with the frontend using the established data-preserving --delete-data=never command. Publication has not been performed because AGENTS.md prohibits deployment unless requested. Operator secrets, request bodies and raw provider errors were not displayed; no paid call, commit or push.


## Local backend aligned with automatic reference context - November 8, 2026

Owner authorized fixing the live mismatch using the new implementation. Ran npm.cmd run backend:publish against local complix-local with --delete-data=never; compilation and publication succeeded with no schema migration listed. Read-only describe confirms generate_project_chat now accepts exactly project_id, request_id, request, source_job_id, expected_draft_revision and component_id, matching the current generated frontend API; reference_ids is no longer required. Stored project references remain SpacetimeDB data and are read into each authorized chat context by the published code. No live provider request, separate reference upload, commit or push. Existing browser connections may need a page reload after publication.


## Remove the lifetime chat-history blocker - November 8, 2026

The 20-job project cap counted component starters and real discussion/generation turns, preventing further chat even after clearing transcripts. Restricted it to the developer mock workflow and count only mock rows. Existing history and draft checkpoints are retained; real chat continues without lifetime history slots. The persistent five-request/minute counter and active-job guard remain unchanged. Added coverage for 20 starter drafts, live discussion beyond that point, 20 terminal mock jobs, rejection of the 21st mock, continued live chat after the mock cap, unchanged drafts/history and rate limiting after transcript clear. Builds and frontend/module typechecks passed; both focused backend tests passed (exit 0, frontend 52373/backend 52300, database complix-chat-history), and git diff --check passed. Published the correction to local complix-local with --delete-data=never; build/publication succeeded with no schema migration listed. Run-specific test Vite was stopped for Windows teardown; application servers were preserved. No live provider call or history deletion.


## Sandbox-hosted previews - November 8, 2026

The preview did not work because the frontend only connected when `VITE_PREVIEW_CONTROLLER_URL` and a separate `npm run preview:start` Node controller were configured; neither was. The owner then added a constraint: ComPlix runs only SpacetimeDB and the frontend server. The new design follows it. A SpacetimeDB procedure (`build_component_preview`) authorizes the editor and the saved revision, then pushes draft files into an E2B sandbox. A preview agent baked into each template builds in the background and serves the result on the sandbox origin under a random capability path. The frontend rebuilds automatically about 1 s after each confirmed save, shows a loading overlay over the last good render, reloads the iframe when the new revision is built, and shows build logs on failure. Sandboxes are reused across saves with a 10-minute idle timeout.

Changes:
- **Added:** `generation/templates/agent.py`, `shared/sandboxPreview.ts`, a private `component_preview` table, the `visible_component_previews` view and the procedure.
- **Rewritten:** `StackPreview.tsx`.
- **Updated:** `build.py` now uses a persistent build directory for incremental Blazor builds. The publish script passes `E2B_API_KEY`, `PREVIEW_APP_ORIGIN` and the agent template IDs.
- **Removed:** the loopback controller, gateway, address and authorization modules, `previewRuntime.ts`, the harness fixture and the controller test.
- **Provisioned (paid, owner-directed E2B use):** React and Blazor agent templates (`agentTemplateId` in `.local/e2b-templates.json`). Earlier template IDs are retained.

Validation actually run:
- **Builds:** frontend/module strict typechecks and the production build passed (existing >500 kB chunk warning). The backend module compiled and bindings were regenerated.
- **Full Playwright regression:** 63 passed and 2 skipped (the opt-in live specs), exit 0, on frontend 52973 / backend 52900 / database complix-sandbox-preview. An earlier run failed one chat test that asserted the old "not connected" text; it now asserts that the auto-build is rejected as unconfigured, before any provider call, in the test module.
- **New unit and agent tests:** the E2B call sequence with mocked transport covers offline create, public ingress, claim, reuse with timeout extension, replacement of dead sandboxes, fixed error messages and no API key sent to the sandbox. The real Python agent was tested against a stub build: single claim, write-key authorization, path rejection, loading page then self-reload, failed rebuild keeping the previous output, latest-revision-wins and CSP `frame-ancestors`.
- **Live E2B (`npm run preview:verify`):** both stacks built, rendered, responded to clicks, rebuilt in place on a new revision and were isolated from the parent frame. Timings: React 12 s first build / 3 s rebuild; Blazor 41 s / 14 s. A separate probe confirmed uid 1500 (non-root), no provider environment variables, and blocked outbound HTTPS. Discovered that offline sandboxes require E2B's traffic-token header for inbound requests unless `network.allowPublicTraffic: true` is set; that flag is now set explicitly.

Not done:
- **Local publication:** the module has not been published to `complix-local`, so the running app still has the old API. Run `npm.cmd run backend:publish` (data-preserving), then reload.
- **Real-account acceptance:** an end-to-end check through the signed-in UI with a real generated component is still pending.
- **Remaining scope:** hosted routing, validation/promotion and exports remain open.
- **Defaults chosen without owner answers:** secret-link access, offline-only dependencies and a 10-minute idle timeout (recorded in decisions.md).
- **Old runtime code:** `generation/e2bRuntime.mjs` is retained only for template-log sanitizing and its legacy contract test.

No commit or push for this increment.

## Preview follow-up: stack matching and session renewal - November 8, 2026

The owner published and hit two procedure rejections, both before any E2B call (server log):
- "Unsupported target stack": strict four-field adapter matching rejected the project. Matching now uses framework and language only (see decisions.md), and the error now says what is supported.
- "Your session expired": the preview treated this as final. It now waits for the workspace to reconnect with the renewed sign-in token and retries automatically. Other failures are still shown and not retried. The precise live token timing remains unobserved.

Validation: typecheck and backend build passed. Focused tests passed (9): the new matching cases (React 19/TS 5 with extra libraries, framework-only "React + TypeScript", Blazor WebAssembly with extra libraries, React Native and JavaScript rejected) and two browser tests mounting the real StackPreview with a scripted connection. The second test confirms there is no retry on the stale connection, a retry on the renewed one, and no automatic retry for ordinary errors. The harness tests use a 180 s timeout because the first Vite compile on Windows exceeded 45 s. The full regression was not rerun after this follow-up. The local backend must be republished for the matching change to apply.

Follow-up (same day): after republishing, the owner's project was still rejected. Cause: older projects store their stack only in `outputStack`, with blank framework/language fields. The project view and chat apply `presetDetails` as a fallback, so the browser saw a supported stack. The preview procedure read the raw blank fields. The procedure now applies the same fallback, and an unsupported-stack error reports the framework and language it read. Backend build and module typecheck passed. There is no automated test for a legacy project in the preview procedure yet. Requires republishing.

## Preview without a hand-written entry - November 8, 2026

Owner request: render the component's own saved file instead of requiring `examples/Preview.tsx` / `Examples/Preview.razor`. If the draft has no such entry, the procedure now generates a host entry for the build only; it is never saved to the draft. A hand-written entry is still preferred when present.
- **React:** the entry uses `import.meta.glob` over the draft's `.tsx` files, ranks the file named after the component (then Common), and picks the export matching the component name, else the default export, else the first capitalized component export. It renders that export with no props inside an error boundary.
- **Blazor:** the entry reflects over the compiled assembly for the component type by name (then Common, then any), excluding host types. It renders that type with `DynamicComponent` inside an `ErrorBoundary`.

Validation: typecheck and backend build passed. Unit cases cover a hand-written entry passing through, the generated React/Blazor entry, name sanitizing, and the missing-file error. The live E2B check passed for both stacks, with component-only drafts building, rendering and clicking (React 17 s, Blazor 49 s). Limits: components that need props render with none, and a thrown error is shown inside the preview. Requires republishing.

Follow-up: a live dropdown crashed with "Cannot read properties of undefined (reading 'filter')". The generated entry rendered the bare component without props and ignored the draft's own nested `Common/dropdown/examples/Preview.tsx`, because only a top-level examples folder was considered. Example/demo/preview files at any depth now outrank the bare component in both the React glob ranking and the Blazor reflection order. Error text names the file and suggests adding an example when props are missing, and the literal `\n` is fixed. A nested Blazor `Preview.razor` that already declares `ComPlixPreview.Library.Examples` is used directly, avoiding a duplicate-type clash. Live E2B check passed for both stacks with a prop-requiring component plus a nested example (React 20 s, Blazor 47 s); backend build and the unit tests passed. Requires republishing.

## Local database reset - November 8, 2026

Owner requested clearing the local database and all projects before starting the project-initiation phase. Deleted `complix-local` on the local standalone server and republished the current working-tree module with `npm.cmd run backend:publish`; the CLI reported a newly created database. All projects, components, drafts, chats, references, guidance, organizations, memberships and invitations are gone; user profiles re-register on next sign-in. This also deployed the pending sandbox-preview module changes listed above. A best-effort copy of the previous data directory is at `.local/data-backup-2026-11-08` (live lock files could not be copied, so restore is not guaranteed). Row counts could not be confirmed by CLI SQL because the tables are private (403). Browsers need a reload and fresh sign-in.


## Shared frontend component extraction - November 8, 2026

On `refactor/shared-frontend-components`, extracted Button, Badge and ChatMessage into `src/components`, moved the existing Modal and ProjectCard there, and updated frontend callers. Native DOM elements, CSS classes, form submit defaults, refs and feature handlers are preserved; raw HTML preview fixtures remain native HTML. Added component usage notes in `src/components/README.md` and recorded the scope in decisions.md. Existing unrelated working-tree changes were preserved; no commit, publication or provider call.

Validation: four focused foundation browser tests passed (project creation/switching, workspace ownership/navigation, project chat, component explorer and transcript clearing), exit 0, isolated frontend 53173/backend 53100/database complix-shared-components. Vite production bundling passed with the existing >500 kB chunk warning. `npm.cmd run build` and a separate frontend typecheck are blocked by the unrelated in-progress `src/pdfText.ts:11` error: `isEvalSupported` is absent from `DocumentInitParameters`; that file was not changed for this extraction. `git diff --check` passed. Full regression was not run.


## Implementable editor-comment agent plan - November 8, 2026

Revised realtime-agent-implementation-proposal-v2.md at owner request: comment-origin requests, durable deduplication, separate complete candidates, revision/local-edit protection, logical Stop checks and phased verification gates. Removed abortable SSE/instant teardown assumptions; automatic triggering and marker UX remain open. Reviewed current coordinator/cancellation/context checks. Documentation only; no application tests, build, publication or provider calls performed.

## Project setup wizard and starter components - November 8, 2026 (in progress, not complete)

Owner request: new projects go through a required setup flow (questionnaire and/or uploaded documents, PDF included), then ComPlix generates starter Common components on the server with a loading screen. Branch: feat/project-setup-wizard (created from the uncommitted sandbox-preview working tree).

Implemented:
- **Backend:** `createSetupProject` (projects start in `setupState = 'setup'`), `saveQuestionnaire` (validated structured answers stored as JSON and rendered into the guidance text fields generation reads), `finishProjectSetup`, `startStarterLibrary`, `retryStarterTask`, `uploadPdfReference`, the `starter_task` table, the `visible_starter_tasks` view and the scheduled `runStarterTask` procedure. Questionnaire-or-document is enforced on the server. The chat procedure was split into `chatCredentials` and `executeChatJob`, so starter jobs use the same Gemini + Nemotron path as live chat, run as the requesting user, and recheck that user's edit access. The job deadline handler resumes an interrupted starter run.
- **Frontend:** `/projects/:id/setup/{questionnaire,references,components,progress}` pages (`ProjectSetup.tsx`), a framework dropdown with library checkboxes plus an "Other" free-text option (`StackPicker.tsx`), browser PDF text extraction (`pdfText.ts`, pdf.js 6.4.299 legacy build, lazy-loaded), a setup gate on other project pages, a "generating" banner and project-card badges.
- **Shared rules:** `shared/questionnaire.ts`, `shared/starterComponents.ts` (Button, TextInput, KpiCard, Modal) and PDF limits in `shared/referenceFiles.ts`.

Checks actually run:
- Frontend and module strict typechecks and the production build passed (pdf.js is a separate lazy chunk; the existing >500 kB main-chunk warning remains). Module build and binding generation passed.
- New unit spec `tests/projectSetupRules.spec.ts`: 6 passed.
- Focused integration tests in `tests/foundation.spec.ts`, mocked providers: 3 passed. These cover setup input gating, questionnaire validation, the starter run executing server-side as the requester with drafts and chat transcripts, the live chat allowance being unaffected, an isolated provider failure followed by retry, and PDF bytes plus text storage.

Not passing or not run:
- **Browser wizard test:** passed questionnaire, PDF upload/extraction and the gate before reaching its timeout. It was not re-run to completion.
- **Two migrated UI tests** ("browser sessions share edits…" and "browser creates and switches…") fail. Right after a project is created in the single-page flow, the server closes the browser's SpacetimeDB websocket without an error, so the page shows "Cannot load the workspace". A full page reload recovers. Cause not yet identified.
- **Concurrent edits:** another local session was editing `spacetimedb/src/index.ts`, `src/OrganizationWorkspace.tsx`, `src/ProjectLibrary.tsx` and `src/useWorkspace.ts` (an editor-instructions feature) at the same time. Results after about 05:00 may reflect those edits.
- **Not done:** full regression, live provider run, local republish.
- **Found while debugging:** the modern pdf.js 6 build hangs in this test browser and fails in Node 24 because `Uint8Array.prototype.toHex` is missing. The legacy build is used instead.


## Automatic editor-comment instructions - November 8, 2026

Implemented the first working increment on `feat/editor-comment-instructions` after the owner selected automatic triggering. New user-saved JSX/Razor markup `@complix` comments run after successful autosave and two idle seconds in the open Code panel. Added shared detection, the EditorInstructions UI, private persisted instruction identity and scoped view, enable/dismiss reducers and a procedure that verifies the saved comment/revision before reusing Gemini/Nemotron. Accepted requests deduplicate across tabs/reloads; generated/inherited markers stay inert through unrelated saves; ambiguous duplicates and moved processed comments do not automatically run. Failed admission persists as blocked and needs explicit enable/retry. Source edits, job cancellation, deadlines and access are checked before every provider call and final acceptance. Results remain separate unverified candidates; newer local/saved edits and the working preview are preserved.

Added @babel/parser 8.1.0 for actual TSX comment parsing (official Babel parser documentation consulted); Razor intentionally supports markup before executable Razor transitions, not arbitrary C# syntax. Reused existing TypeScript module/schema/procedure APIs and official SpacetimeDB procedure guidance. Regenerated bindings and extended workspace subscriptions. Usage: docs/editor-instructions.md. Updated the proposal and decisions to record the owner's automatic-trigger choice; timing/syntax/comment-retention are implementation defaults.

Validation actually run: final frontend/module strict typechecks, Vite production build and backend compilation passed; Vite retains a >500 kB warning (the parser increases the frontend bundle). Three detection tests passed. Final focused integration/browser run: 12 passed, exit 0, frontend 53573/backend 53500/database complix-comment-focused. Coverage includes both React/Blazor automatic execution and reload deduplication, idempotent concurrent claim, access isolation, shared rate limits after transcript clear, stale edits, cancellation with no late acceptance/final Gemini call, oversized-context rejection without job creation, removed markers and inert provider-generated markers. Existing draft/chat/component regressions in that focused run also passed. Initial focused assertions were corrected for string-valued procedure rejections; initial React browser run reached reload successfully but exceeded the 45 s Windows compile budget, so the new browser tests use 120 s.

Full regression attempted on frontend 53473/backend 53400/database complix-comment-regression: 45 passed, 4 skipped, 39 did not run and 1 failed. The serial foundation group stopped at the existing setup helper's `Theme` selectOption locator, which does not match the current questionnaire choice UI. That separate in-progress setup flow was left unchanged. The complete suite is not green. git diff --check passed. No real provider/E2B calls, operator credential reads, local application publication, commit or push. A data-preserving backend publication and browser reload are needed before using the new API in the running app; paid real-model acceptance and broader Razor syntax remain unverified/future.

### Setup wizard follow-up - November 8, 2026

The browser failures recorded above were not a backend disconnect.
- **Cause:** the questionnaire `<select>` elements sat inside their `<label>`, so their accessible names included the selected option ("Theme No preference"). The `Theme` locator therefore never matched. The 1006 websocket close came from test teardown after the timeout. A tracing run confirmed the server stayed responsive.
- **Fix:** each questionnaire select now has an explicit `aria-label`. This also improves screen-reader names.
- **Debug instrumentation:** removed.

Validation actually run after the other session finished:
- Typecheck and production build passed.
- 6 focused setup tests passed: 2 migrated UI tests, the full browser wizard with questionnaire, PDF extraction, two generated starters, progress and library, and 3 API tests.
- Full Playwright suite passed: 85 passed, 4 skipped (opt-in live E2B specs), exit 0, frontend 54173 / backend 54100 / database complix-full-regression. This includes the editor-comment-instruction tests from the other session.

Still pending:
- Local republish of `complix-local`.
- A real-provider starter run (paid, owner approval needed).
- Separating the two uncommitted features into reviewable commits. The working tree is on `feat/editor-comment-instructions`.

Later the same day (owner-approved):
- **Published:** local `complix-local` with `--delete-data=never`. A read-only describe confirmed the setup reducers, `starter_task` and the scheduled `run_starter_task` are live.
- **Real-provider starter run:** done on a separate throwaway database (`complix-starter-live`, local signed tokens, operator Gemini + Nemotron credentials; deleted afterwards).
  - Input: a React project with a questionnaire (dashboard, minimal/corporate, #1f6f54 primary, 8px corners, subtle shadows, Inter, WCAG 2.2 AA).
  - Result: all four starters (Button, TextInput, KpiCard, Modal) finished in 94 s total, about 22 s each, with no failures.
  - Each produced a source file, README.md and examples/Preview.tsx that apply the questionnaire values.
  - Imports stayed within the React preview environment (React, lucide-react, CVA, clsx, tailwind-merge, Radix Slot).
- **Not run:** E2B compile/preview of the generated starters, so their build success is unverified.


## Immediate editor-instruction acknowledgment - November 8, 2026

On feat/acknowledge-editor-instructions, added a component-chat receipt message atomically with instruction acceptance, before Gemini/Nemotron execution. It includes the source location and instruction text, appears through existing subscriptions and cannot duplicate on repeated claims. Updated usage notes. Two focused backend/browser tests passed: idempotent acknowledgment and visibility before a deliberately slow provider response completes, followed by safe cancellation (frontend 54273/backend 54200/database complix-instruction-ack). Frontend/module typechecks, backend compilation and git diff --check passed. No schema/API changes, live provider request, local publication, commit or push. Backend must be republished for the running app to show this new acknowledgment.

## Editor instruction reliability - November 8, 2026

On `fix/editor-instructions-reliability` (from `feat/project-foundation` plus the vite-cache fix):
- Committed the other session's uncommitted chat acknowledgment as-is (`b12a278`).
- Fixed instruction pickup and session handling (see decisions.md).
- Fixed a garbled quote in `docs/editor-instructions.md`.

Diagnosis used:
- The live module log: repeated session-expired `save_component_draft` errors and no `run_editor_instruction` calls.
- Owner-reported browser token timings (15-minute ID token with a refresh token; renewal working), printed without token contents.

Checks actually run:
- Typechecks and build passed.
- Instruction detector unit tests: 4 passed, updated for the wider comment rule.
- 8 focused integration and browser tests passed, including two new ones:
  - a `//` line comment is saved as pending, runs and gets chat messages;
  - an expired session mid-edit shows "Waiting to save…", renewal swaps the connection without unmounting, and the edit then saves (frontend 57173 / backend 57100).
- Full Playwright suite: 88 passed, 4 skipped (opt-in live E2B), exit 0. Republished local `complix-local` with `--delete-data=never`.

## Editor instructions in the chat - November 8, 2026

On `feat/chat-instruction-feed`, on top of `fix/editor-instructions-reliability`.

Changes:
- Moved the instruction panel into the component chat.
- Added the in-conversation typing bubble and per-reply edited-code diffs (`src/lineDiff.ts`).
- Removed the duplicate Stop generation button; Codex's stop test now uses the chat's Cancel reply.

Checks actually run:
- Typecheck and build passed.
- New diff unit tests: 3 passed.
- New browser test of the full flow passed: the pending comment bubble, thinking indicator, acknowledgment, reply with edited code, and Open in editor.
- The affected chat and editor tests (slow-reply cancel, operator chat, component explorer, editor autosave, instruction stop) passed.
- Screenshots of the thinking and done states were reviewed.


## Full-library ZIP export - November 8, 2026

Implemented on `feat/library-zip-export` after owner approval. Added the read-only `prepareLibraryExport` procedure: one transaction authorizes project read access, selects each stable component's latest completed non-mock job (timestamp/ID ordering), overlays saved checkpoints, includes all original reference bytes/text and saved guidance/technology details, and rejects known operator secrets or over-64-MiB snapshots. Placeholders and omitted legacy/unavailable source are explicitly reported. Owners and explicitly granted viewers/editors can export; revocation is rechecked at download. No schema table migration; generated client procedure/types updated.

Added LibraryDownload to the component workspace: flush open draft, review immutable snapshot/revisions, then download. Lazy shared libraryExport ZIP assembly (fflate 0.8.3, official README consulted) preserves source/docs/examples, includes human README and AGENTS guidance, design/technology/dependency/validation notes, every reference original plus stored extracted text, and a SHA-256 manifest. Component-relative structure is preserved; legacy unrooted files are scoped under their owning component, with original/archive mapping and no import rewriting. Static JS/TS dependencies are inventoried; unresolved imports and missing documentation are reported without invented versions. Unsafe/conflicting paths fail rather than overwrite. Usage/limits: docs/library-export.md. All results remain unverified source handoffs, not installable packages or promotion.

Validation: final seven export-focused unit/integration/browser tests passed (exit 0, frontend 57673/backend 57600/database complix-zip-final). Covers exact PDF/reference bytes, saved manual edits including flush-before-download, failure fallback, project isolation, viewer access/revocation, immutable snapshots, ZIP extraction/checksums, React and Blazor browser downloads, traversal/Windows paths/conflicts and dependency warnings. Initial six-test run also passed. Final frontend/module strict typechecks, production build and backend build passed; existing >500 kB main-chunk warning remains, export logic is a lazy chunk. git diff --check passed.

Full regression attempted: 52 passed, 4 skipped (opt-in live), 46 did not run, 1 failed (103 total), on frontend 57573/backend 57500/database complix-zip-regression. The serial foundation suite stopped before export tests when the existing two-browser workspace test timed out waiting for Organizations during initial load; its snapshot showed Cannot load the workspace. No intake form changes or connection workaround was made. The final targeted export suite independently passed. Full suite is not green. Clean consuming-project compilation of actual generated libraries was not performed; exports disclose that integration is unverified. No provider/E2B calls, operator credential reads, local application publication, commit or push. Existing/concurrent chat-feed/style edits and the user's test PDF were preserved. Backend publication and browser reload remain necessary to use the new API locally.


## Fading agent-code highlights - November 8, 2026

Implemented on feat/fading-agent-code-highlights. Added CodeEditor, new-line positions in the existing line diff, result-arrival tracking in ProjectLibrary and a ten-second green-to-transparent CSS animation. Uses native textarea backgrounds, so editing, selection and scrolling remain native. Adjacent added lines share gradient ranges. Existing drafts do not replay highlights; manual typing clears them. Reduced-motion mode holds a steady highlight until expiry. Existing ZIP-export/chat-feed/intake work was preserved; no backend/API changes.

Validation: frontend/module typechecks and production build passed (existing main-chunk warning). All three diff tests passed, including added-line positions. The extended instruction/chat browser test passed after correcting its fake-clock installation to occur before application timers (initial test clock setup failed, not the production fade). It checks no highlight on initial manual edits, new agent highlight, changing animated color, ten-second expiry and no replay after reload. Screenshot .local/agent-code-highlight.png was visually reviewed at mid-fade. Final browser run exit 0 on frontend 57773/backend 57700/database complix-code-highlight. git diff --check passed. No full regression rerun, provider/sandbox call, local publication, commit or push. Frontend-only behavior; refresh the frontend to inspect it.


## Remove standalone Design guidance page - November 8, 2026

On refactor/remove-design-guidance-page, removed the navigation entry, page render/import/type, unused ProjectGuidance.tsx and page-only CSS. Old guidance URLs resolve to Components with canonical URLs on initial load/history; unfinished projects retain the existing setup gate. Updated reference empty-state wording, README and workspace design guide. Saved guidance, setup questionnaire, backend authorization/revision/persistence, generation snapshots and ZIP design exports remain intact. No backend/schema changes.

Migrated tests away from the retired screen: session renewal now proves a persisted component mutation; project switching still checks technologies/navigation; standalone guidance persistence/revision validation stays covered at the backend; wizard guidance is checked through its authorized subscription. Added a browser check for absent navigation, old-route redirect, working Settings and retained export guidance. Six relevant tests passed across isolated runs: saved-guidance persistence and project switching (frontend 57873/backend 57800), organization grants/session renewal/reference uploads (57973/57900, exit 0), and removed-route/data preservation (58073/58000, exit 0). Frontend/module typechecks, production build and git diff --check passed; existing main-chunk warning remains. The broader four-test run had two passes then timed out on existing wizard PDF extraction before its guidance assertion, skipping the final route test, which passed independently. An initial test-only missing observer variable was corrected. Full suite was not rerun. No intake-form redesign, data deletion, provider/sandbox calls, publication, commit or push.


## Intake component-import instructions - November 8, 2026

Replaced the earlier standalone-dashboard proposal with implementable intake integration instructions. Inspected setup gating, job-keyed drafts, source-mode guards, starter reuse and the actual ZIP manifest. Covered bounded ZIP validation, atomic/idempotent persistence, imported provenance, binary references, source-consumer integration, inactive imported comments, starter collision protection, staged milestones and verification gates. Existing staged auth/session work was preserved. Documentation only; no application changes, builds, tests, provider calls, commit or publication.

Plan review, same day: checked the plan's code claims against the code (fflate 0.8.3, export manifest v1/SHA-256/64 MiB, 20-file/256 KiB drafts, requireSetupInput, job-keyed drafts, starter name reuse). Added the owner decisions on setup gate, guidance, references and limits, plus fixes for review gaps: staged upload/atomic finalize, mode 'imported' with isSourceDraft, export origin labelling, reference filename/quota collisions, component re-rooting and preview limits for cross-component imports. Next: increment 1 (contract and validation fixtures). Still documentation only.

### Increment 1: ZIP contract and validation (feat/component-zip-import)

Added shared/componentImport.ts as pure data handling: no backend, UI or schema changes yet.

- **ZIP reader:** reads the central directory itself, rejecting encryption, symlinks, ZIP64, multi-disk archives, unsupported compression, unsafe/traversal/Windows-reserved paths, duplicates and case collisions. Inflated bytes are counted against limits as they stream, so forged header sizes cannot bypass them. Limits: 2 MiB per entry, 8 MiB manifest, 2000 entries, 64 MiB compressed and expanded.
- **ComPlix formatVersion 1 planner:** requires a single wrapper folder and verifies every SHA-256 checksum. Rejects undeclared, missing or doubly assigned files. Validates component names, categories, roots and draft limits, and returns the current exported source under rooted paths.
- **References:** all are restored all-or-nothing, with exact bytes and stored text. Archived design.md is attached as a design reference.
- **Review data:** every file gets an explicit disposition, and generated README/AGENTS files are handoff, never components. Components with external, unresolved or cross-component imports are flagged for preview limits.
- **Conflict check:** projectConflicts reports existing component names, reference filename collisions and the 20-reference quota as issues that block confirmation.

Checks run: `npm run typecheck` passed (frontend and module). `npx playwright test tests/componentImport.spec.ts tests/libraryExport.spec.ts tests/draftFiles.spec.ts tests/reference-files.spec.ts` passed 13/13. React and Blazor fixtures are real createLibraryZip output, so these are true round trips.

Not done yet: ordinary-ZIP mapping (increment 4), staged backend persistence (increment 2) and intake UI and source consumers (increment 3). The safe chunk size against the server is not measured yet.

### Increment 2: staged upload, atomic finalize and provenance (feat/component-zip-import)

- **shared/importPayload.ts:** the payload wire format (JSON with base64 reference bytes), shared decode/revalidation, synchronous SHA-256, chunking and constants. The limits are 1 MiB chunks, a 96 MiB payload (64 MiB of content plus base64 overhead), 200 components and 24-hour staging expiry.
- **Module tables:** private `import_staging` (no view), `import_record` (replay protection, visible through `visible_imports`) and scheduled `import_expiry`.
- **Reducers:**
  - `appendImportChunk` checks edit access, setup state, bounds and request consistency. Identical re-sends are no-ops, and a new request replaces the same uploader's abandoned one.
  - `finalizeImport` rechecks access, verifies the hash, decodes and revalidates the payload, checks secrets, component names, reference quota and filenames, then inserts components, `mode: 'imported'` jobs, revision-0 drafts and references in one transaction. Replays are no-ops.
  - `cancelImport` deletes the caller's staged chunks.
  - Scheduled `expireImportStaging` removes abandoned staging.
- **Imported mode:** `isSourceDraft` (in generationWorkflow) now covers save, chat source selection, enabling and running editor instructions, and export selection. Provider deadlines and rate accounting still use `isChatMode`. Export marks imported components `origin: 'imported'`.
- **Setup gate:** a completed import satisfies `requireSetupInput`. The error message now mentions imports, and the frontend's known-error list matches.
- **Starters:** `startStarterLibrary` rejects starter names that match imported components.
- **Bindings:** regenerated with `npm run backend:generate`.
- **Test file fix:** the staged auth changes to tests/foundation.spec.ts had pasted new helpers inside the "removed guidance page" test without closing it, so the whole file failed to parse. Added the missing `});` (unstaged).

Checks run:
- `npm run typecheck` passed.
- `npm run backend:build` passed.
- 19 unit tests passed (import, payload, export, setup rules). SHA-256 and base64 are checked against Node.
- Real local server: 15 foundation tests passed, the 2 new import tests plus 13 existing setup, starter, PDF, draft, chat, editor-instruction and export tests. The import tests cover outsider rejection, a multi-chunk 1.5 MiB PDF, re-sent and conflicting chunks, incomplete upload, replay, digest reuse, exact reference bytes, unchanged intake technologies, the starter clash, the setup gate, the post-setup rejection, editing imported source, the inherited `@complix` marker staying inert, the imported export origin, rollback on a reference conflict with retry from retained staging, a tampered checksum and cancel.

Not run: the full foundation suite and the browser tests. The maximum server chunk size was not measured; only 1 MiB chunks were verified. Next: increment 3 (intake review UI and frontend source consumers, including the ProjectLibrary `isSourceDraft` label and edit gating and the setup-screen gate text).

### Increment 3: intake review UI and frontend source consumers (feat/component-zip-import)

- **src/ComponentImport.tsx:** an optional "Import existing components" panel in the Documents step. The questionnaire and document upload are unchanged.
  - **Review:** after the user picks a ZIP, it shows a recognition summary (files, expanded size), components with category, root, file count and preview warnings, and references with purpose, size and the archived-design marker. It also lists archived technologies for review only (intake values are kept) and every file's disposition.
  - **Conflicts:** blocking conflicts from `projectConflicts` are recomputed live, so removing a clashing intake upload re-enables confirmation without re-choosing the ZIP.
  - **Confirm:** chunked upload with progress, then `finalizeImport`. Server and parser messages are shown, and a reload before confirming requires choosing the ZIP again (stated in the UI).
  - **Done state:** shows counts from `visible_imports`.
- **Data:** `visible_imports` is added to workspace data and subscriptions, and passed to the setup screen.
- **ProjectSetup:**
  - The gate accepts an import, matching the backend.
  - After an import the step heading is "Your imported library is ready", and "Open imported library" is the main action (finish setup without starters).
  - Starters are unselected by default. Names already in the library are disabled ("Already in your imported library."), and the starter-clash server error is in the known-error list.
- **ProjectLibrary:** imported drafts are editable, previewable and used as chat context through `isSourceDraft`, with the label "Imported · unverified". Provider activity indicators keep `isChatMode`.

Checks run:
- `npm run typecheck` and `npm run build` passed (the existing large-chunk warning remains).
- New browser test on a real server passed: ZIP review, a design.md conflict blocking confirmation, live resolution, import, the setup gate, disabled clashing starter, no starter tasks, opening the library and showing imported code with its label.
- Regression with `--timeout 150000`, 7/7 passed: Library mock workflow, multi-file editor, component explorer, setup wizard and the three import tests.

Not done or not verified:
- With the default 45s timeout, the first browser test of a run timed out on its first page load. The machine was at about 77% CPU, and the dev server took about 12s to serve `/` even warm. Not compared against HEAD.
- Archived references can't be renamed in the UI; conflicts are resolved by removing the intake upload.
- Ordinary (non-ComPlix) ZIP mapping (increment 4) is not implemented, and its UI rejects them with an explicit message.
- The full foundation suite was not run.
