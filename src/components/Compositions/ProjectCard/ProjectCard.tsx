import { Badge } from '../../Common/Badge';
import { Button } from '../../Common/Button';
import { cn } from '../../../lib/utils';
import type { ProjectCardProps, ProjectSummary, SetupBadgeVariant } from './ProjectCard.types';

export function projectStack(project: Pick<ProjectSummary, 'framework' | 'language' | 'styling' | 'libraries'>): string {
  return [project.framework, project.language, project.styling, project.libraries]
    .filter(Boolean)
    .join(' · ') || 'Technology stack not specified yet';
}

function setupBadgeVariant(setupState: string): SetupBadgeVariant {
  return setupState === 'generating' ? 'generating' : setupState === 'ready' ? 'ready' : 'setup';
}

const setupBadge: Record<SetupBadgeVariant, { label: string; variant: 'sky' | 'mint' | 'lemon' }> = {
  generating: { label: 'Generating starters', variant: 'sky' },
  ready: { label: 'Ready', variant: 'mint' },
  setup: { label: 'Setup in progress', variant: 'lemon' },
};

// Long organization names must wrap inside the card instead of overflowing it.
const wrapping = 'whitespace-normal [overflow-wrap:anywhere]';

export function ProjectCard({ project, owned, organization, active, open }: ProjectCardProps) {
  const isOrganizationOwned = project.ownership === 'organization';
  const setup = setupBadge[setupBadgeVariant(project.setupState)];
  const permissionLabel = owned
    ? 'You own this project'
    : project.permission === 'editor'
      ? 'You can edit'
      : 'You can view';

  return (
    <article
      className={cn(
        'project-card min-w-0 rounded-[2px] border border-subtle bg-elevated p-3.5 [overflow-wrap:anywhere] transition-[transform,box-shadow,border-color] duration-150 ease-out hover:-translate-x-px hover:-translate-y-px hover:border-strong hover:shadow-[3px_3px_0px_var(--border-strong)] motion-reduce:transition-none motion-reduce:hover:translate-x-0 motion-reduce:hover:translate-y-0',
        active && 'border-t-[3px] border-t-strong'
      )}
      data-active={active ? 'true' : 'false'}
      aria-label={'Project ' + project.name}
    >
      <div className="card-badges mb-3 flex flex-wrap gap-1.5">
        <Badge variant={owned || isOrganizationOwned ? 'solid' : 'mono'} className={wrapping}>
          {isOrganizationOwned ? 'Organization-owned' : owned ? 'Owned by you' : 'Shared with you'}
        </Badge>
        <Badge variant="mono" className={wrapping}>
          {project.organizationId ? 'Shared space: ' + (organization ?? 'Organization') : 'Private'}
        </Badge>
        {project.setupState !== 'ready' && (
          <Badge variant={setup.variant} withDot data-setup={project.setupState}>{setup.label}</Badge>
        )}
      </div>

      <h3 className="m-0 mb-1 text-[13.5px] font-bold leading-tight text-ink">{project.name}</h3>
      <p className="stack-label m-0 mb-1 font-mono text-[10.5px] uppercase tracking-wider text-ink-muted">
        This project's requested stack
      </p>
      <p className="project-stack m-0 mb-4 font-mono text-xs text-ink">{projectStack(project)}</p>

      <div className="project-card-footer flex flex-wrap items-center justify-between gap-3 border-t border-subtle pt-3">
        <span className="font-mono text-[10.5px] text-ink-muted">{permissionLabel}</span>
        <Button
          type="button"
          variant={active ? 'primary' : 'secondary'}
          size="sm"
          className="m-0"
          aria-label={'Open project ' + project.name}
          onClick={open}
        >
          {active ? 'Continue' : 'Open project'}
        </Button>
      </div>
    </article>
  );
}

ProjectCard.displayName = 'ProjectCard';
