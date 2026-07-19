/* Rally — signed-in user's own profile page (#profile).
   Shows the account card, every backend sport profile with its rank/rating
   (reconstructed via GET /sports + GET /sports/:sport/profile per sport — there
   is no "list my profiles" endpoint), the user's upcoming tournaments, and the
   match history (past tournaments), both from GET /me/tournaments. */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { listSports, getProfile, getMyTournaments } from '../lib/api';
import { useCities, cityLabel } from '../lib/cities';
import { placeElo } from '../lib/rank';
import { Logo, Btn, LangSwitcher, SportTag, Pill } from './primitives';
import { normalizeRank } from './onboarding';
import { MyTeamsSection } from './teams';

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

/* One card per sport the user has a backend skill profile for — same dark
   badge presentation as the onboarding RankReveal, rank derived from the raw
   Elo via place() (src/lib/rank.js). */
function SportProfileCard({ slug, rank, lp }) {
  const { t } = useLang();
  return (
    <article className="flex flex-col items-center gap-4 rounded-3xl bg-[#0b0d13] p-6 text-center">
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-white/50">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        {t.data.sports[slug] ?? slug}
      </span>
      <div
        className="grid h-24 w-24 place-items-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${rank.division.color} 55%, white), ${rank.division.color})`,
          boxShadow: `0 0 0 6px ${rank.division.glow}, 0 18px 40px -12px ${rank.division.glow}`,
        }}>
        <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="#0b0d13" strokeWidth="1.6">
          <path d="M12 2l2.5 5.5L20 8.5l-4.2 4 1 6-4.8-3-4.8 3 1-6L4 8.5l5.5-1z" strokeLinejoin="round" strokeLinecap="round" fill="rgba(11,13,19,.12)" />
        </svg>
      </div>
      <div>
        <div className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/40">{t.onboarding.yourDivision}</div>
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <span className="font-display text-[26px] font-700" style={{ color: rank.division.color }}>{rank.division.label}</span>
          {rank.tier && <span className="font-display text-[19px] font-700 text-white/50">{rank.tier}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2">
        <span className="font-mono text-[13px] text-white/50">{t.onboarding.rating}</span>
        <span className="text-[16px] font-700 text-white">{rank.rating.toLocaleString()}</span>
        {rank.tier && <span className="font-mono text-[12px] text-white/40">· {lp} LP</span>}
      </div>
    </article>
  );
}

/* One row per tournament in "upcoming" / "match history". `slugMap` translates
   the tournament's sportId to the sport slug used by SportTag / t.data.sports. */
function TournamentRow({ row, slugMap }) {
  const { t, lang } = useLang();
  const cities = useCities();
  const slug = slugMap[row.sportId] || row.sportId;
  const date = row.startsAt
    ? new Date(row.startsAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const place = cityLabel(cities, row.city ?? row.location, lang);
  return (
    <li className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white px-5 py-4">
      <div className="min-w-0 flex-1">
        <SportTag sport={slug} />
        <div className="truncate text-[15.5px] font-600 text-ink-900">{row.title}</div>
        <div className="mt-0.5 text-[13px] text-ink-500">{date}{place && ` · ${place}`}</div>
      </div>
      <Pill tone={row.status === 'cancelled' ? 'outline' : 'default'}>
        {t.admin.status[row.status] ?? row.status}
      </Pill>
    </li>
  );
}

function EmptyNote({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
      <p className="mx-auto max-w-sm text-[13.5px] leading-relaxed text-ink-500">{children}</p>
    </div>
  );
}

export function ProfilePage({ onExit }) {
  const { t } = useLang();
  const pp = t.profilePage;
  const { user } = useSession();
  const name = user?.name || t.account.defaultName;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [items, setItems] = useState([]); // [{ slug, rank }]
  const [mine, setMine] = useState({ upcoming: [], past: [] });
  const [slugMap, setSlugMap] = useState({}); // sportId → sport slug

  // Fetch only — state starts as 'loading' and `retry` resets it, so the effect
  // never calls setState synchronously.
  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const [sports, my] = await Promise.all([listSports(), getMyTournaments()]);
      const list = Array.isArray(sports) ? sports : [];
      const found = await Promise.all(
        list.map(async (s) => {
          const slug = s.slug || String(s.name || '').toLowerCase();
          if (!slug) return null;
          const profile = await getProfile(slug); // null on 404 (no profile)
          if (!profile) return null;
          // Derive tier/division/LP from the raw Elo with the backend's
          // place() logic, then map the tier to its colours.
          const placed = placeElo(profile.placement?.elo ?? profile.rating ?? profile.elo);
          return { slug, rank: normalizeRank(placed), lp: placed.lp };
        })
      );
      if (cancelled) return;
      setSlugMap(Object.fromEntries(list.map((s) => [s.id, s.slug || String(s.name || '').toLowerCase()])));
      setItems(found.filter(Boolean));
      setMine({
        upcoming: Array.isArray(my?.upcoming) ? my.upcoming : [],
        past: Array.isArray(my?.past) ? my.past : [],
      });
      setState('ready');
    })().catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => load(), [load]);

  const retry = () => { setState('loading'); load(); };

  return (
    <div className="min-h-screen bg-ink-50/50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-[68px] max-w-4xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Btn variant="ghost" size="sm" onClick={onExit}>← {pp.backToSite}</Btn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* account card */}
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{pp.eyebrow}</span>
        <div className="mt-2 flex items-center gap-4 rounded-3xl border border-ink-100 bg-white p-6">
          {user?.picture
            ? <img src={user.picture} alt="" className="h-16 w-16 rounded-full object-cover" referrerPolicy="no-referrer" />
            : <span className="grid h-16 w-16 place-items-center rounded-full bg-accent text-[20px] font-700 text-white">{initials(name)}</span>}
          <div className="min-w-0">
            <h1 className="font-display text-[26px] font-700 leading-tight text-ink-900">{name}</h1>
            {user?.email && <div className="truncate text-[14px] text-ink-500">{user.email}</div>}
          </div>
        </div>

        {state === 'loading' && (
          <div className="flex items-center gap-2 py-8 text-[14px] text-ink-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
            {pp.loading}
          </div>
        )}
        {state === 'error' && (
          <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
            <p className="text-[14px] text-ink-500">{pp.loadFailed}</p>
            <button onClick={retry} className="mt-2 text-[14px] font-600 text-accent hover:underline">{pp.retry}</button>
          </div>
        )}

        {state === 'ready' && (
          <>
            {/* sport profiles + ratings */}
            <h2 className="font-display mt-10 text-[20px] font-700 text-ink-900">{pp.sportProfiles}</h2>
            <div className="mt-4">
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
                  <p className="text-[15px] font-700 text-ink-900">{pp.noProfiles}</p>
                  <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{pp.noProfilesHint}</p>
                  <Btn variant="dark" size="md" className="mt-4" onClick={onExit}>{pp.findCompetition}</Btn>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((it) => <SportProfileCard key={it.slug} slug={it.slug} rank={it.rank} lp={it.lp} />)}
                </div>
              )}
            </div>

            {/* teams (GET /teams/mine) — create/open handlers arrive with the
                Create Team modal and the team detail page. */}
            <MyTeamsSection />

            {/* upcoming tournaments (GET /me/tournaments → upcoming) */}
            <h2 className="font-display mt-10 text-[20px] font-700 text-ink-900">{pp.upcoming}</h2>
            <div className="mt-4">
              {mine.upcoming.length === 0 ? (
                <EmptyNote>{pp.noUpcoming}</EmptyNote>
              ) : (
                <ul className="space-y-3">
                  {mine.upcoming.map((row) => <TournamentRow key={row.id} row={row} slugMap={slugMap} />)}
                </ul>
              )}
            </div>

            {/* match history (GET /me/tournaments → past) */}
            <h2 className="font-display mt-10 text-[20px] font-700 text-ink-900">{pp.matchHistory}</h2>
            <div className="mt-4">
              {mine.past.length === 0 ? (
                <EmptyNote>{pp.noMatches}</EmptyNote>
              ) : (
                <ul className="space-y-3">
                  {mine.past.map((row) => <TournamentRow key={row.id} row={row} slugMap={slugMap} />)}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
