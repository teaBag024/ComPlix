# ComPlix — Product Design — Reserved for Later

Version 0.6 · October 22, 2026 · Product: ComPlix

**Status language:** Confirmed = explicitly stated by the creator. Proposed = recommendation awaiting agreement. Open = undecided. Future = product direction beyond the initial prototype.

**Document set:** `component-library-builder-proposal.md` explains the proposal; `component-library-builder-product-vision.md` captures the full product; `component-library-builder-product-design.md` reserves the detailed design; `component-library-builder-initial-prototype.md` defines the three-week prototype. Read the relevant document rather than treating the entire vision as prototype scope. This conversation is for design documents, not implementation. Project A and Project B are background context; current scoping focuses on ComPlix itself.

## Status

**Intentionally deferred at the creator's request.** This document will explain how the product works after design decisions are discussed. It is a structured placeholder, not an approved architecture or implementation specification.

## Inputs to the later design

Use the product-vision document for intended behavior and the initial-prototype document for the first milestone. The proposal explains purpose and delivery rationale. Keep full-product design and prototype shortcuts explicitly distinguished.

## Confirmed constraints to carry forward

- A required technical questionnaire guides generated components.
- Blazor and React output are required in the prototype. Angular remains in the broader product scope without a prototype commitment.
- Two projects have agreed to pilot the tool: Project A uses Blazor + Bootstrap; Project B uses React + TypeScript + Tailwind CSS + shadcn/ui. Versions, host setups, and component needs remain open.
- The tool itself is not required to be implemented in Blazor merely because it generates Blazor components.
- A supplied style guide defines appearance; if no guide is available, a style questionnaire defines it. References can be supplied initially and later.
- ComPlix automatically generates very basic starter components after onboarding.
- The component chat window supports larger and more complex UI compositions.
- Users can request individual-component edits and library-wide style changes.
- Components can be previewed and refined through draft chat.
- The library presents components, usage information, and properties.
- Generated component documentation includes IDE hover documentation and comprehensive context for later human and AI development. Use the product-vision documentation checklist as the coverage specification; keep documentation synchronized with revisions.
- Clients can download all or selected components.
- Projects are saved; initially one per client, eventually multiple.
- The prototype uses a client-provided API key collected during the initial questionnaire.
- Future AI selection should not require clients to provide keys.
- IDE and Figma integrations are future possibilities.

## Design sections to develop later

| Area | Questions to resolve | Current status |
| --- | --- | --- |
| User journeys and screens | Onboarding, library navigation, preview/docs/chat layout, empty/error states | Undecided |
| Technical questionnaire | Confirmed pilot profiles, version details, dependencies between answers, unknown-answer handling | Profiles confirmed; questionnaire design undecided |
| Reference processing | Formats, extraction, provenance, conflicts, later updates | Undecided |
| Style foundation | Guide/questionnaire interpretation, library-wide style changes, propagation and conflicts | Undecided |
| Generation workflow | Automatic starter generation, larger compositions, generation boundaries, validation, retries, failures | Undecided |
| Component lifecycle | Drafts, saved state, approval, overwrite/revert behavior | Undecided |
| Preview | Actual-code rendering, execution isolation, supported interactions | Undecided |
| Documentation | Comprehensive human/AI documentation, public API hover docs, exports, and synchronization with code | Undecided |
| Export | Selection, dependency closure, shared files, format, installation instructions | Undecided |
| Identity and persistence | Meaning of client, authentication, storage, cross-device access | Undecided |
| API credentials | Entry, validation, routing, retention, removal, failure and cost visibility | Undecided |
| Provider evolution | Future user selection and product-funded access | Undecided |
| Future integrations | Reusable boundaries and eventual IDE/Figma capabilities | Undecided |
| Quality and deployment | Testing, accessibility, browser support, hosting, operational limits | Undecided |

## Credential and execution design questions

Because clients will provide keys and the tool will preview generated code, the later design must explicitly address how credentials are kept out of generated code, chat content sent unnecessarily to models, logs, exports, and preview execution. No storage mechanism or execution-isolation technology is selected here.

## Blazor-specific questions for later design

- Which .NET version and interactive hosting/render-mode setup will be tested?
- Project A uses Bootstrap. Will the generated Razor components use Bootstrap directly or an existing Blazor wrapper already present in the project? No additional library is selected.
- How should Project A’s Bootstrap customization and any component-specific styles be structured? Bootstrap is confirmed; customization details are open.
- How will actual Razor/C# components be built and previewed? A visual HTML imitation is not proof of working Blazor output.
- How will parameters, callbacks, and component usage be documented, including verified editor hover behavior?
- What files and references must a selective export include, and is a Razor class library package needed or are source files sufficient?

## React-specific questions for later design

- Project B uses React and TypeScript. Which host/build setup and dependency versions must be supported?
- Project B uses Tailwind CSS and shadcn/ui. What existing configuration and component conventions must generated output follow?
- How will actual React output be previewed, documented, and exported into that project?
- Which editor will validate hover documentation for components and props?

## Pilot validation questions for later design

The framework and styling profiles are confirmed. Record each pilot's dependency versions, host setup, required components, and definition of usable output without adding unrequested libraries. Decide what can be shared between workflows and what needs framework-specific handling later. Do not assume that one project must output both frameworks or that automatic conversion is required.

These are questions, not architecture selections. Angular will need a separate target-specific path if added later.

## Newly confirmed behavior; implementation still deferred

A separate mandatory style-approval step is not assumed: style is defined by the guide, or by the questionnaire when a guide is absent. Design later how missing or contradictory style instructions are clarified. Define how a library-wide style edit affects saved components, compositions, overrides, and documentation, including failure behavior. Define how large-component dependencies are tracked and exported. Do not narrow the chat window to basic components without an explicit scope change.

## Decision record

Blazor and React have been selected as required output frameworks, not as the implementation architecture. No architecture decisions have been approved. When design work begins, record each decision with its date, scope, rationale, and unresolved consequences. Do not populate this document with assumed implementation choices merely to make it look complete.
