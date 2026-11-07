import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { DbConnection, tables } from './module_bindings';
import { Workspace, type SavedProject } from './Workspace';
import './style.css';

// Local-only development identity; never print/store this bearer token in source or logs.
const tokenKey = 'complix.local.identity.v1';
const endpoint = import.meta.env.VITE_SPACETIME_URI ?? 'http://127.0.0.1:3000';
const database = import.meta.env.VITE_SPACETIME_DATABASE ?? 'complix-local';

function App() {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [project, setProject] = useState<SavedProject>();
  const [connection, setConnection] = useState<DbConnection>();

  useEffect(() => {
    let disposed = false;
    let conn: DbConnection | undefined;
    let initialized = false;
    let failed = false;
    const fail = () => {
      if (!disposed && !failed) {
        failed = true;
        window.clearTimeout(timeout);
        initialized = false;
        setStatus('error');
        setProject(undefined);
        setConnection(undefined);
        conn?.disconnect();
      }
    };
    setStatus('loading');
    setProject(undefined);
    const timeout = window.setTimeout(fail, 10000);
    try {
      conn = DbConnection.builder()
        .withUri(endpoint)
        .withDatabaseName(database)
        .withToken(localStorage.getItem(tokenKey) ?? undefined)
        .onConnect((ctx, _identity, token) => {
          if (disposed || failed) return;
          try {
            localStorage.setItem(tokenKey, token);
          } catch {
            fail();
            ctx.disconnect();
            return;
          }
          const refresh = () => {
            if (!disposed && initialized) setProject([...ctx.db.myProject.iter()][0]);
          };
          ctx.db.myProject.onInsert(refresh);
          ctx.db.myProject.onDelete(refresh);
          ctx.db.myProject.onUpdate(refresh);
          ctx.subscriptionBuilder()
            .onApplied(() => {
              if (disposed || failed) return;
              window.clearTimeout(timeout);
              initialized = true;
              setProject([...ctx.db.myProject.iter()][0]);
              setConnection(ctx);
              setStatus('ready');
            })
            .onError(fail)
            .subscribe(tables.myProject);
        })
        .onConnectError(fail)
        .onDisconnect(fail)
        .build();
    } catch {
      fail();
    }
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      conn?.disconnect();
    };
  }, [attempt]);

  function ready() {
    if (!connection || status !== 'ready') throw new Error('Not connected.');
    return connection;
  }

  return <>
    <Workspace key={attempt} status={status} project={project}
      create={(name, outputStack) => ready().reducers.createProject({ name, outputStack })}
      rename={(projectId, name) => ready().reducers.renameProject({ projectId, name })}
      retry={() => setAttempt(value => value + 1)} />
    <p className="identity-note">Local identity is saved in this browser. Clearing browser storage loses access; no sign-in or account recovery is configured.</p>
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);
