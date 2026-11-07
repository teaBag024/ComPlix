# ComPlix — Full Product Vision

Version 0.6 · October 22, 2026 · Product: ComPlix

**Status language:** Confirmed = explicitly stated by the creator. Proposed = recommendation awaiting agreement. Open = undecided. Future = product direction beyond the initial prototype.

**Document set:** `component-library-builder-proposal.md` explains the proposal; `component-library-builder-product-vision.md` captures the full product; `component-library-builder-product-design.md` reserves the detailed design; `component-library-builder-initial-prototype.md` defines the three-week prototype. Read the relevant document rather than treating the entire vision as prototype scope. This conversation is for design documents, not implementation. Project A and Project B are background context; current scoping focuses on ComPlix itself.

## Product identity

A tool for building custom UI component libraries through style inputs, a technical questionnaire, generation, and iterative conversation. Its output is a reusable component library with documentation. The product is named ComPlix. A narrower target customer segment has not been chosen.

## End-to-end experience — confirmed direction

1. The client creates a project and completes the initial questionnaire.
2. Everyone supplies technical-stack information to guide generated code.
3. The supplied style guide establishes the visual direction; if there is no guide, the client answers a style questionnaire.
4. ComPlix automatically generates a very basic starter component library. The exact initial component inventory remains open.
5. The client sees a library of generated components and can inspect each component's appearance and documentation.
6. The client opens the component chat window to request additional components, including larger and more complex UI compositions.
7. The client requests individual-component changes or library-wide style changes and reviews the results.
8. The client downloads the entire library or a selected set of components.
9. The client returns to their saved project and may add reference material later.

Automatic basic starter generation is confirmed. Detailed review gates, autosave, and approval mechanics remain design decisions; no mandatory extra style-approval screen is established.

## Style references

The full vision accepts PDFs, images, documents, and URLs. References can be supplied during the initial questionnaire and afterward. Exact file extensions, limits, URL restrictions, and interpretation behavior will be designed later. The confirmed baseline uses the guide when available and the style questionnaire when no guide is available. How to resolve an incomplete guide remains open; no mandatory second style questionnaire or separate approval gate is assumed.

Open questions include how to resolve contradictory references, distinguish inferred styles from explicit requirements, and apply later style changes to existing components. User-requested library-wide style changes are confirmed; propagation, review, and conflict handling remain to be designed.

## Technical questionnaire

The questionnaire describes the target environment of the generated components. It does not select the stack used to build this product. Blazor and React are confirmed prototype output requirements, supported by two willing pilot projects that need custom libraries. Angular remains requested for the broader product without a prototype commitment. Bootstrap is confirmed for Project A; TypeScript, Tailwind CSS, and shadcn/ui are confirmed for Project B. MUI remains a broader candidate rather than a prototype requirement. Support for arbitrary stack combinations is not implied.

| Pilot project | Confirmed prototype target |
| --- | --- |
| Project A | Blazor + Bootstrap |
| Project B | React + TypeScript + Tailwind CSS + shadcn/ui |

Versions, host/build setups, IDEs, and required component lists remain open. Project A's Bootstrap use does not by itself select an additional Blazor component library or define how interactive Bootstrap behavior will be implemented. These are generated-library targets; the builder application's own stack remains undecided.


The following is a **proposed** selection structure and candidate catalog, not a compatibility guarantee:

| Category | Proposed number of choices | Candidate choices or behavior |
| --- | --- | --- |
| UI framework/runtime | Exactly one per project | React, Angular, Blazor; possible later additions: Vue, Svelte, vanilla/web components |
| Output language | Exactly one compatible language | TypeScript or JavaScript where applicable; C#/Razor for Blazor |
| Existing component foundation | One choice, including none | MUI, shadcn/ui, a framework-appropriate alternative, or custom components |
| Primary styling approach | One supported compatible profile | Tailwind, Bootstrap, plain CSS, CSS Modules, or foundation-specific styling |
| Host/build setup | One or “not sure” | Conditional choices appropriate to the selected framework |
| Dependency versions | One tested version set | Record supported versions rather than assuming every version works |
| Package manager | One or “not sure,” where relevant | Options appropriate to the target ecosystem |
| Icon system | Zero or one | None or one supported library |
| Additional constraints | Zero or more | Naming, browser targets, theme requirements, accessibility requirements |

The eventual questionnaire should show compatible choices and disclose unsupported combinations. The final catalog, selection counts, defaults, and compatibility rules remain design decisions. Supporting a framework means supporting its generation, preview, docs, and export path—not merely listing it in a dropdown.

## Framework support priorities

| Framework | Language/component form | Scope status |
| --- | --- | --- |
| Blazor | C# and Razor components | Required in the three-week prototype |
| Angular | TypeScript, templates, and styles | Requested for the broader product; not a prototype commitment |
| React | TypeScript or JavaScript with JSX | Required in the three-week prototype |
| Vue | JavaScript or TypeScript, commonly single-file components | Additional candidate for later evaluation |
| Svelte | JavaScript or TypeScript in Svelte components | Additional candidate for later evaluation |
| Web Components | Browser custom elements; implementation language to choose | Optional later portability direction |

This is a scope catalog, not a popularity ranking. Each framework needs a validated preview, documentation, and export path. Supporting one does not automatically support another.

**Other ecosystem candidates:** Angular may use custom components or Angular Material; MUI is an alternative React foundation for later evaluation. MudBlazor is a possible broader Blazor option, not a selected dependency for Project A. The prototype follows the two confirmed profiles above; additional foundations or styling combinations are not required.

**Confirmed:** deliver both Blazor and React in the prototype. Two projects have agreed to pilot the tool. **Recommendation:** use the two confirmed pilot profiles, and limit component breadth and input formats to protect the three-week goal. Keep Angular in the broader product scope. Supporting both frameworks does not imply automatic cross-framework conversion or a single library targeting both at once.

Technical references: [Blazor components](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/), [Blazor CSS isolation](https://learn.microsoft.com/en-us/aspnet/core/blazor/components/css-isolation), [Angular components](https://angular.dev/essentials/components), [Vue](https://vuejs.org/guide/introduction.html), [Svelte](https://svelte.dev/docs/svelte/overview), [MudBlazor](https://mudblazor.com/), [Angular Material](https://material.angular.dev/). These document ecosystem options; scope priorities are project decisions and recommendations.

## Component library experience

**Confirmed:** show all generated components, their appearance, how to use them, and their properties. Support conversational additions and tweaks. Start with basic reusable components; richer ones can be requested later.

**Confirmed:** exported components should offer IDE hover documentation. This means documenting the generated component API for users working in their editor. The exact documentation syntax and editor behavior depend on the eventual output languages and supported editors. A separate plugin is not a prerequisite in the product scope.

**Confirmed:** larger compositions are in scope for the component chat window; basic-only restrictions are superseded. Navigation bars, login forms, and pricing cards are examples, not a required initial catalog. Generating a login UI does not itself promise an authentication backend.

**Open:** the exact starter inventory, supported complexity boundaries, variants, interaction depth, responsive requirements, accessibility baseline, and testing standard.

## Component documentation for human and AI developers

**Confirmed requirement:** document each component comprehensively so a human or AI developer can understand, use, modify, and extend it later without depending on the original generation chat. Documentation is part of the component deliverable, including larger compositions, and must stay aligned with code after revisions.

The following checklist specifies the intended coverage of that requirement. Exact file formats and generation mechanisms remain design decisions. Document each applicable item; explicitly mark unsupported, unverified, or not-applicable behavior instead of inventing guarantees.

| Area | Information to document |
| --- | --- |
| Purpose and scope | What the component does, intended uses, boundaries, and meaningful limitations |
| Setup | Framework/language, dependency versions, required imports, installation/configuration, styles, and assets |
| Public API | Every public prop/parameter, type, required/optional status, default, allowed values, constraints, events/callbacks and their payloads, children/slots/templates, and public methods where applicable |
| Usage | Minimal working example and examples covering supported variants, states, composition, and meaningful interactions |
| Behavior | State ownership, data binding, interaction rules, validation, loading/empty/error/disabled behavior where applicable, and side effects |
| Styling | Style-guide or questionnaire-derived choices, shared tokens/classes, customization points, and effects of shared style changes |
| Layout and accessibility | Implemented responsive behavior, keyboard/focus interactions, semantics/labels, known gaps, and what has actually been checked |
| Composition and dependencies | Child components, shared utilities, data shapes, external services if any, and required integration points; distinguish UI behavior from backend functionality |
| Maintenance | File organization, extension points, important implementation decisions and constraints, and how to change the component without breaking its contract |
| Verification and limitations | How to run available checks, what was tested, known issues, assumptions, and unverified behavior; do not claim tests exist when they do not |
| Revision impact | Changes to public API, dependencies, behavior, or shared styling that downstream developers need to know about |

Provide readable documentation in the library and with the exported component, plus IDE hover documentation for its public API. Selective downloads must retain the documentation and relevant shared context for the selected components. Library-wide conventions and shared tokens may be documented once and referenced rather than copied into every component.

Documentation should use stable component names, explicit types/contracts, file references, and concrete examples so AI tools can follow it as well as humans. A separate machine-readable manifest is a possible design choice, not a newly confirmed requirement. Comprehensive documentation does not imply disclosure of private model reasoning; record useful decisions and observable behavior.

## Projects and downloads

**Confirmed initial behavior:** one saved project per client, containing their generated components. Clients can download all components or a subset.

**Future:** multiple projects per client, with components associated with their respective projects.

**Proposed export completeness:** selected downloads include required shared styles, helpers, dependencies, and docs. Archive format, package publishing, and repository synchronization are not selected.

## AI access and funding stages

| Stage | Confirmed direction | Still open |
| --- | --- | --- |
| Prototype | Client supplies their API key during onboarding | Specific API/model, validation, key retention, request routing, and usage controls |
| Future product | Client chooses among supported AI options without providing a key | Providers, models, funding, pricing, and limits |

Claude is an example of a possible future option. This is not a commitment to switch exclusively to Claude.

## Integration possibilities

IDE and Figma integrations are future possibilities. Keep them in mind when designing the product, but do not assume live synchronization, code insertion, design import, design export, or plugin behavior has been approved. Each integration's purpose will need a separate decision.

## Not yet committed

Team collaboration, permissions, version history, public sharing, billing, a marketplace, package registries, and full application generation have not been requested as committed features. They should not silently enter the scope.
