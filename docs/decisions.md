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

## Workspace navigation � November 7, 2026

Confirmed owner request: simplify the frontend, reduce scrolling with tabs, and use shadcn/ui.
Implemented six task-focused workspace tabs with an always-visible project selector.
Tabs follow the shadcn/ui Radix composition, using @radix-ui/react-tabs and local CSS
instead of adding a Tailwind build pipeline. Inactive panels stay mounted and are
hidden with CSS to preserve drafts/autosave while navigating. Requested technologies,
permissions, backend rules and generated output requirements remain unchanged.
Source: https://ui.shadcn.com/docs/components/radix/tabs
