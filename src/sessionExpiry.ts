/** Scheduling only. The backend still validates the signature and authorization. */
export function sessionExpiry(idToken: string | undefined, accessExpiry?: number): number {
  if (!idToken) return 0;
  try {
    const part = idToken.split('.')[1];
    if (!part) return 0;
    const encoded = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    const expiry = payload.exp;
    if (typeof expiry !== 'number' || !Number.isFinite(expiry)) return 0;
    return Math.min(expiry, typeof accessExpiry === 'number' && Number.isFinite(accessExpiry) ? accessExpiry : Infinity);
  } catch { return 0; }
}
