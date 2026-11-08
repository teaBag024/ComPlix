import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary';
};

// Leave the native type default intact: existing forms rely on submit buttons.
export function Button({ variant, className, ...props }: ButtonProps) {
  const classes = [variant === 'secondary' ? 'secondary' : '', className].filter(Boolean).join(' ') || undefined;
  return <button {...props} className={classes} />;
}
