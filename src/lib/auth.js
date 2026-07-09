/* Rally — auth client.
   Gets a Google ID token in the browser via Google Identity Services (GIS),
   then exchanges it at the backend's POST /auth/login endpoint. */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Auth is served under /api like the rest of the backend. Blank base => requests
// hit /api/auth/* and go through the Vite dev proxy.
const API_BASE = (import.meta.env.VITE_AUTH_API_BASE || '') + '/api';

const TOKEN_KEY = 'rally.session';

// Comma-separated allowlist of admin emails, e.g. VITE_ADMIN_EMAILS="a@x.com,b@y.com"
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/* Whether the given session belongs to an admin. A session counts as admin if
   the backend flagged it (role/isAdmin) or the user's email is in the
   VITE_ADMIN_EMAILS allowlist. */
export function isAdmin(session) {
  if (!session) return false;
  if (session.isAdmin === true || session.role === 'admin') return true;
  const u = session.user || {};
  if (u.isAdmin === true || u.role === 'admin') return true;
  const email = (u.email || '').toLowerCase();
  return !!email && ADMIN_EMAILS.includes(email);
}

/* ---- session storage helpers ---- */
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null;
  } catch {
    return null;
  }
}
export function setSession(session) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}

/* The bearer token to send on authenticated API calls. Prefer a backend-issued
   token; fall back to the provider ID token (token-only sessions). */
export function getAuthToken(session) {
  if (!session) return null;
  return session.token || session.accessToken || session.idToken || null;
}

/* Decode a JWT payload (e.g. a Google ID token) without verifying it — used
   only to read display fields (name/email/picture) in the browser. */
export function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/* ---- sport profiles (stored locally) ---- */
const PROFILES_KEY = 'rally.profiles';
export function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY)) || [];
  } catch {
    return [];
  }
}
export function setProfiles(list) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(list));
}

/* ---- Google Identity Services loader ---- */
let gisPromise = null;
function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
  return gisPromise;
}

/* Prompt the user with Google sign-in and resolve with the ID token (a JWT).
   Uses One Tap / the GIS prompt; the callback hands back response.credential. */
export async function getGoogleIdToken() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set — add it to your .env file.');
  }
  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (response?.credential) resolve(response.credential);
        else reject(new Error('No credential returned from Google'));
      },
    });
    window.google.accounts.id.prompt((notification) => {
      // If One Tap can't be shown (dismissed/suppressed), surface a clear error.
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        reject(
          new Error(
            'Google sign-in could not be displayed. Check that this origin is an ' +
              'authorized JavaScript origin for your client ID.',
          ),
        );
      }
    });
  });
}

/* ---- backend exchange ---- */
/* POST { provider, idToken } to /auth/login. Same endpoint registers or logs in. */
export async function loginWithProvider(provider, idToken) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, idToken }),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(data?.message || `Login failed (${res.status})`);
  }

  const session = { provider, ...data };
  setSession(session);
  return session;
}

/* Convenience: full Google flow. The user is considered signed in as soon as
   Google returns a valid ID token. The backend exchange is best-effort, so the
   app still works when no backend is running. */
export async function signInWithGoogle() {
  const idToken = await getGoogleIdToken();
  const claims = decodeJwt(idToken) || {};
  const user = {
    sub: claims.sub,
    name: claims.name || claims.email || 'Athlete',
    email: claims.email || '',
    picture: claims.picture || '',
  };

  let backend = {};
  try {
    backend = await loginWithProvider('google', idToken);
  } catch {
    /* no backend / exchange failed — fall back to a token-only session */
  }

  const session = { provider: 'google', idToken, user, ...backend };
  setSession(session);
  return session;
}
