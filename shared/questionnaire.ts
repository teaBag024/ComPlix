// Structured setup questionnaire. The browser and the SpacetimeDB module share these rules.
// Answers are stored as JSON and also rendered into the guidance text fields that generation reads.
export const questionnaireChoices = {
  productType: { label: 'What are you building?', options: ['Dashboard or admin tool', 'SaaS product', 'Marketing website', 'E-commerce', 'Internal business tool', 'Mobile-first web app'] },
  theme: { label: 'Theme', options: ['Light', 'Dark', 'Light and dark'] },
  neutralTone: { label: 'Neutral tone', options: ['Neutral gray', 'Cool gray / slate', 'Warm gray / stone'] },
  corners: { label: 'Corner style', options: ['Sharp (0px)', 'Subtle (4px)', 'Rounded (8px)', 'Very rounded (16px)', 'Pill (fully rounded)'] },
  density: { label: 'Spacing and density', options: ['Compact', 'Comfortable', 'Spacious'] },
  shadows: { label: 'Shadows and depth', options: ['None (flat, use borders)', 'Subtle', 'Pronounced'] },
  font: { label: 'Font family', options: ['System default', 'Inter', 'Roboto', 'Open Sans', 'Source Sans 3', 'Georgia (serif)'] },
  fontSize: { label: 'Base text size', options: ['Small (14px)', 'Medium (16px)', 'Large (18px)'] },
  accessibility: { label: 'Accessibility target', options: ['WCAG 2.2 AA', 'WCAG 2.2 AAA', 'No specific target'] },
} as const;
export const personalityOptions = ['Minimal', 'Friendly', 'Corporate', 'Bold', 'Elegant', 'Playful', 'Technical'] as const;
export const colorFields = { primaryColor: 'Primary brand color', accentColor: 'Accent color' } as const;
export const textFields = { audience: { label: 'Who will use it?', max: 1000 }, notes: { label: 'Anything else the components should follow?', max: 2000 } } as const;

type ChoiceKey = keyof typeof questionnaireChoices;
export type Questionnaire = Record<ChoiceKey | keyof typeof colorFields | keyof typeof textFields, string> & { personality: string[] };
export const emptyQuestionnaire = (): Questionnaire => ({
  productType: '', theme: '', neutralTone: '', corners: '', density: '', shadows: '', font: '', fontSize: '', accessibility: '',
  primaryColor: '', accentColor: '', audience: '', notes: '', personality: [],
});
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
export const QUESTIONNAIRE_ERROR = 'Questionnaire answers are invalid. Reload the page and try again.';

/** Strictly validates stored or submitted JSON. Blank means "no preference". */
export function parseQuestionnaire(json: string): Questionnaire {
  if (!json) return emptyQuestionnaire();
  let value: any;
  try { value = JSON.parse(json); } catch { throw new Error(QUESTIONNAIRE_ERROR); }
  if (!value || typeof value !== 'object' || Array.isArray(value) || json.length > 8000) throw new Error(QUESTIONNAIRE_ERROR);
  const result = emptyQuestionnaire();
  const allowed = new Set(Object.keys(result));
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error(QUESTIONNAIRE_ERROR);
  for (const [key, spec] of Object.entries(questionnaireChoices) as Array<[ChoiceKey, { options: readonly string[] }]>) {
    const answer = value[key] ?? '';
    if (typeof answer !== 'string' || (answer && !spec.options.includes(answer))) throw new Error(QUESTIONNAIRE_ERROR);
    result[key] = answer;
  }
  for (const key of Object.keys(colorFields) as Array<keyof typeof colorFields>) {
    const answer = value[key] ?? '';
    if (typeof answer !== 'string' || (answer && !/^#[0-9a-fA-F]{6}$/.test(answer))) throw new Error(QUESTIONNAIRE_ERROR);
    result[key] = answer.toLowerCase();
  }
  for (const [key, spec] of Object.entries(textFields) as Array<[keyof typeof textFields, { max: number }]>) {
    const answer = value[key] ?? '';
    if (typeof answer !== 'string' || answer.length > spec.max || controlCharacters.test(answer)) throw new Error(QUESTIONNAIRE_ERROR);
    result[key] = answer.trim();
  }
  const personality = value.personality ?? [];
  if (!Array.isArray(personality) || personality.length > personalityOptions.length || personality.some(item => !(personalityOptions as readonly string[]).includes(item)) || new Set(personality).size !== personality.length) throw new Error(QUESTIONNAIRE_ERROR);
  result.personality = personalityOptions.filter(item => personality.includes(item));
  return result;
}
export function hasAnswers(answers: Questionnaire) {
  return answers.personality.length > 0 || Object.entries(answers).some(([key, value]) => key !== 'personality' && value !== '');
}
const line = (label: string, value: string) => value ? `${label}: ${value}.` : '';
const join = (...parts: string[]) => parts.filter(Boolean).join(' ');
/** Concrete, generation-ready text for the existing guidance fields. */
export function questionnaireGuidance(answers: Questionnaire) {
  return {
    audience: join(line('Product type', answers.productType), line('Users', answers.audience)),
    style: join(answers.personality.length ? `Personality: ${answers.personality.join(', ')}.` : '', line('Theme', answers.theme), line('Corner radius', answers.corners), line('Shadows', answers.shadows), answers.notes ? `Notes: ${answers.notes}` : ''),
    colors: join(line('Primary color', answers.primaryColor), line('Accent color', answers.accentColor), line('Neutral palette', answers.neutralTone)),
    typography: join(line('Font family', answers.font), line('Base text size', answers.fontSize)),
    spacing: line('Density', answers.density),
    accessibility: line('Target', answers.accessibility),
  };
}
