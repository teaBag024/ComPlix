# Badge (Common)

Status pill from the style guide's Badges section: 2px corners, JetBrains Mono at 10.5px semibold, border first.

```tsx
import { Badge } from '../components/Common/Badge';

<Badge variant="mono">Organization space</Badge>
<Badge variant="lemon" withDot>Unverified draft</Badge>
<Badge variant="sky" count={3}>Generating</Badge>
```

## Props

Extends native `<span>` attributes and forwards its ref.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `variant` | `default` `solid` `secondary` `mono` `outline` `destructive` `sky` `mint` `apricot` `rose` `lilac` `lemon` | `default` (solid black) | `default`/`solid`, `secondary`/`mono` and `destructive`/`rose` are aliases. |
| `withDot` | `boolean` | `false` | 6×6 square indicator before the text. |
| `count` | `number` | | Trailing count token. |
| `asChild` | `boolean` | `false` | Render through Radix Slot. |
| `className` | `string` | | Merged with `cn`. Badges don't wrap by default; pass `whitespace-normal` for long, user-supplied text. |

Exports: `Badge`, `BadgeDot`, `BadgeCount`, `badgeVariants`, `cn` (re-exported from `src/lib/utils`), and the prop types.
