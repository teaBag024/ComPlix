# Tabs (Common)

shadcn/ui-style Radix Tabs: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

`TabsContent` always stays mounted (`forceMount`), so switching tabs can't discard unsaved form edits or stop autosave. Hide inactive panels with CSS (`[data-state="inactive"]`).

Not currently used by any page. It was kept from the earlier workspace-tabs work so it is available as a Common primitive. It has no style-guide styling yet; add `.tabs-list`/`.tabs-trigger` rules or utilities before using it.
