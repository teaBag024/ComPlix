// Migration fixture: original module from commit 219e7a0. Keep its schema unchanged.
import { schema, table, t, SenderError } from 'spacetimedb/server';

// Private backing table: ownership is enforced even when clients bypass the UI.
const project = table({ name: 'project' }, {
  id: t.u64().primaryKey().autoInc(),
  owner: t.identity().unique(),
  name: t.string(),
  outputStack: t.string(),
});

const db = schema({ project });
export default db;

function projectName(value: string): string {
  const name = value.trim();
  if (name.length < 1 || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new SenderError('Project name must be 1–80 characters without control characters.');
  }
  return name;
}

export const createProject = db.reducer(
  { name: t.string(), outputStack: t.string() },
  (ctx, args) => {
    const name = projectName(args.name);
    if (!['react-ts-tailwind-shadcn', 'blazor-bootstrap'].includes(args.outputStack)) {
      throw new SenderError('Choose a supported output profile.');
    }
    if (ctx.db.project.owner.find(ctx.sender)) {
      throw new SenderError('You already have a saved project.');
    }
    ctx.db.project.insert({ id: 0n, owner: ctx.sender, name, outputStack: args.outputStack });
  },
);

// A small edit operation makes ownership and live updates verifiable after creation.
export const renameProject = db.reducer({ projectId: t.u64(), name: t.string() }, (ctx, args) => {
  const row = ctx.db.project.id.find(args.projectId);
  if (!row || !row.owner.isEqual(ctx.sender)) {
    throw new SenderError('Project not found or access denied.');
  }
  ctx.db.project.id.update({ ...row, name: projectName(args.name) });
});

export const myProject = db.view(
  { name: 'my_project', public: true },
  t.option(project.rowType),
  ctx => ctx.db.project.owner.find(ctx.sender) ?? undefined,
);
