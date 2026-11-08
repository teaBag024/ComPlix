import { Button } from './components/Button';
import { sessionExpiry } from './sessionExpiry';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from 'react-oidc-context';
import type { UserManager } from 'oidc-client-ts';
import { OrganizationWorkspace } from './OrganizationWorkspace';
import { useEffect, useRef, useState } from 'react';
import { RENEW_MARGIN_MS, claimAutoSignIn, createUserManager, followOtherTabs, renewSession, safeReturnPath, userStorageKey } from './authSession';
import './style.css';

document.documentElement.dataset.theme = window.localStorage.getItem('complix.theme') === 'dark' ? 'dark' : 'light';

const clientId = import.meta.env.VITE_AUTH_CLIENT_ID ?? 'client_034te16H37cuA4goFM0pev';
const authority = 'https://auth.spacetimedb.com/oidc';
const appOrigin = import.meta.env.VITE_AUTH_REDIRECT_ORIGIN ?? (import.meta.env.DEV ? 'http://127.0.0.1:5173' : window.location.origin);
const here = () => window.location.pathname + window.location.search;

function App({ manager }: { manager: UserManager }) {
  const auth = useAuth();
  const [, rerender] = useState(0);
  // 'rejected' means the provider refused the refresh token; only then is a new sign-in needed.
  const [renewal, setRenewal] = useState<'ok' | 'rejected'>('ok');
  const workspaceShown = useRef(false);
  const expiresAt = sessionExpiry(auth.user?.id_token, auth.user?.expires_at);
  // Derived from the current token on every render (0 means no session yet), never from a timer flag
  // that could lag behind a newly loaded session.
  const expired = expiresAt > 0 && Date.now() >= expiresAt * 1000;
  useEffect(() => followOtherTabs(manager, userStorageKey({ authority, client_id: clientId })), [manager]);
  useEffect(() => {
    if (!auth.user?.id_token || !Number.isFinite(expiresAt)) return;
    let running = false;
    let retryAfter = 0;
    let disposed = false;
    const renew = () => {
      // Spacetime authenticates with the ID token, which can expire before the access token.
      if (running || Date.now() < retryAfter || Date.now() < expiresAt * 1000 - RENEW_MARGIN_MS) return;
      running = true;
      retryAfter = Date.now() + 15000;
      void renewSession(manager).then(result => { if (!disposed) setRenewal(result === 'rejected' ? 'rejected' : 'ok'); })
        .finally(() => { running = false; });
    };
    const timer = window.setInterval(renew, 10000);
    window.addEventListener('focus', renew);
    document.addEventListener('visibilitychange', renew);
    renew();
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', renew);
      document.removeEventListener('visibilitychange', renew);
    };
  }, [expiresAt, auth.user?.id_token, manager]);
  // Re-render at the expiry moment so `expired` above is re-evaluated.
  useEffect(() => {
    if (!(expiresAt > 0) || !Number.isFinite(expiresAt)) return;
    const timer = window.setTimeout(() => rerender(value => value + 1), Math.max(0, expiresAt * 1000 - Date.now()) + 50);
    return () => window.clearTimeout(timer);
  }, [expiresAt]);
  useEffect(() => { if (auth.user?.refresh_token) setRenewal('ok'); }, [auth.user?.refresh_token]);

  const user = auth.user;
  const stale = !!user && (user.expired || expired);
  const recoverable = !!user?.refresh_token && renewal === 'ok';
  // A refused refresh token: try the provider once automatically. If its login is still active it
  // returns straight here without a click; the cooldown prevents redirect loops.
  const autoSignIn = !!user && stale && !recoverable;
  useEffect(() => {
    if (autoSignIn && claimAutoSignIn()) void auth.signinRedirect({ state: { returnTo: here() } }).catch(() => undefined);
  }, [autoSignIn]);

  if ((auth.isLoading && auth.activeNavigator !== 'signinSilent') || (auth.activeNavigator && auth.activeNavigator !== 'signinSilent')) return <main><p role="status">Completing sign-in…</p></main>;
  if (auth.error && !user) return <main><h1>Sign-in could not finish</h1><p role="alert">Please try again. If this continues, check the registered redirect address.</p><Button onClick={() => void auth.clearStaleState().then(() => window.location.assign('/'))}>Return to sign in</Button></main>;
  if (!user?.id_token || (stale && !recoverable)) return <main>
    <span className="eyebrow">ComPlix</span><h1>Your component workspace</h1>
    <p>Sign in to create an organization or open projects shared with you.</p>
    <Button onClick={() => void auth.signinRedirect({ state: { returnTo: here() } }).catch(() => window.location.assign('/'))}>Sign in</Button>
    <p className="note">Choose Google, GitHub, or email on the sign-in page. Available methods depend on your organization’s sign-in configuration.</p>
  </main>;
  // An expired but renewable session never shows the sign-in screen. Before the workspace has opened
  // (for example, a reload after a long break) wait briefly for the renewed token; once it is open,
  // keep it mounted while renewal finishes in the background.
  if (stale && !workspaceShown.current) return <main><p role="status">Restoring your session…</p></main>;
  workspaceShown.current = true;
  return <>
    {stale && <p role="status" className="session-banner">Reconnecting your session…</p>}
    <OrganizationWorkspace key={user.profile.sub} token={user.id_token} signOut={async () => {
      const hint = auth.user?.id_token;
      await auth.removeUser();
      try { await auth.signoutRedirect({ id_token_hint: hint }); }
      catch { window.location.replace('/'); }
    }} />
  </>;
}

if (window.location.origin !== appOrigin) {
  // PKCE state is origin-scoped. Navigate before starting OIDC so callback state
  // and the old local project token remain on the documented origin.
  window.location.replace(appOrigin);
} else {
  const manager = createUserManager({ authority, client_id: clientId, redirect_uri: appOrigin + '/callback', post_logout_redirect_uri: appOrigin,
    scope: 'openid profile email offline_access', response_type: 'code', automaticSilentRenew: false });
  createRoot(document.getElementById('root')!).render(
    <AuthProvider userManager={manager}
      onSigninCallback={user => window.history.replaceState({}, document.title, safeReturnPath((user?.state as { returnTo?: unknown } | undefined)?.returnTo))}>
      <App manager={manager} />
    </AuthProvider>,
  );
}
