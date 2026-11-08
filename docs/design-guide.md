# ComPlix Workspace Design Guide

Status: owner-confirmed layout preferences, recorded November 7, 2026. The more specific visual system and page mockups in [frontend-design-guide.html](./frontend-design-guide.html) are the current visual authority. This guide preserves product constraints and is not approval to implement backend capabilities that are still open or unavailable.

## Project entry

- After sign-in, land on a card grid of the user's projects.
- Keep project cards in a three-column desktop grid even when the current view has fewer than three projects; reduce to two and one column at tablet and phone widths.
- Keep personal projects and shared projects as separate views. The shared view includes an organization dropdown filter.
- Project cards make ownership/access and the requested technology stack easy to scan.
- Keep project, organization, and invitation creation forms in accessible popup dialogs launched by their matching create actions. Closing or failing a dialog must not submit or discard an in-progress request; only successful creation closes it.
- Opening a card enters that project's workspace. Keep a project picker available for switching projects and a clear route back to the project grid.
- Treat the project grid, component workspace, settings, guidance, references, sharing, organizations, and invitations as separate pages with distinct URLs. Do not implement these as tabs or keep inactive pages mounted.
- Keep `/organizations` as a responsive organization-card directory. Each card opens a dedicated organization workspace at `/organizations/:id`, with separate Overview, Projects, Members & invitations, and Settings routes.
- The organization Projects page lists only projects the current user can access. Opening one enters its normal project workspace without carrying an extra organization mode.
- Owners and admins can rename an organization. Members can review the space and leave, but cannot change organization settings or manage other members.
- Project invitations are launched from project Sharing in a modal. Offer project-only, organization-only, and organization-plus-project access when the inviter is authorized to invite into the organization. Project-only access does not add organization membership.
- Continue to show only explicitly granted projects. Organization membership/administration must not expose personal projects by itself. Removing a member continues to revoke grants to projects in the organization; online collaborator presence/activity is future work.
- Use `/projects/:id/components` as the canonical component workspace URL. Keep Components, Design guidance, and Settings as the primary project navigation.
- Keep organization and invitation management available without making either one a prerequisite for private projects.

## Project workspace

- The project is for reusable components and compositions, not complete applications.
- Keep project-level navigation simple and provide a toggleable list of available components.
- When a project has no published components, use the guide's Button, Input, LoginForm, and FilterPanel examples as clearly labeled UI-only samples. They are illustrative preview/source fixtures, not saved or published project components.
- The main work area places the component list on the left, preview/source in the center, and chat on the right. The list is separate navigation, not a replacement for either work area.
- On desktop, show the component list, inspection surface, and chat together as three side-by-side panes. Keep mock workflow controls secondary to that workspace.
- A component may switch between preview and source/documentation/validation views when those views are supported.
- Label candidates, mock output, and unverified checks accurately. Do not present them as the current library or successful builds.
- On narrow screens, stack the list, preview/code, and chat areas without horizontal overflow.

## Project settings

- Provide a visible project settings action in the open project.
- Show requested framework, language, styling, libraries, and version notes as read-only project settings. Requested technology is not evidence of generation/build support.
- Group the requested technologies into read-only blocks and summarize saved references with a direct link to reference management. Keep existing access checks, untrusted-file handling, and upload limits.
- Keep project-specific operations (rename, sharing, references) scoped to the selected project.

## Backend gaps and behavior

- Prefer a small presentational placeholder over speculative backend, generation, or sandbox work when the requested capability is not implemented.
- Show whether chat is available; a submitted chat message may request a draft but does not directly edit or validate the current library.
- Use the word "mock" for fixture-based generation and previews. Do not claim real provider calls, compilation, tests, validation, or promotion unless they ran.
- Preserve access control, autosave, error reporting, and existing organization/project behavior while changing the layout.

## Visual and interaction guidance

- Follow the HTML design guide's organic sage/forest-green palette, semantic design tokens, Inter and JetBrains Mono typography, soft horizontal navigation pills, card geometry, and responsive three-column workspace. Prefer locally available Inter and JetBrains Mono fonts with system fallbacks; do not make initial rendering depend on a remote font service. Light mode is the default; support the specified forest-slate dark theme with a visible toggle and saved preference.
- Keep the interface direct, compact, and card-based. Use the guide's established style rather than introducing a competing visual system.
- Use semantic headings, visible focus states, labeled controls, and buttons/links with clear names.
- Preserve responsive behavior. Avoid hidden actions that depend only on hover.
- Do not add decorative or configurable UI that is not needed for the project workflow.

## Current prototype boundary

The project grid, shared-project organization filter, component workspace, project settings, read-only technology summary, and references are present in the prototype. Button, Input, LoginForm, and FilterPanel are UI-only HTML examples; they are not saved to a project. Chat can request provider-backed drafts when configured; results remain unverified and are not directly applied to the library. Example and mock previews use trusted HTML fixtures, not actual React or Blazor builds. Actual-code execution/preview, validation, and promotion remain separate work.


## Stack-independent workspace - November 7, 2026

Code, Docs and Preview use a shared interface for all stacks, with multiple source/documentation files and isolated iframe previews. Generated draft files can be edited in Code and autosave to versioned server checkpoints; mock fixtures and viewers remain read-only. Chat snapshots the selected saved draft. Adapter definitions do not establish verified runtime compatibility. HTML examples and mock fixtures are illustrative only.


Chat now uses Gemini for discussion and Nemotron for requested code changes through a bounded tool call. The UI distinguishes coordinating and generating changes; both operate on the selected saved draft. Missing operator configuration leaves chat unavailable and does not expose key inputs. All generated output remains explicitly unverified; executable preview/build support is unchanged.

### Project chat presentation — November 7, 2026

Use a conversation-style layout within the existing right-side workspace pane. Align the member's messages to the right in a theme-token sage surface and ComPlix replies to the left on a softly bordered surface. Keep the connection/status label compact, the empty state quiet, and the message composer anchored below an independently scrolling history. The composer grows with typed text and has a clear send action. Preserve accessible labels and distinct unavailable, working/cancellation, failure, read-only, and unverified-draft states. Do not imply that a generated draft has passed validation.

Give the chat pane enough viewport-relative height for the transcript to remain the main visible area. Keep reference selection bounded and scrollable and keep context text compact; the transcript should take remaining pane height and scroll independently, including when a component scope indicator and clear-chat control are shown.

All saved references in the current project are automatically included in Gemini/Nemotron chat context. Do not present per-message reference selection. Display a compact count/status instead. If the complete authorized project snapshot exceeds 64 KiB, block the send with an actionable message; never silently omit references.


### Component creation and conversations - November 8, 2026

The explorer creates persisted Common or Composition components through a native dialog with a name, category and optional first prompt. Selecting one sets ?selected=<componentId>; reload and browser history restore selection. The selected component exposes its draft file tree and existing Code/Docs/Preview controls. Its chat heading identifies the name/category. Clear chat uses native confirmation and preserves draft files; conversation context restarts from saved files and guidance. New empty projects require component creation before chat. Legacy project-level jobs remain inspectable and retain their previous chat compatibility until a component is selected. Provider/build results remain explicitly unverified. Light/dark dialogs use existing theme tokens.
