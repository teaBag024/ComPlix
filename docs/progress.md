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

## Workspace tabs � November 7, 2026

Implemented on feat/workspace-tabs, preserving existing uncommitted work:
- Six task-focused tabs: Projects, Design guidance, Technologies, Sharing, Organization, Invitations.
- Active project/name/access stay above the tab panels; invitation counts surface pending items.
- shadcn/ui-style Radix Tabs component under src/components/ui/tabs.tsx, adapted to existing CSS. Added @radix-ui/react-tabs; no Tailwind pipeline or backend changes.
- Compact cards, two-column project creation/guidance on wider screens, wrapping mobile tabs and visible keyboard focus.
- Inactive panels remain mounted so switching tabs retains technology drafts and guidance autosave. Existing project-switch recovery limits still apply.
- Browser flows updated to navigate tabs; added assertions for a single visible panel, retained unsaved technology edits, arrow-key navigation and no horizontal page overflow at 390px.

Validation: strict frontend/module typechecks and production build passed. Vite emitted Radix use-client directive warnings. npm reported the host Node 24.21.0 is below the project's declared minimum 24.22.1; dependencies installed successfully with zero reported audit vulnerabilities. Initial test run reported all 10 cases passing but stalled in process cleanup; terminated only identified test processes and reran outside the sandbox. Final rerun result follows below. No commit, push or publication.

Final validation: npm.cmd test passed all 10 tests in 47.4 seconds, exit 0, including the new keyboard, hidden-panel, unsaved-draft and mobile-width assertions. A preceding rerun was interrupted by a frontend formatting reload during the connection-retry check; the final source-stable run passed that check. git diff --check passed (line-ending notices only). Formal accessibility audit and visual browser matrix were not performed.
