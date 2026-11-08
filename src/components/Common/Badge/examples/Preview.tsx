import { Badge } from '..';

// Demonstration only.
export default function BadgePreview() {
  return (
    <div className="flex flex-wrap gap-2 rounded-[2px] border border-subtle bg-surface p-4">
      <Badge>Default</Badge>
      <Badge variant="mono">Revision #12</Badge>
      <Badge variant="solid" withDot>Owner</Badge>
      <Badge variant="lemon" count={3}>Unverified draft</Badge>
      <Badge variant="sky" withDot>Generating</Badge>
      <Badge variant="mint" withDot>Ready</Badge>
      <Badge variant="rose" withDot>Failed</Badge>
      <Badge variant="lilac">Composition</Badge>
      <Badge variant="apricot">Breaking diff</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}
