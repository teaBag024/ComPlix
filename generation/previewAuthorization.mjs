/** This controller never accepts source files or project access claims from the browser. */
export function createPreviewAuthorizer({ uri = 'http://127.0.0.1:3000', database = 'complix-local', fetcher = fetch }) {
  const base = `${uri.replace(/\/$/, '')}/v1/database/${encodeURIComponent(database)}`;
  const id = value => {
    if (typeof value !== 'string' || !/^\d{1,20}$/.test(value) || BigInt(value) > 18446744073709551615n) throw new Error('Invalid preview identifier.');
    return BigInt(value).toString();
  };
  async function call(token, endpoint, body, type) {
    const result = await fetcher(base + endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': type }, body });
    if (!result.ok) throw new Error('Preview access denied or the workspace is unavailable.');
    return result;
  }
  async function sql(token, query) {
    const result = await call(token, '/sql', query, 'text/plain');
    const data = JSON.parse(await result.text(), (_key, value, context) => typeof value === 'number' && !Number.isSafeInteger(value) ? context.source : value);
    const first = data[0];
    if (!first?.schema?.elements || !Array.isArray(first.rows)) throw new Error('Unexpected authorized workspace response.');
    return first.rows.map(row => Object.fromEntries(first.schema.elements.map((field, index) => [typeof field.name === 'string' ? field.name : field.name?.some, row[index]])));
  }
  async function access(token, projectId, editing = false) {
    projectId = id(projectId);
    // The reducer verifies issuer, audience, verified email and expiry at server time, including on HTTP calls.
    await call(token, '/call/register_profile', '[]', 'application/json');
    const [projects, profiles] = await Promise.all([
      sql(token, `SELECT id, permission, framework, language, styling, libraries, versions FROM visible_projects WHERE id = ${projectId}`),
      sql(token, 'SELECT identity FROM my_profile'),
    ]);
    const project = projects[0];
    if (!project || (editing && project.permission !== 'editor') || !profiles[0]) throw new Error('Project edit access is required to build a preview.');
    const expiry = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).exp;
    if (!Number.isFinite(expiry) || expiry * 1000 <= Date.now()) throw new Error('Your preview session expired.');
    return { project, owner: JSON.stringify(profiles[0].identity), expiresAt: Math.min(Date.now() + 300000, expiry * 1000) };
  }
  async function source(token, request) {
    const projectId = id(request.projectId), jobId = id(request.jobId), revision = id(request.revision);
    const authorized = await access(token, projectId, true);
    const [jobs, drafts] = await Promise.all([
      sql(token, `SELECT id, project_id, state, mode, artifacts FROM visible_generation_jobs WHERE id = ${jobId}`),
      sql(token, `SELECT revision, files FROM visible_component_drafts WHERE job_id = ${jobId}`),
    ]);
    const job = jobs[0], draft = drafts[0];
    if (!job || String(job.project_id) !== projectId || job.state !== 'draft_ready' || !['gemini', 'nvidia'].includes(job.mode)) throw new Error('Select a saved generated draft from this project.');
    if (String(draft?.revision ?? 0) !== revision) throw new Error('Draft changed. Save and rebuild the latest draft.');
    const files = draft ? draft.files.map(file => Array.isArray(file) ? { path: file[0], content: file[1] } : file) : JSON.parse(job.artifacts).files;
    return { ...authorized, projectId, jobId, revision, files, target: authorized.project };
  }
  return { access, source };
}
