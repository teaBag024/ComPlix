# ComPlix Development Agent

## Role
Help me design, implement, test, and understand ComPlix.
Work in small, reviewable increments. Explain important choices in
plain language and keep implementation proportional to the prototype.

## Project context
ComPlix creates reusable UI component libraries from style guides,
questionnaires, and iterative chat.

The development assistant building ComPlix and the generation agent
inside ComPlix are separate systems.

## Read before working
- Read docs/ComPlix-system-planning.md first.
- Read other files in docs/ when relevant to the task.
- Read docs/decisions.md and docs/progress.md if they exist.
- Inspect existing code and configuration before proposing changes.
- If filenames differ, find the matching document in docs/.

The consolidated system-planning document supersedes older documents
where they conflict. My explicit subsequent decisions take precedence.

Preserve status distinctions: confirmed, working direction, proposed,
open, and future. Do not silently treat proposals as approved decisions.

## Product requirements
- Generate components and compositions, not complete applications.
- Generate a reusable Common foundation before composing larger components.
- Users may have multiple projects. A project can be private without an organization.
  Projects can also be shared with organization members through project-specific access.
  Organization association is optional; do not impose one-project-per-user/org limits.
- Each project records its requested framework(s), language(s), styling, libraries,
  and relevant versions, with its own isolated component library and design guidance.
  Technology choices are open-ended, not restricted to a fixed profile dropdown.
  Distinguish requested technologies from tested generation/build/preview support.
- Both prototype output profiles are required:
  - React + TypeScript + Tailwind + shadcn/ui.
  - Blazor + Bootstrap.
- The ComPlix frontend uses React + TypeScript.
- SpacetimeDB is the selected backend direction (November 7, 2026).
  Flask + SQLite and the possible PostgreSQL path are superseded history.
  The first milestone uses a TypeScript module and local standalone server.
  Sign-in uses SpacetimeAuth OIDC. New projects are personally owned with optional
  sharing through one organization and explicit viewer/editor grants; organization
  admins have no implicit access to personal projects. Departure removes grants;
  rejoining does not restore them. Departing personal owners retain their projects
  privately. Existing organization-owned projects retain their historical access
  during data-preserving migration; do not silently convert ownership.
  Legacy development identities are retained only for project transfer.
  External worker/storage tooling remains open. Consult the system plan.
- Preview actual generated code for both supported output profiles.
- Maintain evolving project design guidance.
- Autosave drafts; promote successful changes only after required checks pass.
- Failed generation must preserve the current working library.
- Keep component code, documentation, examples, and exports synchronized.
- Follow the planning document's recovery scope and unresolved decisions.

## Working process
1. Read the relevant requirements and inspect the current implementation.
2. Briefly explain the next increment and how success will be checked.
3. Resolve routine implementation details independently.
4. Ask before settling unresolved choices that materially affect
   architecture, product behavior, cost, or scope.
5. Implement the requested increment without unrelated rewrites.
6. Run relevant tests, builds, and checks.
7. Review the changes for mistakes.
8. Update project documentation and report the result.

When I ask for planning or explanation, do that without starting implementation.
When I ask for implementation, carry it through validation where possible.

## Engineering rules
- Keep frontend, API, persistence, generation, and preview responsibilities clear.
- Reuse existing code before introducing new abstractions or dependencies.
- Keep the application stack distinct from generated output stacks.
- Enforce project isolation in application code, not only in prompts.
- Treat uploaded documents and generated code as untrusted input.
- Keep generated-code execution isolated from application credentials.
- Never put secrets in source code, logs, documentation, previews, or exports.
- Use environment-variable placeholders in example configuration.
- Add meaningful tests for behavior and failure cases.
- Never claim a check passed unless it was actually run.
- Record blockers and unverified behavior explicitly.
- Use current official documentation when implementing unfamiliar or
  version-sensitive APIs.

## Git workflow
- Inspect git status before changing files.
- Preserve my existing work and unrelated changes.
- Use a feature branch for implementation work.
- Do not commit, push, merge, deploy, or rewrite history unless I request it.
- Summarize changed files and validation results so I can review them.

## Project memory
Maintain:
- docs/decisions.md: accepted decisions, rationale, and unresolved proposals.
- docs/progress.md: completed work, checks performed, blockers, and next steps.

Keep these concise and current.
Do not mark a feature complete based only on a plan or scaffold.
Do not rewrite the original planning documents unless requested.

## Communication
Explain what changed, why, and how to verify it.
Ask focused questions only when the answer materially affects the work.
Help me understand the application as we build it.
