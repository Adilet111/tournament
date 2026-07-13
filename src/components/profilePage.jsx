/* Rally — signed-in user's own profile page (#profile).
   Shows the account card, every backend sport profile with its rank/rating
   (reconstructed via GET /sports + GET /sports/:sport/profile per sport — there
   is no "list my profiles" endpoint), and a match-history section that is a
   placeholder until the backend ships a match-history endpoint. */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { listSports, getProfile } from '../lib/api';
import { getAuthToken } from '../lib/auth';
import { Logo, Btn, LangSwitcher, SportTag } from './primitives';
import { normalizeRank } from './onboarding';

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

/* One card per sport the user has a backend skill profile for. */
function SportProfileCard({ slug, rank }) {
  const { t } = useLang();
  const pp = t.profilePage;
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 transition-all hover:border-ink-200 hover:shadow-lg">
      <span
        className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, color-mix(in srgb, ${rank.division.color} 55%, white), ${rank.division.color})`,
          boxShadow: `0 0 0 4px ${rank.division.glow}`,
        }}
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <SportTag sport={slug} />
        <div className="mt-0.5 font-display text-[19px] font-700 leading-snug" style={{ color: rank.division.color }}>
          {rank.label}
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-[10.5px] uppercase tracking-wide text-ink-300">{pp.ratingLbl}</div>
        <div className="font-display text-[22px] font-700 text-ink-900">{rank.rating.toLocaleString()}</div>
      </div>
    </article>
  );
}

export function ProfilePage({ onExit }) {
  const { t } = useLang();
  const pp = t.profilePage;
  const { session, user } = useSession();
  const token = getAuthToken(session);
  const name = user?.name || t.account.defaultName;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [items, setItems] = useState([]); // [{ slug, rank }]

  // Fetch only — state starts as 'loading' and `retry` resets it, so the effect
  // never calls setState synchronously.
  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const sports = await listSports();
      const found = await Promise.all(
        (Array.isArray(sports) ? sports : []).map(async (s) => {
          const slug = s.slug || String(s.name || '').toLowerCase();
          if (!slug) return null;
          const profile = await getProfile(slug, token); // null on 404 (no profile)
          return profile ? { slug, rank: normalizeRank(profile) } : null;
        })
      );
      if (cancelled) return;
      setItems(found.filter(Boolean));
      setState('ready');
    })().catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [token]);

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

        {/* sport profiles + ratings */}
        <h2 className="font-display mt-10 text-[20px] font-700 text-ink-900">{pp.sportProfiles}</h2>
        <div className="mt-4">
          {state === 'loading' && (
            <div className="flex items-center gap-2 py-2 text-[14px] text-ink-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
              {pp.loading}
            </div>
          )}
          {state === 'error' && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
              <p className="text-[14px] text-ink-500">{pp.loadFailed}</p>
              <button onClick={retry} className="mt-2 text-[14px] font-600 text-accent hover:underline">{pp.retry}</button>
            </div>
          )}
          {state === 'ready' && items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
              <p className="text-[15px] font-700 text-ink-900">{pp.noProfiles}</p>
              <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{pp.noProfilesHint}</p>
              <Btn variant="dark" size="md" className="mt-4" onClick={onExit}>{pp.findCompetition}</Btn>
            </div>
          )}
          {state === 'ready' && items.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((it) => <SportProfileCard key={it.slug} slug={it.slug} rank={it.rank} />)}
            </div>
          )}
        </div>

        {/* match history — placeholder until the backend endpoint exists */}
        <h2 className="font-display mt-10 text-[20px] font-700 text-ink-900">{pp.matchHistory}</h2>
        <div className="mt-4 rounded-2xl border border-dashed border-ink-200 bg-white p-8 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-ink-50 text-ink-400">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          </span>
          <p className="mt-3 text-[15px] font-700 text-ink-900">{pp.matchHistorySoon}</p>
          <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{pp.matchHistoryHint}</p>
        </div>
      </main>
    </div>
  );
}
