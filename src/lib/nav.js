/* Rally — hash-router navigation helpers. */

/* Leave a hash route (#admin / #profile) and return to the landing page
   without leaving a bare '#' in the URL — assigning `location.hash = ''`
   keeps the trailing '#'. `history.replaceState` cleans it, but doesn't fire
   `hashchange`, so we dispatch it manually for the hash router in App.jsx. */
export function goHome() {
  history.replaceState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/* The signed-in user's profile page. */
export function goToProfile() {
  window.location.hash = 'profile';
}

/* A team detail page (members only — the router bounces signed-out users). */
export function goToTeam(teamId) {
  window.location.hash = `team/${teamId}`;
}

/* A tournament's public bracket page — anyone can open it, signed in or not. */
export function goToBracket(tournamentId) {
  window.location.hash = `bracket/${tournamentId}`;
}

/* The signed-in user's own statistics page (GET /me/stats). */
export function goToStats() {
  window.location.hash = 'stats';
}

/* Absolute shareable URL for a team invite token. The backend only stores the
   token (its joinPath is API-relative); the app owns the user-facing route —
   '#/teams/join/<token>', served by the join landing page. */
export function teamJoinUrl(token) {
  return `${window.location.origin}${window.location.pathname}#/teams/join/${token}`;
}
