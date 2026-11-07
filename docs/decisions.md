# ComPlix decision baseline

Recorded and revised November 7, 2026. The original planning baseline is preserved below; the owner subsequently authorized the first local implementation milestone.

## Authority and status

Read AGENTS.md and the original five planning documents and the project memory records. ComPlix-system-planning.md v1.2 supersedes conflicting October 22 v0.6 documents; later explicit owner decisions take precedence. IDs below refer to its decision register. Confirmed, working direction, proposed, open, and future are distinct statuses.

## Confirmed requirements

- D01-D05: Generate reusable components and compositions, not complete applications. Generate each project's Common foundation before compositions. Each project has one output stack and its own isolated library. Both React + TypeScript + Tailwind + shadcn/ui and Blazor + Bootstrap are required prototype outputs. The builder frontend uses React + TypeScript.
- D06: SpacetimeDB is the selected backend direction by explicit owner decision on November 7, 2026. It replaces Flask + SQLite before any application code exists. React/TypeScript and both output profiles remain confirmed.
- D08, D10: Maintain evolving project design.md guidance. Reuse the generation workflow while enforcing project context and write isolation in application code.
- D12: Autosave meaningful draft checkpoints. Required checks gate automatic promotion of complete related changes. Failed/incomplete generation preserves the current library; source, docs, examples and dependencies stay synchronized.
- D16-D19: Preview actual generated code in both runtimes. Deliver comprehensive readable/exported documentation and IDE hover help, plus full/selective downloads. Initially one saved project per client. Clients supply their API key during onboarding; provider and credential lifecycle remain open.
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

Angular/additional profiles, multiple projects per client, product-funded model access, IDE/Figma integrations, arbitrary historical restoration, public sharing, billing, marketplace, package publishing and collaboration remain future/uncommitted. Full application generation remains outside the product boundary.


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
