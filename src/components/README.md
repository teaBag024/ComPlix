# Shared frontend components

ComPlix application UI components. They are separate from the component libraries ComPlix generates for projects.

They come from the "uplift" component export (2026-11-08) and follow its B&W Box + Multi-Pastel style guide. They were adapted to fit this app; see "Changes from the export" below.

## Tree

```
src/components/
  Common/                  foundation primitives; no imports from Compositions
    Button/                Button, buttonVariants
    Badge/                 Badge, BadgeDot, BadgeCount, badgeVariants
    Tabs/                  Radix Tabs (shadcn/ui composition; currently unused)
  Compositions/            built from Common primitives
    Modal/                 native <dialog>; uses Common Button + Badge
    ChatMessage/           chat bubble row
    ProjectCard/           project summary card; uses Common Badge + Button
    CodeEditor/            draft source editor; uses Common Badge + Button
```

Each component folder holds the source, an `index.ts` (its public exports), a `README.md` (API), and `examples/Preview.tsx` (a demo, not an integration).

## Rules

- Import through the folder: `import { Button } from './components/Common/Button'`.
- Common never imports from Compositions. A composition uses Common primitives instead of re-implementing them.
- Keep source, README, example and `index.ts` exports in sync when an API changes.
- Feature state, permissions, autosave, backend calls and generation stay in their feature modules (`src/*.tsx`), not here.
- Use `cn()` from `src/lib/utils.ts` to merge classes, so a caller's `className` can override a variant's utilities.

## Styling

- Components use Tailwind CSS v4 utilities (via `@tailwindcss/vite`). `src/style.css` imports Tailwind's theme and utilities without preflight.
- App rules in `style.css` live in `@layer base`, which sits below `utilities`. That means a component's utilities beat app element rules like `button { … }`, regardless of specificity.
- `dark:` follows `<html data-theme="dark">` (the app's theme toggle), not the OS setting.
- Semantic token utilities map to the style-guide CSS variables and switch with the theme. Use these for new work: `bg-canvas`, `bg-surface`, `bg-elevated`, `bg-header`, `bg-tab-muted`, `bg-tab-active`, `border-subtle`, `border-strong`, `text-ink`, `text-ink-secondary`, `text-ink-muted`, `ring-focus`.
- The exported Button and Badge variants keep their literal hex values plus `dark:` pairs. These match the token values.

## Choosing variants in the app

| Need | Use |
|---|---|
| Main action / form submit | `<Button>` (primary) |
| Secondary action | `<Button variant="secondary">` |
| Destructive confirm | `<Button variant="danger">` |
| Hero call to action | `<Button variant="rainbow">` (used once: Create project) |
| Page/section navigation, toggle groups | `<Button variant="nav">` with `aria-current="page"` or `aria-pressed` |
| List entries that act like links | `<Button variant="link">` |
| Neutral status | `<Badge variant="mono">` |
| Ready / success | `<Badge variant="mint">` |
| In progress | `<Badge variant="sky">` |
| Unverified / setup / warning | `<Badge variant="lemon">` |
| Failure | `<Badge variant="rose">` |

## Changes from the export

The uplift archive is an unverified draft (see its `docs/validation.md`). Changes made during integration:

- **Layout:** Button and Badge moved to `Common/` (the export filed everything under `Compositions/`). The shared `cn` helper moved to `src/lib/utils.ts`.
- **Button:** gained a named export, `nav` and `link` variants, and `data-slot="button"`. The `rainbow` variant now has its animated gradient (`.btn-rainbow` in `style.css`); before, it only had a dark hover with dark text.
- **Badge:** BadgeDot keeps its rounding when it receives a className. BadgeCount uses theme tokens instead of the undefined `bg-background`.
- **Modal:** the title is an `<h2>`, and the close button is the Common Button. It uses `open:flex` so a closed dialog stays hidden, and `cn` so callers can widen it.
- **ChatMessage:** user messages are right-aligned, and text keeps its line breaks. It keeps the `chat-bubble-user` and `chat-bubble-assistant` class names that tests and styles rely on. `toChatMessageRole()` narrows stored role strings.
- **ProjectCard:** uses the app's `ProjectSummary` binding type (the export's own type didn't match the backend). It keeps `article` semantics named "Project …" (the export's `role="presentation"` hid them). It uses the Common Badge and Button instead of private copies.
- **CodeEditor:** uses the app's tested `lineDiff` instead of the export's diff routine, which backtracked incorrectly. The line-number gutter scrolls with the text, and it applies the `agent-code-highlight` class so the fade animates. Copy works in read-only mode, and the language label follows the file extension.
