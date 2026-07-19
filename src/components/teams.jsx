/* Rally — teams UI (public site).
   MyTeamsSection lives on the profile page and lists the signed-in user's
   active teams from GET /teams/mine (role, sport, member count per team).
   `onCreate` / `onOpenTeam` stay optional until the Create Team modal and the
   team detail page (DESIGN_PROMPTS.md §2–3) land — without a handler the
   create button renders disabled and the cards are not clickable. */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { listMyTeams } from '../lib/api';
import { Btn, Pill } from './primitives';

function teamInitials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'T';
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  );
}

function TeamLogo({ team, size = 'h-12 w-12 text-[16px]' }) {
  return team.logoUrl ? (
    <img src={team.logoUrl} alt="" className={`${size} rounded-xl bg-ink-50 object-cover`} />
  ) : (
    <span className={`${size} grid place-items-center rounded-xl bg-[var(--accent-soft)] font-700 text-accent`}>
      {teamInitials(team.name)}
    </span>
  );
}

function RoleBadge({ role }) {
  const { t } = useLang();
  return role === 'captain' ? (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[12px] font-700 text-white">
      {t.teams.roleCaptain}
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-ink-300 bg-white px-2.5 py-1 text-[12px] font-700 text-ink-700">
      {t.teams.roleMember}
    </span>
  );
}

function TeamCard({ team, onOpen }) {
  const { t } = useLang();
  const sportLabel = t.data.sports[team.sportSlug] ?? team.sportName ?? team.sportSlug;
  return (
    <article
      onClick={onOpen ? () => onOpen(team) : undefined}
      className={
        'rounded-2xl border border-ink-100 bg-white p-4.5 transition-colors ' +
        (onOpen ? 'cursor-pointer hover:border-accent' : '')
      }>
      <TeamLogo team={team} />
      <div className="font-display mt-3 text-[16px] font-600 text-ink-900">{team.name}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Pill>{sportLabel}</Pill>
        <RoleBadge role={team.myRole} />
      </div>
      <div className="mt-1.5 text-[13px] text-ink-500">{t.teams.membersFn(team.memberCount ?? 0)}</div>
    </article>
  );
}

function EmptyTeams({ onCreate }) {
  const { t } = useLang();
  const tt = t.teams;
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <span className="grid h-[72px] w-[72px] place-items-center rounded-[20px] bg-[var(--accent-soft)]">
        <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="var(--accent)" strokeWidth="1.6">
          <circle cx="9" cy="8" r="3" />
          <path d="M2 20c0-3.3 3-5.5 7-5.5s7 2.2 7 5.5" strokeLinecap="round" />
          <circle cx="17" cy="7" r="2.4" />
          <path d="M15.5 13.5c2.7.4 5 2.3 5 5.5" strokeLinecap="round" />
        </svg>
      </span>
      <p className="mt-5 text-[15px] font-700 text-ink-900">{tt.emptyTitle}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-500">{tt.emptyHint}</p>
      <Btn size="sm" className="mt-5" onClick={onCreate} disabled={!onCreate}>
        <PlusIcon />
        {tt.createTeam}
      </Btn>
    </div>
  );
}

export function MyTeamsSection({ onCreate, onOpenTeam }) {
  const { t } = useLang();
  const tt = t.teams;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [teams, setTeams] = useState([]);

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const list = await listMyTeams();
      if (cancelled) return;
      setTeams(Array.isArray(list) ? list : []);
      setState('ready');
    })().catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => load(), [load]);

  const retry = () => { setState('loading'); load(); };

  return (
    <section>
      <div className="mt-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <h2 className="font-display text-[20px] font-700 text-ink-900">{tt.title}</h2>
          {state === 'ready' && teams.length > 0 && (
            <span className="rounded-full bg-ink-50 px-2.5 py-0.5 text-[13px] font-600 text-ink-700">{teams.length}</span>
          )}
        </div>
        <Btn size="sm" onClick={onCreate} disabled={!onCreate}>
          <PlusIcon />
          {tt.createTeam}
        </Btn>
      </div>

      <div className="mt-4">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-4 text-[14px] text-ink-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
            {t.profilePage.loading}
          </div>
        )}
        {state === 'error' && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
            <p className="text-[14px] text-ink-500">{tt.loadFailed}</p>
            <button onClick={retry} className="mt-2 text-[14px] font-600 text-accent hover:underline">{tt.retry}</button>
          </div>
        )}
        {state === 'ready' && (
          teams.length === 0 ? (
            <EmptyTeams onCreate={onCreate} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => <TeamCard key={team.id} team={team} onOpen={onOpenTeam} />)}
            </div>
          )
        )}
      </div>
    </section>
  );
}
