import { UserManager, WebStorageStateStore, type UserManagerSettings } from 'oidc-client-ts';
import { sessionExpiry } from './sessionExpiry';

/** Renew this long before the earliest token expiry; background tabs run timers about once a minute. */
export const RENEW_MARGIN_MS = 5 * 60_000;
const REFRESH_LOCK = 'complix-auth-refresh';
const AUTO_SIGNIN_KEY = 'complix.auth.autoSignin';
const AUTO_SIGNIN_COOLDOWN_MS = 5 * 60_000;

export type RenewResult = 'renewed' | 'adopted' | 'rejected' | 'unavailable';
type Settings = Omit<UserManagerSettings, 'userStore' | 'stateStore'>;

export const userStorageKey = (settings: Pick<Settings, 'authority' | 'client_id'>) => `oidc.user:${settings.authority}:${settings.client_id}`;

/**
 * The signed-in session is shared by every tab (localStorage) and survives reloads and browser restarts
 * until the refresh token expires or the user signs out. PKCE sign-in state stays per tab.
 * A session saved per tab by an earlier build is moved over, keeping whichever copy is fresher.
 */
export function createUserManager(settings: Settings) {
  const key = userStorageKey(settings);
  try {
    const legacy = sessionStorage.getItem(key);
    if (legacy) {
      const shared = localStorage.getItem(key);
      if (!shared || expiryOf(legacy) > expiryOf(shared)) localStorage.setItem(key, legacy);
      sessionStorage.removeItem(key);
    }
  } catch { /* Storage unavailable: the user signs in again. */ }
  return new UserManager({ ...settings, userStore: new WebStorageStateStore({ store: window.localStorage }), stateStore: new WebStorageStateStore({ store: window.sessionStorage }) });
}
function expiryOf(json: string) {
  try { const user = JSON.parse(json); return sessionExpiry(user.id_token, user.expires_at); } catch { return 0; }
}

/**
 * Renews the shared session with the refresh token. A cross-tab lock lets only one tab refresh at a
 * time; a tab that waited adopts the session another tab already renewed instead of spending the
 * (possibly rotated) refresh token again.
 */
export async function renewSession(manager: UserManager): Promise<RenewResult> {
  const run = async (): Promise<RenewResult> => {
    const stored = await manager.getUser();
    if (!stored) return 'rejected';
    if (sessionExpiry(stored.id_token, stored.expires_at) * 1000 - Date.now() > RENEW_MARGIN_MS) {
      await manager.events.load(stored);
      return 'adopted';
    }
    if (!stored.refresh_token) return 'rejected';
    try { return (await manager.signinSilent()) ? 'renewed' : 'unavailable'; }
    catch (cause) {
      // The provider refused the refresh token: only a new sign-in helps. Anything else may be transient.
      const code = (cause as { error?: unknown })?.error;
      return code === 'invalid_grant' || code === 'login_required' || code === 'unauthorized_client' ? 'rejected' : 'unavailable';
    }
  };
  return typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request(REFRESH_LOCK, run) : run();
}

/** Picks up sessions renewed or signed out in other tabs. Returns an unsubscribe function. */
export function followOtherTabs(manager: UserManager, key: string) {
  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage || event.key !== key) return;
    if (!event.newValue) void manager.events.unload();
    else void manager.getUser().then(user => { if (user) void manager.events.load(user); });
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/** An automatic provider redirect is attempted at most once per cooldown per tab, so it can never loop. */
export function claimAutoSignIn(now = Date.now()) {
  try {
    if (now - Number(sessionStorage.getItem(AUTO_SIGNIN_KEY) ?? 0) < AUTO_SIGNIN_COOLDOWN_MS) return false;
    sessionStorage.setItem(AUTO_SIGNIN_KEY, String(now));
    return true;
  } catch { return false; }
}

/** Only same-origin app paths are restored after sign-in (no open redirects, no callback loops). */
export function safeReturnPath(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') && !value.startsWith('/callback') ? value : '/projects';
}
