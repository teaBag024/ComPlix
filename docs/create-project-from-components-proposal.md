# Implementation Proposal: Creating Projects from Existing Component Bundles

## 1. Overview & Architectural Objectives

The ComPlix platform enables developers and design system teams to generate, validate, and manage UI component libraries across React and Blazor target stacks. While creating a project from scratch or initializing from a default template is supported, developers frequently possess pre-existing or legacy component suites (`.tsx`, `.css`, `.razor`, `.md`) that they wish to migrate into ComPlix as a managed workspace.

This proposal outlines the end-to-end technical specification for **"Create Project from Existing Component Suite"**. Rather than creating an empty project workspace and manually uploading files individually, this workflow enables users to upload a ZIP archive or target component directory directly from the Project Dashboard. The system initializes a new project record in SpacetimeDB, parses the incoming component hierarchy, seeds database tables, classifies components into Common Primitives or Compositions, and opens the new project workspace ready for inspection and real-time AI pair programming.

---

## 2. User Experience & Dashboard Import Workflow

The creation flow is integrated directly into the primary ComPlix Project Dashboard (`/projects`).

```
+-----------------------------------------------------------------------------------+
|  ComPlix Project Workspace Dashboard                                              |
|                                                                                   |
|  [ + New Blank Project ]    [ 📦 Create Project from Existing Components ]        |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Modal: Create Project from Existing Component Bundle                        |  |
|  | --------------------------------------------------------------------------- |  |
|  | 1. Project Name: [ Enterprise Design System                     ]           |  |
|  | 2. Target Framework: (•) React + Tailwind  ( ) Blazor + Bootstrap           |  |
|  | 3. Source Upload: [ Drag & Drop Folder or .zip Archive Here ]              |  |
|  |    Selected: legacy-ui-components.zip (14 files, 340 KiB)                    |  |
|  | 4. Primary Classification Strategy:                                         |  |
|  |    (•) Automatic Folder Hierarchy (common/ vs compositions/)                |  |
|  |    ( ) Static Import Analysis                                               |  |
|  | --------------------------------------------------------------------------- |  |
|  |                                                [ Cancel ]  [ Create Project ] |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Step-by-Step Creation Sequence

1. **Dashboard Entry Point**: On the main `/projects` grid page, a primary action button labeled **"Create Project from Existing Components"** sits alongside the standard blank project button.
2. **Import Configuration Modal**: Clicking the action triggers a modal asking for:
   * **Project Name**: User-provided title (e.g., `"Legacy UI Migration"`).
   * **Target Stack Profile**: Target output framework selection (`React + TypeScript + Tailwind` or `Blazor + Bootstrap`).
   * **Source Upload**: Accepts a folder selection or `.zip` archive via drag-and-drop.
   * **Classification Strategy**: Choice between explicit directory mapping (looking for `common/` or `primitives/` directories) or static import analysis.
3. **Optimistic Processing State**: Upon submission, a creation progress overlay displays step-by-step progress:
   * **Unpacking & Parsing**: Reading file entries client-side using JSZip or Web Directory Reader APIs.
   * **Database Transaction**: Executing the `create_project_from_components` SpacetimeDB reducer.
   * **Workspace Redirect**: Automatically navigating to `/projects/:id/components` upon completion.

---

## 3. SpacetimeDB Engine & Transactional Data Flow

To guarantee data integrity, project creation is handled as a single atomic transaction inside the SpacetimeDB module engine. If any step fails (e.g., identity rate limit exceeded or malformed payload), the transaction aborts cleanly without leaving orphaned records.

```
[Client Dashboard (Browser)]
        |
        | 1. Extract UTF-8 File Map from ZIP / Folder
        v
[SpacetimeDB Reducer: create_project_from_components]
        |
        +---> 2. Insert row into `project` table
        |
        +---> 3. Insert `project_grant` row (Owner role assigned to identity)
        |
        +---> 4. Group files by top-level component directory
        |        |
        |        +---> Insert `component` identity row (status = 'draft')
        |        |
        |        +---> Insert `component_draft` multi-file rows (revision = 1)
        |
        +---> 5. Generate initial `design.md` memory entry from extracted styles
        |
        v
[Client Redirect to /projects/:id/components]
```

### Module Interface Specification

| Parameter | Type | Description |
| :--- | :--- | :--- |
| **`projectName`** | `string` | Human-readable title for the new project workspace. |
| **`targetStack`** | `"react_tailwind" \| "blazor_bootstrap"` | Output target profile governing compiler checks and styling rules. |
| **`classificationStrategy`** | `"directory" \| "static_analysis"` | Method used to categorize components into Common Primitives vs. Compositions. |
| **`files`** | `Array<{ relativePath: string, content: string }>` | Array of UTF-8 relative file paths and source code contents. |

```typescript
// SpacetimeDB TypeScript Reducer Implementation Signature
#[spacetimedb::reducer]
export function create_project_from_components(
  ctx: ReducerContext,
  args: CreateProjectFromComponentsArgs
): void {
  // 1. Verify user identity & rate limits
  const identity = ctx.sender;
  enforceRateLimit(ctx, identity);

  // 2. Insert Project & Ownership Grant
  const projectId = ctx.db.project.insert({
    name: args.projectName,
    targetStack: args.targetStack,
    createdAt: ctx.timestamp,
  });

  ctx.db.project_grant.insert({
    projectId,
    identity,
    role: "owner",
    createdAt: ctx.timestamp,
  });

  // 3. Group files by component root folder
  const componentMap = groupFilesByComponent(args.files);

  for (const [compName, draftFiles] of componentMap.entries()) {
    const category = classifyComponent(compName, draftFiles, args.classificationStrategy);

    const componentId = ctx.db.component.insert({
      projectId,
      name: compName,
      category,
      rootPath: `components/${compName}`,
      status: "draft",
      createdAt: ctx.timestamp,
    });

    for (const file of draftFiles) {
      ctx.db.component_draft.insert({
        componentId,
        projectId,
        revision: 1n,
        filePath: file.relativePath,
        content: file.content,
        updatedAt: ctx.timestamp,
      });
    }
  }
}
```

---

## 4. Component Classification & Hierarchy Extraction

A core architectural invariant of ComPlix is the distinction between **Common Primitives** (atomic building blocks like `Button`, `Input`) and **Compositions** (higher-level components like `LoginForm`, `DataTable` built from primitives).

### Classification Logic

The project importer applies a two-tier strategy during project creation:

```
                          [ Incoming Component Folder ]
                                        |
                                        v
                    Does directory path contain 'common', 'primitives', or 'atoms'?
                                   /         \
                                 YES          NO
                                 /             \
                                v               v
                       [ Common Primitive ]   Does code import other local components?
                                                      /          \
                                                    YES           NO
                                                    /              \
                                                   v                v
                                            [ Composition ]   [ Common Primitive ]
```

1. **Path-Based Rule Matching**: If the uploaded folder path contains `common`, `primitives`, `ui`, or `atoms` (e.g., `src/components/common/Button.tsx`), the component is categorized as a **Common Primitive**.
2. **Static Import Analysis**: For flat component directories, the parser analyzes relative import statements:
   * Components with zero relative imports to sibling components map to **Common Primitives**.
   * Components importing sibling primitives (e.g., `import { Button } from './Button'`) map to **Compositions**.

---

## 5. Automated Validation & Sandbox Verification

Following database insertion, the backend triggers an automated post-import validation job inside **E2B isolated micro-containers**:

```
+-----------------------------------------------------------------------------------+
|  E2B Post-Import Verification Run                                                 |
|                                                                                   |
|  1. Provision offline E2B micro-container for target stack (React / Blazor)       |
|  2. Inject all project component files into /workspace/candidate/                 |
|  3. Run compiler verification:                                                    |
|     - React Target: `tsc --noEmit` and `vite build`                               |
|     - Blazor Target: `dotnet build`                                               |
|  4. Assign initial status badges:                                                 |
|     - Clean build: Update `component.status` to 'verified'                        |
|     - Compiler errors: Keep status as 'draft', log error log to component thread   |
+-----------------------------------------------------------------------------------+
```

This verification run guarantees that imported legacy components with existing syntax or type errors are clearly badged in the UI, enabling developers to immediately initiate AI-assisted repair turns with Nemotron inside the component workspace.

---

## 6. Implementation Milestones

1. **Milestone 1 (Dashboard Modal)**: Implement UI folder upload picker and JSZip parser on the `/projects` page.
2. **Milestone 2 (SpacetimeDB Reducer)**: Build `create_project_from_components` reducer handling atomic project, grant, component, and draft insertion.
3. **Milestone 3 (Classification & Styling Memory)**: Implement import path parser and seed `design.md` visual tokens from uploaded style sheets.
4. **Milestone 4 (E2B Build Verification)**: Connect post-import container checks to populate status badges upon initial workspace load.
