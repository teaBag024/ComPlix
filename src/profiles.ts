/** These describe future generated libraries, not the ComPlix builder. */
export const profiles = {
  'react-ts-tailwind-shadcn': 'React + TypeScript + Tailwind + shadcn/ui',
  'blazor-bootstrap': 'Blazor + Bootstrap',
} as const;
export type OutputProfile = keyof typeof profiles;
