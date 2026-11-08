# Implementation instructions: existing components in project intake

Revised November 8, 2026 after owner discussion and feasibility review.
Status: implementation plan, not an implemented feature or approval to deploy.

## 1. Scope and decisions

**Confirmed direction:** let users supply existing component source as an optional part of the current project intake. Preserve the intentional intake design, questionnaire, open-ended technology details and supporting-document uploads. Do not add a competing dashboard creation workflow or restrict projects to fixed stack profiles.

**Working direction:** review imported components before saving; skip automatic starter generation by default when components were imported, while allowing explicitly selected additional starters. Imported code remains an unverified draft.

**Owner decisions (November 8, 2026):**

- **Setup gate:** imported components alone satisfy intake's required-input rule. The user can still add more: answer the questionnaire, upload documents, choose additional starters and create further components. None of these are required after a successful import.
- **Guidance precedence:** the user's intake answers and entered technologies stay authoritative. Archived design.md is attached as a reviewed design reference, not parsed into structured guidance.
- **References:** all-or-nothing. Every reference declared in a ComPlix archive is restored with its source, or nothing is saved. There is no source-only import mode.
- **Limits:** reuse existing limits (20 files/256 KiB per component draft; 20 references; 128 KiB text and 2 MiB PDF per reference; 32 KiB stored PDF text). The aggregate expanded-import cap matches the export's 64 MiB, so any accepted ComPlix export can be re-imported.
- **Scope:** this is the final feature and covers both ComPlix ZIPs and ordinary source ZIPs. Build ComPlix ZIPs first, then ordinary ZIPs with explicit mapping. Folder upload remains an optional final enhancement.

Importing a second ZIP into an already-ready project is not included.

Read the consolidated system plan, decisions and progress before implementation. Keep the builder stack separate from the imported output stack. Do not expand into application generation, automatic repair, package publishing or verified promotion.

## 2. Intake experience

Keep the project name/stack entry and current questionnaire and Documents steps. Integrate an optional Existing components ZIP control into the intake before starter selection; the exact step placement is a routine UI decision, but the existing questionnaire layout must remain intact.

The two upload purposes are distinct:

- **Supporting documents:** saved as project references and used as context.
- **Existing components:** reviewed source files that become editable library components.

Workflow:

1. Create a personally owned setup project through the existing flow. Organization association/sharing remains optional and follows existing access checks.
2. Complete or skip the questionnaire under current rules and optionally upload documents.
3. Optionally choose a component ZIP. Show parsing progress, total files/expanded bytes and whether a ComPlix manifest was recognized.
4. Present a review listing proposed component names, Common/Composition category, source roots, assigned files, detected technologies, reference count and warnings. Allow corrections before confirmation.
5. Save the reviewed import atomically. Show failures without losing the selected local review or previously saved intake answers.
6. If components were imported, offer Open imported library as the default path instead of starting duplicate Common generation. Additional starter generation must be explicit and must not overwrite matching imported names.
7. Open the normal component workspace with imported source, docs/examples and chat available. Label files Imported / unverified. Supported previews remain separate from successful import.

Refresh before confirmation may require reselecting the local ZIP; disclose that rather than promising durable browser file storage. Refresh after a successful import restores the saved library without importing twice.

## 3. Start with the current ComPlix ZIP contract

Inspect shared/libraryExport.ts and docs/library-export.md; use the actual exported formatVersion 1 contract rather than inventing another archive layout.

ComPlix ZIPs contain a wrapper directory, manifest.json, components, documentation, original reference bytes and stored extracted text. They may contain binary PDFs; do not decode the entire ZIP as UTF-8.

- Detect at most one unambiguous bundle root and supported manifest version. Reject ambiguous/malformed bundles with a useful error.
- Use manifest component/file mappings to propose groups. Every referenced path must exist and belong to the validated archive. Reject duplicate component identities, duplicate/conflicting paths and inconsistent assignments.
- Verify declared checksums against actual bytes where provided. Checksums detect inconsistency, not trust or authorship: all metadata remains untrusted.
- Import the exported current source, not the original paths from another historical revision. The archive includes original-to-archive mappings; validate any reconstructed layout before using it.
- Create fresh project-local component IDs, source IDs and reference IDs. Never restore ownership, identities, grants, provider credentials, sandbox leases or verification flags from a manifest.
- Preserve saved component docs, examples, styles and license notices. Do not treat the handoff README/AGENTS.md as another UI component or as backend instructions.
- Restore every declared reference's original stored bytes and its purpose/filename, plus stored extracted text. Apply current reference quotas and validation. PDF text remains an unverified extraction.
- If references are missing, unsupported or exceed current quotas, block confirmation and explain the problem; do not silently omit them. There is no source-only fallback (owner decision).
- Reference filenames are unique per project (case-insensitive) and capped at 20, counting documents the user already uploaded during intake plus archived references plus design.md. Detect collisions and quota overflow in the review. Let the user rename an archived reference or remove an intake upload; never overwrite silently.
- Show archived technologies and guidance for review. Do not silently replace technologies the user just entered. Treat archived design.md as untrusted reference text, not structured authoritative guidance reconstructed by Markdown guessing.

The current export renders saved free-text guidance into docs/design.md, but does not export the structured questionnaire as an importable record. Per the owner decision, design.md is imported as a reviewed design reference and the user's intake answers are kept. Structured guidance round-trip is out of scope.

## 4. Ordinary ZIPs: explicit mapping before insertion

After the supported ComPlix round-trip works, accept ordinary source ZIPs through the same review UI.

- Offer directory-based grouping suggestions, then let the user choose component roots and categories. A folder is not automatically a component: it may hold utilities, styles, examples or several exported components.
- Common, primitives, atoms or ui folders are hints only. An imported Common primitive can depend on another Common primitive; relative import count does not define category.
- Show all included and excluded files, with reasons. Exclude build output, caches, node_modules, .git and credential files. Never silently drop a required source file.
- Re-root each component's files under the stored root: insertComponent forces Common/<name> or Compositions/<name> and requires names matching [a-zA-Z0-9_-]{1,80}. Keep relative paths inside the chosen component root, propose sanitized names for review, and record original paths as provenance. Detect duplicate names, case-insensitive collisions, unsupported binary assets and paths outside the chosen roots. Require a mapping decision where ownership is ambiguous.
- Re-rooting can break relative imports between components (for example ../button/Button). Report each such import as unresolved in the review; do not rewrite it.
- Report aliases and unresolved relative dependencies. Do not rewrite imports or move shared files behind the user's back.
- Shared utilities/styles/assets need an explicit owner and inclusion strategy. For an initial restricted implementation, require them to fit the reviewed component file sets and explain cross-component preview limits. Do not claim arbitrary repositories are supported.
- If a component exceeds existing 20-file/256-KiB draft limits, reject it with a clear explanation. Do not increase global limits merely to make an archive fit.

Do not infer permanent project design rules from CSS. Extracted tokens may be shown as source-derived suggestions or reference material for review, not as confirmed preferences.

## 5. Parsing and validation boundaries

Reuse the installed fflate dependency. Prefer bounded streaming/worker extraction over blindly calling unzip on unbounded input. Do not add JSZip unless an identified requirement cannot be met by the existing library.

Implement shared pure validation/grouping helpers, with browser parsing and authoritative server payload validation separated:

- Set and test compressed-size, actual expanded-size, entry-count, per-entry, per-component and aggregate limits. ZIP header sizes are not sufficient protection against excessive expansion.
- Reject encrypted/unsupported entries, symlinks, absolute paths, traversal, unsafe separators, Windows-unsafe names, case collisions and duplicate entries before accepting a plan.
- Decode allowed source/doc files as strict UTF-8. Keep original reference bytes binary.
- Validate manifest shapes and all paths; never evaluate archive code, scripts, package hooks or imported agent instructions while parsing.
- Apply known-operator-secret checks to all persisted import content. Do not echo source/secrets into errors or logs.
- Give every uploaded file an explicit disposition in the review. Unsupported content must be visible as an issue, not silently discarded.

Use the limits in section 1, documented in shared constants. The 64 MiB aggregate does not fit in one reducer request: transport uses the staged upload in section 6. Measure the largest safe chunk against the installed server/SDK and record it as a constant.

## 6. Backend persistence and atomicity

Use the actual TypeScript SDK table/schema/reducer APIs, not Rust attributes. Current ownership uses workspaceProject.createdBy/ownership with explicit projectAccess grants. The legacy project table is not the new project model. Current componentDraft rows contain whole file sets keyed by jobId, not one row per file.

Propose a dedicated import reducer accepting:

- projectId of the already-created setup project;
- a stable idempotency request ID;
- expected project/guidance revision where those records are affected;
- reviewed component groups: name, category, source root and typed file arrays;
- typed reference records with original bytes and stored text;
- explicitly chosen guidance/technology handling, if supported in that increment.

The browser submits a structured reviewed plan; it does not submit arbitrary database IDs or ownership grants from the ZIP.

Within one transaction:

1. Validate the current authenticated caller and project edit access. Enforce setup-only import for the first increment.
2. Validate request identity and all limits, names, paths, references, collisions and revision expectations before finalizing changes.
3. Replays with the same request ID and payload return the already accepted result without duplicates. Reusing an ID with different content is rejected. Persist enough request/provenance metadata to support this.
4. Insert fresh component identities and complete imported source records/checkpoints. Record provenance as imported rather than fabricated Gemini/Nemotron output or starter placeholders.
5. Insert all accepted project references with fresh IDs and explicit uploader identity under current rules. Never share data with the source project's IDs/grants.
6. Persist only user-approved intake metadata updates, incrementing the relevant revisions.
7. Record successful import metadata and commit all related records together. On any error roll back this import; the setup project and previously saved intake remain available.

Do not call providers or E2B inside the reducer.

**Staged transport, atomic finalize.** Reference bytes alone can reach about 40 MiB (20 × 2 MiB PDFs), so the reviewed plan is uploaded in chunks and committed in one transaction:

- A private importStaging table holds chunks keyed by (projectId, requestId, sequence), plus the uploader identity, declared chunk count, total bytes and plan SHA-256. It is never exposed through views or subscriptions.
- An appendImportChunk reducer checks edit access, setup state, sequence bounds and the running byte total against the 64 MiB cap. Re-sending a chunk with identical bytes is a no-op; different bytes for the same sequence are rejected.
- finalizeImport rechecks access, confirms every chunk is present, verifies the assembled plan hash, and performs steps 1–7 above in one transaction. On success it deletes the staging rows; on failure nothing is inserted and staging remains for retry.
- cancelImport deletes staging rows. A scheduled cleanup removes abandoned staging rows after a fixed expiry (for example 24 hours), and project deletion removes them too.
- Staged bytes are untrusted and are validated again at finalize. A chunk only proves receipt, not acceptance.

## 7. Make imported source work through every existing consumer

Do not stop at inserting component and draft rows. Current code expects source job records and often uses isChatMode to decide whether a draft is usable. Imported provenance must not accidentally trigger provider behavior.

Introduce a narrowly scoped source-draft predicate or equivalent that distinguishes editable source from provider execution. Audit:

- ProjectLibrary selection, file tree, labels and Code/Docs views;
- saveComponentDraft authorization and revision handling;
- queueGeneration source selection and candidateFiles context;
- Common contract lookup for compositions;
- buildComponentPreview source acceptance;
- prepareLibraryExport selection and manifest origin;
- editor instruction enable/run source acceptance;
- chat diff baselines, recovery and new-agent-code highlights.

Keep provider-job scheduling, deadlines, rate counters and activity indicators limited to actual generation jobs. Do not simply add import to isChatMode everywhere: that could mislabel imported code and alter provider accounting.

**Chosen approach:** insert each imported component's source as a generationJob with mode 'imported', state draft_ready, an empty model and a diagnostic stating it was imported and is unverified, plus its componentDraft checkpoint. Add a shared isSourceDraft(mode) predicate (isChatMode or imported) and use it on the read/edit paths above. Provider paths (queueGeneration provider dispatch, generationDeadline, modelUsage) keep isChatMode. Do not copy the existing starter precedent, which stores placeholders as mode 'gemini' (spacetimedb/src/index.ts insertComponent). prepareLibraryExport currently derives origin from model ('generated' vs 'starter-placeholder'); derive 'imported' from the mode so imported libraries do not re-export as placeholders.

Imported @complix comments must be inactive after import and remain inactive through unrelated saves, reloads and opening the component. Explicit enable or a genuinely new user-authored instruction can use the normal pipeline. Test malformed imported source being repaired as well, so a parser that previously returned no comments does not accidentally arm inherited markers.

## 8. Setup completion and additional starters

The current requireSetupInput checks questionnaire answers or saved project references. Its frontend equivalent must remain consistent with the backend.

**Decided:** imported components alone satisfy this gate. Extend requireSetupInput to accept questionnaire answers, saved references or at least one imported component, and change the frontend check to match. When no questionnaire answers exist, label design guidance unspecified rather than inventing it.

On successful import, keep the project in setup until the user finishes the reviewed intake. Do not automatically run starter generation or paid validation. The default completion path opens the imported library. Before finishing, the user can optionally add more: questionnaire answers, documents and explicitly chosen starters. After setup, the existing createComponent and chat flows add further components as usual.

If the user explicitly chooses additional starters, detect case-insensitive name/root collisions before scheduling. Existing starter generation may find/reuse an existing named component, which could overwrite imported work; imported names must be excluded or rejected rather than reused silently.

## 9. Preview and verification boundaries

Successful import means validated storage, not successful compilation. Preserve draft/unverified labels.

Existing previews build an individual draft with pinned offline template dependencies. Starters are deliberately self-contained for this reason, but real imported libraries usually are not: a Card that imports Button will typically fail to preview on its own. Shared files and non-template external packages may not build either. Flag components with cross-component or external imports in the review, with a preview-limitation note, and say the same in the workspace. Do not launch an all-project E2B verification workflow as if it already exists.

Later dependency-aware preview work should assemble exact component/dependency revisions and shared resources, preserve credentials/network isolation, record build outcomes and handle stale inputs. A passing build is not complete verification or promotion. Any automatic paid build/repair policy needs separate approval.

## 10. Implementation increments and checks

1. **Contract and validation:** fixtures from actual ComPlix exports for React and Blazor; bounded ZIP handling, manifest checks, binary references and review-plan types. Test malformed manifests, traversal, duplicate/case collisions, unsupported files and expansion limits before connecting UI.
2. **Staged upload, atomic finalize and provenance:** private staging table, chunk append/finalize/cancel/expiry, setup-project authorization, replay protection, mode 'imported' source/reference insertion, the updated setup gate, rollback and scoped views. Test viewer/outsider rejection, lost edit access between chunks and finalize, missing/duplicate/conflicting chunks, the cap, retries, conflicting component and reference names, reference quota overflow, abandoned staging cleanup and failure after partial attempted inserts.
3. **Intake integration and source consumers:** preserve existing form, add optional ZIP/review flow, imported source in editor/chat/export, no default starter generation and no inherited-comment execution. Test reload/navigation, source edits/autosave, chat using exact imported source, export/re-import and reference-byte equality. Both required profiles must be covered.
4. **Ordinary ZIP mapping:** review/correct groups and shared files, warn about unresolved dependencies and reject oversized/unsupported layouts. Do not advertise arbitrary compatibility until these cases pass.
5. **Optional / later:** folder picker, import into already-ready projects, dependency-aware previews, reviewed style-token suggestions and deeper validation. Keep these distinct from the import milestone.

Run frontend/module typechecks, builds and focused real-server/browser tests with synthetic provider fixtures. Run broader regression when changes justify it. Never claim clean-project builds, paid model behavior or E2B validation unless actually run.

## 11. Files to inspect and update

- src/ProjectSetup.tsx: existing intake steps and starter completion.
- src/OrganizationWorkspace.tsx: setup routing and project creation; preserve its current appearance.
- spacetimedb/src/index.ts: ownership, setup gating, source records, authorization, preview/export and generation context.
- shared/draftFiles.ts, referenceFiles.ts, questionnaire.ts and starterComponents.ts: reuse existing rules.
- shared/libraryExport.ts and docs/library-export.md: actual ZIP contract and reference/provenance handling.
- shared/generationWorkflow.ts, src/ProjectLibrary.tsx, useDraftEditor.ts and EditorInstructions.tsx: source-mode assumptions.
- Generated module bindings: regenerate after backend API/schema changes; do not hand-edit.
- Tests: pure parser/plan cases plus backend/browser intake, import and round-trip coverage.
- docs/decisions.md and docs/progress.md: record accepted choices, limits, tests and remaining gaps. Do not rewrite the consolidated system plan.

No implementation, commit, push, local publication, paid provider request or sandbox provisioning is performed by this planning document. The section 1 owner decisions are settled. Anything else still called a recommendation needs owner confirmation before it becomes architecture.
