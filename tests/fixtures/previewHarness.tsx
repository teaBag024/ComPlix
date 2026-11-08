import { createRoot } from 'react-dom/client';
import { StackPreview } from '../../src/StackPreview';
import { createPreviewRuntime } from '../../src/previewRuntime';
import { selectStackAdapter } from '../../shared/stackAdapters';

export function mount(endpoint: string) {
  const target = { framework: 'React', language: 'TypeScript', styling: 'Tailwind CSS', libraries: 'shadcn/ui', versions: '' };
  const revision = { projectId: '1', sourceJobId: '2', draftRevision: '0', revisionId: '2:0', target, files: [] };
  createRoot(document.getElementById('host')!).render(<StackPreview adapter={selectStackAdapter(target)} revision={revision} runtime={createPreviewRuntime(endpoint, 'synthetic-user-token')} />);
}
