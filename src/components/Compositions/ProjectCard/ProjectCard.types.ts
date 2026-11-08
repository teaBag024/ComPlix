import type { ProjectSummary } from '../../../module_bindings/types';

export type { ProjectSummary };

export interface ProjectCardProps {
  project: ProjectSummary;
  owned: boolean;
  organization?: string;
  active: boolean;
  open: () => void;
}

/** Setup states stored on a project row: `setup` (wizard), `generating` (starters running), `ready`. */
export type SetupBadgeVariant = 'ready' | 'generating' | 'setup';
