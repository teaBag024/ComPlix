# Shared frontend components

These are ComPlix application UI components, separate from generated project libraries.

- `Button`: native button props and refs, with an optional `secondary` variant. The default keeps native form submission behavior; use `type="button"` for non-submit actions. Existing custom CSS classes are supported.
- `Badge`: a span with the shared badge class and optional additional classes.
- `Modal`: the existing controlled native dialog, including its title, Escape handling and backdrop dismissal.
- `ProjectCard`: the shared project summary and open action.
- `ChatMessage`: the shared user/assistant message row, with optional error styling.
- `ui/tabs`: the existing Radix-based tabs.

Import components directly from their files. Keep project data access, permissions, autosave and generation logic in their current feature modules. Existing styles remain in `src/style.css`.
