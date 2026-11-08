# Button (Common)

Box-architecture button: 2px corners, a 1px border on every variant, Inter semibold, and a visible focus ring.

```tsx
import { Button } from '../components/Common/Button';

<Button>Save</Button>                              // submits a surrounding form (native default)
<Button type="button" variant="secondary">Cancel</Button>
<Button type="button" variant="nav" aria-current="page">Components</Button>
```

## Props

Extends native `<button>` attributes and forwards its ref.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `primary` `secondary` `outline` `ghost` `mint` `danger` `rainbow` `nav` `link` | `primary` | `nav` shows its active state from `aria-current="page"` or `aria-pressed="true"`. `link` is left-aligned and wraps text. |
| `size` | `sm` `md` `lg` `icon` | `md` | `icon` uses monospace; give it an `aria-label`. |
| `asChild` | `boolean` | `false` | Renders the child element (for example `<a>`) through Radix Slot. |
| `className` | `string` | | Merged with `cn`, so utilities here override the variant's. |

The native `type` default (`submit`) is kept on purpose: forms rely on it. Pass `type="button"` for non-submit actions.

## Notes

- `rainbow` relies on `.btn-rainbow` and `.btn-rainbow-label` in `src/style.css`. Its label is wrapped in a span so dark mode can clip the gradient to the text. Animation stops under `prefers-reduced-motion`.
- Disabled buttons get `pointer-events: none` and 50% opacity.
- The app's base `button { margin-top: 16px }` rule still applies. Add `m-0` where a Button sits in a tight row.

Exports: `Button` (also the default export), `buttonVariants`, `ButtonProps`.
