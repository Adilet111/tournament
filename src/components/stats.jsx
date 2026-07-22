/* Rally — "My statistics" page (#stats).
   Renders GET /me/stats (NEW.md §18) — fully derived server-side, nothing to
   refresh manually. Three sections: overall stat tiles, a row per sport, and
   tournament history with a placement badge. Placement badges beyond
   champion/runner-up are computed from `finalRank` (1 champion, 2 runner-up,
   3 semifinal losers, 5 quarterfinal losers, 9 round-of-16 losers, …, per the
   API's own numbering) and reuse the bracket page's round-name strings so the
   wording matches. See DESIGN_PROMPTS.md §9. */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { getMyStats } from '../lib/api';
import { placementInfo } from '../lib/bracketRounds';
import { Logo, Btn, LangSwitcher, Pill } from './primitives';

function sportInitials(label) {
  return (label || '').slice(0, 2).toUpperCase() || '?';
}

function PlacementBadge({ rank, t }) {
  const info = placementInfo(rank, t.stats, t.bracket);
  if (!info) return <span className="text-[12px] text-ink-300">—</span>;
  const cls =
    info.tone === 'gold' ? 'bg-amber-100 text-amber-800'
    : info.tone === 'silver' ? 'border border-ink-100 bg-ink-50 text-ink-700'
    : 'text-ink-500';
  return <span className={'inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-700 ' + cls}>{info.label}</span>;
}

function StatTile({ value, label, sub, featured }) {
  return (
    <div className={'rounded-2xl border p-4 ' + (featured ? 'border-accent/30 bg-[var(--accent-soft)]' : 'border-ink-100 bg-white')}>
      <div className={'font-mono text-[26px] font-600 leading-none ' + (featured ? 'text-accent' : 'text-ink-900')}>{value}</div>
      <div className={'mt-2 text-[11px] font-700 uppercase leading-snug tracking-wide ' + (featured ? 'text-accent' : 'text-ink-500')}>{label}</div>
      {sub && <div className="mt-0.5 font-mono text-[12px] text-ink-500">{sub}</div>}
    </div>
  );
}

function SportRow({ row, t }) {
  const label = t.data.sports[row.sportSlug] ?? row.sportName;
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-3.5 rounded-2xl border border-ink-100 bg-white px-5 py-4 last:mb-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--accent-soft)] font-mono text-[12px] font-700 text-accent">
        {sportInitials(label)}
      </span>
      <span className="font-display w-[110px] shrink-0 text-[15px] font-700 text-ink-900">{label}</span>
      {row.rating != null && (
        <span className="rounded-full bg-accent px-3 py-1 font-mono text-[13px] font-600 text-white">{row.rating}</span>
      )}
      <div className="ml-auto flex flex-wrap items-end gap-5">
        <div className="text-right">
          <b className="block font-mono text-[15px] font-600 text-ink-900">{row.tournamentsPlayed}</b>
          <span className="text-[11px] font-600 uppercase tracking-wide text-ink-500">{t.stats.miniTournaments}</span>
        </div>
        <div className="text-right">
          <b className="block font-mono text-[15px] font-600 text-ink-900">{row.tournamentsWon}</b>
          <span className="text-[11px] font-600 uppercase tracking-wide text-ink-500">{t.stats.miniWon}</span>
        </div>
        <div className="text-right">
          <b className="block font-mono text-[15px] font-600 text-ink-900">{row.matchesPlayed}</b>
          <span className="text-[11px] font-600 uppercase tracking-wide text-ink-500">{t.stats.miniMatches}</span>
        </div>
        <div className="text-right">
          <b className="block font-mono text-[15px] font-600 text-ink-900">{row.winRate != null ? t.stats.winRatePctFn(row.winRate) : '—'}</b>
          <span className="text-[11px] font-600 uppercase tracking-wide text-ink-500">{t.stats.miniWinRate}</span>
        </div>
        <div className="text-right">
          <b className="block font-mono text-[15px] font-600 text-ink-900">{row.score}</b>
          <span className="text-[11px] font-600 uppercase tracking-wide text-ink-500">{t.stats.miniScore}</span>
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ row, t, lang }) {
  const date = row.startsAt
    ? new Date(row.startsAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const sportLabel = t.data.sports[row.sportSlug] ?? row.sportSlug;
  const loss = Math.max(0, (row.matchesPlayed ?? 0) - (row.matchesWon ?? 0));
  return (
    <div className="grid grid-cols-[1.5fr_110px_100px_130px_50px_110px_70px] items-center gap-3 border-t border-ink-50 px-5 py-3.5 first:border-t-0">
      <span className="truncate text-[14.5px] font-600 text-ink-900">{row.title}</span>
      <span className="text-[13px] text-ink-500">{date}</span>
      <Pill className="justify-self-start">{sportLabel}</Pill>
      {row.teamName ? <Pill tone="accent" className="justify-self-start">{row.teamName}</Pill> : <span />}
      <span className="font-mono text-[13px] text-ink-500">{row.seed != null ? `#${row.seed}` : '—'}</span>
      <PlacementBadge rank={row.finalRank} t={t} />
      <span className="justify-self-end font-mono text-[13px] text-ink-700">{t.stats.recordFn(row.matchesWon ?? 0, loss)}</span>
    </div>
  );
}

export function StatsPage({ onExit }) {
  const { t, lang } = useLang();
  const st = t.stats;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [stats, setStats] = useState(null);
  const [scoreInfoOpen, setScoreInfoOpen] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    getMyStats()
      .then((s) => { if (!cancelled) { setStats(s); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => load(), [load]);
  const retry = () => { setState('loading'); load(); };

  const overall = stats?.overall;
  const bySport = stats?.bySport ?? [];
  const history = stats?.tournaments ?? [];
  const hasStats = overall && overall.tournamentsPlayed > 0;

  return (
    <div className="min-h-screen bg-ink-50/50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-[68px] max-w-4xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Btn variant="ghost" size="sm" onClick={onExit}>← {st.backToProfile}</Btn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="font-display text-[24px] font-700 text-ink-900">{st.title}</h1>

        {state === 'loading' && (
          <div className="mt-6 flex items-center gap-2 py-8 text-[14px] text-ink-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
            {st.loading}
          </div>
        )}
        {state === 'error' && (
          <div className="mt-6 rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
            <p className="text-[14px] text-ink-500">{st.loadFailed}</p>
            <button onClick={retry} className="mt-2 text-[14px] font-600 text-accent hover:underline">{st.retry}</button>
          </div>
        )}

        {state === 'ready' && !hasStats && (
          <div className="mt-6 flex flex-col items-center rounded-3xl border border-ink-100 bg-white px-8 py-16 text-center">
            <span className="mb-4 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-ink-50 text-ink-500">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" />
              </svg>
            </span>
            <p className="font-display text-[16px] font-700 text-ink-900">{st.emptyTitle}</p>
            <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{st.emptyBody}</p>
            <Btn variant="dark" size="md" className="mt-5" onClick={onExit}>{t.teams.browseTournaments}</Btn>
          </div>
        )}

        {state === 'ready' && hasStats && (
          <>
            <h2 className="font-display mt-8 mb-3 text-[16px] font-700 text-ink-900">{st.overall}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatTile value={overall.tournamentsPlayed} label={st.tilePlayed} />
              <StatTile value={overall.tournamentsWon} label={st.tileWon} />
              <StatTile value={overall.podiumFinishes} label={st.tilePodiums} />
              <StatTile
                value={overall.matchesPlayed}
                label={st.tileMatches}
                sub={st.recordFn(overall.matchesWon, overall.matchesLost)}
              />
              <StatTile value={overall.winRate != null ? st.winRatePctFn(overall.winRate) : '—'} label={st.tileWinRate} />
              <StatTile value={overall.score} label={st.tileScore} featured />
            </div>

            <button onClick={() => setScoreInfoOpen((o) => !o)}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-600 text-accent hover:underline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {st.scoreInfoCta}
            </button>

            {scoreInfoOpen && (
              <div className="mt-3 rounded-2xl border border-ink-100 bg-white p-5">
                <h3 className="font-display text-[15px] font-700 text-ink-900">{st.scoreInfoTitle}</h3>
                <p className="mt-1 text-[13px] text-ink-500">{st.scoreInfoIntro}</p>
                <ul className="mt-3 space-y-1.5 text-[13.5px] text-ink-700">
                  <li className="flex items-center justify-between gap-3">
                    <span>{st.scoreInfoParticipation}</span>
                    <b className="shrink-0 font-mono text-ink-900">+10</b>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>{st.scoreInfoMatchWin}</span>
                    <b className="shrink-0 font-mono text-ink-900">+5 {st.scoreInfoEach}</b>
                  </li>
                </ul>

                <p className="mt-4 text-[13px] text-ink-500">{st.scoreInfoPlacementIntro}</p>
                <ul className="mt-2 space-y-1.5 text-[13.5px] text-ink-700">
                  <li className="flex items-center justify-between gap-3">
                    <span>{st.champion}</span>
                    <b className="shrink-0 font-mono text-ink-900">+50</b>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>{st.runnerUp}</span>
                    <b className="shrink-0 font-mono text-ink-900">+30</b>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span>{st.scoreInfoSemifinal}</span>
                    <b className="shrink-0 font-mono text-ink-900">+20</b>
                  </li>
                  <li className="flex items-center justify-between gap-3 text-ink-400">
                    <span>{st.scoreInfoOtherPlacement}</span>
                    <b className="shrink-0 font-mono">+0</b>
                  </li>
                </ul>

                <div className="mt-4 rounded-xl bg-ink-50 px-3.5 py-2.5 font-mono text-[12.5px] leading-relaxed text-ink-700">
                  {st.scoreInfoFormula}
                </div>
              </div>
            )}

            {bySport.length > 0 && (
              <>
                <h2 className="font-display mt-8 mb-3 text-[16px] font-700 text-ink-900">{st.bySport}</h2>
                <div>
                  {bySport.map((row) => <SportRow key={row.sportId} row={row} t={t} />)}
                </div>
              </>
            )}

            {history.length > 0 && (
              <>
                <h2 className="font-display mt-8 mb-3 text-[16px] font-700 text-ink-900">{st.history}</h2>
                <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
                  <div className="overflow-x-auto">
                    <div className="min-w-[720px]">
                      {history.map((row) => <HistoryRow key={row.tournamentId} row={row} t={t} lang={lang} />)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
