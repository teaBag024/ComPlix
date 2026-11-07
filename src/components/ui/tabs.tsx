import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

// shadcn/ui Tabs composition, styled with the application's CSS tokens.
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className = '', ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={`tabs-list ${className}`} {...props} />;
}
export function TabsTrigger({ className = '', ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={`tabs-trigger ${className}`} {...props} />;
}
export function TabsContent({ className = '', ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  // Keep forms mounted so changing tabs cannot discard unsaved edits or stop autosave.
  return <TabsPrimitive.Content forceMount data-slot="tabs-content" className={`tabs-content ${className}`} {...props} />;
}
