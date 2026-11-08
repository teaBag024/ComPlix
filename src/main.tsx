import { sessionExpiry } from './sessionExpiry';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from 'react-oidc-context';
import { WebStorageStateStore } from 'oidc-client-ts';
import { OrganizationWorkspace } from './OrganizationWorkspace';
import { useEffect, useState } from 'react';
import './style.css';

document.documentElement.dataset.theme = window.localStorage.getItem('complix.theme') === 'dark' ? 'dark' : 'light';

const clientId = import.meta.env.VITE_AUTH_CLIENT_ID ?? 'client_034te16H37cuA4goFM0pev';
const authority = 'https://auth.spacetimedb.com/oidc';
const appOrigin = import.meta.env.VITE_AUTH_REDIRECT_ORIGIN ?? (import.meta.env.DEV ? 'http://127.0.0.1:5173' : window.location.origin);

function App() {
  const auth = useAuth();
  const [expired, setExpired] = useState(false);
  const expiresAt = sessionExpiry(auth.user?.id_token, auth.user?.expires_at);
  useEffect(() => {
    if (!auth.user?.id_token || !Number.isFinite(expiresAt)) return;
    let running = false;
    let retryAfter = 0;
    const renew = () => {
      // Spacetime authenticates with the ID token, which can expire before
      // the access token used by the library's default renewal timer.
      if (running || Date.now() < retryAfter || Date.now() < expiresAt * 1000 - 120000) return;
      running = true;
      retryAfter = Date.now() + 15000;
      void auth.signinSilent().catch(() => {
        // Keep valid credentials until expiry; retry transient failures.
      }).finally(() => { running = false; });
    };
    const timer = window.setInterval(renew, 10000);
    window.addEventListener('focus', renew);
    document.addEventListener('visibilitychange', renew);
    renew();
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', renew);
      document.removeEventListener('visibilitychange', renew);
    };
  }, [expiresAt, auth.user?.id_token, auth.signinSilent]);
  useEffect(() => {
    setExpired(false);
    if (!Number.isFinite(expiresAt)) return;
    const timer = window.setTimeout(() => setExpired(true), Math.max(0, expiresAt * 1000 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [expiresAt, auth.user?.id_token]);
  if ((auth.isLoading && auth.activeNavigator !== 'signinSilent') || (auth.activeNavigator && auth.activeNavigator !== 'signinSilent')) return <main><p role="status">Completing sign-in…</p></main>;
  // A renewal error must not discard a still-valid session. Expiry checks below
  // continue to stop access if fresh credentials cannot be obtained.
  if (auth.error && (!auth.isAuthenticated || expired)) return <main><h1>Sign-in could not finish</h1><p role="alert">Please try again. If this continues, check the registered redirect address.</p><button onClick={() => void auth.clearStaleState().then(() => window.location.assign('/'))}>Return to sign in</button></main>;
  if (!auth.isAuthenticated || !auth.user?.id_token || auth.user.expired || expired) return <main>
    <span className="eyebrow">ComPlix</span><h1>Your component workspace</h1>
    <p>Sign in to create an organization or open projects shared with you.</p>
    <button onClick={() => void auth.signinRedirect().catch(() => window.location.assign('/'))}>Sign in</button>
    <p className="note">Choose Google, GitHub, or email on the sign-in page. Available methods depend on your organization’s sign-in configuration.</p>
  </main>;
  const token = auth.user.id_token;
  return <OrganizationWorkspace key={auth.user.profile.sub} token={token} signOut={async () => {
    const hint = auth.user?.id_token;
    await auth.removeUser();
    try { await auth.signoutRedirect({ id_token_hint: hint }); }
    catch { window.location.replace('/'); }
  }} />;
}

if (window.location.origin !== appOrigin) {
  // PKCE state is origin-scoped. Navigate before starting OIDC so callback state
  // and the old local project token remain on the documented origin.
  window.location.replace(appOrigin);
} else createRoot(document.getElementById('root')!).render(
  <AuthProvider authority={authority} client_id={clientId}
    redirect_uri={appOrigin + '/callback'}
    post_logout_redirect_uri={appOrigin}
    scope="openid profile email offline_access" response_type="code"
    automaticSilentRenew={false}
    stateStore={new WebStorageStateStore({ store: window.sessionStorage })}
    userStore={new WebStorageStateStore({ store: window.sessionStorage })}
    onSigninCallback={() => window.history.replaceState({}, document.title, '/')}>
    <App />
  </AuthProvider>,
);
