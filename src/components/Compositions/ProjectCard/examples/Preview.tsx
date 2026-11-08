import { useState } from 'react';
import { ProjectCard } from '..';
import type { ProjectSummary } from '../ProjectCard.types';

// Demonstration only: the row fields the card reads, with placeholder values for the rest.
const sample = (id: bigint, overrides: Partial<ProjectSummary>) => ({
  id, name: 'Sample', framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui',
  ownership: 'personal', organizationId: 0n, setupState: 'ready', permission: 'editor', ...overrides,
}) as ProjectSummary;

const projects = [
  sample(1n, { name: 'Pilot B design system' }),
  sample(2n, { name: 'Portal library', framework: 'Blazor', language: 'C#', styling: 'Bootstrap', libraries: '', organizationId: 7n, setupState: 'generating' }),
  sample(3n, { name: 'Analytics UI', setupState: 'setup', permission: 'viewer' }),
];

export default function ProjectCardPreview() {
  const [active, setActive] = useState<bigint>(1n);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {projects.map(project => <ProjectCard key={project.id.toString()} project={project} owned={project.id === 1n}
        organization="Acme" active={project.id === active} open={() => setActive(project.id)} />)}
    </div>
  );
}
