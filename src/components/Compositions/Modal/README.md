# Modal (Composition)

Controlled native `<dialog>` with the style guide's box frame (strong 1px border, hard 4px offset shadow) and partitioned header, body and footer. It uses the Common `Button` (close) and `Badge` (header badge).

```tsx
import { Modal } from '../components/Compositions/Modal';

<Modal open={open} title="Create organization" onClose={() => setOpen(false)}>
  <form>…</form>
</Modal>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | required | Calls `showModal()` / `close()` on change. |
| `title` | `string` | required | Rendered as an `<h2>`; it is the dialog's accessible name. |
| `onClose` | `() => void` | required | Called on Escape, backdrop click, the close button, or a native close. Return early if closing is unsafe (for example, while busy). |
| `children` | `ReactNode` | | Body content; the body scrolls when tall. |
| `headerBadge` | `ReactNode` | | Lemon badge beside the title. |
| `footer` | `ReactNode` | | Actions bar. Keep submit buttons inside the `<form>` instead, unless you use the `form` attribute. |
| `showClose` | `boolean` | `true` | Shows the "ESC ✕" button (`aria-label="Close dialog"`). |
| `titleId` | `string` | auto | Override the `aria-labelledby` id. |
| `className` | `string` | | Merged with `cn`. For example, `max-w-[min(760px,calc(100vw-32px))]` for a wide form. |

`ModalHeader`, `ModalTitle`, `ModalBody` and `ModalFooter` are exported for custom layouts.

The dialog keeps the `app-modal` class so form-layout rules in `src/style.css` (`.app-modal form …`, `.modal-actions`) still apply.
