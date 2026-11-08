# ProjectCard (Composition)

Project summary card for the project grid: ownership, sharing and setup badges, the requested stack, the caller's permission, and an open action. Uses the Common `Badge` and `Button`. It lifts with a hard shadow on hover (no motion under reduced-motion), and the active project gets a 3px strong top border.

```tsx
import { ProjectCard, projectStack } from '../components/Compositions/ProjectCard';

<ProjectCard project={row} owned={isOwner} organization={orgName} active={row.id === current?.id} open={() => openProject(row.id)} />
```

## Props

| Prop | Type | Notes |
|---|---|---|
| `project` | `ProjectSummary` | The `visibleProjects` row type from `src/module_bindings/types`. |
| `owned` | `boolean` | Whether the signed-in user owns it. |
| `organization` | `string?` | Sharing organization's name, shown as "Shared space: …". |
| `active` | `boolean` | Current project: "Continue" label and primary button. |
| `open` | `() => void` | Called by the open button. |

The card is an `<article>` named "Project {name}". The button is named "Open project {name}".

`setupState` values: `setup` (lemon badge "Setup in progress"), `generating` (sky "Generating starters"), and `ready` (no badge).

`projectStack(project)` joins framework, language, styling and libraries with " · ". It returns "Technology stack not specified yet" when they are all empty.
