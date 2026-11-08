import { createRoot, type Root } from 'react-dom/client';
import { StackPreview } from '../../src/StackPreview';
import { selectStackAdapter } from '../../shared/stackAdapters';

const target = { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' };
let root: Root | undefined;
/** Mounts the real preview component with a fake connection whose procedure outcome is scripted. */
export function mount(outcomes: string[]) {
  const calls: string[] = (window as any).previewCalls = [];
  const connection = (name: string) => ({ procedures: { buildComponentPreview: async () => {
    calls.push(name);
    const outcome = outcomes.shift() ?? 'ok';
    if (outcome !== 'ok') throw outcome;
  } } }) as any;
  const render = (conn: unknown) => root!.render(<StackPreview adapter={selectStackAdapter(target)} connection={conn as any} jobId={2n} savedRevision={1n} unsaved={false} editable active />);
  root = createRoot(document.getElementById('host')!);
  render(connection('first'));
  (window as any).reconnect = () => render(connection('renewed'));
}
