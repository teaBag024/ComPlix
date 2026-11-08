import type { ButtonHTMLAttributes } from 'react';
export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className="rounded-md bg-green-800 px-4 py-2 text-white" />;
}
