# ComPlix — System Planning Document

Version 1.5 · November 7, 2026
Audience: project owner, collaborators, and future AI development assistants  
Status: consolidated planning baseline; no implementation or deployment is claimed.

## 1. Purpose and decision status

ComPlix generates and maintains custom, reusable UI component libraries. This document consolidates the original product documents, saved planning notes, and subsequent conversation through the renderer discussion and the November 7, 2026 selection of SpacetimeDB. It focuses on internal behavior and architecture. Screen layouts were initially deferred; the owner-confirmed workspace direction is recorded in section 24 and detailed in [design-guide.md](./design-guide.md).

Status labels:

- **Confirmed:** explicitly requested or agreed direction.
- **Working direction:** approach carried forward in discussion, with details still to validate.
- **Proposed:** recommendation not separately approved.
- **Open:** a choice still required.
- **Future:** outside the initial prototype.

A general acknowledgement does not approve every suggested tool, version, or operational detail. This document records those distinctions rather than filling gaps with assumptions. It is a new consolidated document; the four original documents and earlier notes have not been rewritten.

## 2. Decision register

| ID | Area | Current position | Status |
| --- | --- | --- | --- |
| D01 | Product boundary | Generate components and complex compositions, not complete pages or application backends | Confirmed |
| D02 | Reuse | Generate a Common foundation first; later components reuse it | Confirmed |
| D03 | Project technology details | Open-ended requested frameworks, languages, styling, libraries and relevant versions; isolated library and guidance per project; verified generation support tracked separately | Confirmed owner clarification, November 7, 2026; supersedes fixed-profile-only project model |
| D04 | Prototype outputs | Blazor + Bootstrap and React + TypeScript + Tailwind + shadcn/ui | Confirmed |
| D05 | Builder frontend | React + TypeScript | Confirmed |
| D06 | Builder backend | SpacetimeDB replaces the Flask + SQLite direction | Confirmed owner decision, November 7, 2026; TypeScript/local foundation implemented; hosted deployment open |
| D07 | Database tooling | SpacetimeDB module schema and publishing/migration workflow | Direction follows D06; exact workflow/version open; SQLAlchemy/Alembic proposal superseded |
| D08 | Design memory | Capture evolving preferences in project design.md and use them in agent work | Confirmed |
| D09 | Preference authority | Structured database records generate design.md | Proposed |
| D10 | Agent reuse | Reuse the workflow while isolating each project's context and writes | Confirmed direction |
| D11 | Generation architecture | Background worker, scoped tools, separate build execution | Working direction; queue and isolation tooling open |
| D12 | Saving | Autosave draft checkpoints; validated results automatically become current | Confirmed |
| D13 | Validation | Build, contracts, dependencies, runtime preview, and relevant interactions | Accepted baseline; exact checks/tools open |
| D14 | Recovery | One-level undo/redo of the latest complete change set | Working prototype direction following discussion and acknowledgement |
| D15 | Historical restoration | Arbitrary older-component restoration deferred | Working prototype boundary |
| D16 | Rendering | Actual-code previews using separate React and Blazor environments | Confirmed requirement; proposed hosting design below |
| D17 | Documentation/export | Comprehensive synchronized docs, IDE hover help, full/selective downloads | Confirmed |
| D18 | Ownership and sharing | Multiple projects per user; private projects need no organization; optional organization association and project-specific sharing with organization members | Confirmed owner clarification, November 7, 2026; supersedes mandatory organization ownership and one-project limits |
| D19 | AI access | Client supplies API key initially; provider/model and retention undecided | Confirmed direction |
| D20 | Delivery | Original goal is a limited-budget, three-week prototype | Existing scope constraint; current dates and feasibility require reassessment |

## 3. Product boundaries and user journey

### Components rather than pages

A component provides a defined UI capability with documented inputs, callbacks, and integration points. It may own local UI state and contain other components. Its size alone does not make it a page.

Examples in scope include Button, Input, searchable Select, DataTable, LoginForm, and FilterPanel. These are examples, not an approved starter inventory.

A LoginForm may validate fields and expose a submission callback. The consuming application supplies authentication and navigation. A customer-management screen that coordinates routes, permissions, database access, and CRUD workflows is outside component generation scope.

Preview examples may supply mock data and demonstration handlers, but remain separate from reusable implementation files.

### End-to-end journey

1. Create a project and complete the required technical questionnaire.
2. Supply a style guide or, if absent, complete a style questionnaire.
3. ComPlix establishes technical and design guidance, then automatically generates Common starter components.
4. Browse actual-code previews, APIs, examples, and documentation.
5. Use chat to request additions, complex compositions, individual edits, or library-wide style changes.
6. ComPlix generates drafts, checks them, and automatically makes successful changes current.
7. Refine by conversation or undo/redo the latest change.
8. Download all components or a selected subset.
9. Reopen the project and optionally add references later.

No mandatory extra style-approval screen has been established. Incomplete or contradictory instructions may require targeted clarification.

## 4. Common components and dependency logic

**Confirmed:** Common is the reusable foundation within each project's own stack. A React library uses its React Common implementations; a Blazor library uses its Blazor implementations. Cross-framework source sharing and automatic translation are not required.

Proposed generation rules:

1. Search the existing library before implementing a reusable UI element.
2. Use a suitable Common component through its public API rather than copying its source into a composition.
3. If a reusable capability is missing, deliberately extend Common and check affected consumers.
4. If a building block is absent, add it to Common and then compose with it.
5. Keep composition-specific behavior in the composition.
6. Use ordinary layout markup where appropriate; do not manufacture a Common component for every HTML element.

Proposed dependency constraints:

- Common may depend on shared styles and other Common components.
- Common must not depend on higher-level compositions.
- Compositions may depend on Common and other compositions.
- Reject circular dependencies.
- Track dependencies for validation, export, and recovery.

Existing foundations such as shadcn/ui should be reused or adapted where appropriate. Direct use versus customization versus wrappers remains undecided. Bootstrap does not select an additional Blazor wrapper library.

For shared style edits, identify affected components and explicit local overrides. Prefer changing shared design values when they express the request; code changes may still be needed. Do not silently remove deliberate exceptions.

## 5. Technology boundaries

The **builder stack** implements ComPlix. An **output stack** describes a generated library. These are separate.

| Concern | Current direction | Unresolved |
| --- | --- | --- |
| Builder frontend | React + TypeScript | Build setup, versions, UI styling |
| Builder backend | SpacetimeDB; local TypeScript module with 2.14.1 CLI/server/SDK | Hosted deployment and recoverable OIDC account policy |
| Persistent state | SpacetimeDB tables and transactional module logic | Schema, indexes, backup/restore and durability configuration |
| Schema evolution | SpacetimeDB publishing/migrations | Compatible changes versus explicit data migration; client binding updates |
| External integration service/worker | Recommended for AI, jobs and artifact operations | Language/framework, service identity, leases and process management |
| React output | React + TypeScript + Tailwind + shadcn/ui | Versions, host/build setup, conventions |
| Blazor output | Blazor + Bootstrap | .NET/Bootstrap versions, render mode, interactivity |
| File storage | Database metadata plus external file storage proposed | Local/object storage choice and backup |
| Preview host | Framework-specific preview environments | Hosting and isolation technologies |

Project details record the user's requested frameworks, languages, styling approach, libraries and relevant versions. These choices are open-ended; React/MUI and Angular are examples, not a complete catalog. Projects must not be restricted to the two prototype profiles. Recording a request does not establish generation support.

A generation profile is a proposed versioned, tested configuration of generation/build/preview/documentation/export rules matched against project technology details. It does not replace those details or define which projects may exist. The two required prototype profiles remain the initial implementation targets; additional combinations require verification before claiming support. Multiple requested technologies do not imply automatic cross-framework translation or simultaneous multi-target generation; that behavior remains open.

### Superseded backend history

Before November 7, 2026, Flask/Python + SQLite was the owner's preferred starting direction, with PostgreSQL a possible later move. SQLAlchemy/Alembic, portable relational queries, SQLite foreign-key enforcement, short write transactions and a separately verified PostgreSQL data transfer were proposals for that direction.

The owner explicitly selected SpacetimeDB before any application implementation. Those backend and migration proposals are superseded, not installed dependencies or an ongoing parallel backend. There is no application database to migrate. Python remains an option for an external worker, not a selected backend requirement. General concerns about transaction length, recoverability, project isolation and schema evolution still apply; SQLite-specific contention and PostgreSQL migration triggers no longer govern this plan.

## 6. Logical architecture and responsibilities

These are logical responsibilities, not a requirement to deploy a separate service for every row.

| Part | Responsibility |
| --- | --- |
| React frontend | Intake, chat, library browsing, status, previews, documentation, recovery and downloads |
| SpacetimeDB module | Authorized state transitions, project/job records, atomic promotion and caller-scoped readable views |
| SpacetimeDB tables/module rules | Persist project rules, revisions, dependencies, conversations and design memory |
| Generation coordinator | Context gathering, scoped agent execution, validation/repair sequence |
| Background worker | Executes long-running generation and coordinates builds |
| Stack-specific support | Generation conventions, build commands, preview templates, documentation/export rules |
| Isolated build/runtime environment | Compiles and exercises generated code without application credentials |
| Preview host | Serves runnable output for a specific revision |
| Export assembly | Collects selected code and required shared files, docs and setup instructions |

Recommended: a short reducer creates a durable job record; the frontend subscribes to authorized job/project views for progress. A separately authenticated worker claims jobs and reports checkpoints through guarded module operations. External effects stay outside reducers. The jobs table is a proposed durable work queue, not a built-in exactly-once worker system. No queue product, agent framework, container platform, or hosting provider is selected. See section 19 for verified capabilities and recommendations.

### Agent versus application authority

| Agent responsibilities | Application responsibilities |
| --- | --- |
| Interpret intent and ask necessary clarifications | Enforce user/project access |
| Find and reuse suitable Common APIs | Provide scoped retrieval and file tools |
| Propose/write candidate code and docs | Keep candidates separate from current revisions |
| Extract actionable design preferences | Persist authorized preference changes consistently |
| Repair errors from checks | Execute checks and bound retries |
| Explain results and limitations | Commit revisions and implement undo/redo |

Illustrative tools: read component, find dependencies, write draft, run checks, and record design preference. These are conceptual operations, not finalized endpoint names. No multi-agent architecture has been selected.

## 7. Project isolation and concurrency

**Confirmed direction:** shared workflow implementation, separate project execution context.

Proposed enforcement:

- Every job is associated with one project and authorized user.
- Every tool verifies that requested records/files belong to the authorized project.
- Each job has a separate working directory and isolated execution context.
- Retrieved conversations, preferences, components, and references remain project-specific.
- Jobs can commit only to their associated project.
- Credentials do not enter generated code, documentation, preview files, logs, or exports.

Prompt instructions alone are insufficient to enforce isolation.

Proposed prototype concurrency: one actively modifying generation job per project. Different projects can run independently within resource limits. Undo/redo and promotion must be coordinated with active jobs; stale candidates require reconciliation and revalidation.

## 8. Design memory

**Confirmed:** maintain a living project design.md that lets the agent and future developers understand evolving preferences without reading the entire conversation.

Record actionable meaning rather than vague sentiment:

| Feedback | Interpretation |
| --- | --- |
| “From now on, no shadows on cards” | Future card convention; does not by itself modify existing cards |
| “This form feels crowded” | Local feedback until broader scope is established |
| “Maybe try smaller corners” | Experiment, not automatically a permanent rule |
| “Apply this throughout the library” | Project-wide change request requiring impact checks |

Proposed preference fields: text, scope, status, origin, exceptions, and superseded-rule reference. Scope may be project-wide, a component category, or one component.

Agent behavior:

- Read current guidance before generation.
- Record clear preferences and briefly disclose the update.
- Clarify meaningful ambiguity or conflicting instructions.
- Keep confirmed rules distinct from experiments.
- Distinguish desired future guidance from changes actually implemented.
- Consolidate current rules and preserve a concise history.

**Proposed authority:** structured preference records in the database generate design.md. Avoid two independently editable sources that can disagree. Direct file editing/import behavior remains open.

Undo treatment of a preference recorded alongside code changes is unresolved. The recovery implementation must explicitly decide whether that preference is reversed, retained, or handled separately; otherwise a later generation could recreate the undone change.

## 9. Data model

The following entities are a proposed logical model, not final database tables.

| Entity | Main information |
| --- | --- |
| Client/owner | Identity and project ownership; authentication details open |
| Project | Name, owner, target stack/configuration, current state |
| Design rule | Preference, scope, status, origin, exceptions |
| Reference | Original file/URL, extraction result and provenance |
| Component | Stable identity, purpose, Common/composed classification |
| Component revision | Source files, public API, docs, examples, validation results |
| Dependency | Components/shared resources used by a revision |
| Conversation/message | User/agent messages with project/component context |
| Generation job | Request, starting revisions, status, candidate changes, errors |
| Change set | Related revision changes that become current or are reversed together |

The change-set entity formalizes the agreed grouped-change behavior; exact schema is proposed.

A component's stable identity is separate from its revisions. A job records the component and guidance revisions used to generate its candidate. Before promotion, ComPlix checks whether those inputs have changed.

Files may be stored outside the database, with records tracking identity, location, revision, and ownership. Exact storage format, deduplication mechanism, backup, and cleanup strategy are open.

## 10. Generation lifecycle and automatic saving

### Workflow

1. Queue the request under the project.
2. Load relevant rules, references, stack configuration, and existing component contracts.
3. Determine whether the request creates a component, changes one, or affects the library.
4. Define the component API, behavior, and affected dependencies.
5. Generate source, docs, and examples in a draft workspace.
6. Run required build, runtime, dependency, and behavior checks.
7. Supply relevant failures to the agent for bounded repairs.
8. Recheck the starting project state for conflicts.
9. Make the validated change set current automatically.
10. Report the outcome and retain recovery information.

Proposed states: queued, preparing, generating, validating, repairing, succeeded/current, failed, and cancelled. An ambiguous request may require clarification before continuing; the exact waiting state is open.

### Saving rules

**Confirmed:**

- Persist draft progress at meaningful checkpoints.
- Required checks must pass before a candidate replaces current components.
- Successful changes become current automatically; no routine Apply button.
- Failed or incomplete work must preserve the current working library.
- Keep bounded history for recovery.

Related changes must move together. If SearchField requires a Common Input extension, save both revisions and their documentation/dependency updates as one successful change set.

Proposed consistency mechanism: prepare immutable revision artifacts first, then a short SpacetimeDB reducer verifies the worker, job attempt, starting revision and required checks before atomically advancing current-version references and change-set metadata. External storage is not part of that transaction; pending artifacts, missing files, orphan cleanup and crash reconciliation need explicit handling.

A follow-up such as “make that smaller” should refer to the candidate being discussed. If a new job or preference update changes its starting context, reconcile and revalidate rather than overwriting newer work.

## 11. Validation baseline

The baseline was accepted in discussion; exact tests and pass criteria remain to be specified.

| Check | Required evidence |
| --- | --- |
| Build/type checks | Generated source compiles in its selected supported stack |
| Public contract | Implementation, inputs/callbacks, documentation and examples agree |
| Dependencies | Required components exist, imports resolve, no prohibited cycles |
| Runtime preview | Actual generated code mounts/runs without observed runtime errors |
| Relevant behavior | Requested interactions work in specified scenarios |
| Shared-component impact | Affected consumers remain compatible after Common changes |

A successful compile does not prove visual quality, accessibility, or every interaction. Record what was checked, what failed, and what remains unverified. Define applicable keyboard/focus, responsive, and accessibility checks before claiming support.

Automatic promotion requires all designated blocking checks to pass. The blocking versus advisory classification, retry count, timeouts, and resource budgets remain open.

## 12. Undo, redo, and older-version restoration

**Working prototype scope:** ordinary component editing plus one-level undo/redo of the latest successful complete change set. Arbitrary historical component selection is deferred.

| Operation | Behavior |
| --- | --- |
| Edit again | Agent creates a new candidate; exact historical reproduction is not guaranteed |
| Undo | Restore the complete pre-change component state for the latest successful change set |
| Redo | Restore the exact change just undone, without another AI generation |
| Restore older component | Future candidate based on an older revision; must be checked against current consumers |

Example: a job extends Common Input and creates SearchField. Undo restores the old Input and removes SearchField from the current library together. Redo restores both exact revisions.

Proposed redo rules:

- Browsing or downloading does not clear redo.
- An unpromoted draft does not by itself clear redo.
- A new successful change becoming current clears the old redo option.
- Verify expected project state before undo or redo.
- Revalidate stale active jobs before any later promotion.
- Preserve revision artifacts needed for available undo/redo from cleanup.

Undo/redo must preserve synchronized code, docs, dependencies, and applicable shared styling. Whether design rules and configuration are also part of the reversible set needs an explicit policy.

Storage strategy: retain referenced revisions rather than duplicate all files for each operation. One-level recovery still requires retention rules across sessions, cleanup, failures, and restarts; those details remain open.

## 13. Renderer and preview architecture

**Confirmed requirement:** previews exercise real generated components. An HTML imitation is not proof that Blazor output works.

Proposed implementation:

| Concern | React output | Blazor output |
| --- | --- | --- |
| Preview template | React app with the selected styles and dependencies | Blazor app with selected Bootstrap setup |
| Build execution | Selected React toolchain | Selected .NET/Blazor toolchain |
| Runtime renderer | React component runtime | Blazor component runtime |
| Example harness | Sample props, data and callback handlers | Sample parameters, data and event handlers |
| Hosting | Exact setup open | Depends on selected hosting/render mode |

Generation produces the reusable component plus a separate usage example. The worker assembles the appropriate template with Common dependencies, shared styles, and project configuration, builds it, and runs checks. The preview host serves output tied to that exact revision.

ComPlix's React frontend can embed either framework's preview in an isolated iframe. This is the proposed embedding approach; actual origin, sandbox permissions, network restrictions, authentication, and lifecycle are open. An iframe alone does not isolate server-side builds or protect credentials.

Use one maintained template per supported stack/version profile rather than asking the agent to invent a new preview application each time. Keep example data and demonstration callbacks out of the exported component implementation.

Build and runtime failures feed back into the validation process. Preview startup, idle shutdown, caching, limits, and cancellation remain operational decisions.

**Next critical choice:** Blazor hosting/render mode, since it determines its runtime and hosting needs. No browser-only or server-based mode has been selected.

## 14. Documentation and export

**Confirmed:** every component must be understandable and maintainable by humans and AI without the original generation chat.

Required applicable coverage:

- Purpose, intended uses, boundaries and limitations.
- Framework/dependency versions, imports, configuration and installation.
- Public props/parameters, types, defaults, constraints and allowed values.
- Callbacks/events and payloads; slots/templates/children; public methods.
- Minimal usage and supported variants/states.
- State ownership, binding, validation, loading/error/empty/disabled behavior.
- Shared styles, tokens, local overrides and customization points.
- Implemented responsiveness, semantics, keyboard/focus behavior and known accessibility gaps.
- Child components, utilities, data shapes and external integration points.
- File organization, extension points and maintenance constraints.
- Checks performed, how to run them, assumptions and unverified behavior.
- Revision impact on APIs, dependencies, behavior and shared styles.

Provide library-view documentation, exported readable docs, and IDE hover documentation. Exact conventions and the editor used to verify hover behavior remain open. Shared guidance may be documented once and referenced.

Full and selective exports are confirmed. Proposed selective export behavior: include the selected components' transitive internal dependencies, styles, utilities, assets, relevant design context, documentation, and external-package setup instructions. Source archive format is not selected. Preview-only examples should be clearly separated if included.

Validate exports in clean supported example projects; the embedded preview alone does not establish successful integration.

## 15. Credentials, storage and operational limits

Prototype clients provide an API key during onboarding. Provider/model, key validation, retention, encryption, deletion/replacement, usage limits, and cost reporting remain open.

Keys must be restricted to authorized provider requests and excluded from generated artifacts, previews, documentation, exports and logs. Generated builds/runtime must be isolated from application secrets and other projects.

Proposed storage controls:

- Save meaningful checkpoints rather than every token or keystroke.
- Reuse unchanged artifacts where practical.
- Retain the versions needed for current components and undo/redo.
- Expire abandoned/failed drafts under an explicit policy.
- Clean temporary build output and dependency caches under separate policies.
- Measure uploads, history and build/cache storage before setting budgets.

Automatic promotion versus an Apply button does not itself determine storage usage; retention policy does. Exact limits, backups, deletion behavior, disaster recovery, and monitoring are unresolved.

## 16. Prototype boundaries and acceptance evidence

Keep both required output stacks in the prototype. Limit optional breadth before dropping either framework or core documentation/preview/export behavior.

The original three-week goal is a planning constraint, not evidence of a started schedule or a delivery guarantee. Team capacity, revised dates, and feasibility need review.

Suggested acceptance evidence:

1. A client completes supported onboarding and reopens the saved project.
2. Supported references actually influence the design; unsupported formats are identified.
3. Both stack profiles generate an agreed Common starter set.
4. A composed component references existing Common components.
5. Later preference feedback affects subsequent work within its recorded scope.
6. Generation cannot read or write another project's data.
7. Validated related changes become current together automatically.
8. Failed generation leaves the working library unchanged.
9. Actual React and Blazor previews demonstrate required interactions.
10. Common updates trigger checks of dependent components.
11. Undo and redo restore exact related revisions and synchronized docs.
12. Selective exports include necessary dependencies and work in a clean project.
13. Hover documentation is verified in an agreed editor.
14. Credentials do not appear in generated artifacts or preview execution.

Future or uncommitted: verified Angular generation support, product-funded model choice, IDE/Figma integrations, arbitrary historical restoration, public sharing, billing, marketplace, package publishing, broader collaboration, verified generation for additional stack combinations, and full application generation. Multiple projects, optional organizations and open-ended technology requests are confirmed requirements; see section 22.

## 17. Open decisions and next planning order

| Priority | Decision | Why it matters |
| --- | --- | --- |
| 1 | Blazor render/hosting mode and exact target versions | Determines real preview/build infrastructure |
| 2 | SpacetimeDB module language/version, deployment and authentication provider | Backend selected; these choices establish its implementation baseline |
| 3 | Worker/queue, execution isolation and hosting | Defines how generation runs, stops and recovers |
| 4 | Authentication/client identity and credential lifecycle | Defines project access and AI request authorization |
| 5 | Starter Common inventory and behavior boundaries | Defines what both stacks must support |
| 6 | Input formats and conflict handling | Makes onboarding/reference processing testable |
| 7 | Blocking checks, retry/time limits, accessibility baseline | Defines automatic promotion criteria |
| 8 | Undo/redo scope for preferences and shared configuration | Prevents code and design memory disagreement |
| 9 | Artifact storage/retention, SpacetimeDB capacity and backup/restore | Controls cost and recovery expectations |
| 10 | Export format, IDE verification and clean-project tests | Establishes usable deliverables |
| 11 | Schedule, capacity and budget | Revalidates the original prototype goal |

None of these unresolved choices prevents recording the decisions already made. They do prevent treating this document as a fully specified implementation contract.

## 18. Source and precedence record

Project inputs reviewed:

- component-library-builder-proposal.md — v0.6, October 22, 2026.
- component-library-builder-product-vision.md — v0.6, October 22, 2026.
- component-library-builder-product-design.md — v0.6 placeholder, October 22, 2026.
- component-library-builder-initial-prototype.md — v0.6, October 22, 2026.
- ComPlix-planning-notes.md — saved revision 1, October 22, 2026.
- This planning conversation, including subsequent undo/redo, frontend/backend, and renderer discussions through November 7, 2026.

Later explicit user decisions take precedence over earlier placeholders: automatic promotion replaces the explicit-Apply proposal; React/TypeScript is now selected for the builder frontend; the earlier Flask/SQLite preference was superseded by the explicit November 7, 2026 selection of SpacetimeDB. Proposed implementation details remain proposals even when documented here.

Historical technical references from the superseded Flask/SQLite discussion (not current implementation recommendations):

- Flask background tasks: https://flask.palletsprojects.com/en/stable/patterns/celery/
- Flask asynchronous execution guidance: https://flask.palletsprojects.com/en/stable/async-await/
- SQLAlchemy supported dialects: https://docs.sqlalchemy.org/en/20/dialects/index.html
- SQLAlchemy SQLite considerations: https://docs.sqlalchemy.org/en/20/dialects/sqlite.html
- Alembic SQLite batch migrations: https://alembic.sqlalchemy.org/en/latest/batch.html

These references support implementation considerations, not project approval of specific libraries or versions.


## 19. SpacetimeDB architecture revision — November 7, 2026

Historical pre-implementation research and recommendations. See section 20 and the project memory files for subsequent local implementation decisions/evidence.

### Status and evidence

**Confirmed:** SpacetimeDB is the selected backend direction. React + TypeScript remains the builder frontend. Both generated profiles remain required: React + TypeScript + Tailwind + shadcn/ui, and Blazor + Bootstrap.

**Verified in official documentation, not locally tested:** the live documentation reviewed identifies itself as version 2.0.0. This is a research baseline, not an approved dependency pin or a claim about the locally installed version. The CLI is not on PATH. No application code, module, database, auth project or hosted resources were created.

The following proposed architecture is not implicitly approved by selecting SpacetimeDB.

### Documented capabilities and implications

| Capability verified in official docs | Consequence for ComPlix |
| --- | --- |
| Modules declare tables and business logic; TypeScript is a supported module language [S1] | Recommend TypeScript module plus generated TypeScript client bindings; language remains open |
| Reducers execute atomic transactions; reducers have no general network/filesystem/system-call access [S2] | Keep permission checks and state transitions short; run compilers and AI orchestration elsewhere |
| Persistence uses a commit log with recovery; host/durability settings matter [S3] | Saved projects need durable server storage and tested recovery; the browser cache is not persistence or backup |
| OIDC authentication provides caller identity; module checks must restrict issuer/audience [S4, S5] | Map stable authenticated identities to clients and enforce application ownership |
| Tables are private by default; caller-aware views can expose authorized rows/columns using indexed lookups [S6] | Recommend private project tables and scoped views, rather than globally public client data |
| Subscriptions initialize a client cache and push changes; transaction updates are atomic [S7] | Use subscriptions for job status/library changes; explicit disconnected/loading/error states remain necessary |
| Procedures support external HTTP and explicit transactions; HTTP timeout defaults to 30 seconds and is capped at 180 seconds [S8] | Simple AI HTTP calls are possible inside procedures; this is not evidence for an entire durable generation pipeline |
| Binary data can be stored inline; external file references are also supported patterns [S9] | External blob storage is a recommendation for artifacts, not a missing SpacetimeDB capability |
| Publishing supports compatible automatic schema changes; incompatible changes require planning [S10] | Replace the ORM/migration proposal with a tested module/schema migration process |

### Authentication, data, realtime and authorization — proposed ComPlix behavior

**Authentication:** recommend an OIDC provider, with SpacetimeAuth as the minimal candidate. Sign-in obtains a provider token; the frontend uses it to connect with the TypeScript SDK. Keep login tokens distinct from client-supplied AI API keys. Provider selection, refresh/logout behavior and account recovery remain open. Server-issued anonymous/dev identities do not establish the desired recoverable client account.

Validate accepted issuer and audience in module authorization paths, including directly callable operations; do not rely only on connection admission. The integration service independently verifies credentials intended for its audience and authorizes each project operation. Decide its audience/token exchange explicitly rather than assuming every SpacetimeDB token is valid for another service. A worker uses a separate approved service identity, not the database owner's deployment credentials or a user's browser token.

**Persistent state:** recommend one ComPlix database/module initially, with application-enforced project isolation, not a database per client. Candidate private records: clients/owners, projects, questionnaire drafts, design rules, messages, components/revisions, dependencies, generation jobs/attempts, validation summaries, change sets and artifact metadata. Link records to a project and owner; index owner/project lookup paths. Enforce per-project authorization transactionally. The earlier one-project-per-client constraint is superseded by section 22. Exact schema and whether source/docs are inline or immutable external files remain open.

A small reducer saves an authorized draft checkpoint. A promotion reducer updates all related current revisions and recovery references together only after required checks and starting-state checks. This keeps the confirmed failure-preservation behavior. Backend durability does not implement application undo/redo: explicit revision/change-set records still do. Backup/restore must cover database state and referenced artifacts together.

**Realtime:** subscribe only to scoped project/library/job views, then render the SDK cache. Job progress comes from persisted, sanitized worker checkpoints; realtime subscription support is not AI token streaming or an offline-write conflict policy. Reconnect/resubscribe and confirm initialized state before presenting current data; distinguish a pending mutation from server-confirmed save. Clear per-user cached data on account changes. Required tests include reconnect, two-tab updates and lost-connection behavior.

**Access control:** identity proves who called, not which project they may use. Every callable mutation checks authenticated caller, ownership or service role, requested project, related records, allowed transition and expected revision. Worker result operations additionally check assigned job, attempt/lease and allowed project. Ordinary users cannot report passed checks or promote candidates. Private backing tables plus identity-filtered public views restrict reads; a client query's WHERE clause is not authorization. Views must preserve ownership through joins and omit secret/internal fields. Download/upload routes and preview access need the same project checks.

Use dedicated worker views for eligible jobs/authorized job context; do not publish the private jobs table just to wake a worker. A worker is trusted application code and its privileges must be explicit. Build environments receive job artifacts, not that service identity. Raw queries, subscriptions, reducer calls and guessed artifact IDs must all be covered by cross-client denial tests.

### Responsibilities outside the database

| Work | Minimal recommendation | Required versus optional boundary |
| --- | --- | --- |
| AI requests and API keys | Trusted integration service/worker calls provider; keep plaintext keys in short-lived server memory initially, pending owner approval | Procedures can call providers; external service is recommended for lifecycle/control, not technically mandatory for HTTP |
| Long-running generation | One external worker subscribes/scans eligible jobs, atomically claims a lease, checkpoints progress, bounds retries and reports completion | A job row does not run a worker; scheduling is not an exactly-once guarantee |
| React and Blazor builds | Worker dispatches ephemeral isolated build/runtime environments with supported Node and .NET toolchains | External execution is necessary for the proposed actual-code build/preview workflow; module runtime is not a general build host |
| Uploads/references | Integration service validates/quarantines uploads; worker extracts supported content; private file store holds originals | Inline blobs are possible; external storage/extraction is recommended for this workload |
| Exports | Worker assembles selected revision/dependency closure, docs and setup files; service authorizes download | SpacetimeDB stores export/job metadata; archives do not need to be copied into live subscriptions |
| Preview delivery | Separate preview origin serves exact validated revision artifacts; sandboxed embedding with explicit network policy | Static hosting may serve React and, if selected, Blazor WebAssembly; server-interactive Blazor needs a separate running .NET host |

For API keys, recommend HTTPS submission directly to the authenticated integration endpoint, excluded from chat, database events, telemetry, exception text and model prompts. Store only an opaque credential reference/status in project/job records. A worker restart would require key re-entry under the proposed memory-only policy; report a waiting-for-credential state rather than losing queued work. Persisted encrypted keys and secret-store integration are alternatives requiring a separate retention/deletion decision. A private table alone is not a complete secret lifecycle or encryption policy.

Recommend a durable jobs table instead of adding Redis/Celery initially. Claims, heartbeats, lease expiry and attempt fencing must be implemented; reconcile queued/running jobs after restart. At-least-once execution can duplicate provider charges or artifact creation. Use provider idempotency features where available, immutable artifact identities and deduplicated result registration; do not promise exactly-once external effects. Cancellation prevents later promotion even if an in-flight request cannot be stopped.

The credential-bearing coordinator must never execute generated code in its own process. Build/runtime sandboxes get only approved dependencies, generated artifacts and example data: no AI key, login token, worker identity, application data directory or privileged container socket. Constrain CPU, memory, time, filesystem and network. A separate directory or iframe alone is insufficient. The exact isolation technology and hosting threat model remain open.

Recommend a private local artifact directory for local development, served only through authorized endpoints; move to a private object store for hosted use. Record owner/project, immutable artifact ID, digest, size, media type and revision. Verify file ownership and existence before registering completion; do not trust a browser-supplied storage URL. Use short-lived authorized download links where appropriate. Preview content must not inherit application cookies or credentials. Validate filenames, limits and supported extraction formats; keep failed upload and orphan-artifact cleanup policies explicit.

### Recommended minimal deployment

1. React + TypeScript frontend using the SpacetimeDB TypeScript SDK and generated bindings.
2. One SpacetimeDB module/database for authoritative state, access checks, scoped views and transactional transitions.
3. One small trusted integration service with a supervised worker process for credentials, AI orchestration and file operations. TypeScript/Node is recommended to reuse an available SDK and language; Python remains possible after integration evaluation. No Flask service, additional database or extra queue is assumed.
4. Ephemeral execution environments for React and Blazor, separate from the trusted service's credentials.
5. A private artifact store and a distinct preview origin/host. Service and worker may share one codebase/deployment initially, but execution boundaries remain separate.
6. One OIDC provider. SpacetimeAuth is the recommended candidate, not an approved account/vendor configuration.

This is a minimal set of responsibilities, not a recommendation to purchase six independent cloud services. SpacetimeDB replaces the prior CRUD API/database direction; it does not remove ComPlix's file, credential and untrusted execution responsibilities.

### Decisions before implementation

Before the first state/persistence increment:
- Select module language (recommend TypeScript), pin mutually compatible CLI/server/SDK versions, and choose local standalone versus Maincloud development/deployment.
- Select OIDC provider and client/account model; specify accepted issuer/audiences and service authentication.
- Agree private tables/caller-scoped views and the first schema/migration/recovery checks.

Before AI/build workflow:
- Choose provider/model, memory-only versus encrypted persisted client keys, token audiences, restart/cancellation policy and budgets.
- Select worker deployment/isolation, service permissions, lease/retry/time limits and authoritative validation rules.
- Select tested React profile versions and Blazor .NET/Bootstrap versions/render mode. Browser-hosted Blazor WebAssembly is a candidate to simplify preview serving; it is not selected.
- Decide artifact storage/limits/backup/retention and preview-origin authorization/network policy.
- Retain existing open choices: starter Common inventory, input formats, design-memory authority, preference/configuration undo scope, export format and hover-verification editor.

**Proposed first increment:** sign in, create a project with either supported profile identifier, save/reopen a draft and see its state update in a second session. Historical foundation acceptance (one-project limit now superseded): rejected malformed/unauthorized operations, no cross-client reads through queries/subscriptions, reconnect initialization, durable restart recovery and no secrets in synchronized state. Test module publication/schema evolution without deleting saved data. This does not claim generation or either runtime preview works.

### Official research sources

Reviewed November 7, 2026; current unversioned pages display 2.0.0. These verify platform capabilities, not ComPlix behavior, performance, hosting cost or approval.

- [S1 Language support](https://spacetimedb.com/docs/intro/language-support/)
- [S2 Reducers](https://spacetimedb.com/docs/functions/reducers/) and [transaction architecture](https://spacetimedb.com/docs/intro/key-architecture/)
- [S3 Commit log and durability](https://spacetimedb.com/docs/reference/internals/commitlog/)
- [S4 Authentication](https://spacetimedb.com/docs/core-concepts/authentication/) and [SpacetimeAuth](https://spacetimedb.com/docs/core-concepts/authentication/spacetimeauth/)
- [S5 Issuer/audience and authorization claims](https://spacetimedb.com/docs/core-concepts/authentication/usage/)
- [S6 Table permissions](https://spacetimedb.com/docs/tables/access-permissions/) and [views](https://spacetimedb.com/docs/functions/views/)
- [S7 Subscriptions](https://spacetimedb.com/docs/clients/subscriptions/) and [subscription semantics](https://spacetimedb.com/docs/clients/subscriptions/semantics/)
- [S8 Procedures and HTTP limits](https://spacetimedb.com/docs/functions/procedures/)
- [S9 File storage](https://spacetimedb.com/docs/tables/file-storage/)
- [S10 Automatic migrations](https://spacetimedb.com/docs/databases/automatic-migrations/)


## 20. First local foundation milestone — November 7, 2026

The owner authorized implementation and approved local standalone Spacetime with browser-retained development identities. The implemented foundation uses a TypeScript module, React/TypeScript frontend, private project table, unique owner constraint, caller-scoped view and guarded create/rename reducers. Both output-profile identifiers are selectable; no components are generated.

All application backend rules for this increment run in Spacetime. No separate API, worker, upload/preview service or hosted resource was added. Local credentials/data/tools remain ignored; the browser token has no account recovery or cross-device login. Hosted OIDC and the broader section 19 recommendations remain separate decisions.

Actual tests and start commands are recorded in progress.md and README.md. The tested local foundation is complete; broader onboarding, draft design guidance, generation, revision promotion/recovery, exports and actual generated-code previews remain unimplemented. This does not establish production readiness or revise those product requirements.

## 21. Organization sign-in increment — November 7, 2026 (historical implemented scope)

Subsequent confirmed owner decisions bring organization/project collaboration into prototype scope: SpacetimeAuth sign-in with Google, GitHub and email magic links; identity/name/verified email; multiple organization memberships; one project per organization; owner/admin management with editor/viewer grants. Ordinary membership alone provides no project access. This supersedes the earlier individual-client project limit and blanket deferral of collaboration. Broader collaboration features remain future.

The TypeScript module now implements the private organization/membership/grant model and original-project transfer; the frontend implements OIDC integration and shared workspace UI. These run locally against hosted authentication; no new external application API/worker was introduced. The old project table is preserved and imported only with old-token proof. Detailed accepted rules and useful sources are in decisions.md.

Automated local acceptance uses signed identity fixtures and seeded OIDC sessions; real Google/GitHub/email completion remains unverified until exercised by a user. Do not mark the entire auth milestone complete based on the local tests. Invitation delivery is in-app, not email. Provider-side account linking is not promised. See progress.md for checks, reported redirect issue and remaining manual acceptance.

### Tab session follow-up

Confirmed owner preference: retain sign-in until the tab closes. The OIDC client requests offline_access and renews credentials automatically, with user credentials and PKCE state in sessionStorage. Server token-expiry checks remain enforced; provider expiry/revocation can require sign-in again. Browser session restoration can restore tab storage. Google login and Google-to-GitHub invitations were reported working by the owner; real-provider refresh remains unverified.

## 22. Current project ownership and technology requirements — November 7, 2026

**Confirmed by explicit owner clarification; supersedes conflicting earlier sections and the assistant's interpretation of a brief acknowledgement:**
- A user can have multiple projects. Do not impose one project per user or organization.
- A project can be a private personal project with no organization. Organization ownership/association is not mandatory.
- Projects can be shared with people in the same organization using project-specific grants. Organization membership must not by itself expose private personal projects.
- Every project has its own library, design guidance and requested technology details. Any framework, language or libraries can be requested; the data model must not restrict project creation to the two prototype output profiles.
- Requested technology choices and verified generation/build/preview/export capabilities are separate facts. The two existing prototype combinations remain required initial generation targets, not the entire product catalog. Additional technology support is not claimed as implemented.

**Historical implementation gap (addressed by section 23):** the previous module required an organization, enforced unique organizationId and selected a fixed outputStack. The migration removes that unique constraint, appends defaulted ownership/technology fields and preserves IDs, grants and guidance. See progress.md for validation status.

**Proposed next increment:** implement personal project ownership with optional organization association, project listing/selection/creation, open-ended technology details and project-specific sharing before generation. Validate separate guidance per project, denied cross-project reads/writes, private-project invisibility to ungranted organization members, multiple projects in personal/org contexts, and data-preserving migration of existing projects/grants/guidance.

**Open, not approved:** whether association grants organization administrators implicit management; who may associate, detach or transfer projects; one versus multiple organization associations; behavior when a collaborator leaves an organization; technology edits after components exist; profile matching and multi-target generation semantics. Do not infer answers from the existing org-only schema. Private-project ownership must remain explicit and organization sharing must be deliberate.

## 23. Private and shared multi-project increment — November 7, 2026

Owner authorized this milestone and explicitly chose removal of grants on organization departure; rejoining must not restore them. The recommendation that organization admins receive no implicit access to personal projects is carried into the authorized implementation.

New projects are personally owned by their creator, with optional sharing through one organization. Any member may create their own project; only the project owner chooses/changes its sharing organization and grants viewer/editor access to current organization members. An editor can rename the project, edit requested technologies and save guidance; editing does not imply sharing/ownership management. Changing/removing the organization clears grants and pending invitation project grants without transferring ownership. A departing personal owner retains the project privately and all its sharing is removed. Organization owners cannot leave until ownership-transfer support exists; transfer remains future work.

Existing organization-owned projects retain their original organizational ownership/admin management, grants, IDs and guidance. They are explicitly labeled in the UI. They are not silently converted into a creator's personal property. The old legacy-token handoff remains proof-of-possession based and can now import as a private project.

Framework(s), language(s), styling, libraries and version/compatibility notes are separate open text fields (1000 characters each, blank allowed). Two optional starting-point presets fill these fields; users can edit them or choose custom. No generation support is claimed for any recorded request. Technology edits use revision checks; questionnaire/design guidance keeps its existing autosave/recovery behavior per project.

Migration uses the documented removal of unique constraints and appended columns with defaults. The internal organizationId value 0 represents no organization; real organization IDs are generated from 1. The public UI calls this Private/no organization. Existing createdBy remains provenance; ownership mode distinguishes legacy organization ownership from new personal ownership.

Deferred: ownership transfer/conversion, sharing across multiple organizations, anonymous/public links, project deletion, automatic technology compatibility checks and code migration. Generation, actual-code previews, workers and exports remain outside this milestone. Both initial output profiles remain required generation targets.

## 24. Workspace layout and interaction preferences — November 7, 2026

**Confirmed by explicit owner request:** sign-in opens a card grid of the user's projects. A separate shared-projects view filters by a selected organization. Opening a project shows its components workspace, with a toggleable component list, a preview/code area and a chat area. Project settings provide project configuration, including view-only requested technologies and references.

The simple responsive layout and implementation boundaries are documented in [design-guide.md](./design-guide.md). When a backend capability is unavailable, the UI may provide a small, clearly labeled placeholder; it must not imply that chat, generated output, previews or validation are connected when they are not.

## 24. Project reference intake - November 7, 2026

Owner authorized project-specific reference intake and explicitly approved private inline SpacetimeDB storage for the initial text-only scope: 128 KiB per file, 20 references per project. Store original bytes and readable text plus purpose/uploader/time. Existing project permissions govern reads; editors upload/remove and viewers read. References remain untrusted data: no code execution, rendered HTML or automatic application of reference instructions. They do not change the current working library.

Initial intake supports UTF-8 Markdown/text and selected source files, with client/server validation, project-scoped live lists, processing/error feedback and plain-text previews. Synchronous Ready status means readable text was decoded, not AI analysis. Duplicate filenames are rejected within the project rather than overwritten. Confirmed removal deletes the uploaded reference; intake undo is not implemented. Failed uploads preserve existing references.

Deferred: PDF/image/ZIP extraction, repository imports, document-link retrieval, external storage, semantic indexing, AI consumption and formal reference-precedence/conflict policy. Nemotron generation remains separate. Requested technology configurations remain open-ended; verified generation/build/preview support is a distinct concern, initially required for both prototype stacks.

## 25. Workspace navigation correction — November 7, 2026

The owner's follow-up rejects tabs in favor of distinct pages. Project list, project components, settings, guidance, references, sharing, organizations, and invitations must render as separate URL-backed pages with browser history navigation; inactive pages should not remain mounted. This supersedes the earlier tab-navigation implementation note. See [design-guide.md](./design-guide.md) for the UI preferences and prototype boundaries.

## 26. Frontend visual guide — November 7, 2026

The owner designated [frontend-design-guide.html](./frontend-design-guide.html) as the visual reference for the React frontend. It specifies an organic sage/forest-green visual system with semantic light/dark themes, light by default, typography, horizontal navigation, and URL-backed project-page mockups. The canonical component workspace path is `/projects/:id/components`; primary project navigation is Components, Design guidance, and Settings. Existing product boundaries and backend truth remain authoritative; a visual mockup does not establish a backend capability.

## 27. Organization workspaces and project invitations — November 7, 2026

The owner approved an organization-card directory at `/organizations`, with each organization opening a URL-backed workspace at `/organizations/:id`. Overview, Projects, Members & invitations, and Settings are separate pages. The Projects page exposes only projects the caller can access and opens each through its regular project workspace. Owners and admins can rename organizations; existing organization role rules remain otherwise unchanged.

The owner also approved project-only invitations that do not create organization membership, alongside organization-only and organization-plus-project choices. Project-only invitation acceptance creates an explicit project grant for the invited user's verified email-matched identity. Existing project isolation and organization departure/removal grant cleanup remain required. Online collaborator presence/activity in project docs is future work.


## 26. Built-in AI chat and operator credentials - confirmed correction

The owner explicitly clarified that ComPlix comes with project chat and end users never supply AI keys. Backend operator configuration supplies the provider credential and model. This supersedes all per-user/per-request key-entry proposals and their temporary implementation. The private .local/backend.env file is local operator setup; SpacetimeDB protects persisted backend environment values. Built-in chat uses authenticated project access, saved guidance/references, bounded conversation and latest draft context, with server-enforced usage limits. Discussion replies and generated draft files are shared only within authorized project access. Actual generation does not imply successful builds, previews or promotion. See decisions.md decision 27 and README for the current implementation boundary and setup.
