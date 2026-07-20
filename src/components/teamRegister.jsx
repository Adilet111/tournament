/* Rally — team-tournament registration modal (DESIGN_PROMPTS.md §6).
   Opened instead of the solo RegisterModal when a tournament's
   `participantType` is 'team'. Flow (see NEW.md §11/§12):
   - list the signed-in user's captained teams in this sport (GET /teams/mine);
   - none → the "not a captain" state with a "Create team" shortcut;
   - one → skip straight to the roster picker; several → pick one first;
   - roster picker: check exactly `teamSize` active members, then
     POST /tournaments/:id/register-team;
   - success screen with a self-service "Withdraw team"
     (POST /tournaments/:id/withdraw-team). */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { apiErrorMessage } from '../i18n';
import { listMyTeams, getTeam, registerTeamForTournament, withdrawTeamFromTournament } from '../lib/api';
import { Btn, Pill, SportTag } from './primitives';
import { CreateTeamModal, TeamLogo } from './teams';

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

function TeamPickRow({ team, selected, onSelect }) {
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ' +
        (selected ? 'border-accent bg-[var(--accent-soft)]' : 'border-ink-100 hover:border-ink-300')
      }>
      <TeamLogo team={team} size="h-9 w-9 text-[13px]" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-600 text-ink-900">{team.name}</div>
        <div className="text-[12px] text-ink-500">{t.teams.membersFn(team.memberCount ?? 0)}</div>
      </div>
      <span className={'grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ' + (selected ? 'border-accent bg-accent' : 'border-ink-200')}>
        {selected && (
          <svg viewBox="0 0 16 16" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

function MemberPickRow({ member, checked, disabled, onToggle }) {
  return (
    <label
      className={
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ' +
        (disabled ? 'border-ink-100 opacity-50' : checked ? 'border-accent bg-[var(--accent-soft)] cursor-pointer' : 'border-ink-100 hover:border-ink-300 cursor-pointer')
      }>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="h-4 w-4 accent-[var(--accent)]" />
      <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[11px] font-700 text-accent">
        {initials(member.name)}
      </span>
      <span className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-600 text-ink-900">{member.name}</div>
        <div className="truncate text-[12px] text-ink-500">{member.email}</div>
      </span>
      <span className={'font-mono text-[13px] ' + (member.rating == null ? 'text-ink-300' : 'text-ink-700')}>
        {member.rating ?? '—'}
      </span>
    </label>
  );
}

export function TeamRegisterModal({ comp, onClose }) {
  const { t } = useLang();
  const tr = t.teamRegister;
  const sportName = t.data.sports[comp.sport] || comp.sport;

  // loading-teams | teams-error | no-team | pick-team | loading-roster | roster-error | roster | done
  const [phase, setPhase] = useState('loading-teams');
  const [myTeams, setMyTeams] = useState([]);
  const [teamId, setTeamId] = useState(null);
  const [roster, setRoster] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [submitState, setSubmitState] = useState('idle'); // idle | submitting
  const [submitError, setSubmitError] = useState('');
  const [registeredTeamName, setRegisteredTeamName] = useState('');
  const [withdrawState, setWithdrawState] = useState('idle'); // idle | pending

  // Fetch helpers set state only inside their promise callbacks (never
  // synchronously in the caller), so they're safe to invoke directly from
  // the mount effect below as well as from click handlers.
  const pickTeam = useCallback((id) => {
    setTeamId(id);
    setSelected(new Set());
    getTeam(id)
      .then((detail) => { setRoster(detail); setPhase('roster'); })
      .catch(() => setPhase('roster-error'));
  }, []);

  const fetchTeams = useCallback(() => {
    listMyTeams()
      .then((list) => {
        const mine = (Array.isArray(list) ? list : []).filter(
          (tm) => tm.sportSlug === comp.sport && tm.myRole === 'captain'
        );
        setMyTeams(mine);
        if (mine.length === 0) setPhase('no-team');
        else if (mine.length === 1) pickTeam(mine[0].id);
        else setPhase('pick-team');
      })
      .catch(() => setPhase('teams-error'));
  }, [comp.sport, pickTeam]);

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const retryTeams = () => { setPhase('loading-teams'); fetchTeams(); };
  const retryRoster = () => { setPhase('loading-roster'); pickTeam(teamId); };

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const toggleMember = (userId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else if (next.size < comp.teamSize) next.add(userId);
      return next;
    });
  };

  const submit = async () => {
    if (submitState === 'submitting') return;
    setSubmitState('submitting');
    setSubmitError('');
    try {
      await registerTeamForTournament(comp.id, teamId, [...selected]);
      setRegisteredTeamName(roster?.name || '');
      setSubmitState('idle');
      setPhase('done');
    } catch (e) {
      setSubmitError(apiErrorMessage(e, t));
      setSubmitState('idle');
    }
  };

  const withdraw = async () => {
    if (withdrawState === 'pending') return;
    setWithdrawState('pending');
    try {
      await withdrawTeamFromTournament(comp.id, teamId);
      onClose();
    } catch (e) {
      setSubmitError(apiErrorMessage(e, t));
      setWithdrawState('idle');
    }
  };

  const multipleTeams = myTeams.length > 1;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <div onMouseDown={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-ink-100 px-6 py-4">
          <div>
            <SportTag sport={comp.sport} />
            <h3 className="font-display mt-1 text-[18px] font-700 leading-snug text-ink-900">{comp.title}</h3>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 hover:bg-ink-50" aria-label="Close">✕</button>
        </div>

        <div className="p-6">
          {phase === 'done' ? (
            <div className="text-center">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-center gap-1.5 text-[14.5px] font-700 text-green-800">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {tr.successFn(registeredTeamName)}
                </div>
              </div>
              <button onClick={withdraw} disabled={withdrawState === 'pending'} className="mt-3 text-[13px] font-600 text-ink-500 hover:text-red-600 disabled:opacity-50">
                {withdrawState === 'pending' ? tr.withdrawing : tr.withdrawTeam}
              </button>
              {submitError && <p className="mt-2 text-[12.5px] font-500 text-red-600">{submitError}</p>}
              <Btn variant="dark" size="md" className="mt-5 w-full justify-center" onClick={onClose}>{tr.doneCta}</Btn>
            </div>
          ) : phase === 'loading-teams' || phase === 'loading-roster' ? (
            <div className="flex items-center gap-2 py-4 text-[14px] text-ink-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
              {tr.loading}
            </div>
          ) : phase === 'teams-error' ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-5 text-center">
              <p className="text-[14px] text-ink-500">{tr.loadFailed}</p>
              <button onClick={retryTeams} className="mt-2 text-[14px] font-600 text-accent hover:underline">{t.teams.retry}</button>
            </div>
          ) : phase === 'no-team' ? (
            <div className="text-center">
              <Btn variant="primary" size="md" disabled className="w-full justify-center">{tr.registerCta}</Btn>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{tr.notCaptainFn(sportName)}</p>
              <button onClick={() => setCreateOpen(true)} className="mt-2 text-[13.5px] font-600 text-accent hover:underline">
                {t.teams.createTeam}
              </button>
            </div>
          ) : phase === 'pick-team' ? (
            <div>
              <h4 className="font-display text-[15px] font-700 text-ink-900">{tr.chooseTeamTitle}</h4>
              <div className="mt-3 space-y-2">
                {myTeams.map((tm) => (
                  <TeamPickRow key={tm.id} team={tm} selected={teamId === tm.id} onSelect={() => { setPhase('loading-roster'); pickTeam(tm.id); }} />
                ))}
              </div>
            </div>
          ) : phase === 'roster-error' ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-5 text-center">
              <p className="text-[14px] text-ink-500">{tr.loadFailed}</p>
              <button onClick={retryRoster} className="mt-2 text-[14px] font-600 text-accent hover:underline">{t.teams.retry}</button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-display text-[15px] font-700 text-ink-900">{tr.rosterTitle}</h4>
                <Pill tone={selected.size === comp.teamSize ? 'accent' : 'default'} className="font-mono">
                  {tr.selectedFn(selected.size, comp.teamSize)}
                </Pill>
              </div>
              <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {(roster?.members ?? []).map((m) => (
                  <MemberPickRow
                    key={m.userId}
                    member={m}
                    checked={selected.has(m.userId)}
                    disabled={!selected.has(m.userId) && selected.size >= comp.teamSize}
                    onToggle={() => toggleMember(m.userId)}
                  />
                ))}
              </div>
              <p className="mt-3 text-[12px] leading-relaxed text-ink-500">{tr.frozenNote}</p>
              {submitError && <p className="mt-2 text-[12.5px] font-500 text-red-600">{submitError}</p>}
              <div className="mt-4 flex items-center justify-between">
                {multipleTeams ? (
                  <button onClick={() => setPhase('pick-team')} className="text-[13.5px] font-600 text-ink-500 hover:text-ink-900">{tr.back}</button>
                ) : <span />}
                <Btn variant="primary" size="md" disabled={selected.size !== comp.teamSize || submitState === 'submitting'} onClick={submit}>
                  {submitState === 'submitting' ? tr.registering : tr.registerRosterCta}
                </Btn>
              </div>
            </div>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateTeamModal
          initialSportSlug={comp.sport}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); retryTeams(); }}
        />
      )}
    </div>
  );
}
