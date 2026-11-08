// Starter Common components generated after project setup. Names must satisfy the component-name rule.
export const starterComponents = [
  { id: 'button', name: 'Button', label: 'Button', description: 'Primary, secondary and ghost variants, sizes, disabled and loading states.',
    brief: 'a Button with primary, secondary and ghost variants, small/medium/large sizes, disabled and loading states, and an optional leading icon slot' },
  { id: 'text-input', name: 'TextInput', label: 'Text input', description: 'Labelled text field with helper text, error and disabled states.',
    brief: 'a labelled TextInput field with placeholder, helper text, error message, required and disabled states, and a controlled value with change callback' },
  { id: 'kpi-card', name: 'KpiCard', label: 'KPI card', description: 'Metric label, value and up/down trend versus a previous period.',
    brief: 'a KpiCard that shows a metric label, a formatted value, a trend (up, down or flat) with a percentage change versus a previous period, and an optional caption' },
  { id: 'modal', name: 'Modal', label: 'Modal', description: 'Dialog with title, body, footer actions, overlay and Escape to close.',
    brief: 'an accessible Modal dialog with open state, title, body content, footer action area, close on overlay click and Escape, and focus kept inside while open' },
] as const;
export type StarterId = typeof starterComponents[number]['id'];
export const MAX_STARTER_COMPONENTS = starterComponents.length;

/** A directive request so the coordinator generates files instead of asking questions. */
export function starterRequest(id: string) {
  const item = starterComponents.find(row => row.id === id);
  if (!item) throw new Error('Unknown starter component.');
  return `Create the starter Common component "${item.name}" now by calling generate_component_changes. Build ${item.brief}. `
    + 'Do not ask clarifying questions: apply the project guidance (colors, corner radius, shadows, density, typography, theme and accessibility target) as concrete style values, and choose sensible defaults where guidance is blank. '
    + 'Keep it self-contained: do not import other project components. Plan at most 3 concise files under the component rootPath: the component source, a short README.md documenting its public API, and an interactive preview example entry for this stack.';
}
