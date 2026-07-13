/* Rally — rank placement, a JS port of the backend's `place()` (rank.ts).
   Derives { tier, division, lp } from a raw Elo so the client can render a
   rank when it only has the number. Keep the config in sync with the backend's
   RankConfig — if the tier boundaries drift, the two will disagree. */

/* Iron → Challenger ladder over the app's 0–3000+ rating scale. Divisional
   tiers are 400 Elo wide (4 × 100-LP divisions); Master and above are open
   leaderboard tiers (divisions: 0 → ranked by raw Elo, no division/LP). */
export const RANK_CONFIG = {
  tiers: [
    { name: 'Iron',        min: null, max: 400,  divisions: 4 },
    { name: 'Bronze',      min: 400,  max: 800,  divisions: 4 },
    { name: 'Silver',      min: 800,  max: 1200, divisions: 4 },
    { name: 'Gold',        min: 1200, max: 1600, divisions: 4 },
    { name: 'Platinum',    min: 1600, max: 2000, divisions: 4 },
    { name: 'Emerald',     min: 2000, max: 2400, divisions: 4 },
    { name: 'Diamond',     min: 2400, max: 2800, divisions: 4 },
    { name: 'Master',      min: 2800, max: 3000, divisions: 0 },
    { name: 'Grandmaster', min: 3000, max: 3200, divisions: 0 },
    { name: 'Challenger',  min: 3200, max: null, divisions: 0 },
  ],
  divisionLabels: ['IV', 'III', 'II', 'I'], // low → high
  lpScale: 100,
};

export function place(cfg, elo) {
  for (const t of cfg.tiers) {
    const min = t.min ?? -Infinity;
    const max = t.max ?? Infinity;
    if (elo < min || elo >= max) continue; // half-open [min, max)

    // apex/open tier: no divisions, ranked by raw Elo
    if (t.divisions <= 0) {
      return { elo, tier: t.name, division: '', lp: 0 };
    }
    // an open-bottom divisional tier has no finite width — pin below-range
    // Elo to its lowest division at 0 LP
    const floor = Number.isFinite(min) ? min : 0;
    const width = (max - floor) / t.divisions;
    let d = Math.floor((Math.max(elo, floor) - floor) / width);
    if (d >= t.divisions) d = t.divisions - 1; // clamp top edge
    const lp = Math.floor(((Math.max(elo, floor) - floor - d * width) / width) * cfg.lpScale);
    return { elo, tier: t.name, division: cfg.divisionLabels[d], lp };
  }
  return { elo, tier: '', division: '', lp: 0 }; // outside all tiers
}

/* Place a raw rating on the default ladder. */
export const placeElo = (elo) => place(RANK_CONFIG, Number(elo) || 0);
