/* Rally — backend API client (non-auth endpoints).
   Blank base => requests hit /<path> and go through the Vite dev proxy
   (see vite.config.js), which forwards to the backend without CORS in dev. */

const API_BASE = import.meta.env.VITE_API_BASE || '';

/* Shared request helper for the JSON endpoints. `body === undefined` sends no
   body; any other value (including {}) is JSON-serialized. Tolerates empty
   responses (e.g. 204 from DELETE). Throws Error(message) on non-2xx. */
async function request(method, path, body, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON response */
  }

  if (!res.ok) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
}

const post = (path, body, token) => request('POST', path, body, token);
const patch = (path, body, token) => request('PATCH', path, body, token);
const del = (path, token) => request('DELETE', path, undefined, token);

/* POST /tournaments — create a tournament (admin only). */
export function createTournament(payload, token) {
  return post('/tournaments', payload, token);
}

/* POST /tournaments/:id/register — register the signed-in user for a tournament,
   e.g. POST /tournaments/<uuid>/register with an Authorization: Bearer <idToken>
   header. Requires a token; the user is identified from it, so we send an empty
   JSON body ({}). */
export function registerForTournament(tournamentId, token) {
  return post(`/tournaments/${encodeURIComponent(tournamentId)}/register`, {}, token);
}

/* ---------------------------------------------------------------- admin ---
   Endpoints from ADMIN_LOGIC.md. All require an admin bearer token: a missing/
   invalid token → 401, a valid non-admin token → 403. */

/* GET /admin/tournaments — every tournament regardless of status (drafts,
   closed, completed, cancelled). Optional `status` narrows the list. The public
   GET /tournaments only returns `open` ones. */
export async function listAdminTournaments(status, token) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/admin/tournaments${q}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/* GET /tournaments/:id — one tournament plus a live `registeredCount`. Public. */
export async function getTournament(id, token) {
  const res = await fetch(`${API_BASE}/tournaments/${encodeURIComponent(id)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/* PATCH /tournaments/:id — edit fields and/or move status. Send only the
   changed fields; include `status` to transition through the lifecycle. Backend
   enforces the guard rails (capacity ≥ registrations, minRating ≤ maxRating,
   paid needs a positive entryFee, valid status transition). */
export function updateTournament(id, patchBody, token) {
  return patch(`/tournaments/${encodeURIComponent(id)}`, patchBody, token);
}

/* DELETE /tournaments/:id — hard-delete, allowed only when the tournament has
   zero registrations (else 409 — cancel instead). */
export function deleteTournament(id, token) {
  return del(`/tournaments/${encodeURIComponent(id)}`, token);
}

/* GET /tournaments/:id/registrations — every registration joined to the user
   and their sport profile (name, email, rating, status, registeredAt). Optional
   `status` filters registered vs withdrawn. */
export async function listRegistrations(id, status, token) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${API_BASE}/tournaments/${encodeURIComponent(id)}/registrations${q}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/* POST /tournaments/:id/registrations — admin adds a participant on their
   behalf, bypassing the open-status/rating/capacity gates. The user must
   already have a profile in the tournament's sport. 409 if already registered. */
export function addRegistration(id, userId, token) {
  return post(`/tournaments/${encodeURIComponent(id)}/registrations`, { userId }, token);
}

/* PATCH /tournaments/:id/registrations/:userId — set a participant's status to
   'registered' (reinstate) or 'withdrawn' (withdraw). Keeps the record. */
export function updateRegistration(id, userId, status, token) {
  return patch(`/tournaments/${encodeURIComponent(id)}/registrations/${encodeURIComponent(userId)}`, { status }, token);
}

/* DELETE /tournaments/:id/registrations/:userId — erase a registration row
   entirely (vs. withdrawing, which keeps it). 404 if there's no such row. */
export function deleteRegistration(id, userId, token) {
  return del(`/tournaments/${encodeURIComponent(id)}/registrations/${encodeURIComponent(userId)}`, token);
}

/* GET /admin/users/:id — full record for one user: { user, profiles,
   registrations } — account fields, every sport profile, tournament history. */
export async function getAdminUser(id, token) {
  const res = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(id)}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
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

/* POST /sports/:sport/profile — submit onboarding answers, e.g.
   POST /sports/football/profile with body { answers: { ... } }. The backend
   scores the answers and returns the created profile, including a `placement`
   block: { elo, tier, division, lp } (tier = rank name Iron…Challenger,
   division = sub-division IV–I, elo = score, also mirrored as top-level rating). */
export function submitProfileAnswers(sport, answers, token) {
  return post(`/sports/${encodeURIComponent(sport)}/profile`, { answers }, token);
}

/* GET /sports/:sport/profile — the signed-in user's skill profile for a sport
   slug, e.g. GET /sports/tennis/profile with an Authorization: Bearer <idToken>
   header. Returns the profile object, or null when the user has no profile yet (404). */
export async function getProfile(sport, token) {
  const res = await fetch(`${API_BASE}/sports/${encodeURIComponent(sport)}/profile`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 404) return null;
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}
