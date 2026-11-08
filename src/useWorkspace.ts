import type componentSchema from './module_bindings/visible_components_table';
import type chatSchema from './module_bindings/visible_component_chat_table';
export type Component = Infer<typeof componentSchema>;
export type ComponentMessage = Infer<typeof chatSchema>;
import type draftSchema from './module_bindings/visible_component_drafts_table';
export type ComponentDraft = Infer<typeof draftSchema>;
import type jobSchema from './module_bindings/visible_generation_jobs_table';
export type GenerationJob = Infer<typeof jobSchema>;
import type referenceSchema from './module_bindings/visible_references_table';
export type ProjectReference = Infer<typeof referenceSchema>;
import type { Infer } from 'spacetimedb';
import type guidanceSchema from './module_bindings/visible_guidance_table';
export type Guidance = Infer<typeof guidanceSchema>;
import { useEffect, useState } from 'react';
import { DbConnection, tables } from './module_bindings';
import type { UserProfile, OrganizationSummary, ProjectSummary, MemberSummary, InvitationSummary, ProjectShareSummary } from './module_bindings/types';

export const endpoint = import.meta.env.VITE_SPACETIME_URI ?? 'http://127.0.0.1:3000';
export const database = import.meta.env.VITE_SPACETIME_DATABASE ?? 'complix-local';
export type WorkspaceData = { profile?: UserProfile; organizations: OrganizationSummary[]; projects: ProjectSummary[]; members: MemberSummary[]; invitations: InvitationSummary[]; guidance: Guidance[]; shares: ProjectShareSummary[]; references: ProjectReference[]; jobs: GenerationJob[]; drafts: ComponentDraft[]; components: Component[]; messages: ComponentMessage[]; generationMode: string; chatEnabled: boolean };
const empty = (): WorkspaceData => ({ organizations: [], projects: [], members: [], invitations: [], guidance: [], shares: [], references: [], jobs: [], drafts: [], components: [], messages: [], generationMode: 'unconfigured', chatEnabled: false });
export function useWorkspace(token: string, attempt: number) {
  const [data, setData] = useState(empty);
  const [connection, setConnection] = useState<DbConnection>();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
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
      conn?.disconnect();
    };
    const timeout = window.setTimeout(fail, 15000);
    setStatus('loading');
    setData(empty());
    setConnection(undefined);
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
                drafts: [...ctx.db.visibleComponentDrafts.iter()], components: [...ctx.db.visibleComponents.iter()], messages: [...ctx.db.visibleComponentChat.iter()],
                generationMode: [...ctx.db.generationSettings.iter()][0]?.mode ?? 'unconfigured',
                chatEnabled: [...ctx.db.generationSettings.iter()][0]?.chatEnabled ?? false,
              });
            };
            const handles = [ctx.db.myProfile, ctx.db.myOrganizations, ctx.db.visibleProjects, ctx.db.organizationMembers, ctx.db.myInvitations, ctx.db.visibleGuidance, ctx.db.managedProjectShares, ctx.db.visibleReferences, ctx.db.visibleGenerationJobs, ctx.db.visibleComponentDrafts, ctx.db.visibleComponents, ctx.db.visibleComponentChat, ctx.db.generationSettings];
            for (const handle of handles) {
              handle.onInsert(refresh); handle.onDelete(refresh); handle.onUpdate(refresh);
            }
            ctx.subscriptionBuilder().onApplied(() => {
              if (disposed || failed) return;
              initialized = true;
              window.clearTimeout(timeout);
              refresh();
              setConnection(ctx);
              setStatus('ready');
            }).onError(fail).subscribe([tables.myProfile, tables.myOrganizations, tables.visibleProjects, tables.organizationMembers, tables.myInvitations, tables.visibleGuidance, tables.managedProjectShares, tables.visibleReferences, tables.visibleGenerationJobs, tables.visibleComponentDrafts, tables.visibleComponents, tables.visibleComponentChat, tables.generationSettings]);
          }).catch(fail);
        }).onDisconnect(fail).onConnectError(fail).build();
    } catch { fail(); }
    return () => { disposed = true; window.clearTimeout(timeout); conn?.disconnect(); };
  }, [token, attempt]);
  // Do not show an old session's snapshot during the effect cleanup on token changes.
  return { data, connection, status };
}
