/* Rally — backend API client (non-auth endpoints).
   Every endpoint is served under /api. Blank VITE_API_BASE => requests hit
   /api/<path> and go through the Vite dev proxy (see vite.config.js), which
   forwards to the backend without CORS in dev.

   Auth: the backend sets an httpOnly `auth_token` cookie at login; every
   request sends it via `credentials: 'include'`. No Authorization header,
   no token in localStorage — JavaScript never touches the token. */

const API_BASE = (import.meta.env.VITE_API_BASE || '') + '/api';

/* Error shape thrown by every call: `.code` is the backend's stable error code
   (branch on this, never on the message text), `.status` is the HTTP status. */
export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/* Shared request helper for the JSON endpoints. `body === undefined` sends no
   body; any other value (including {}) is JSON-serialized. Tolerates empty
   responses (e.g. 204 from DELETE). On a non-2xx it throws an ApiError.
   On 401 it also broadcasts `rally:unauthorized` so the session provider can
   clear state and bounce the user to sign-in — every screen gets that for free. */
async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include', // send the auth cookie
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
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
    if (res.status === 401 && !path.startsWith('/auth/')) {
      window.dispatchEvent(new CustomEvent('rally:unauthorized'));
    }
    throw new ApiError(
      data?.code ?? 'internal_error',
      data?.error || data?.message || `Request failed (${res.status})`,
      res.status,
    );
  }
  return data;
}

/* Method shorthands — every endpoint below is one of these one-liners, so the
   fetch/parse/error handling lives in exactly one place (`request`). */
const get = (path) => request('GET', path, undefined);
const post = (path, body) => request('POST', path, body);
const patch = (path, body) => request('PATCH', path, body);
const del = (path) => request('DELETE', path, undefined);

/* Encode a path segment (tournament id, user id, sport slug) for safe interpolation. */
const seg = (v) => encodeURIComponent(v);

/* ------------------------------------------------------------- tournaments -- */

/* GET /tournaments — list all open tournaments (public). Optional `city`
   (a slug from GET /cities) filters server-side: /tournaments?city=almaty. */
export function listTournaments(city) {
  const q = city ? `?city=${seg(city)}` : '';
  return get(`/tournaments${q}`);
}

/* GET /tournaments/:id — one tournament plus a live `registeredCount`. Public. */
export function getTournament(id) {
  return get(`/tournaments/${seg(id)}`);
}

/* POST /tournaments — create a tournament (admin only). */
export function createTournament(payload) {
  return post('/tournaments', payload);
}

/* PATCH /tournaments/:id — edit fields and/or move status. Send only the
   changed fields; include `status` to transition through the lifecycle. Backend
   enforces the guard rails (capacity ≥ registrations, minRating ≤ maxRating,
   paid needs a positive entryFee, valid status transition). */
export function updateTournament(id, patchBody) {
  return patch(`/tournaments/${seg(id)}`, patchBody);
}

/* DELETE /tournaments/:id — hard-delete, allowed only when the tournament has
   zero registrations (else 409 — cancel instead). */
export function deleteTournament(id) {
  return del(`/tournaments/${seg(id)}`);
}

/* POST /tournaments/:id/register — register the signed-in user for a tournament.
   The user is identified from the auth cookie, so we send an empty JSON body ({}). */
export function registerForTournament(tournamentId) {
  return post(`/tournaments/${seg(tournamentId)}/register`, {});
}

/* GET /me/tournaments — the signed-in user's tournaments, split into
   { upcoming, past } arrays. `past` doubles as the match history. */
export function getMyTournaments() {
  return get('/me/tournaments');
}

/* ------------------------------------------------------------------ admin ---
   Endpoints from ADMIN_LOGIC.md. All require an admin session cookie: missing/
   invalid → 401, valid non-admin → 403. */

/* GET /admin/tournaments — every tournament regardless of status (drafts,
   closed, completed, cancelled). Optional `status` narrows the list. The public
   GET /tournaments only returns `open` ones. */
export function listAdminTournaments(status) {
  const q = status ? `?status=${seg(status)}` : '';
  return get(`/admin/tournaments${q}`);
}

/* GET /admin/users/:id — full record for one user: { user, profiles,
   registrations } — account fields, every sport profile, tournament history. */
export function getAdminUser(id) {
  return get(`/admin/users/${seg(id)}`);
}

/* GET /admin/removed-registrations — players auto-removed when a tournament's
   age gates tightened. Default = pending (to contact); notified=true → already
   handled; tournamentId scopes to one tournament. */
export function listRemovedRegistrations({ notified, tournamentId } = {}) {
  const params = new URLSearchParams();
  if (notified != null) params.set('notified', String(notified));
  if (tournamentId) params.set('tournamentId', tournamentId);
  const q = params.toString();
  return get(`/admin/removed-registrations${q ? `?${q}` : ''}`);
}

/* POST /admin/removed-registrations/mark-notified — body { ids } marks rows as
   contacted; responds { notified: <count> }. */
export function markRemovedNotified(ids) {
  return post('/admin/removed-registrations/mark-notified', { ids });
}

/* --------------------------------------------------------- registrations --- */

/* GET /tournaments/:id/registrations — every registration joined to the user
   and their sport profile (name, email, rating, status, registeredAt). Optional
   `status` filters registered vs withdrawn. */
export function listRegistrations(id, status) {
  const q = status ? `?status=${seg(status)}` : '';
  return get(`/tournaments/${seg(id)}/registrations${q}`);
}

/* POST /tournaments/:id/registrations — admin adds a participant on their
   behalf, bypassing the open-status/rating/capacity gates. The user must
   already have a profile in the tournament's sport. 409 if already registered. */
export function addRegistration(id, userId) {
  return post(`/tournaments/${seg(id)}/registrations`, { userId });
}

/* PATCH /tournaments/:id/registrations/:userId — set a participant's status to
   'registered' (reinstate) or 'withdrawn' (withdraw). Keeps the record. */
export function updateRegistration(id, userId, status) {
  return patch(`/tournaments/${seg(id)}/registrations/${seg(userId)}`, { status });
}

/* DELETE /tournaments/:id/registrations/:userId — erase a registration row
   entirely (vs. withdrawing, which keeps it). 404 if there's no such row. */
export function deleteRegistration(id, userId) {
  return del(`/tournaments/${seg(id)}/registrations/${seg(userId)}`);
}

/* ------------------------------------------------------------------ teams ---
   Team endpoints (see NEW.md). Joining a team is by invite link only. */

/* POST /teams — create a team; the signed-in user becomes its captain.
   Body: { sportId, name, logoUrl? }. The 201 response is the only plain
   response that includes `inviteToken` — captains re-fetch it later via
   GET /teams/:id/invite. Errors: 404 not_found (bad sportId),
   409 team_name_taken (name already used within this sport). */
export function createTeam(payload) {
  return post('/teams', payload);
}

/* GET /teams/mine — teams the signed-in user is an active member of. Each item
   carries `myRole` ('captain' | 'member'), `sportName`/`sportSlug` and
   `memberCount` on top of the base team fields. */
export function listMyTeams() {
  return get('/teams/mine');
}

/* GET /teams/:id — one team plus `myRole` and the active roster (`members`:
   userId, name, email, role, rating in the team's sport or null, joinedAt).
   Members and admins only: 403 not_team_member, 404 not_found. */
export function getTeam(id) {
  return get(`/teams/${seg(id)}`);
}

/* POST /teams/:id/leave — leave a team. The captain can't leave
   (409 captain_cannot_leave) — transfer captaincy or delete the team instead.
   Someone who left voluntarily may rejoin via a valid invite link. */
export function leaveTeam(id) {
  return post(`/teams/${seg(id)}/leave`, {});
}

/* POST /teams/:id/transfer-captain — captain hands captaincy to another active
   member (body { userId }); the caller becomes a plain member. */
export function transferTeamCaptain(id, userId) {
  return post(`/teams/${seg(id)}/transfer-captain`, { userId });
}

/* DELETE /teams/:id/members/:userId — captain removes (bans) a member: the
   row keeps status 'removed' and blocks rejoining forever. Rotate the invite
   link afterwards if it may have leaked. */
export function removeTeamMember(id, userId) {
  return del(`/teams/${seg(id)}/members/${seg(userId)}`);
}

/* DELETE /teams/:id — captain deletes the team. Blocked once the team has any
   tournament registration, even withdrawn (409 team_has_registrations). */
export function deleteTeam(id) {
  return del(`/teams/${seg(id)}`);
}

/* ----------------------------------------------------------------- cities --- */

/* GET /cities — supported cities (public): [{ slug, en, ru }]. Tournaments
   reference a city by its slug in their `city` field. */
export function listCities() {
  return get('/cities');
}

/* ----------------------------------------------------------------- sports --- */

/* GET /sports — list all sports (public). */
export function listSports() {
  return get('/sports');
}

/* POST /sports — create a sport (admin only). */
export function createSport(payload) {
  return post('/sports', payload);
}

/* GET /sports/:sport/questions — the onboarding questionnaire for a sport slug,
   e.g. GET /sports/football/questions. Returns whatever the backend sends;
   the onboarding component normalizes it into its bubble/option shape. */
export function getSportQuestions(sport) {
  return get(`/sports/${seg(sport)}/questions`);
}

/* POST /sports/:sport/profile — submit onboarding answers, e.g.
   POST /sports/football/profile with body { answers: { ... } }. The backend
   scores the answers and returns the created profile, including a `placement`
   block: { elo, tier, division, lp } (tier = rank name Iron…Challenger,
   division = sub-division IV–I, elo = score, also mirrored as top-level rating). */
export function submitProfileAnswers(sport, answers) {
  return post(`/sports/${seg(sport)}/profile`, { answers });
}

/* GET /sports/:sport/profile — the signed-in user's skill profile for a sport
   slug, e.g. GET /sports/tennis/profile (auth cookie identifies the user).
   Returns the profile object, or null when the user has no profile yet (404). */
export async function getProfile(sport) {
  try {
    return await get(`/sports/${seg(sport)}/profile`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}
