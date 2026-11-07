# ComPlix — Initial Prototype Scope

Version 0.6 · October 22, 2026 · Product: ComPlix

**Status language:** Confirmed = explicitly stated by the creator. Proposed = recommendation awaiting agreement. Open = undecided. Future = product direction beyond the initial prototype.

**Document set:** `component-library-builder-proposal.md` explains the proposal; `component-library-builder-product-vision.md` captures the full product; `component-library-builder-product-design.md` reserves the detailed design; `component-library-builder-initial-prototype.md` defines the three-week prototype. Read the relevant document rather than treating the entire vision as prototype scope. This conversation is for design documents, not implementation. Project A and Project B are background context; current scoping focuses on ComPlix itself.

## Goal and constraints

**Confirmed:** deliver a prototype in three weeks. This is not the complete product or a production-launch commitment. Budget is very limited; exact spending cap, working hours, and team size are unspecified. This chat produces design documents only.

## Confirmed prototype direction

- Required tech-stack questionnaire.
- Both Blazor and React component output are mandatory for this prototype.
- Style defined by the supplied guide, or the style questionnaire when no guide is available; references can be added later.
- Automatic generation of very basic starter components and a visible component library.
- Component draft chat for additional components, including larger and more complex UI compositions.
- Both individual-component edits and library-wide style changes.
- Component previews and comprehensive documentation for later human and AI development, including usage, public APIs, and IDE hover documentation.
- Download the complete library or selected components.
- Saved project, initially one per client.
- Client-provided API key collected as part of the initial questionnaire.

The creator described the initial credential as a “ChatGPT API token.” The exact API/model and credential workflow are still to be specified. The document does not assume that any chat subscription supplies API access or credit.

## Output stack versus product stack

The **output stack** is what the generated components use. The **product stack** is what developers use to build this tool. They are separate decisions. Blazor and React are confirmed for generated output. Project A uses Blazor + Bootstrap. Project B uses React + TypeScript + Tailwind CSS + shadcn/ui. Runtime/dependency versions and supported host setups remain open. The product implementation stack is undecided.

React, TypeScript, Tailwind CSS, and shadcn/ui are now explicitly confirmed for Project B. Angular remains in the broader product scope without a prototype commitment. Supporting both frameworks does not imply generating both from a single project or translating components between them.

## Proposed scope reductions — not approved

| Area | Recommendation | Decision still required |
| --- | --- | --- |
| Output support | Validate Project A: Blazor + Bootstrap; Project B: React + TypeScript + Tailwind CSS + shadcn/ui | Which versions and host configurations? |
| Starter catalog | Button, Input, Textarea, Checkbox, Card, Badge | Which components, variants, and behaviors? |
| Input formats | Questionnaire, pasted text/Markdown, text-based PDF first | Which formats must work in three weeks? |
| New-component chat | Support larger compositions while defining explicit supported boundaries | Which complexity and integration limits apply? Basic-only restriction is superseded. |
| Theme support | One theme initially | Is light/dark switching required? |
| Downloads | Source archive with shared dependencies and docs | ZIP or another format? |

The wider upload vision remains PDFs, images, documents, and URLs. No reduction in that vision is implied by this prototype recommendation. A file being accepted for storage must not be presented as successfully interpreted if it has not informed generation.

## Documentation requirement

Documentation has two destinations: information viewed in the library and information accompanying exported code for IDE hover help. The latter is confirmed, not postponed until an IDE plugin exists. For Blazor, define the C#/Razor documentation convention and verify hover behavior for components and parameters in a named editor. For Project B, define the TypeScript documentation convention and verify hover behavior for components and props. No editor has been selected yet.

Documentation must cover each component sufficiently for humans and AI developers to use, maintain, and extend it without relying on the generation chat. Follow the full coverage checklist in the product-vision document, including APIs, behavior, dependencies, styling, composition, extension points, verification status, and limitations. Keep docs synchronized after component-level and library-wide edits and include them in full and selective downloads. Specific documentation formats remain undecided.

## API-key onboarding

**Confirmed:** ask the client to provide their own key during the initial questionnaire. Future product-funded provider selection is outside this milestone.

**Open:** model choice, validation, session-only versus persisted keys, request routing, replacement/removal, error messages, and usage limits. These belong in product design; no key should be requested in this document-generation chat.

## Pilot projects — background context

Project A (Blazor + Bootstrap) and Project B (React + TypeScript + Tailwind CSS + shadcn/ui) have agreed to pilot the tool. These establish the confirmed prototype target profiles. Their specific needs and feedback arrangements are not prerequisites for continuing ComPlix product scoping, and pilot sign-off is not a confirmed completion condition.

Versions, host setups, IDEs, and component lists remain open. Bootstrap does not by itself select an additional Blazor wrapper or interaction implementation. The builder application's stack remains undecided.

## Proposed three-week milestones

| Period | Milestone | Evidence |
| --- | --- | --- |
| Week 1 | Confirm versions and host setups for both profiles and a small shared scope; establish onboarding and persistence; prove generation and actual preview for each framework | At least one Blazor and one React component can be generated and previewed |
| Week 2 | Complete automatic starter generation, larger-composition chat, individual and library-wide edits, and documentation for both profiles; try early exports | Both frameworks support the revision loop; early exports reveal integration issues |
| Week 3 | Verify full/selective downloads, comprehensive docs and IDE hover behavior in both supported profiles; fix blockers and record limitations | Usable exports for both target profiles with documented validation results and outstanding blockers |

This is a proposed sequence, not a validated effort estimate. Protect both required frameworks by reducing optional breadth rather than silently dropping one. Pilot feedback is useful when available but is not the driver of current product scoping.

## Proposed acceptance checks

1. A client can complete supported onboarding, including API-key entry, and reopen their saved project.
2. Supported style inputs actually influence generated components; unsupported inputs are identified.
3. Onboarding automatically produces the agreed basic starter library using the guide or, when absent, the questionnaire; the client can browse previews and documentation.
4. The client can request a larger composition through component chat and revise an individual component; supported complexity limits are explicit.
5. Exported code includes documentation that appears on hover in the agreed IDE/language setup.
6. Full and selective downloads include necessary shared files and dependency instructions and work in a clean example project.
7. Later uploads are supported through the agreed formats; the behavior for updating existing styles is explicit.
8. Failed generation does not silently destroy the saved component; credential failures are surfaced clearly.
9. API credentials do not appear in exports, generated component source, or generated previews.
10. Project A output compiles and functions in the agreed Blazor + Bootstrap setup; previews exercise actual generated components, and exported parameters/events and IDE documentation are verified.
11. Project B output builds and functions in the agreed React + TypeScript + Tailwind CSS + shadcn/ui setup; previews exercise actual generated components, and exported props/events and IDE documentation are verified.
12. A user can request a library-wide style change; affected components and their documentation remain consistent under the defined update behavior.
13. Each exported component includes the applicable documentation from the product-vision checklist, sufficient for human/AI development without the chat transcript. Unverified claims and limitations are explicit.

## Outside the three-week milestone

Multiple projects per client, IDE/Figma integrations, and product-funded multi-provider selection belong to the future product. All-stack support, all-format interpretation, collaboration, package publishing, and sophisticated version history are not approved prototype commitments.

## Next scope decisions

- Define ComPlix’s automatically generated basic starter set and the supported limits for larger compositions.
- Confirm Project A’s .NET and Bootstrap versions, host/render setup, and any existing Blazor wrapper.
- Confirm Project B’s dependency versions, host/build setup, and existing Tailwind/shadcn configuration.
- Choose the product implementation stack separately; neither output framework determines it.
- Agree input formats and the starter catalog without treating earlier suggestions as accepted.
- Define client identity and project persistence expectations.
- Specify API/model access and credential behavior during product design.
- Choose an editor/language combination for testing the hover documentation.

## Scope assessment with two required frameworks

**Confirmed:** both Blazor and React belong in the three-week deliverable. The earlier Blazor-only recommendation is superseded.

**Recommendation:** support the two confirmed profiles and a small automatic starter catalog while retaining chat generation of larger compositions. Limit optional input formats, theme modes, and foundation choices before reducing the core preview, revision, documentation, save, or export workflow. Do not add Angular to this milestone without an explicit scope change.

This is a more demanding prototype than a single-framework version. Whether it fits depends on development time, chosen tooling, and the supported complexity boundaries; no delivery guarantee or effort multiplier is assumed. Validate both framework paths early to expose technical blockers before expanding the catalog.
