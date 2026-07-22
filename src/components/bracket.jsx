/* Rally — public bracket view (#bracket/<id>).
   Renders the single-elimination bracket from GET /tournaments/:id/bracket
   (NEW.md §15) — public, works before generation too (`generated: false`).
   Round labels count backwards from the final (Final, Semifinal,
   Quarterfinal, then "Round of N"); a match's still-unresolved slot is
   traced to its feeder match via `nextMatchId` + `position` (per the API's
   own rendering note) and shown as an italic "Winner of …" placeholder.
   See DESIGN_PROMPTS.md §8. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLang } from '../LangContext';
import { getTournament, getBracket, listSports } from '../lib/api';
import { roundLabel as roundLabelFor, winningSlot, buildFeedersByNext } from '../lib/bracketRounds';
import { Logo, Btn, LangSwitcher, Pill, SportTag } from './primitives';

function TrophyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6 4h12v3a6 6 0 0 1-12 0V4z" />
      <path d="M6 6H3a3 3 0 0 0 3 5M18 6h3a3 3 0 0 1-3 5" />
      <path d="M12 13v3M9 20h6M8 20l1-4h6l1 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* The connector is a sibling of the (rounded, clipped) card rather than a
   pseudo-element on it — an `overflow-hidden` card would clip a line that
   pokes out past its own right edge. */
function Connector() {
  return <span className="pointer-events-none absolute -right-8 top-1/2 h-px w-8 bg-ink-100" />;
}

function MatchCard({ match, entryById, feedersByNext, roundLabel, isFinal, t }) {
  if (match.status === 'walkover') {
    const p = match.participants[0];
    const entry = p && entryById.get(p.entryId);
    return (
      <div className="relative">
        <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50 px-3 py-2.5">
          <span className="w-3 shrink-0 font-mono text-[11px] text-ink-300">{entry?.seed ?? ''}</span>
          <span className="flex-1 truncate text-[13.5px] font-600 text-ink-900">{p?.displayName ?? entry?.displayName ?? '—'}</span>
          <Pill tone="outline" className="!px-2 !py-0.5 !text-[10px] font-700 uppercase tracking-wide">{t.bracket.bye}</Pill>
        </div>
        {!isFinal && <Connector />}
      </div>
    );
  }

  const winner = winningSlot(match);
  const feeders = feedersByNext.get(match.id) || [];
  const slots = [1, 2].map((slot) => {
    const p = match.participants.find((pp) => pp.slot === slot);
    if (p) {
      const entry = entryById.get(p.entryId);
      return { seed: entry?.seed, name: p.displayName ?? entry?.displayName ?? '—', score: p.score, isWinner: winner === slot, isLoser: winner != null && winner !== slot, placeholder: false };
    }
    const feeder = feeders[slot - 1];
    const name = feeder ? t.bracket.winnerOfFn(roundLabel(feeder.round), feeder.position + 1) : '—';
    return { seed: null, name, score: null, isWinner: false, isLoser: false, placeholder: true };
  });

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-ink-50 px-3 py-2.5 last:border-b-0">
            <span className="w-3 shrink-0 font-mono text-[11px] text-ink-300">{s.seed ?? ''}</span>
            <span className={
              'flex-1 text-[13.5px] leading-snug ' +
              (s.placeholder ? 'italic text-ink-300' : 'truncate ' + (s.isWinner ? 'font-600 text-ink-900' : s.isLoser ? 'text-ink-300' : 'text-ink-700'))
            }>
              {s.name}
            </span>
            {s.isWinner && <CheckIcon />}
            <span className={'shrink-0 font-mono text-[13.5px] ' + (s.isWinner ? 'font-700 text-accent' : 'text-ink-300')}>
              {s.score ?? (s.placeholder ? '' : '–')}
            </span>
          </div>
        ))}
      </div>
      {!isFinal && <Connector />}
    </div>
  );
}

export function BracketPage({ tournamentId, onExit }) {
  const { t } = useLang();
  const bt = t.bracket;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [tournament, setTournament] = useState(null);
  const [bracket, setBracket] = useState(null);
  const [sportSlug, setSportSlug] = useState('');

  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([getTournament(tournamentId), getBracket(tournamentId), listSports()])
      .then(([tr, br, sports]) => {
        if (cancelled) return;
        setTournament(tr);
        setBracket(br);
        const list = Array.isArray(sports) ? sports : [];
        setSportSlug(list.find((s) => s.id === tr.sportId)?.slug || '');
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [tournamentId]);

  useEffect(() => load(), [load]);
  const retry = () => { setState('loading'); load(); };

  const rounds = useMemo(() => [...(bracket?.rounds || [])].sort((a, b) => a.round - b.round), [bracket]);
  const entries = useMemo(() => bracket?.entries || [], [bracket]);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const totalRounds = rounds.length;

  const roundLabel = useCallback((r) => roundLabelFor(r, totalRounds, bt), [totalRounds, bt]);

  const feedersByNext = useMemo(() => buildFeedersByNext(rounds), [rounds]);

  const champion = entries.find((e) => e.finalRank === 1);
  const runnerUp = champion ? entries.find((e) => e.finalRank === 2) : null;
  const firstRoundCount = rounds[0]?.matches.length || 0;
  const bracketSize = firstRoundCount * 2;

  return (
    <div className="min-h-screen bg-ink-50/50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Btn variant="ghost" size="sm" onClick={onExit}>← {bt.back}</Btn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-8 text-[14px] text-ink-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
            {bt.loading}
          </div>
        )}
        {state === 'error' && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
            <p className="text-[14px] text-ink-500">{bt.loadFailed}</p>
            <button onClick={retry} className="mt-2 text-[14px] font-600 text-accent hover:underline">{bt.retry}</button>
          </div>
        )}

        {state === 'ready' && tournament && (
          <>
            {sportSlug && <SportTag sport={sportSlug} className="mb-1.5" />}
            <h1 className="font-display text-[26px] font-700 leading-tight text-ink-900">{tournament.title}</h1>

            {bracket?.generated ? (
              <>
                <div className="mt-3">
                  <Pill tone="outline" className="font-mono uppercase tracking-wide">
                    {bt.sizeStatusFn(bracketSize, t.admin.status[tournament.status] ?? tournament.status)}
                  </Pill>
                </div>

                {champion && (
                  <div className="mt-5 flex flex-wrap items-center gap-3.5 rounded-2xl border border-accent/30 bg-[var(--accent-soft)] px-5 py-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[var(--accent-ink)]"><TrophyIcon /></span>
                    <span className="font-display text-[16px] font-700 text-ink-900">
                      {bt.championLabel} <span className="text-accent">{champion.displayName}</span>
                    </span>
                    {runnerUp && <span className="text-[13px] text-ink-500">{bt.runnerUpFn(runnerUp.displayName)}</span>}
                  </div>
                )}

                <div className="mt-7 overflow-x-auto pb-3">
                  <div className="flex gap-14" style={{ minHeight: firstRoundCount * 108 }}>
                    {rounds.map((round) => (
                      <div key={round.round} className="flex w-56 shrink-0 flex-col">
                        <div className="mb-4 font-mono text-[11px] font-700 uppercase tracking-wide text-ink-500">
                          {roundLabel(round.round)}
                        </div>
                        <div className="flex flex-1 flex-col justify-around gap-3">
                          {round.matches.map((m) => (
                            <MatchCard
                              key={m.id}
                              match={m}
                              entryById={entryById}
                              feedersByNext={feedersByNext}
                              roundLabel={roundLabel}
                              isFinal={!m.nextMatchId}
                              t={t}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-7 flex flex-col items-center justify-center rounded-3xl border border-ink-100 bg-white px-8 py-16 text-center">
                <span className="mb-4 grid h-[52px] w-[52px] place-items-center rounded-2xl bg-ink-50 text-ink-500">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M4 5h6v5H4zM14 5h6v5h-6zM4 14h6v5H4zM14 14h6v5h-6zM10 7.5h4M10 16.5h4M12 10v9" strokeLinecap="round" />
                  </svg>
                </span>
                <p className="font-display text-[16px] font-700 text-ink-900">{bt.emptyTitle}</p>
                <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{bt.emptySub}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
