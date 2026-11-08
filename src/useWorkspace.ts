import type instructionSchema from './module_bindings/visible_editor_instructions_table';
export type SavedEditorInstruction = Infer<typeof instructionSchema>;
import type componentSchema from './module_bindings/visible_components_table';
import type chatSchema from './module_bindings/visible_component_chat_table';
export type Component = Infer<typeof componentSchema>;
export type ComponentMessage = Infer<typeof chatSchema>;
import type draftSchema from './module_bindings/visible_component_drafts_table';
export type ComponentDraft = Infer<typeof draftSchema>;
import type previewSchema from './module_bindings/visible_component_previews_table';
export type ComponentPreview = Infer<typeof previewSchema>;
import type jobSchema from './module_bindings/visible_generation_jobs_table';
export type GenerationJob = Infer<typeof jobSchema>;
import type referenceSchema from './module_bindings/visible_references_table';
export type ProjectReference = Infer<typeof referenceSchema>;
import type { Infer } from 'spacetimedb';
import type guidanceSchema from './module_bindings/visible_guidance_table';
import type starterSchema from './module_bindings/visible_starter_tasks_table';
export type StarterTask = Infer<typeof starterSchema>;
export type Guidance = Infer<typeof guidanceSchema>;
import { useEffect, useRef, useState } from 'react';
import { DbConnection, tables } from './module_bindings';
import type { UserProfile, OrganizationSummary, ProjectSummary, MemberSummary, InvitationSummary, ProjectShareSummary } from './module_bindings/types';

export const endpoint = import.meta.env.VITE_SPACETIME_URI ?? 'http://127.0.0.1:3000';
export const database = import.meta.env.VITE_SPACETIME_DATABASE ?? 'complix-local';
export type WorkspaceData = { profile?: UserProfile; organizations: OrganizationSummary[]; projects: ProjectSummary[]; members: MemberSummary[]; invitations: InvitationSummary[]; guidance: Guidance[]; shares: ProjectShareSummary[]; references: ProjectReference[]; jobs: GenerationJob[]; drafts: ComponentDraft[]; previews: ComponentPreview[]; components: Component[]; messages: ComponentMessage[]; starterTasks: StarterTask[]; instructions: SavedEditorInstruction[]; generationMode: string; chatEnabled: boolean };
const empty = (): WorkspaceData => ({ organizations: [], projects: [], members: [], invitations: [], guidance: [], shares: [], references: [], jobs: [], drafts: [], previews: [], components: [], messages: [], starterTasks: [], instructions: [], generationMode: 'unconfigured', chatEnabled: false });
export function useWorkspace(token: string, attempt: number) {
  const [data, setData] = useState(empty);
  const [connection, setConnection] = useState<DbConnection>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // The connection currently serving the workspace. Sign-in renewal (a new token for the same user, about
  // every 13 minutes) opens a replacement in the background and swaps only once it is subscribed, so the
  // workspace and any open editor stay mounted. A different user remounts this hook (keyed by subject).
  const live = useRef<DbConnection | undefined>(undefined);
  useEffect(() => () => { live.current?.disconnect(); live.current = undefined; }, []);
  useEffect(() => {
    let disposed = false;
    let failed = false;
    let initialized = false;
    let conn: DbConnection | undefined;
    const fail = () => {
      if (disposed || failed) return;
      failed = true;
      window.clearTimeout(timeout);
      setData(empty());
      setConnection(undefined);
      setStatus('error');
      live.current?.disconnect(); live.current = undefined;
      conn?.disconnect();
    };
    const timeout = window.setTimeout(fail, 15000);
    if (!live.current) {
      setStatus('loading');
      setData(empty());
      setConnection(undefined);
    }
    try {
      conn = DbConnection.builder().withUri(endpoint).withDatabaseName(database).withToken(token)
        .onConnect(ctx => {
          void ctx.reducers.registerProfile({}).then(() => {
            if (disposed || failed) return;
            const refresh = () => {
              if (!disposed && !failed && initialized) setData({
                profile: [...ctx.db.myProfile.iter()][0],
                organizations: [...ctx.db.myOrganizations.iter()],
                projects: [...ctx.db.visibleProjects.iter()],
                members: [...ctx.db.organizationMembers.iter()],
                invitations: [...ctx.db.myInvitations.iter()],
                guidance: [...ctx.db.visibleGuidance.iter()],
                shares: [...ctx.db.managedProjectShares.iter()],
                references: [...ctx.db.visibleReferences.iter()],
                jobs: [...ctx.db.visibleGenerationJobs.iter()],
                drafts: [...ctx.db.visibleComponentDrafts.iter()], previews: [...ctx.db.visibleComponentPreviews.iter()], components: [...ctx.db.visibleComponents.iter()], messages: [...ctx.db.visibleComponentChat.iter()], starterTasks: [...ctx.db.visibleStarterTasks.iter()], instructions: [...ctx.db.visibleEditorInstructions.iter()],
                generationMode: [...ctx.db.generationSettings.iter()][0]?.mode ?? 'unconfigured',
                chatEnabled: [...ctx.db.generationSettings.iter()][0]?.chatEnabled ?? false,
              });
            };
            const handles = [ctx.db.myProfile, ctx.db.myOrganizations, ctx.db.visibleProjects, ctx.db.organizationMembers, ctx.db.myInvitations, ctx.db.visibleGuidance, ctx.db.managedProjectShares, ctx.db.visibleReferences, ctx.db.visibleGenerationJobs, ctx.db.visibleComponentDrafts, ctx.db.visibleComponentPreviews, ctx.db.visibleComponents, ctx.db.visibleComponentChat, ctx.db.visibleStarterTasks, ctx.db.visibleEditorInstructions, ctx.db.generationSettings];
            for (const handle of handles) {
              handle.onInsert(refresh); handle.onDelete(refresh); handle.onUpdate(refresh);
            }
            ctx.subscriptionBuilder().onApplied(() => {
              if (disposed || failed) return;
              initialized = true;
              window.clearTimeout(timeout);
              const previous = live.current;
              live.current = conn;
              refresh();
              setConnection(ctx);
              setStatus('ready');
              // Retire the renewed-away connection only after the replacement is live.
              if (previous && previous !== conn) previous.disconnect();
            }).onError(fail).subscribe([tables.myProfile, tables.myOrganizations, tables.visibleProjects, tables.organizationMembers, tables.myInvitations, tables.visibleGuidance, tables.managedProjectShares, tables.visibleReferences, tables.visibleGenerationJobs, tables.visibleComponentDrafts, tables.visibleComponentPreviews, tables.visibleComponents, tables.visibleComponentChat, tables.visibleStarterTasks, tables.visibleEditorInstructions, tables.generationSettings]);
          }).catch(fail);
        }).onDisconnect(fail).onConnectError(fail).build();
    } catch { fail(); }
    // A connection that became live stays open until its replacement is ready (or the hook unmounts).
    return () => { disposed = true; window.clearTimeout(timeout); if (conn !== live.current) conn?.disconnect(); };
  }, [token, attempt]);
  return { data, connection, status };
}
