# ComPlix decision baseline

Recorded and revised November 7, 2026. The original planning baseline is preserved below; the owner subsequently authorized the first local implementation milestone.

## Authority and status

Read AGENTS.md and the original five planning documents and the project memory records. ComPlix-system-planning.md v1.5 supersedes conflicting October 22 v0.6 documents; later explicit owner decisions take precedence. IDs below refer to its decision register. Confirmed, working direction, proposed, open, and future are distinct statuses.

## Confirmed requirements

- D01-D05: Generate reusable components and compositions, not complete applications. Generate each project's Common foundation before compositions. Each project has its own isolated library and open-ended requested technology details; the earlier fixed-profile-only interpretation is superseded by the current clarification below. Both React + TypeScript + Tailwind + shadcn/ui and Blazor + Bootstrap are required prototype outputs. The builder frontend uses React + TypeScript.
- D06: SpacetimeDB is the selected backend direction by explicit owner decision on November 7, 2026. It replaces Flask + SQLite before any application code exists. React/TypeScript and both output profiles remain confirmed.
- D08, D10: Maintain evolving project design.md guidance. Reuse the generation workflow while enforcing project context and write isolation in application code.
- D12: Autosave meaningful draft checkpoints. Required checks gate automatic promotion of complete related changes. Failed/incomplete generation preserves the current library; source, docs, examples and dependencies stay synchronized.
- D16-D19: Preview actual generated code in both runtimes. Deliver comprehensive readable/exported documentation and IDE hover help, plus full/selective downloads. Originally one saved project per client, then one per organization; both limits are superseded by the current private/multiple-project clarification below. Clients supply their API key during onboarding; provider and credential lifecycle remain open.
- Uploaded references and generated code are untrusted. Build/runtime execution must exclude application credentials and other projects' data.
- Style guides guide generation; absent a guide, use a style questionnaire. Technical intake is required. No mandatory separate style-approval screen is established.

Rationale: these preserve the documented reusable-library workflow and both pilot output profiles without confusing the builder stack with generated output stacks.

## Preferred and working directions (not finalized architecture)

- D11: Background generation worker, scoped tools and separate build execution; no queue or isolation platform selected.
- D13: Accepted validation baseline covers build/types, public contracts, dependencies, runtime preview, relevant interactions and Common consumer impact. Exact blocking checks remain open.
- D14-D15: One-level undo/redo of the latest complete successful change set; arbitrary historical component restoration deferred. Preference/configuration recovery policy remains open.
- D20: Limited-budget, originally three-week prototype; no current start date, capacity, budget cap or delivery guarantee established.

## Proposals awaiting adoption

Structured preference records as the authority generating design.md; logical entities/schema; external artifact storage; one modifying job per project; dependency graph rules; atomic artifact/database promotion mechanism; iframe embedding and maintained stack preview templates; selective export dependency closure; retention policies and redo details. These are recommendations in the consolidated plan, not approved library or infrastructure selections.

The older Button/Input/Textarea/Checkbox/Card/Badge catalog, text/Markdown/PDF input reduction, single theme and source archive are also proposals.

## Reconciled conflicts

| Earlier wording | Governing baseline |
| --- | --- |
| Builder stack undecided; no architecture approved in the reserved product-design document | React/TypeScript confirmed; SpacetimeDB selected; language, hosting and external services remain open |
| Autosave/approval mechanics undecided; explicit Apply proposal referenced in the consolidated source history | Draft checkpoints and automatic promotion after required checks; no routine Apply button |
| Version history uncommitted / sophisticated history excluded | Limited one-level grouped undo/redo is the working direction; arbitrary history remains deferred |
| Three-week deliverable phrased as a fixed goal | Original constraint only; current schedule and feasibility require reassessment |
| Original design document remains a deferred placeholder | Later consolidated planning supplies the baseline; the placeholder is not a reason to discard subsequent decisions |

No unresolved contradiction overrides the consolidated baseline. References to historical conversation are baseline evidence, not independently available repository files.

## Open decisions and when they block work

Before the proposed persistence milestone:

1. Choose SpacetimeDB module language and compatible CLI/server/SDK versions, plus local standalone versus Maincloud deployment.
2. Select OIDC provider, client/account model and issuer/audience policy, including future service identities.
3. Agree private backing tables, caller-scoped views, ownership indexes and schema evolution/restart recovery checks.

Before real generation and previews:
- Supported versions/build setups for both profiles, especially Blazor render/hosting mode; shadcn adaptation conventions.
- Worker/queue, execution isolation, hosting, cancellation and restart behavior.
- Provider/model, API-key validation/retention/deletion and cost limits.
- Common starter inventory, input formats/conflict handling, and supported behavior.
- Blocking versus advisory validation, repair limits, accessibility scope.
- Design-memory authority, recovery of rules/configuration, atomic promotion and artifact recovery.
- Export format, hover-verification editor, clean-project checks, retention/backup budgets.
- Revised schedule, capacity and spending cap.

These later choices need not block project-record persistence if that milestone avoids credentials, uploads, generation, artifact execution and revision recovery.

## Proposed first implementation milestone: persist and reopen a project

Originally proposed; subsequently authorized for the local foundation scope recorded below. After the immediate decisions above, create a small React/TypeScript sign-in/intake view and SpacetimeDB persistence path for a named project with exactly one of the two required output-profile identifiers. List/reopen saved projects within the authorized client context. Keep profile versions explicitly unset until chosen; profile selection does not claim generation support. No AI keys, uploads, generation, previews or exports in this increment. It is a foundation slice, not completed onboarding.

Proposed acceptance checks:
- Both profile choices round-trip through persistence and survive a durable SpacetimeDB restart.
- Invalid/unsupported profiles and malformed requests are rejected without partial records.
- Enforce one saved project per client, including duplicate creation; enforce client/project access in application code, with denied cross-client access tested.
- The authenticated frontend reopens saved values and reports connection/mutation failures without claiming success.
- Relevant module/persistence failure tests, frontend type/build checks and a manual save/reopen flow pass with recorded evidence.
- A second authorized session receives saved changes through subscriptions; reconnect restores the initialized view. Cross-client queries/subscriptions expose no unauthorized rows.
- No AI credentials are collected; no generated code executes; no generation capability is claimed.

Use a feature branch when implementation is authorized. This documentation-only baseline leaves the existing unborn main branch unchanged.

## Superseded backend history

The initial baseline recorded Flask/Python + SQLite as the preferred backend, PostgreSQL as a possible later move and SQLAlchemy/Alembic as proposals. The owner's November 7, 2026 decision replaces that direction with SpacetimeDB. No application implementation or database migration exists. Those tools are not current prerequisites; Python may still be evaluated for external worker use.

## Researched architecture recommendations — not yet adopted

Official documentation research and detailed sources are in system-planning section 19. The reviewed live docs display version 2.0.0; no dependency version has been selected or installed.

- Recommend TypeScript module and generated TypeScript client bindings.
- Recommend one database/module, private project tables, caller-scoped indexed views and authorization in every callable mutation.
- Recommend OIDC sign-in; SpacetimeAuth is a candidate. Authentication does not grant project authorization automatically.
- Recommend subscriptions for persisted state/progress rather than an additional polling API.
- Recommend a small external integration service and worker, initially TypeScript/Node, with a durable jobs table and guarded claim/checkpoint/completion operations. No extra queue initially.
- Recommend short-lived server-memory AI keys pending explicit retention choice; store only references/status in synchronized state. Restart would require key re-entry.
- Recommend external artifact storage and separately isolated React/.NET build/runtime environments, with a distinct preview origin.
- Recommend atomic promotion of revision references only after artifact preparation, validation and stale-input checks.

Verified capability distinctions: reducers are transactional but cannot do general network/filesystem work. Procedures can perform external HTTP, so a separate service is not intrinsically necessary for a simple provider request. Inline binary storage is supported, so external blob storage is a workload recommendation. Neither capability establishes durable AI orchestration or safe generated-code execution.

Open before the AI workflow: provider/key lifecycle, service authentication and audience, job leases/retries/cancellation/cost limits, hosting/isolation, source/artifact placement, preview access, supported profile versions and Blazor render mode. Prior product decisions on automatic promotion, recovery scope and both output stacks still apply. See system-planning section 19 for the full service boundaries and acceptance proposal.

## Future scope

Verified generation support for Angular/additional profiles, product-funded model access, IDE/Figma integrations, arbitrary historical restoration, public sharing, billing, marketplace, package publishing and broader collaboration beyond the approved organization/project access model remain future/uncommitted. Full application generation remains outside the product boundary.


## First milestone implementation — local foundation (November 7, 2026)

The owner authorized implementation of the local project foundation. This supersedes the earlier statement that the first increment was not approved for implementation, without approving all broader architecture recommendations.

Routine implementation choices: TypeScript module, React/TypeScript with Vite, private project table, caller-scoped my_project view, unique owner constraint and guarded create/rename reducers. Rename is a small verification/edit operation; output stack remains fixed after creation. Names are trimmed and limited to 1–80 characters without control characters.

Pinned local toolchain: SpacetimeDB CLI/server/SDK 2.14.1; portable Node 24.22.2 (SDK requires ^24.22.1 in the Node 24 line); React/React DOM 19.3.1; Vite 8.3.6; TypeScript 7.0.2; Playwright 1.65.0. Dependencies are project-local and lockfiles retained. No system-wide installation is selected.

Accepted owner decision: proceed with local standalone SpacetimeDB and browser-retained server-issued development identities. The owner approved this after discussion of local versus hosted tradeoffs. No hosted resources, account access, credits or OIDC provider were used. This is not an approved production authentication policy.

Implementation: all application state/ownership logic is in the TypeScript module. A unique owner constraint enforces one project per identity. Private backing data is readable only through the caller-scoped view; ordinary users cannot query/subscribe to the backing table. Vite and Spacetime bind to loopback. ES256 signing keys are generated once into ignored .local storage and retained across restart. CLI credentials are isolated under .local/cli. The browser persists its bearer token in local storage; a retry retains it. There is no login/recovery/multi-device account yet.

Routine limits: output profile is fixed after create; rename edits only the name. No offline writes or transparent reconnect promise: failed connection/subscription clears the displayed project and offers explicit retry. Simultaneous first-time tabs are not coordinated; initialize the first tab before opening another. Data remains authoritative on the server.

User-provided official guide read: https://spacetimedb.com/agent-setup.md and https://spacetimedb.com/docs/intro/zen/. The guide now calls the platform Spacetime; package/tool names remain SpacetimeDB. Follow the installed SDK and generated bindings for APIs. No global plugins, skills, MCP servers or settings were installed/changed from that link; those are outside the project-local milestone.

Local acceptance evidence: real reducer and browser tests cover both profile choices, one-project/input rules, cross-identity query/subscription/write denial, reload, realtime edits, restart durability and error/retry recovery. Build/test details are in progress.md. These checks do not establish production authentication, hosted reliability, or generated-library support.

Official references checked for this increment:
- TypeScript/local workflow: https://spacetimedb.com/docs/quickstarts/typescript/
- TypeScript SDK: https://spacetimedb.com/docs/clients/typescript/
- Server-only access and views: https://spacetimedb.com/docs/tables/access-permissions/ and https://spacetimedb.com/docs/functions/views/
- Identity/token persistence: https://spacetimedb.com/docs/core-concepts/authentication/
- Local CLI commands: https://spacetimedb.com/docs/cli-reference/
- Local signing key configuration: https://spacetimedb.com/docs/cli-reference/standalone-config/ and https://spacetimedb.com/docs/how-to/self-hosted-key-rotation/
- Release/version metadata: https://github.com/clockworklabs/SpacetimeDB/releases/tag/v2.14.1 and the installed SDK package engine declaration.
- Vite Node requirements/build setup: https://vite.dev/guide/
- Browser assertions: https://playwright.dev/docs/test-assertions

## Sign-in and organization milestone — historical accepted/implemented scope, November 7, 2026

Mandatory org ownership and the one-project limit in this historical increment are superseded below; the implementation still has these constraints.

The owner explicitly approved Google/GitHub/email magic-link sign-in, identity/name/verified email capture, organization-owned projects (one per organization initially), membership in multiple organizations, invitation-based joining and explicit editor/viewer project grants. Owner/admin manages access; this supersedes one-project-per-individual and the previous deferral of all collaboration. Frontend and application data remain local during this increment. SpacetimeAuth is the selected identity provider; its configuration is hosted.

Public client: client_034te16H37cuA4goFM0pev. The owner created complix-dev on Maincloud to enable SpacetimeAuth and configured providers. Public configuration was verified through spacetime auth client get, without --include-secret: issuer https://auth.spacetimedb.com/oidc, callback http://127.0.0.1:5173/callback, logout http://127.0.0.1:5173, authorization code/public client. This increment publishes only complix-local on loopback; it does not update complix-dev. No secrets are embedded in source, examples or test reports.

Implementation choices within this scope:
- Stable identity is the server's authenticated issuer/subject identity. Email is verified contact/invitation matching data, not an ownership key. Do not merge accounts merely because email matches; provider-side cross-method linking remains unverified.
- Backend issuer/audience/expiry/email checks run at connection admission and every authorized mutation. Profile values come from validated JWT claims, never form arguments.
- Private tables contain organizations, memberships, projects, grants, invitations and profiles. Scoped views drive UI and retract access after grants/memberships change.
- Owners/admins manage the organization project; owner alone appoints/demotes admins. Ordinary membership has no implicit project access. Owner removal is rejected; ownership transfer is outside this increment.
- Invitations are verified-email-targeted, seven-day, revocable, single acceptance records. This increment uses in-app invitations; email delivery is explicitly not implemented. No domain auto-join or GitHub organization import.
- OIDC uses authorization code with PKCE through react-oidc-context 3.3.1 / oidc-client-ts 3.5.0, openid/profile/email scopes, session-storage state and the ID token for Spacetime. Sign-out/expiry remove the rendered connection; no credential-debug component is included.
- Local development uses a canonical 127.0.0.1 origin before initiating OIDC, preventing localhost/alternate-port callback mismatches.
- Preserve the original project table exactly. Old-token possession authorizes a ten-minute handoff to an authenticated identity; an organization manager imports into an empty organization project. The source is marked claimed, hidden from the old view and retained for history. No claim-by-email, overwriting, replay or data deletion.
- The data-preserving local upgrade intentionally changes reducer signatures; --break-clients accepts that compatibility change while --delete-data=never forbids data removal.

Verification distinction: local signed-claim identity fixtures and seeded browser OIDC sessions exercise real module/SDK/UI behavior, not real provider authorization-code exchange. Live public discovery, client registration, rendered provider choices and navigation to Google's authorization host were checked; Google/GitHub/email completion and cross-provider identity linking still need real-account acceptance. A reported redirect mismatch was traced to origin consistency; registration itself matched the documented callback.

Official sources consulted:
- https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/react-integration/
- https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/configuring-a-project/
- https://spacetimedb.com/docs/core-concepts/authentication/usage/
- https://spacetimedb.com/docs/functions/reducers/lifecycle/
- https://spacetimedb.com/docs/databases/environment-variables/
- https://github.com/authts/react-oidc-context
- Installed 2.14.1 SDK types and generated bindings remain authoritative for exact APIs.

Remaining acceptance: real provider callback, renewal and sign-out; invitation expiry/transfer TTL clock-boundary checks; provider-side linking policy. No production reliability, recovery, load/accessibility audit or automatic invitation email delivery is claimed.

## Tab-lifetime sign-in — November 7, 2026

Confirmed: the owner wants sign-in retained until the tab closes, including reloads. Implementation: request offline_access for refresh-token renewal; retain tokens and PKCE state only in sessionStorage. No extension of token validity or relaxation of backend expiry checks. A renewal error alone does not hide an otherwise valid workspace. Existing sessions need one new sign-in to obtain refresh credentials. Provider revocation/expiry remains authoritative; browser tab restoration may restore session storage.

Verified sources: public [SpacetimeAuth discovery](https://auth.spacetimedb.com/oidc/.well-known/openid-configuration) advertises offline_access and refresh_token; [OIDC client settings](https://authts.github.io/oidc-client-ts/interfaces/UserManagerSettings.html) documents automatic renewal. Inspected installed oidc-client-ts 3.5.0: signinSilent uses a stored refresh token, retains rotated credentials and checks subject continuity. Real-provider renewal remains to be observed; a local mocked token endpoint is used for automated acceptance.

## Questionnaire and guidance increment — November 7, 2026

Confirmed scope: owner authorized the proposed saved questionnaire/design-guidance milestone after confirming login works. Both output profiles remain required; the existing selected profile is not changed by intake. No generation, worker, provider-key intake, uploads or previews were added.

Implementation decisions (routine, reversible): eight optional draft text answers cover audience/component needs, technical constraints, visual style, colors, typography, spacing, accessibility and evolving project guidance. Blank means undecided; each answer is capped at 4000 characters, with server validation. This is not final questionnaire completeness/compatibility validation or an approved starter inventory.

A new private project_guidance row is keyed by project ID. The authorized visible_guidance view follows existing membership/project grants; saves require editor permission and valid identity claims. Compare-and-set revisions prevent silent lost updates, including initial creation races. Failed reducers preserve saved answers. The browser debounces saves by 700 ms, retains unsaved drafts in tab session storage when available, and surfaces conflicts for explicit review/discard. Draft storage is scoped to endpoint/database/identity/project; no background/offline queue is claimed.

The displayed Markdown guidance document is a deterministic text view of these answers, including clearly labeled unsaved edits. It is not independently editable or an exported file. The broader proposed D09 authority model, structured preference status/scope/history, import rules, preference undo and contradiction handling remain open. This implementation does not silently approve them.

Current official sources checked: [transactional reducers](https://spacetimedb.com/docs/functions/reducers/) and [caller-dependent subscribed views](https://spacetimedb.com/docs/functions/views/), plus installed 2.14.1 server/client SDK and generated bindings. No dependency/version changes were needed.

## Guidance save investigation and token deadlines — November 7, 2026

Observed: local server logs show save_guidance rejected with the original generic Access denied error. That message did not distinguish credential expiry from permissions; the user's exact cause remains unconfirmed until retry with the improved diagnostics. No caller tokens or draft text were inspected/logged.

Corrected a verified implementation gap: oidc-client-ts automatic renewal schedules against access-token expiry, while the module authenticates the ID token and checks its exp. They may differ. The application now schedules renewal against the earlier deadline, requests renewed credentials through signinSilent, retries transient failures with bounded frequency and checks on focus/visibility changes. Library automatic renewal is disabled to avoid two schedulers. Backend expiry and ownership checks remain enforced. Safe, allowlisted save errors now distinguish expired sessions, missing project edit access, stale revisions and invalid text; unknown errors remain generic. Useful source: https://authts.github.io/oidc-client-ts/interfaces/UserManagerSettings.html (automaticSilentRenew and accessTokenExpiringNotificationTimeInSeconds).

## Current authority: private projects, multiple projects and open technology details — November 7, 2026

Confirmed owner requirements:
- Users can have multiple projects; no one-project-per-user/organization product limit.
- A project may be private and have no organization. The assistant's mandatory-organization recommendation was not the intended requirement and is superseded by this explicit clarification.
- Organization members can share projects through project-specific access. Private personal projects must not be implicitly exposed to organization members/admins.
- Project details capture any requested framework(s), language(s), styling, libraries and relevant versions, independently of a fixed supported-profile catalog. MUI and Angular are examples, not an approved exhaustive list.
- Keep project libraries/design guidance isolated. Preserve both required initial generation targets: React + TypeScript + Tailwind + shadcn/ui, and Blazor + Bootstrap. Accepting other technology details does not claim their generation, preview or export works.

Implementation status: documentation only in this clarification. The current code still requires one org per project, enforces one project per org, and validates two output-profile IDs. These are migration targets, not current product requirements. Preserve existing project/grant/guidance records when implementing the change.

Proposed next milestone: personal ownership, optional org association, multiple-project navigation, open-ended technology details and scoped project sharing, before generation. Versioned generation adapters remain a proposal; they must not restrict which technology requests a project can record.

Open decisions: organization administrator authority over deliberately associated projects; association/detachment/transfer permissions and cardinality; access after leaving an org; changing technology after generation; profile matching and multi-target output behavior. No silent ownership conversion or sharing expansion is authorized by this documentation update.

## Multi-project implementation — November 7, 2026

Accepted: owner authorized private/shared multi-project implementation, accepted explicit grants rather than automatic organization-admin access to personal projects, and explicitly selected grant deletion on departure (not suspension/revival on rejoin).

Routine implementation choices: new projects are creator-owned; optional one-org sharing context, private represented internally by org ID 0. Owners alone manage sharing; editors may rename/update technology details and guidance. Association changes clear current grants and pending invitation project grants; owner departure detaches personal projects and clears sharing, retaining ownership. Org owners cannot leave in this increment. Transfer, multi-org sharing and legacy ownership conversion remain future, not implemented approvals.

Migration preserves existing organization-owned project behavior through a defaulted ownership mode, rather than silently reassigning them. Remove organizationId uniqueness in favor of a btree index; append ownership, five requested-technology strings and details revision with defaults. Existing project/grant/guidance IDs and original development-token rows remain intact. A snapshot of the preceding module supports an actual data-preserving upgrade test. New creation uses createProjectWithDetails; createProject is a retained compatibility entry for older preset clients, not the open-ended model's limit. The organizationMembers projectRole field is a compatibility placeholder; managedProjectShares supplies actual per-project grants.

Requested technologies remain unverified text (blank allowed, 1000 characters/field, control characters rejected), with optional initial presets for both required output combinations. Current generated components/compatibility/build workers are absent. Details writes compare expected revision; questionnaire autosave remains isolated by project.

Sources consulted: https://spacetimedb.com/docs/databases/automatic-migrations/ and https://spacetimedb.com/docs/tables/default-values/ (removing unique constraints and appending defaulted columns); https://spacetimedb.com/docs/functions/reducers/lifecycle/ (init is not an update migration); installed SpacetimeDB 2.14.1 types/bindings and server/client skills. No dependency changes.

## Workspace navigation — November 7, 2026

Confirmed owner request: simplify the frontend, reduce scrolling with tabs, and use shadcn/ui.
Implemented six task-focused workspace tabs with an always-visible project selector.
Tabs follow the shadcn/ui Radix composition, using @radix-ui/react-tabs and local CSS
instead of adding a Tailwind build pipeline. Inactive panels stay mounted and are
hidden with CSS to preserve drafts/autosave while navigating. Requested technologies,
permissions, backend rules and generated output requirements remain unchanged.
Source: https://ui.shadcn.com/docs/components/radix/tabs

## Frontend ownership and shared-space clarity - November 7, 2026

Owner feedback: the interface must communicate that users own multiple projects, each project has its own technology stack, users can belong to zero or many organizations, and organizations are optional shared spaces for multiple projects.

Implementation: Projects separates personally owned and shared/organization-owned project cards, showing each requested stack and private/space status. The selected-project header carries that context across tabs. Organizations shows membership spaces and the authorized projects available within each, with direct project navigation. Space project counts describe only projects the caller can access, not the organization's total. Membership/admin roles do not gain new visibility from this UI. Existing explicit sharing rules and historical ownership remain unchanged. Existing Radix tabs and mounted-draft behavior are retained; no new dependencies/backend integration.

## Reference intake preparation - November 7, 2026

Confirmed: owner authorized the small project-reference intake milestone: Markdown/text/selected source files, list/purpose/status/plain-text preview, editor upload/removal, authorized viewer reads and project isolation. Uploaded code is reference data, not executable code or automatically promoted library content.

Initially proposed; subsequently explicitly approved by the owner: store small original file bytes plus readable UTF-8 content in private SpacetimeDB tables, up to 128 KiB/file and 20 references/project. A separate local file service is not needed for this text-only increment; external storage remains open for larger/binary formats. The approval supersedes the pending preparation status below.

Verified official sources: https://spacetimedb.com/docs/tables/file-storage/ documents inline binary arrays and transactional subscriptions; https://spacetimedb.com/docs/functions/views/ documents caller-dependent scoped views. Installed 2.14.1 SDK supports byte arrays and module text decoding. No storage implementation or remote resource was added yet.

Related generation direction: owner expects attempts for arbitrary requested technology configurations, not a hard-coded profile gate. Initial end-to-end verification remains on both required output stacks. Nemotron is the owner's preferred model family; provider/model evaluation, key handling and execution isolation are still separate implementation decisions. References will be untrusted supporting context; final precedence/conflict handling is not silently decided by this intake work.

## Reference intake implementation - November 7, 2026

Accepted storage decision: inline private SpacetimeDB storage, 128 KiB/file and 20 references/project. Routine choices: immutable uploaded references with case-insensitive filename uniqueness within each project; changing a reference requires explicit removal and a new upload. Filenames have no paths, up to 180 characters. The initial allowlist covers Markdown/text and common source/configuration formats; it excludes PDF, images, archives and environment files. UTF-8 decoding and readable-text checks run in both client and server; byte limits and quota are enforced transactionally on the server.

Original bytes, decoded text, purpose, uploader and upload time are saved atomically. Authorized caller views expose references only for accessible projects; upload/removal requires editor access. Grant/membership revocation retracts reference data through the same project authorization rules. Removal uses explicit confirmation and deletes the reference's original/text; undo is not implemented for intake. Uploads never execute code, render HTML/Markdown or call an AI provider. Ready means UTF-8 text is available, not AI interpretation or semantic extraction.

Prototype limitation: the scoped workspace subscription currently includes reference bytes/text for all accessible projects. Caps bound each project, but paging/lazy content loading and external binary storage remain future scaling work. Both generated-output profiles and arbitrary requested technologies are unaffected. No provider key, model API or paid service is involved.

## Nemotron sandbox planning - November 7, 2026

Owner chose "Plan the complete build/preview sandbox first" rather than immediate draft-only integration. Pause application/provider wiring and generated-code execution pending this design. Full proposal and unsettled decisions: generation-sandbox-plan.md. Docker containers, local trusted coordinator, memory-only per-request client keys, Blazor WebAssembly/static previews and specific limits are recommendations, not approved infrastructure.

Verified read-only local prerequisites: Docker Desktop Linux engine is running (Docker 29.8.1, Desktop 4.93.0, WSL2). Sandbox access initially failed; outside-sandbox read-only inspection succeeded. Host dotnet is absent; no host install is required if container toolchains are adopted. No images pulled or containers executed.

Independent preparation: generation/nvidia.mjs and generation/context.mjs plus three mocked tests. NVIDIA model candidate nvidia/nemotron-3.5-super-vl-120b-a12b, fixed official endpoint, capped output/time/response size, safe errors, no retries, reasoning not returned, project-scoped bounded context. These helpers are not connected to UI/Spacetime jobs and have not made real provider calls. Exact model/account access, costs and key handling still need implementation acceptance. The next proposed increment is sandbox proof with fixture components for both required stacks, before live generation.

## Library and generation workflow implementation with mocks - November 7, 2026

Owner authorized starting implementation and explicitly selected "Build with mocks; configure accounts later." No paid provider calls or external deployment are authorized by this selection. E2B is the hosted execution candidate; Docker Desktop is not a requirement or installed dependency of ComPlix. All project technology requests remain open-ended; mock execution does not establish support for any stack.

Implemented first slice: private generation_job records and scoped views, editor-only queue/advance/cancel/delete controls, immutable saved context, selected-reference/project validation, idempotent request IDs, one active job/project, stale-input failure and bounded history (20 jobs/project). Deleting terminal history requires explicit UI confirmation and removes its saved context/artifacts. Removing a reference does not erase older job snapshots; users must delete those history entries separately. Mock jobs cannot be promoted to current or marked as actual build/validation evidence.

Local publisher explicitly sets GENERATION_MODE=mock unless overridden; absence/other values disable generation. Mock advancement is a guarded reducer with server-controlled fixtures, not a client assertion of real validation. No extra application server, secret storage or provider-key fields added. Current stages advance from the browser; interruption preserves state for explicit resume/cancel. Durable background orchestration/leases and worker authentication remain open for live execution.

Prepared injected E2B SDK-controller adapter contract: operator-selected template and commands, protected traffic, outbound network disabled, per-job directory, candidate path/count/size checks, bounded commands and teardown on failure. The returned private traffic token stays controller-side; no iframe/private-preview integration consumes it yet. Live SDK package/version, custom toolchains, command readiness checks, proxy/session access, lifecycle recovery and real provider acceptance remain unverified. Do not mistake this adapter for E2B-compatible Spacetime WASM SDK support; direct procedure/HTTP orchestration is still to validate, potentially requiring a narrowly scoped integration worker.

Official sources reviewed: https://spacetimedb.com/docs/functions/procedures/ ; https://docs.e2b.dev/network/internet-access ; https://docs.e2b.dev/network/restrict-public-access ; https://docs.e2b.dev/sandbox/secured-access ; https://docs.e2b.dev/commands and upstream JS command types. These document provider controls, not successful ComPlix live integration.

## 25. Workspace layout and interaction preferences — November 7, 2026

Confirmed by explicit owner request:
- After sign-in, show the user's projects as cards. Provide a separate Shared projects view with an organization filter.
- Opening a project goes to its component workspace. Keep the available component list toggleable beside a preview/code surface and a chat area.
- Put project configuration behind a settings button. Requested technology details are view-only there; references are summarized there with a link to reference management.
- Keep the presentation simple. If a backend capability is not implemented, use a small and honest placeholder rather than building unsupported infrastructure or implying a feature works.

The detailed UI hierarchy, responsive behavior and implementation status are in [design-guide.md](./design-guide.md). This layout decision does not change project authorization, generation validation, mock status or the distinction between requested technologies and verified support.


## 26. Per-request NVIDIA draft generation - superseded by decision 27

Confirmed scope: the owner has NVIDIA, no E2B account yet, and requested the key-entry implementation. Actual provider usage is initiated by the owner's explicit Generate action; development validation continues with synthetic keys and mocked transport only.

Implemented routine choice: a TypeScript SpacetimeDB procedure owns the NVIDIA HTTP call directly, with permission checks in transactions before sending and before accepting results. No additional application server or worker is introduced for this bounded request. The key is a procedure parameter, never a reducer argument or stored job field. A private immutable project snapshot is sent; only authorized job views expose the result. The model identifier is recorded per job. Existing model-less mock jobs migrate with an empty model default. These choices supersede the earlier statement that no API-key input exists; they do not approve a persistent key vault.

Default: `nvidia/nemotron-3.5-super-vl-120b-a12b`, nonstreaming strict JSON-schema output, low reasoning, 4096 completion-token cap, 60 seconds, no automatic retries. One active job/project and existing history/context limits apply. Request IDs prevent restarting a claimed job on replay. Parsed manifests reject unsafe/duplicate paths, excessive output, incomplete completion and echoed keys (including JSON escapes). Artifacts are unverified source only, never executed or promoted. Cancellation cannot refund/guarantee stopping provider work; a process interruption may leave a job requiring cancellation. These are prototype limitations, not durable worker orchestration guarantees.

Verified official capabilities: [SpacetimeDB procedures](https://spacetimedb.com/docs/functions/procedures/) support HTTP outside transactions and `withTx` for authorized database updates; [NVIDIA API reference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer) documents this endpoint/model and JSON-schema, reasoning and token options. [Upstream HTTP implementation](https://github.com/clockworklabs/SpacetimeDB/blob/master/crates/core/src/host/instance_env.rs) and the installed server reject loopback HTTP. Therefore procedure tests use a transport-instrumented module copy under ignored .local, not a production fixture endpoint/flag or relaxed server controls. Production transport/live model output remain unverified until owner acceptance.

Still open: E2B credentials/templates, authenticated protected preview routing, dependency/toolchain policy, real compiler/tests, background recovery, artifact promotion and exports. Requested technologies remain open-ended; no tested stack support follows from draft generation.

## 27. Built-in chat with operator-managed AI credentials - November 7, 2026

Confirmed owner correction: ComPlix supplies project chat. End users never enter AI provider keys. Decision 26's per-user key flow was an incorrect interpretation and is superseded; retain it only as implementation history. The operator configures NVIDIA once on the backend. The browser cannot supply either a key or model to the chat procedure.

Implemented: operator NVIDIA_API_KEY/NVIDIA_MODEL optional environment declarations; no key means an honest unavailable state, while other app features remain usable. A private ignored .local/backend.env file feeds the local publish helper, which forwards only the named provider settings to SpacetimeDB's protected environment. Backend-only configuration does not use Vite env files. No real credential has been requested/read by development validation, and no quota is used in tests. See README for setup. SpacetimeDB environment values persist between publishes; emptying the local file does not revoke a stored key.

Project chat is connected to the existing authorized procedure/job records. Each accepted turn records the member's request, immutable context and sanitized reply, with optional draft files. Successful discussion can return no files; code changes return a complete candidate file set. Context includes up to six recent successful turns (replies capped at 2000 characters for context), latest draft files, saved guidance/technologies and explicitly selected references within the existing 64 KiB cap. Authorized collaborators read shared turns through subscriptions; viewers cannot send. Existing history controls also delete conversation turns. Current 20-job prototype history cap applies to chat; this is not a long-term conversation design.

Routine bounded defaults: private per-identity usage counters allow five new requests per minute across projects; replayed request IDs do not spend a second allowance. Counters persist separately from deletable history. One active request/project, token/time/output limits and no automatic retries remain. These are prototype controls, not a global spend ceiling. Rate plans, operator budgets and durable conversation/orchestration design remain open. No component is promoted/validated and no generated code is executed.

Official references checked for this correction: [AI calls from modules](https://spacetimedb.com/docs/how-to/app-patterns/call-ai-model/) explicitly describes provider credentials kept in database environment and private usage controls; [environment variables](https://spacetimedb.com/docs/databases/environment-variables/) documents declarations, protected settings, process-environment publication and preservation; [NVIDIA inference](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer) documents the structured response options. Live NVIDIA output and E2B remain unverified.

## 28. Workspace navigation correction — November 7, 2026

The owner's explicit feedback rejects the earlier tabbed workspace design. Project lists, project components, project settings, guidance, references, sharing, organizations, and invitations are separate pages with URL-backed navigation and browser back/forward support. Each page renders only its own content; do not retain hidden tab panels. This supersedes the tab-navigation choices in the earlier “Workspace navigation” and “Frontend ownership and shared-space clarity” entries. Keep the existing project-card, shared-project filter, component workspace, and settings behavior.

## 29. Frontend visual design guide — November 7, 2026

The owner designated [frontend-design-guide.html](./frontend-design-guide.html) as the current frontend visual reference. Follow its organic sage/forest-green palette, semantic light/dark theme tokens, typography, soft horizontal navigation, and URL/page mockups. Light is the default; the UI has a user-toggleable dark theme. Use `/projects/:id/components` as the canonical project-workspace route, with Components, Design guidance, and Settings as the primary project navigation. Preserve product truth and existing backend permissions; mockups are not permission to claim unavailable generation/build/preview behavior. See [design-guide.md](./design-guide.md) for implementation boundaries.

## Create actions use popup dialogs — November 7, 2026

Owner requested that Create project, Create organization, and Create invitation actions open popup modals rather than inline forms. Use accessible native modal dialogs with a visible cancel/close action and preserve form values on failure. Close a dialog only after its create request succeeds; preserve the existing reducer authorization and error handling. Other edit/manage forms are outside this request.

## Organization workspaces and project-only invitations — November 7, 2026

Owner approved organization management modeled on project workspaces: `/organizations` remains a card directory; managing an organization opens `/organizations/:id` with distinct Overview, Projects, Members & invitations, and Settings pages. Projects shown there remain limited to the caller's authorized projects and open in their normal project workspace. Organization owners and admins may rename; existing organization/member management rules remain otherwise unchanged.

Owner approved project invitations that can grant access to the project alone, without organization membership, alongside organization-only and organization-plus-project invitation choices. Project-only acceptance grants only the selected project's viewer/editor role. The explicit `project_access` grant provides access; organization membership or administrator status is not inferred. Continue project-isolated subscriptions/views and remove organization-linked grants when the member leaves or is removed. Online collaborator presence/activity in project docs is future work.

## Chat latency and abandoned-request recovery - November 7, 2026

Owner observed an AI request still generating after 374 seconds, beyond the configured 60-second HTTP timeout. Exact interruption/provider cause remains unconfirmed; filtered backend log inspection did not establish it. Found a definite lifecycle gap: a committed generating row had no deadline if the procedure was interrupted or finalization failed.

Implemented a private scheduled deadline per NVIDIA job at 90 seconds. It marks only active NVIDIA jobs failed; late results are ignored by the existing state check. Re-registering a verified profile or queuing work also expires authorized stale jobs, including jobs created before deadlines existed. This is a bounded recovery mechanism, not a general worker/retry system. No automatic paid retries. Cancellation/deadlines discard results but do not guarantee stopping upstream billing or execution.

Routine latency adjustment: set reasoning_effort to none instead of low for interactive requests, retaining the model and 4096-token bound. NVIDIA documents none as disabling reasoning tokens: https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer . Actual latency improvement remains unmeasured without a live request. Responses still arrive complete rather than stream. UI now shows elapsed time, overdue guidance and a directly accessible Cancel reply action; a 75-second client confirmation limit and attempt guards prevent a lost RPC from indefinitely holding the local sending state.

Scheduler reference: https://spacetimedb.com/docs/tables/schedule-tables/ . onSchedule callbacks are private; deadlines are created transactionally with jobs. Production deadline is 90 seconds; automated tests instrument only the abandoned-job fixture to expire at two seconds.


## Stack-independent workspace - November 7, 2026

Confirmed owner correction: the workspace is stack-independent. Adapters own file/generation conventions, dependencies, compilation, validation, preview lifecycle and export preparation. React and Blazor are initial adapters. External isolated runtimes are allowed; browser compilation is optional. Unsupported targets have no generic compiler fallback. Tested runtime support remains separate from requested technologies.


## Direct editor and chat workflow - November 7, 2026

Confirmed owner clarification: users edit multi-file component drafts directly beside component/chat inspection. Gemini is intended to coordinate conversation and call Nemotron for generation. Both manual and generated changes use a shared draft workspace, with autosave and adapter checks before promotion. The existing direct Nemotron chat is a transitional implementation, not Gemini orchestration.

First increment: editable checkpoints are scoped to one project and one generated candidate file set, with optimistic revision checks. Provider job responses remain immutable. Selected-draft chat flushes autosave, captures the exact saved revision, and rejects stale completion if that revision changes during generation. This checkpoint model does not yet establish stable per-component identity, validated current revisions or recovery. Candidate file sets may contain multiple Common/composed components. Gemini model/version, credentials and coordinator implementation remain to be connected; no provider replacement or paid call is performed by this increment.


## Gemini coordinator with Nemotron generation - November 7, 2026

Confirmed: owner selected Gemini Flash for development because budget is limited. Use operator-configurable GEMINI_MODEL, defaulting to the currently documented stable gemini-3.8-flash, and backend-only GEMINI_API_KEY. Never ask end users for keys. Source now routes chat through Gemini; it can answer directly or request one narrowly scoped Nemotron generation tool. The direct public NVIDIA procedure is removed; historical NVIDIA jobs remain readable/editable. No fallback bypasses a missing Gemini configuration.

Bounded prototype implementation: at most two Gemini calls and one Nemotron call per accepted turn, existing five-turn/minute identity limit, no automatic retries, LOW thinking for Gemini 3, bounded context/output and existing 90-second job deadline. This is not a hard monetary budget. Tools cannot supply project IDs, commands, credentials or validation/promotion claims. Stack support and authorization/source revisions are enforced by the application. Live account/model acceptance, background orchestration, actual builds/previews and validated promotion remain open.
## E2B preview implementation — November 8, 2026

Confirmed: owner authorized building React and Blazor E2B templates and short live sandbox verification, including credit consumption. The owner requires one stack-independent component display. Both adapters therefore use the shared Code/Docs/Preview workspace and a separate-origin iframe; the adapter chooses the internal toolchain. Standalone Blazor WebAssembly is the initial internal preview host, without constraining a consuming application's render mode.

Superseded by "Sandbox-hosted previews" below. Original direction: an operator-controlled loopback Node preview service reads authorized saved SpacetimeDB drafts, builds in disposable offline E2B instances and serves bounded static artifacts. Builds require an explicit user action; a failed replacement preserves the previous preview. Dependency support is pinned and explicit. This establishes local preview execution, not authoritative validation/promotion or hosted production routing. Setup and limits: [preview-runtime.md](./preview-runtime.md).


## Component-scoped conversations - November 8, 2026

Accepted owner specification: stable project-owned components grouped into Common and Compositions, component-specific draft context and chat, URL selection, native creation/clear dialogs, and transcript clearing that preserves files and persistent identity rate counters.

Implementation retains job-based immutable results and revisioned checkpoints, appending defaulted componentId=0 for existing records. Legacy jobs remain available without silently inventing component ownership. Private component/component_chat_message tables expose caller-scoped authorized views. The existing generateProjectChat procedure accepts optional componentId, verifies its project and source-draft ownership, and uses the selected thread's last six messages. Compositions receive project-local Common documentation/declaration contracts, never dependency implementations as editable candidates. Clear deletes only message rows, cancels that component's active request to prevent late replies, and leaves jobs/checkpoints/counters intact. It is a conversation reset, not erasure of historical job snapshots.

Creation seeds documentation and a minimal React or Blazor component when a matching adapter exists; arbitrary stacks receive documentation without substituted code. The optional initial prompt is submitted through the existing authenticated provider procedure after creation succeeds; provider failure retains the created component and is reported separately. Existing one-active-job/project and 20-job prototype history limits remain. Starter records count toward that retained history limit. No automatic migration/assignment of legacy project-level conversations, promotion, or dependency implementation edits is introduced.

Schema changes follow official [automatic migration rules](https://spacetimedb.com/docs/databases/automatic-migrations/) and [caller-scoped view behavior](https://spacetimedb.com/docs/functions/views/); actual tests use the installed 2.14.1 server. Operator credentials and isolated preview execution remain unchanged.


## Chat request authentication lifetime - November 8, 2026

Owner reports session-expired errors inside chat while the browser remains signed in. A procedure retains its original RPC JWT even when browser OIDC renewal produces a new token. Routine correction: validate issuer/audience/verified profile/token expiry at job acceptance; subsequent internal checkpoints use that accepted identity and recheck the current user record, project edit grants, cancellation, source fingerprint/revision and existing 90-second deadline. Expiry of the original token alone no longer aborts already accepted work. New requests/reducers still require an unexpired token; grant revocation still prevents provider continuation/result acceptance. No token-expiry check was removed from public entry points.

Browser renewal starts 120 seconds before the earliest token expiry, covering the bounded chat lifetime. Background silent renewal does not itself replace the workspace with a sign-in progress screen. Credentials remain tab-scoped in sessionStorage. Provider failure reporting retains fixed safe NVIDIA parse/truncation errors and identifies Gemini/NVIDIA transport failures without persisting exception text, secrets, provider bodies or retrying.

Reviewed official [SpacetimeAuth ID-token integration](https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/) and [OIDC client renewal settings](https://authts.github.io/oidc-client-ts/interfaces/UserManagerSettings.html), plus installed SDK/client implementation. The user's particular historical provider failure cannot be reconstructed from the previously generic diagnostic; no new paid provider request was made.


## Actual credential expiry is authoritative for browser renewal - November 8, 2026

Follow-up correction: live local logs locate the reported session-expired failures at create_component, before AI coordination. The preceding in-flight JWT explanation did not establish the cause of these entry-point failures. Browser renewal used profile.exp from OIDC user data, which can differ from the actual encoded ID token after user-info merging or stale session state. Read the ID token exp directly for scheduling, bounded by access-token expiry; invalid or missing expiry fails closed. This is client scheduling only; signature, issuer/audience, profile and authorization checks remain backend responsibilities. No database schema or published module change is required for this follow-up.


## Automatic project references in chat - November 8, 2026

Owner decision: every saved reference belonging to the current project is automatically included in Gemini chat context and, when code generation is requested, the same reference snapshot is included for Nemotron. Users do not select references per message. The backend resolves references from the authorized project rather than trusting client-supplied reference IDs.

Retain the existing 64 KiB complete-snapshot limit. If all saved references plus the remaining project/request context do not fit, reject before creating a job or calling a provider, and report a clear remediation. Never silently omit or truncate reference documents. Existing per-file and project reference-count upload limits are unchanged; therefore a project with an oversized set may need its references shortened or removed before chat can proceed. Historical job snapshots remain immutable when source references are later removed.


## Gemini owns bounded generation planning - November 8, 2026

Owner correction: users talk to Gemini; Gemini is responsible for the Nemotron implementation brief. Telling end users to reduce a Nemotron request is inappropriate. The prior complete-replacement response requirement made Nemotron repeat unchanged source/docs within 4096 tokens.

Implemented: Gemini plans one focused change with 1-6 exact changed-file paths and a concise implementation brief, knowing the existing total output limit. Broad/ambiguous work is discussed or clarified before calling generation. Nemotron returns complete content only for planned changed files; application code merges these with the saved candidate set, preserving unchanged/manual files and validating the complete result. Unsafe/duplicate plans, writes to supplied Common dependency roots, and missing/unplanned result files are rejected. This tool does not delete files; deletion remains unsupported. Component/project authorization and revision checks remain in application code.

A truncated/incomplete Nemotron response becomes a structured generation_incomplete tool result for Gemini, without partial source or raw provider data. Gemini supplies the user-facing explanation and a focused next step; the current draft is preserved. There is still at most one Nemotron call and two Gemini calls, no automatic Nemotron retry or raised token/time/cost limit. Provider failure explanation is a chat reply with no files, not a successful code change or promotion. Exact live model behavior remains unverified.

Official references: [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling?hl=en) for required arguments and returning tool results; [NVIDIA model API](https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer) for output token bounds and structured responses. No new dependency, schema migration or provider configuration.


## Chat history is not a lifetime request quota - November 8, 2026

Correction following the owner-reported history-limit block: the 20-record cap applies only to retained developer mock jobs. Saved real chat, successful/failed provider jobs and starter drafts do not impose a lifetime chat limit and do not consume mock-history slots. All existing rows/checkpoints/transcripts remain intact; no automatic pruning or rate-counter reset is introduced. Five requests per identity per minute, one active job/project, bounded provider calls and the 64 KiB context limit remain enforced. Long-term retention, pagination and storage budgets remain future/open; this local prototype does not claim bounded total historical storage.


## Sandbox-hosted previews; no extra server - November 8, 2026

Owner constraint: ComPlix runs only SpacetimeDB and the frontend server. This supersedes the loopback Node preview controller and gateway, which were removed. Owner direction: draft source stays in SpacetimeDB; previews rebuild on save with a loading screen.

Implemented: the SpacetimeDB procedure `build_component_preview` authorizes the editor and the exact saved revision, then pushes files to an E2B sandbox using the operator key held in module configuration. Each template bakes in a small preview agent that is claimed once, builds in the background and serves the latest successful output on the sandbox's own origin under a random capability path. The private `component_preview` table holds write keys and sandbox IDs; the view exposes only the URL, revision and expiry. Sandboxes are reused across saves, with a 10-minute idle timeout extended on each save.

Defaults chosen by the agent (the owner did not answer these; revisit if needed):
- the preview URL is a secret link without a per-request access recheck;
- builds run offline, so only pinned template dependencies are available;
- the idle timeout is 10 minutes.

E2B detail verified live: offline sandboxes require a traffic-token header for inbound requests unless `network.allowPublicTraffic: true` is set. An iframe cannot send that header, so public inbound traffic is enabled while outbound internet stays blocked. Supporting another stack means adding a template plus an adapter entry. Hosted production routing, validation/promotion and exports remain open.

## Stack matching by framework and language - November 8, 2026

The owner's live preview was rejected with "Unsupported target stack". Adapter selection required exact strings for all four fields (for example `Tailwind CSS` and `shadcn/ui`). Following the owner's request that any React + TypeScript or Blazor component should render, selection now uses only framework and language: React (not React Native) with TypeScript, or Blazor with C#/.NET or a blank language. Styling, extra libraries and version text no longer block preview or generation instructions. The preview hosts still provide only their pinned dependencies (Tailwind/shadcn utilities, or Bootstrap), so other imports fail visibly at build time. The same rule drives generation-instruction selection. There is still no generic or other-framework fallback.


## Shared frontend components - November 8, 2026

Owner requested extracting common frontend UI into `src/components`. Button, Badge and ChatMessage now share repeated markup; the existing Modal and ProjectCard live alongside them. Reuse native elements, current theme classes and native button submit defaults without adding dependencies. Feature state and backend calls remain in their feature modules. These application components are distinct from generated project Common libraries.


## Comment-driven agent proposal revision - November 8, 2026

Owner clarified editor-comment instructions and requested revising realtime-agent-implementation-proposal-v2.md. The proposal now reuses buffered generation, separate candidates and logical cancellation under current architecture/budgets. Marker syntax, automatic versus explicit triggering, idle interval and completed-comment handling remain proposed/open. No implementation or new worker/repair/promotion policy was approved.

## Project setup wizard and starter components - November 8, 2026

**Confirmed by owner:**
- Setup is required for new projects. At least one of the questionnaire or an uploaded document is required.
- PDF uploads are supported.
- Starter components are Button, Text input, KPI card and Modal, selectable with checkboxes.
- The framework is chosen from a dropdown, with libraries as checkboxes.
- Starter generation runs server-side, with a loading screen.

**Implementation choices (routine, reversible):**
- **Stack picker:** an "Other" option with free-text fields keeps requested technologies open-ended, as AGENTS.md requires. Only React + TypeScript and Blazor + C# can generate starters.
- **Direct API:** `createProjectWithDetails` stays for direct API/test use and creates projects that are ready immediately. The UI uses `createSetupProject`. This only skips a UX step; it has no security impact.
- **Questionnaire storage:** answers are stored as JSON on the guidance row and rendered into the guidance text fields that generation reads. Later free-text guidance edits do not rewrite the JSON; the text fields are what generation uses.
- **Starter generation:**
  - It runs one component at a time through a scheduled procedure, as the user who started it, with edit access rechecked.
  - It does not count toward that user's 5-per-minute chat window, but it is bounded to at most four components per run.
  - Failures are isolated and retryable.
  - Starters are told to be self-contained, with no cross-component imports, because previews build each component on its own. There is no separate theme/tokens component.
  - Outputs remain unverified drafts; promotion is unchanged.
- **PDF handling:**
  - Text is extracted in the browser (pdf.js legacy build, never rendered).
  - The server stores the original bytes (at most 2 MiB) and the text (at most 32 KiB). It validates the PDF header and the text, but cannot prove the text matches the PDF.
  - Both are treated as untrusted context.
  - Scanned or image-only PDFs are rejected.

**Open:**
- Whether to store bytes for large PDFs at all, since every subscriber of `visible_references` receives them.
- Whether starters should share a generated theme/tokens foundation once previews can include dependencies.


## Automatic editor instructions - November 8, 2026

Owner authorized implementation and explicitly chose automatic execution after typing stops. Prototype defaults: JSX `@complix` comments in TSX and Razor markup `@* @complix ... *@` comments; two idle seconds after successful autosave while Code is open; retain comments; explicit enable/rerun for inherited or previously processed markers. These syntax/timing/retention details are implementation defaults, not separate owner decisions. Persist instruction-to-job identity and admission blocks, reuse existing Gemini/Nemotron budgets/context/rate limits and preserve newer human drafts. Logical Stop rejects further calls and late results without aborting in-flight HTTP or destroying the working preview. Automatic repair and verified promotion remain future scope.


## Editor instruction receipt acknowledgment - November 8, 2026

Owner requested a visible acknowledgment when an @complix instruction is detected. On successful backend acceptance, persist one system message in component chat quoting the instruction and file location before provider calls. The message confirms receipt by ComPlix and explains that Nemotron handles code changes; it is not a fabricated model response and adds no provider call. Rejected requests produce no receipt acknowledgment.

## Editor instruction reliability - November 8, 2026

Owner report: an `@complix` comment was neither picked up nor acknowledged.

**Root causes:**
- **Narrow comment rule:** only JSX `{/* */}` comments counted.
- **One failed save stopped everything:** the local server log showed repeated "Your session expired" rejections of `save_component_draft` and no `run_editor_instruction` calls at all. The instruction pipeline only starts after a successful save, and one failed save stopped autosave until a manual retry.

**Changes (owner-directed fix; behaviour changes noted):**
- **Wider comment rule:** any real comment that *starts* with `@complix` now counts in `.tsx/.ts/.jsx/.js` (line, block or JSX comment), as does a Razor HTML comment. Babel still excludes strings, template literals and regexes, and comments that only mention the marker later stay inactive.
- **Seamless renewal:** SpacetimeAuth ID tokens last 15 minutes. Renewal now starts 5 minutes before expiry (was 2), and the workspace swaps to the renewed connection only after it is subscribed, instead of resetting the workspace and unmounting the editor.
- **Waiting saves:** draft saves rejected for an expired session or a lost connection keep local edits, show "Waiting to save…" and retry automatically on the next connection. Conflicts still require a decision.
- **Instruction retry:** a run rejected for those reasons retries on the next connection. The server does not mark it blocked, because its own session check fails first.

**Unchanged:** the per-mutation expiry check on the server.

## Editor instructions in the chat conversation - November 8, 2026

Owner request: show recognized `@complix` comments in the chat window, with a thinking indicator, the response and the edited portion, as a conversation. Implementation choices (reversible UI decisions):
- **Instruction panel moves into the chat.** A detected comment that hasn't been sent yet appears as the user's dashed message bubble ("from your comment in Button.tsx:3") with its status. Once sent, it continues in the transcript as a normal turn.
- **Runs in any view.** Because the panel now lives in the chat, instructions run whenever the component is open, not only in the Code view.
- **In-conversation progress.** Component chats show progress as a typing bubble (animated dots, stage, elapsed time, Cancel reply) instead of the separate activity box. The separate "Stop generation" button was removed as a duplicate of Cancel reply.
- **Edited portion in replies.** Assistant replies with files show a line diff against the code the request started from: changed lines with two lines of context per file, at most 60 lines each, plus Open in editor. This also applies to ordinary chat edits.
- **Quieter acknowledgment.** "I see your @complix request…" is shown as a muted system note.


## Full-library ZIP handoff - November 8, 2026

Owner approved implementing full-library source ZIP export with human/agent documentation and every uploaded project reference. Use the newest completed non-mock source job per stable component plus its saved checkpoint; keep unverified labels and fallback to completed content after failures. One authorized backend snapshot feeds browser ZIP assembly; explicit project viewers may download. Include original reference bytes and stored extracted text, saved design/technology guidance, component docs/examples, README.md, AGENTS.md and a revision/checksum manifest. Export is a source handoff, not npm/NuGet packaging or verified promotion. Implementation defaults: 64 MiB uncompressed cap, preserve rooted paths and component-local layout, reject conflicting/unsafe paths, report missing source/dependencies and placeholders, and recheck access at download. Selective exports and clean-project certification remain future.


## Temporary agent-code highlights - November 8, 2026

Owner requested a roughly ten-second highlight that fades away on newly added ComPlix code. Added/replaced lines in newly completed provider drafts receive a theme-aware green background in the code editor, using the existing line diff and original request snapshot. The ten-second window starts when the result arrives and is shared across file/view switches. Existing history, reloads, mock/placeholder output and unchanged lines do not trigger it. Typing clears that editor highlight to prevent displaced line markers. Reduced-motion users receive a steady highlight that clears at the same deadline.


## Remove the Design guidance page - November 8, 2026

Owner requested removing the standalone Design guidance page. Remove its navigation, route view, unused frontend component and styles; legacy guidance URLs resolve to Components (or the existing setup gate for unfinished projects). Retain all saved guidance, questionnaire intake, backend revision/access rules, generation context and ZIP design.md export. No data deletion or backend migration is part of this UI removal. This supersedes earlier guidance-page navigation requirements.

## Shared, silent sign-in sessions - November 8, 2026

**Owner decision:** keep the session shared across tabs. This supersedes the earlier confirmed choice to retain sign-in only until the tab closes. Prompt: frequent re-authentication was disrupting work.

- **Shared storage:** OIDC user state (ID, access and refresh tokens) is stored in `localStorage` and shared by all tabs. It persists across reloads and browser restarts until the refresh token expires or the user signs out. PKCE state stays per tab. Sessions saved per tab by earlier builds migrate automatically, keeping the fresher copy.
- **Single refresher:** renewal runs under a Web Locks API lock. A tab that waited adopts a session another tab already renewed instead of reusing a possibly rotated refresh token. Tabs follow each other through `storage` events, and signing out anywhere signs out everywhere.
- **Expired but renewable is not signed out:**
  - The Sign in screen appears only when there is no session, no refresh token, or the provider refused the refresh token.
  - An open workspace stays mounted while renewing.
  - A fresh load shows "Restoring your session…".
  - "Expired" is computed from the current token on each render. A timer flag previously fired before the session loaded and flagged valid sessions as expired for one render.
- **Automatic recovery:** a refused refresh token triggers one automatic provider redirect per tab per 5 minutes, so it can never loop. The return path is validated as a same-origin app path and restored after sign-in.

**Tradeoff (accepted):** anyone with access to the same browser profile stays signed in until sign-out, and tokens in `localStorage` persist on disk. Exposure to script injection is unchanged from `sessionStorage`.

**Unchanged:** server-side expiry is still enforced on every mutation.


## Existing component import within intake: implementation plan - November 8, 2026

Owner requested implementation instructions for optional existing-component uploads alongside current intake. Revised create-project-from-components-proposal.md around preserving the form, reviewed ZIP import into an existing setup project, actual source/draft provenance, references and all source consumers. Skipping default starters is the working direction. No implementation or deployment was authorized by this documentation request.

**Owner decisions after review (November 8, 2026).** Existing-component ZIP import is approved in scope as the final feature. This brings ZIP import forward from the system plan's deferred list.

- **Setup gate:** imported components alone satisfy setup. The user can still add questionnaire answers, documents, explicit starters and later components.
- **Guidance:** intake answers and technologies stay authoritative. Archived design.md becomes a reviewed reference.
- **References:** all-or-nothing restoration, with no source-only mode.
- **Limits:** reuse existing per-draft and per-reference limits, with a 64 MiB aggregate cap matching export.
- **Scope:** both ComPlix and ordinary ZIPs.

**Design consequences recorded in the plan:**

- **Transport and commit:** staged chunk upload into a private table with one atomic finalize, because reference bytes exceed a single reducer request.
- **Provenance:** imported source is stored as mode 'imported', behind a new isSourceDraft predicate; provider accounting stays on isChatMode.
- **Paths:** ordinary ZIP components are re-rooted under Common/ or Compositions/, and broken cross-component imports are reported rather than rewritten.

**Implementation defaults (November 8, 2026, increments 1-4; working defaults, adjustable):**

- **Limits:** 1 MiB upload chunks, 96 MiB payload cap (64 MiB of content plus base64), 200 components per import, staging expires after 24 hours, one in-flight import per uploader and project.
- **Ordinary ZIPs:** build, dependency and tool folders, credential-like files, lockfiles, binaries and unsupported types are excluded with visible reasons. Grouping and category are suggestions; the user's mapping decides. Cross-component relative imports are reported, never rewritten.
- **Conflicts:** archived references cannot yet be renamed in the UI, so clashes are resolved by removing the intake upload.

## Uplift components, Tailwind and the B&W style guide - November 8, 2026

**Owner decisions:**

- **Components:** adopt the "uplift" component export (a ComPlix-generated draft of the app's own components) as the shared frontend components.
- **Styling:** add Tailwind CSS v4 to the builder frontend. This supersedes the November 7 choice of local CSS without a Tailwind pipeline.
- **Visual authority:** restyle the whole app to the uplift B&W Box + Multi-Pastel style guide. This supersedes docs/frontend-design-guide.html (sage/forest) as the visual authority.

**Implementation choices (working defaults):**

- **Tree:** `src/components/Common/` (Button, Badge, Tabs) and `src/components/Compositions/` (Modal, ChatMessage, ProjectCard, CodeEditor). Compositions reuse Common primitives, matching the Common-first rule ComPlix applies to generated libraries. These remain application components, separate from generated project libraries.
- **CSS layers:** Tailwind's theme and utilities are imported without preflight. App rules sit in `@layer base` below utilities, so component utilities win without rewriting existing markup.
- **Theme:** `dark:` follows `data-theme`. Semantic token utilities (`bg-canvas`, `text-ink`, …) map to the style-guide CSS variables.
- **Variants added:** Button `nav` and `link` cover navigation tabs and list links, which used to be styled by context CSS.
- **Fixes during integration:** described in src/components/README.md.
- **Archive:** the export stays untouched in `src/components/uplift-*`. It is excluded from TypeScript and Tailwind scanning.
- **Dev server:** Vite no longer watches `.local` and `.tools` (gigabytes of local data and browsers). Watching them delayed the first CSS request by about 40 s on Windows.
- **Fonts:** Inter and JetBrains Mono load from Google Fonts in index.html, as the style guide does. This is a new third-party request from the app.

Open: whether to delete the uplift archive after review; whether the HTML guide (docs/frontend-design-guide.html) should be replaced or marked historical.
