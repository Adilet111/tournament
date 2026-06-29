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
