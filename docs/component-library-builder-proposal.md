# ComPlix — Project Proposal

Version 0.6 · October 22, 2026 · Product: ComPlix

**Status language:** Confirmed = explicitly stated by the creator. Proposed = recommendation awaiting agreement. Open = undecided. Future = product direction beyond the initial prototype.

**Document set:** `component-library-builder-proposal.md` explains the proposal; `component-library-builder-product-vision.md` captures the full product; `component-library-builder-product-design.md` reserves the detailed design; `component-library-builder-initial-prototype.md` defines the three-week prototype. Read the relevant document rather than treating the entire vision as prototype scope. This conversation is for design documents, not implementation. Project A and Project B are background context; current scoping focuses on ComPlix itself.

## Purpose

Propose a tool that helps people create custom component libraries from their visual requirements and technical stack. This document is for the creator, people with whom they share the idea, and LLMs assisting in subsequent project conversations.

## Opportunity

The proposed tool brings style definition, component generation, preview, documentation, and conversational refinement into one workflow. The product hypothesis is that users can build a coherent reusable library with less repetitive implementation and documentation work. This is a hypothesis, not a measured claim or market-research finding. The specific customer segment remains open.

## Proposed product

Users complete a required tech-stack questionnaire. Their supplied style guide defines the visual direction; if no guide is available, a style questionnaire defines it. ComPlix then automatically generates a very basic starter library. The precise starter inventory remains open.

Users browse components and their documentation, preview them, and request revisions through chat. The component chat window supports creating larger, more complex UI compositions as well as basic components. Users can change an individual component or the entire library's style, and download the complete library or a selected subset.

Each generated component must be comprehensively documented for later human and AI development, including usage, public API, behavior, dependencies, customization, extension, limitations, and IDE hover documentation. Documentation must stay consistent with revisions. The detailed coverage is recorded in the product-vision document. A separate IDE integration is not required for hover documentation.

Projects are saved. Initially each client has one project; multiple projects per client are a future capability. IDE and Figma integrations are future possibilities to keep in mind during design.

## Delivery strategy

**Confirmed:** the three-week deliverable is a prototype, not the completed product. The budget is very limited. This document set does not authorize implementation or choose the application's architecture.

**Confirmed initial model-access approach:** the client provides their API key during the initial questionnaire. The creator described this as a “ChatGPT API token”; this document uses “client-provided API key” without choosing a particular model or credential implementation.

**Future direction:** users can choose among supported AI providers/models without supplying their own keys. Claude was mentioned as an example, not a selected exclusive provider. Funding, pricing, provider availability, and operating limits remain open.

**Proposed scope control:** demonstrate one complete onboarding → generation → preview → revision → documentation → download workflow for both required output frameworks: Blazor and React. Angular remains in the broader product scope, without a prototype commitment. The confirmed profiles are Project A: Blazor + Bootstrap, and Project B: React + TypeScript + Tailwind CSS + shadcn/ui. Upload formats, starter components, versions, and host setups remain open.

**Confirmed pilot context:** the creator has two other projects that need custom component libraries, and both have agreed to be pilot users. They are labeled Project A and Project B with the stacks above. Component needs, versions, and acceptance contacts have not been supplied. These are pilot commitments, not completed validation results.

## Definition of success

The prototype should demonstrate that project inputs can guide useful component generation and that a client can inspect, revise, document, save, and export the results. The prototype document contains the scope and proposed acceptance checks. No production reliability, broad compatibility, or launch readiness is implied.

## Boundaries

The full vision is not a three-week delivery promise. Detailed architecture, UX layouts, data models, credential handling, and integration design belong in the deferred product-design document. Framework examples are not commitments to support every combination.

## Decisions needed next

- Which very basic components should ComPlix automatically generate, and what supported complexity limits should apply to larger compositions?
- Which upload formats and basic components fit the prototype?
- What constitutes a client, and where must their saved project be available?
- Which API/model will be used, and how will client credentials be handled?

## Guidance for future readers

Treat explicit creator decisions as authoritative. Keep recommendations labeled. Do not infer implementation choices from examples. Update the appropriate document when a decision changes; do not silently enlarge the prototype to match the full vision. These files are intended as project context; their creation alone does not guarantee access in every subsequent chat.
