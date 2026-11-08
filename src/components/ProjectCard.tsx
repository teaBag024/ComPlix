import { Badge } from './Badge';
import { Button } from './Button';
import type { ProjectSummary } from '../module_bindings/types';

export function projectStack(project: ProjectSummary) {
  return [project.framework, project.language, project.styling, project.libraries].filter(Boolean).join(' · ') || 'Technology stack not specified yet';
}
export function ProjectCard({ project, owned, organization, active, open }: {
  project: ProjectSummary; owned: boolean; organization?: string; active: boolean; open: () => void;
}) {
  return <article className="project-card" data-active={active} aria-label={'Project ' + project.name}>
    <div className="card-badges"><Badge>{project.ownership === 'organization' ? 'Organization-owned' : owned ? 'Owned by you' : 'Shared with you'}</Badge>
      <Badge>{project.organizationId ? 'Shared space: ' + (organization ?? 'Organization') : 'Private'}</Badge>
      {project.setupState !== 'ready' && <Badge>{project.setupState === 'generating' ? 'Generating starters' : 'Setup in progress'}</Badge>}</div>
    <h3>{project.name}</h3><p className="stack-label">This project's requested stack</p><p className="project-stack">{projectStack(project)}</p>
    <div className="project-card-footer"><span className="note">{owned ? 'You own this project' : project.permission === 'editor' ? 'You can edit' : 'You can view'}</span>
      <Button type="button" variant="secondary" aria-label={'Open project ' + project.name} onClick={open}>{active ? 'Continue' : 'Open project'}</Button></div>
  </article>;
}
