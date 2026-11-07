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
