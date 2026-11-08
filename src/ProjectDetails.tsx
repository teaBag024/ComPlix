import type { ProjectSummary } from './module_bindings/types';

export const technologyLabels = { framework: 'Framework(s)', language: 'Language(s)', styling: 'Styling', libraries: 'Libraries', versions: 'Versions and compatibility notes' };
export const emptyTechnology = { framework: '', language: '', styling: '', libraries: '', versions: '' };
export type Technology = typeof emptyTechnology;
export function ProjectDetails({ project }: { project: ProjectSummary }) {
  const groups = [
    { label: 'Framework(s) & Language(s)', values: [project.framework, project.language] },
    { label: 'Styling & Libraries', values: [project.styling, project.libraries] },
    { label: 'Version & Compatibility Notes', values: [project.versions] },
  ];
  return <section className="panel"><h2>Technologies</h2>
    <p className="note">These requested technologies are view only here and do not imply verified generation or build support.</p>
    <dl className="technology-list">{groups.map(group => <div className="technology-block" key={group.label}>
      <dt>{group.label}</dt>
      <dd>{group.values.filter(Boolean).join(' · ') || <span className="note">Not specified</span>}</dd>
    </div>)}</dl>
  </section>;
}
