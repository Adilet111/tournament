/* Rally — shared single-elimination bracket helpers.
   Used by both the public bracket page (components/bracket.jsx) and the
   admin bracket panel (admin/AdminViews.jsx) so round naming, winner
   resolution and placeholder ("winner of …") logic stay identical between
   the two. See NEW.md §15 for the bracket shape these operate on. */

/* Round labels count backwards from the final: the last round is "Final",
   the one before it "Semifinal", then "Quarterfinal", then "Round of N"
   (N = participants entering that round). `bt` is the translation table's
   `bracket` section (t.bracket) — it owns the final/semifinal/quarterfinal/
   roundOfFn strings. */
export function roundLabel(round, totalRounds, bt) {
  const diff = totalRounds - round;
  if (diff <= 0) return bt.final;
  if (diff === 1) return bt.semifinal;
  if (diff === 2) return bt.quarterfinal;
  return bt.roundOfFn(2 ** (diff + 1));
}

/* Winner of a completed match: prefer an explicit `outcome: 'win'`, else
   fall back to comparing scores (both are valid per NEW.md — scores are
   optional). Returns the winning slot number, or null. */
export function winningSlot(match) {
  if (match.status !== 'completed') return null;
  const marked = match.participants.find((p) => p.outcome === 'win');
  if (marked) return marked.slot;
  const [a, b] = match.participants;
  if (a && b && a.score != null && b.score != null && a.score !== b.score) {
    return a.score > b.score ? a.slot : b.slot;
  }
  return null;
}

/* Map of matchId -> [feederMatch, feederMatch] (sorted by position, so index
   0 feeds slot 1 and index 1 feeds slot 2) built from every match's
   `nextMatchId`. Used to resolve a pending match's still-empty slot into a
   "Winner of <round> <n>" placeholder, per NEW.md §15's rendering note. */
export function buildFeedersByNext(rounds) {
  const map = new Map();
  rounds.forEach((r) => r.matches.forEach((m) => {
    if (!m.nextMatchId) return;
    const arr = map.get(m.nextMatchId) || [];
    arr.push(m);
    map.set(m.nextMatchId, arr);
  }));
  map.forEach((arr) => arr.sort((a, b) => a.position - b.position));
  return map;
}

/* Smallest power of two >= n (min 2) — the bracket size a given number of
   registered participants will seed into (NEW.md §14: byes fill the gap). */
export function nextPow2(n) {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/* A tournament-history row's placement badge from its `finalRank` (NEW.md
   §18: 1 champion, 2 runner-up, 3 semifinal losers, 5 quarterfinal losers,
   9 round-of-16 losers, … — i.e. rank = 2^k + 1 for k rounds before the
   final). Reuses the bracket page's own round-name strings (t.bracket) so a
   player's "Semifinal" placement reads the same word as the bracket view.
   `st` is the translation table's stats-flavoured section — it owns
   champion/runnerUp (t.stats on the public page, t.admin.userStats in the
   admin tab). Returns null when there's no result yet. */
export function placementInfo(rank, st, bt) {
  if (rank == null) return null;
  if (rank === 1) return { tone: 'gold', label: st.champion };
  if (rank === 2) return { tone: 'silver', label: st.runnerUp };
  const k = Math.log2(rank - 1);
  const label = k === 1 ? bt.semifinal : k === 2 ? bt.quarterfinal : bt.roundOfFn(2 ** (Math.max(1, k) + 1));
  return { tone: 'plain', label };
}
