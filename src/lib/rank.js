/* Rally — rank placement, a 1:1 port of the backend's `place()`
   (src/modules/profiles/rating.ts). Derives { tier, division, lp } from a raw
   Elo so the client can render a rank when it only has the number.

   The ladder is NOT a fixed app-wide ladder — every sport has its own tier
   config (boundaries, division count, labels) served by
   GET /sports/:sport/tiers. Fetch it per sport via getTierConfig (cached,
   since it changes rarely) rather than hardcoding a ladder here.

   Tier/division names (Iron/Bronze/.../Challenger, I/II/III/IV) are never
   translated — always display them as returned by the backend. */
import { getSportTiers } from './api';

/* Place a raw Elo on a sport's ladder. `config` is a GET /sports/:sport/tiers
   response: { tiers, divisionLabels, lpScale, ... }.
   Boundary rule: a tier's range is [min, max) — `max` belongs to the next
   tier's `min`, never this one. `divisions <= 0` (e.g. an open apex tier like
   Challenger) means no division/LP; players there rank by raw Elo instead. */
export function placeTier(elo, config) {
  const { tiers, divisionLabels, lpScale } = config;
  for (const t of tiers) {
    const min = t.min ?? -Infinity;
    const max = t.max ?? Infinity;
    if (elo < min || elo >= max) continue; // not in this tier

    if (t.divisions <= 0) {
      return { elo, tier: t.name, division: '', lp: 0 };
    }

    const width = (max - min) / t.divisions;
    let d = Math.floor((elo - min) / width);
    if (d >= t.divisions) d = t.divisions - 1;
    const lp = Math.floor((((elo - min) - d * width) / width) * lpScale);

    return { elo, tier: t.name, division: divisionLabels[d], lp };
  }
  return { elo, tier: '', division: '', lp: 0 }; // outside all tiers (shouldn't happen)
}

/* ---- per-sport config cache — tier ladders change rarely ---- */
const _configCache = new Map(); // sport slug → config
const _configPromises = new Map();

export function getTierConfig(sport) {
  if (_configCache.has(sport)) return Promise.resolve(_configCache.get(sport));
  if (!_configPromises.has(sport)) {
    _configPromises.set(
      sport,
      getSportTiers(sport)
        .then((config) => { _configCache.set(sport, config); return config; })
        .catch((e) => { _configPromises.delete(sport); throw e; }),
    );
  }
  return _configPromises.get(sport);
}

/* Fetch (or reuse the cached) tier config for `sport` and place `elo` on it. */
export async function placeEloForSport(sport, elo) {
  const config = await getTierConfig(sport);
  return placeTier(Number(elo) || 0, config);
}
