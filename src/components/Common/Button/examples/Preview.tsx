import { Button } from '..';

// Demonstration only: shows every variant and size; handlers are placeholders.
export default function ButtonPreview() {
  return (
    <div className="flex flex-col gap-4 rounded-[2px] border border-subtle bg-surface p-4 text-ink">
      <div className="flex flex-wrap gap-2">
        <Button type="button">Primary</Button>
        <Button type="button" variant="secondary">Secondary</Button>
        <Button type="button" variant="outline">Outline</Button>
        <Button type="button" variant="ghost">Ghost</Button>
        <Button type="button" variant="mint">Promote</Button>
        <Button type="button" variant="danger">Delete</Button>
        <Button type="button" variant="rainbow">Create project</Button>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Navigation example">
        <Button type="button" variant="nav" size="sm" aria-current="page">Components</Button>
        <Button type="button" variant="nav" size="sm">Settings</Button>
        <Button type="button" variant="link" size="sm" aria-pressed>Button.tsx</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary">Small</Button>
        <Button type="button" size="md" variant="secondary">Medium</Button>
        <Button type="button" size="lg" variant="secondary">Large</Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Copy source">⧉</Button>
        <Button type="button" disabled>Disabled</Button>
        <Button asChild variant="outline"><a href="#example">Anchor as button</a></Button>
      </div>
    </div>
  );
}
