import type { Technology } from './ProjectDetails';

// Requested technologies stay open-ended ("Other"); the presets cover the two supported output stacks.
// `preview` marks libraries the current sandbox preview environment already provides.
const frameworks = {
  React: { languages: ['TypeScript', 'JavaScript'], styling: ['Tailwind CSS', 'CSS Modules', 'Plain CSS'],
    libraries: [{ name: 'shadcn/ui', preview: true }, { name: 'lucide-react', preview: true }, { name: 'Radix UI', preview: false }, { name: 'Recharts', preview: false }, { name: 'Framer Motion', preview: false }] },
  Blazor: { languages: ['C#'], styling: ['Bootstrap', 'Plain CSS'],
    libraries: [{ name: 'Bootstrap Icons', preview: false }, { name: 'BlazorBootstrap', preview: false }] },
} as const;
type Framework = keyof typeof frameworks | 'Other';
export type StackChoice = { framework: Framework; language: string; styling: string; libraries: string[]; otherLibraries: string; versions: string; custom: { framework: string; language: string; styling: string } };
export const defaultStackChoice = (): StackChoice => ({ framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: ['shadcn/ui'], otherLibraries: '', versions: '', custom: { framework: '', language: '', styling: '' } });

export function toTechnology(choice: StackChoice): Technology {
  const libraries = [...choice.libraries, ...choice.otherLibraries.split(',').map(item => item.trim()).filter(Boolean)].join(', ');
  if (choice.framework === 'Other') return { ...choice.custom, libraries, versions: choice.versions.trim() };
  return { framework: choice.framework, language: choice.language, styling: choice.styling, libraries, versions: choice.versions.trim() };
}

export function StackPicker({ value, onChange }: { value: StackChoice; onChange: (next: StackChoice) => void }) {
  const preset = value.framework === 'Other' ? undefined : frameworks[value.framework];
  const update = (patch: Partial<StackChoice>) => onChange({ ...value, ...patch });
  return <fieldset className="stack-picker"><legend>Technology stack</legend>
    <label>Framework<select aria-label="Framework" value={value.framework} onChange={event => {
      const framework = event.target.value as Framework;
      const next = framework === 'Other' ? undefined : frameworks[framework];
      update({ framework, language: next?.languages[0] ?? '', styling: next?.styling[0] ?? '', libraries: framework === 'React' ? ['shadcn/ui'] : [] });
    }}>{[...Object.keys(frameworks), 'Other'].map(name => <option key={name} value={name}>{name === 'Other' ? 'Other (type it in)' : name}</option>)}</select></label>
    {preset ? <>
      <label>Language<select aria-label="Language" value={value.language} onChange={event => update({ language: event.target.value })}>{preset.languages.map(item => <option key={item}>{item}</option>)}</select></label>
      <label>Styling<select aria-label="Styling" value={value.styling} onChange={event => update({ styling: event.target.value })}>{preset.styling.map(item => <option key={item}>{item}</option>)}</select></label>
      <fieldset className="chip-group"><legend>Libraries</legend>{preset.libraries.map(library => <label key={library.name} className="chip">
        <input type="checkbox" checked={value.libraries.includes(library.name)} onChange={event => update({ libraries: event.target.checked ? [...value.libraries, library.name] : value.libraries.filter(item => item !== library.name) })} />
        {library.name}{library.preview && <span className="chip-note">preview ready</span>}
      </label>)}</fieldset>
    </> : <>
      {(['framework', 'language', 'styling'] as const).map(field => <label key={field}>{field === 'framework' ? 'Framework name' : field === 'language' ? 'Language' : 'Styling'}
        <input aria-label={'Custom ' + field} maxLength={1000} value={value.custom[field]} onChange={event => update({ custom: { ...value.custom, [field]: event.target.value } })} /></label>)}
    </>}
    <label>Other libraries (comma separated)<input aria-label="Other libraries" maxLength={500} value={value.otherLibraries} onChange={event => update({ otherLibraries: event.target.value })} /></label>
    <label>Versions and compatibility notes (optional)<input aria-label="Versions and compatibility notes" maxLength={1000} placeholder="e.g. React 19, .NET 10" value={value.versions} onChange={event => update({ versions: event.target.value })} /></label>
    <p className="note">Starter components and previews currently support React + TypeScript and Blazor + C#. Other stacks are recorded but can't be generated yet.</p>
  </fieldset>;
}
