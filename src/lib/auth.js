/* Rally — auth client.
   Gets a Google ID token in the browser via Google Identity Services (GIS),
   then exchanges it at the backend's POST /auth/login endpoint. The backend
   answers by setting an httpOnly `auth_token` cookie — JavaScript never sees
   or stores the session token. "Am I logged in?" is answered by GET /auth/me
   on startup, not by anything in localStorage. */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
// Auth is served under /api like the rest of the backend. Blank base => requests
// hit /api/auth/* and go through the Vite dev proxy.
const API_BASE = (import.meta.env.VITE_AUTH_API_BASE || '') + '/api';

// Comma-separated allowlist of admin emails, e.g. VITE_ADMIN_EMAILS="a@x.com,b@y.com"
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/* Whether the given session belongs to an admin. A session counts as admin if
   the backend flagged it (role/isAdmin) or the user's email is in the
   VITE_ADMIN_EMAILS allowlist. Display-only — the backend enforces the real check. */
export function isAdmin(session) {
  if (!session) return false;
  if (session.isAdmin === true || session.role === 'admin') return true;
  const u = session.user || {};
  if (u.isAdmin === true || u.role === 'admin') return true;
  const email = (u.email || '').toLowerCase();
  return !!email && ADMIN_EMAILS.includes(email);
}

/* Shared fetch for the /auth/* endpoints (they live outside lib/api.js because
   the auth base URL can differ). Always sends the cookie. */
async function authRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // send / receive the auth cookie
    headers: {
      // Only claim JSON when we actually send a body — Fastify rejects an
      // empty body with a JSON content-type.
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON response */
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `Request failed (${res.status})`);
    err.code = data?.code ?? 'internal_error';
    err.status = res.status;
    throw err;
  }
  return data;
}

/* GET /auth/me — the server is the source of truth for "am I logged in?".
   Returns the user object, or null when there's no valid session (401). */
export async function getCurrentUser() {
  try {
    const data = await authRequest('/auth/me');
    return data?.user ?? data ?? null;
  } catch (e) {
    if (e.status === 401) return null; // not logged in / session expired
    throw e;
  }
}

/* POST /auth/logout — clears the httpOnly cookie server-side. */
export async function logoutServer() {
  try {
    await authRequest('/auth/logout', { method: 'POST' });
  } catch {
    /* best-effort — clear local state regardless */
  }
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
/* POST { provider, idToken } to /auth/login. Same endpoint registers or logs in.
   The response sets the httpOnly auth cookie; the token still present in the
   body is intentionally ignored — only the user object is kept, in app state. */
export async function loginWithProvider(provider, idToken) {
  const data = await authRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ provider, idToken }),
  });
  return { provider, user: data?.user ?? null, role: data?.user?.role };
}

/* Convenience: full Google flow — GIS prompt, then the cookie-setting backend
   exchange. Display fields (name/picture) come from the Google ID token when
   the backend doesn't echo them back. */
export async function signInWithGoogle() {
  const idToken = await getGoogleIdToken();
  const claims = decodeJwt(idToken) || {};
  const googleUser = {
    sub: claims.sub,
    name: claims.name || claims.email || 'Athlete',
    email: claims.email || '',
    picture: claims.picture || '',
  };

  const backend = await loginWithProvider('google', idToken);
  return {
    provider: 'google',
    ...backend,
    user: { ...googleUser, ...(backend.user || {}) },
  };
}
