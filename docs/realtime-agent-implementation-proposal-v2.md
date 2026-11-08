# Implementation Proposal: Comment-Driven Component Assistance (revised v2)

Revised November 8, 2026 following owner discussion and feasibility review.
Status: implementation in progress. Automatic comment submission is implemented in source; validation results and remaining limits are recorded in docs/progress.md. Future capabilities remain proposals.

## 1. Intent and status

The intended experience is to type an instruction near component code, such as “make this green,” and have ComPlix make a focused change. Built-in chat remains available.

- **Confirmed intent:** comments in the editor can request changes to the selected component.
- **Working direction:** Stop generation revokes permission to continue or save results. An already dispatched provider request may finish; its output is discarded.
- **Working implementation:** an explicit `@complix` marker distinguishes instructions from ordinary comments. Initial syntax is JSX comments in `.tsx` and Razor markup comments in `.razor`.
- **Confirmed owner choice:** automatically execute after typing stops (November 8, 2026). The prototype uses a two-second idle interval after a successful autosave while Code is open. Failed admissions require explicit retry.
- **Working implementation:** retain completed comments and persist processing state separately. Enable/rerun is explicit; generated/inherited comments stay inert until enabled. Automatic comment removal is not implemented.
- **Future:** token streaming, resumable model generation, automatic repair and verified promotion.

The [system plan](./ComPlix-system-planning.md) and accepted [decisions](./decisions.md) remain authoritative. This revision replaces this proposal's earlier abortable SSE, instant teardown and partial-draft-write assumptions. It does not approve additional services or increased provider budgets.

## 2. Architecture and existing foundation

Keep only the frontend server and SpacetimeDB, with the existing external E2B preview service. Reuse component identities, scoped chat, whole-draft revision checkpoints, 500 ms autosave, Gemini coordination, bounded Nemotron changed-file output and actual-code previews.

Subscriptions deliver committed job states and completed results. The installed TypeScript HTTP client returns synchronous buffered responses and exposes neither AbortSignal nor a readable stream. No token-stream listener is required. See [SpacetimeDB procedures](https://spacetimedb.com/docs/functions/procedures/) and installed `node_modules/spacetimedb/src/server/http_internal.ts` / `http_shared.ts`.

Provider credentials remain operator backend configuration. Never expose them to the browser, generated code or sandbox. Keep application UI components separate from generated project Common libraries.

## 3. Instruction workflow

Proposed React syntax:

```tsx
{/* @complix Make this button green using the project palette. */}
<Button>Save</Button>
```

Proposed Blazor syntax:

```razor
@* @complix Make this button green using the project palette. *@
<button class="btn btn-primary">Save</button>
```

1. Detect markers only in supported source comments. Strings, JSX text, references and model replies are not executable instructions. Use syntax-aware detection with separate JSX/Razor handling; define a small supported syntax set first.
2. Show the instruction and file location. New comments added through user saves run automatically after a two-second pause with Code open. This idle interval is separate from autosave.
3. Flush and confirm the complete draft. Failed autosave or a conflicted checkpoint prevents submission.
4. Backend acceptance verifies current editor access, project/component/source-job ownership, revision and the exact marked comment in the saved file. Accept the instruction identity and job atomically, using an idempotent request ID.
5. Send the instruction, file path and location with authoritative saved component context through the existing Gemini/Nemotron pipeline. Gemini asks in component chat when the target is ambiguous.
6. Save complete validated file output as a separate **unverified candidate**. Never write partial JSON or unfinished generated files into the editable draft.
7. Adopt the result only when the selected source/revision still match and the editor has no unsaved local edits. Otherwise preserve human text and retain the result for inspection without automatic merging.
8. Reuse existing preview rebuilding on the accepted complete draft. A preview build does not establish verified library promotion.

Record request origin and show progress/results in component chat as well as the instruction UI. The existing text editor is sufficient for an initial action/list UI; a new editor framework is not required.

## 4. Persistence and duplicate prevention

Propose a private instruction-request table using TypeScript `table()` / `schema()`. Keep existing whole-draft files and revision; no per-file draft migration is needed.

Suggested fields: project/component IDs, instruction ID, source job/revision, path, exact text, source/context anchor, request ID, associated job, requesting identity, lifecycle state and timestamps. Final schema/indexes belong to implementation.

- Repeating an accepted request ID returns its original job, without another provider call.
- Persist processed-comment identity across unrelated autosaves, remounts, reloads and collaborator tabs. A hash of the entire draft revision alone is insufficient.
- Reconcile unchanged comments with source anchors. Moved/duplicate comments with ambiguous identity require explicit selection.
- Changed instructions become pending new requests. Rerun is explicit and consumes normal quota.
- Model-generated/imported markers remain inert until explicitly submitted by a user. Prevent self-triggering generation loops.
- Preserve one active modifying job per project and five requests/minute per identity across chat and comments. Busy projects show that state; do not create an unbounded queue.
- Clearing chat preserves drafts, instruction processing identity and rate counters.

Backend checks are authoritative; client-supplied paths or text do not grant access.

## 5. Stop generation and races

Use **Stop generation**, not Pause. Display Stopping until server acknowledgment. On failure offer retry without claiming success. Cancellation is an idempotent terminal transition requiring current project edit access; a former requester has no special rights after revocation.

Recheck job state, current actor access, deadline, source revision/input fingerprint and instruction identity before:

- every provider call, including Gemini's final response after Nemotron;
- accepting output or saving candidate files;
- dispatching a new preview/validation stage;
- accepting build results or any future promotion.

Already dispatched provider/sandbox operations may finish. Cancellation prevents subsequent acceptance and further authorized stages; it cannot undo an external operation already sent or refund usage. Guarantees apply at committed checks, not instant network interruption.

Cancellation and completion race transactionally: cancellation committed first rejects output; completion committed first cannot be undone by Stop. Recovery remains separate under the system plan. Late results cannot mutate a newer job, instruction or component selection. Scheduled deadlines remain a fallback after browser disconnection.

Preserve human code and the last working preview. Never kill a reused preview sandbox merely to stop an AI request. Cancellation does not imply resumable generation.

## 6. Revision and context protection

Capture source job ID, whole-draft revision and existing project-input fingerprint at acceptance. Recheck before accepting results; reuse existing stale-input rejection with an instruction-facing stale status.

| Event | Required behavior |
| --- | --- |
| No intervening edits | Save complete candidate; adopt only on the same clean editor source |
| Saved human/collaborator edit | Reject automatic replacement and show stale result |
| Unsaved local edit when result arrives | Preserve local text and selected draft |
| Marker edited/removed | Revalidate source; never apply old instruction over newer code |
| Stop committed first | Discard output and prohibit further stages |
| Incomplete/unsafe output | Preserve saved draft and report failure where authorized |
| Access revoked | Deny further work/acceptance; views enforce current grants |

Include all component files, saved design guidance, requested technologies/versions, Common dependency contracts for compositions, last six selected-thread messages and **all authorized project references**. Preserve the 64 KiB complete-context limit: reject before job/provider creation without dropping references.

Keep work scoped to reusable components/compositions. Composition instructions cannot modify read-only Common implementations. Explain required Common extensions and handle them through the scoped Common workflow. Isolation is enforced in code, not prompts.

## 7. Preview, budgets and future validation

Reuse E2B agents/templates for React + TypeScript + Tailwind + shadcn/ui and Blazor + Bootstrap. Requested technologies remain open-ended; recording a request is not verified build support. Unsupported imports fail visibly.

Keep strict paths, offline pinned dependencies, credential isolation, separate-origin iframe/CSP controls and last-good output. Retain documented secret-link/idle-timeout limitations. No extra local controller/gateway is introduced.

Retain current generation limits: one Nemotron call, up to two Gemini calls, 4096 Nemotron output tokens and the existing 90-second generation deadline. Preview execution has its own lifecycle. Do not assume generation plus repeated Blazor builds fits that deadline.

**Future proposal:** define compiler/contracts/runtime checks, synchronized documentation/examples/exports, stage timeouts, repair/cost budgets, durable validation results, recovery and atomic promotion separately. Two automatic repair attempts are not approved here. Successful compilation alone is insufficient for promotion.

## 8. Small implementation increments

1. **Saved-comment requests:** supported JSX/Razor syntax, Run instruction UI, backend verification, persisted request identity and existing generation. Test valid requests for both stacks; ordinary comments, strings, forged/cross-project locations, viewers, failed autosave and oversized context must not call providers.
2. **Consistent Stop and edit safety:** audit all stage boundaries and preserve unsaved text. Test cancellation before/during each provider call, late output, deadlines, access revocation, collaborator changes and cancellation/completion races. Assert call counts, unchanged human drafts and last-good preview.
3. **Durable lifecycle:** deduplication across reloads/collaborators, explicit rerun, moved/edited/duplicate comments and transcript clearing. Test that unrelated saves and generated markers cannot trigger more paid work or bypass quotas. These safeguards are required before automatic mode.
4. **Automatic mode (owner selected):** use two idle seconds after successful autosave in the open Code panel; retain the safety gates below. Test partially typed comments, rapid edits, busy projects, multiple tabs and reconnects. Do not automatically replay stale instructions or generate on every autosave.
5. **Future validation/promotion:** plan separately under the system plan. Keep intermediate candidates labeled unverified.

## 9. Open choices

- Broader syntax support beyond JSX comments and the conservative Razor markup subset remains future work.
- Should completed comments ever be removed automatically? The current implementation retains them.
- Should automatic execution later work outside the open Code panel or use a configurable idle interval?

The owner subsequently authorized implementation and selected automatic triggering. No deployment, paid acceptance run, external worker, increased repair budget or verified promotion is included in this increment.

## Prototype limits

Razor scanning accepts markup comments before executable Razor transitions; it stops at C# blocks/expressions rather than attempting a full Razor parser. Identical markers in one file are inactive; moving an existing instruction to another file does not arm it automatically. New editor markers may wait while the project is busy; accepted, failed, stopped and dismissed instructions never replay on ordinary saves or reload. Failed admission is persisted as blocked and requires enable/retry. Completed files remain unverified candidates and the existing preview lease is preserved.
