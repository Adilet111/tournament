/* Rally — backend API client (non-auth endpoints).
   Blank base => requests hit /<path> and go through the Vite dev proxy
   (see vite.config.js), which forwards to the backend without CORS in dev. */

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function post(path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

/* POST /tournaments — create a tournament (admin only). */
export function createTournament(payload, token) {
  return post('/tournaments', payload, token);
}

/* GET /tournaments — list all tournaments (public). */
export async function listTournaments() {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const res = await fetch(`${API_BASE}/tournaments`);
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/* GET /sports — list all sports (public). */
export async function listSports() {
  const API_BASE = import.meta.env.VITE_API_BASE || '';
  const res = await fetch(`${API_BASE}/sports`);
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/* POST /sports — create a sport (admin only). */
export function createSport(payload, token) {
  return post('/sports', payload, token);
}

/* GET /sports/:sport/questions — the onboarding questionnaire for a sport slug,
   e.g. GET /sports/football/questions. Returns whatever the backend sends;
   the onboarding component normalizes it into its bubble/option shape. */
export async function getSportQuestions(sport, token) {
  const res = await fetch(`${API_BASE}/sports/${encodeURIComponent(sport)}/questions`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/* GET /profiles/:sport — the signed-in user's skill profile for a sport slug,
   e.g. GET /profiles/tennis with an Authorization: Bearer <idToken> header.
   Returns the profile object, or null when the user has no profile yet (404). */
export async function getProfile(sport, token) {
  const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(sport)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404) return null;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}
