/* Rally — team detail page (#team/<id>).
   Shows the team header (logo, sport, my role), the active roster from
   GET /teams/:id, and the role-gated actions from NEW.md: captains can
   transfer captaincy, remove (ban) members and delete the team; members can
   leave. The invite-link card (DESIGN_PROMPTS.md §4) slots in under the
   header when it lands. The route is members-only — the backend answers
   403 not_team_member / 404 not_found, both rendered as the error state. */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { apiErrorMessage } from '../i18n';
import {
  getTeam, listSports, leaveTeam, transferTeamCaptain, removeTeamMember, deleteTeam,
} from '../lib/api';
import { Logo, Btn, LangSwitcher, Pill } from './primitives';
import { TeamLogo, RoleBadge } from './teams';

function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

/* Small confirm dialog for the destructive team actions. Runs `onConfirm`
   (async) and keeps itself open with the API error message when it throws —
   that's how "delete blocked: team_has_registrations" reaches the user. */
function ConfirmDialog({ title, body, confirmLabel, danger = false, onConfirm, onClose }) {
  const { t } = useLang();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await onConfirm();
    } catch (err) {
      setError(apiErrorMessage(err, t));
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border border-ink-100 bg-white p-6 shadow-2xl">
        <h3 className="font-display text-[18px] font-700 text-ink-900">{title}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{body}</p>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{error}</div>}
        <div className="mt-5 flex justify-end gap-2.5">
          <Btn variant="outline" size="sm" onClick={onClose}>{t.teams.cancel}</Btn>
          {danger ? (
            <button
              onClick={run}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-[14px] font-600 text-white transition-colors hover:bg-red-700 disabled:pointer-events-none disabled:opacity-40">
              {confirmLabel}
            </button>
          ) : (
            <Btn size="sm" onClick={run} disabled={pending}>{confirmLabel}</Btn>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberRow({ member, isCaptainView, mode, onRemove, onMakeCaptain }) {
  const { t, lang } = useLang();
  const joined = member.joinedAt
    ? new Date(member.joinedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const actionable = isCaptainView && member.role !== 'captain';
  return (
    <div className="grid grid-cols-[32px_1.6fr_110px_90px_120px_130px] items-center gap-3.5 border-t border-ink-50 px-7 py-3.5">
      <span className="font-display grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-soft)] text-[12px] font-700 text-accent">
        {initials(member.name)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[14.5px] font-600 text-ink-900">{member.name}</div>
        <div className="truncate text-[12px] text-ink-500">{member.email}</div>
      </div>
      <span className="justify-self-start"><RoleBadge role={member.role} /></span>
      <span className={'font-mono text-[14px] ' + (member.rating == null ? 'text-ink-300' : 'text-ink-700')}>
        {member.rating ?? '—'}
      </span>
      <span className="text-[13px] text-ink-500">{joined}</span>
      <span className="justify-self-end">
        {actionable && mode === 'view' && (
          <button onClick={onRemove} className="text-[13px] font-600 text-red-600 hover:underline">
            {t.teams.remove}
          </button>
        )}
        {actionable && mode === 'transfer' && (
          <button onClick={onMakeCaptain} className="text-[13px] font-600 text-accent hover:underline">
            {t.teams.makeCaptain}
          </button>
        )}
      </span>
    </div>
  );
}

export function TeamPage({ teamId, onExit }) {
  const { t, lang } = useLang();
  const tt = t.teams;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [team, setTeam] = useState(null);
  const [slugMap, setSlugMap] = useState({}); // sportId → sport slug
  const [mode, setMode] = useState('view'); // view | transfer
  const [confirm, setConfirm] = useState(null); // { kind: leave|delete|remove|transfer, member? }

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const [detail, sports] = await Promise.all([getTeam(teamId), listSports()]);
      if (cancelled) return;
      setTeam(detail);
      const list = Array.isArray(sports) ? sports : [];
      setSlugMap(Object.fromEntries(list.map((s) => [s.id, s.slug || String(s.name || '').toLowerCase()])));
      setState('ready');
    })().catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [teamId]);

  useEffect(() => load(), [load]);

  const reload = () => { setState('loading'); setMode('view'); load(); };
  const isCaptain = team?.myRole === 'captain';
  const members = team?.members ?? [];
  const sportSlug = slugMap[team?.sportId];
  const created = team?.createdAt
    ? new Date(team.createdAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const confirmProps = confirm && {
    leave: {
      title: tt.confirmLeaveFn(team?.name ?? ''),
      body: tt.confirmLeaveBody,
      confirmLabel: tt.leaveTeam,
      danger: true,
      onConfirm: async () => { await leaveTeam(teamId); onExit(); },
    },
    delete: {
      title: tt.confirmDeleteFn(team?.name ?? ''),
      body: tt.confirmDeleteBody,
      confirmLabel: tt.deleteTeam,
      danger: true,
      onConfirm: async () => { await deleteTeam(teamId); onExit(); },
    },
    remove: {
      title: tt.confirmRemoveFn(confirm.member?.name ?? ''),
      body: tt.confirmRemoveBody,
      confirmLabel: tt.remove,
      danger: true,
      onConfirm: async () => { await removeTeamMember(teamId, confirm.member.userId); setConfirm(null); reload(); },
    },
    transfer: {
      title: tt.confirmTransferFn(confirm.member?.name ?? ''),
      body: tt.confirmTransferBody,
      confirmLabel: tt.makeCaptain,
      danger: false,
      onConfirm: async () => { await transferTeamCaptain(teamId, confirm.member.userId); setConfirm(null); reload(); },
    },
  }[confirm.kind];

  return (
    <div className="min-h-screen bg-ink-50/50">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-[68px] max-w-4xl items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <LangSwitcher />
            <Btn variant="ghost" size="sm" onClick={onExit}>← {tt.backToProfile}</Btn>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {state === 'loading' && (
          <div className="flex items-center gap-2 py-8 text-[14px] text-ink-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
            {t.profilePage.loading}
          </div>
        )}
        {state === 'error' && (
          <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center">
            <p className="text-[14px] text-ink-500">{tt.teamLoadFailed}</p>
            <button onClick={reload} className="mt-2 text-[14px] font-600 text-accent hover:underline">{tt.retry}</button>
          </div>
        )}

        {state === 'ready' && team && (
          <>
            {/* header card */}
            <div className="flex flex-wrap items-start justify-between gap-5 rounded-3xl border border-ink-100 bg-white p-6">
              <div className="flex min-w-0 gap-4">
                <TeamLogo team={team} size="h-16 w-16 text-[20px]" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-display text-[24px] font-700 leading-tight text-ink-900">{team.name}</h1>
                    {sportSlug && <Pill>{t.data.sports[sportSlug] ?? sportSlug}</Pill>}
                    <RoleBadge role={team.myRole} />
                  </div>
                  {created && <div className="mt-1.5 text-[13px] text-ink-500">{tt.createdFn(created)}</div>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {isCaptain ? (
                  <>
                    <Btn
                      variant="outline" size="sm"
                      onClick={() => setMode(mode === 'transfer' ? 'view' : 'transfer')}
                      disabled={members.length < 2}>
                      {mode === 'transfer' ? tt.cancel : tt.transferCaptaincy}
                    </Btn>
                    <button
                      onClick={() => setConfirm({ kind: 'delete' })}
                      className="px-1 py-1.5 text-[13.5px] font-600 text-red-600 hover:underline">
                      {tt.deleteTeam}
                    </button>
                  </>
                ) : (
                  <Btn variant="outline" size="sm" onClick={() => setConfirm({ kind: 'leave' })}>
                    {tt.leaveTeam}
                  </Btn>
                )}
              </div>
            </div>

            {/* invite-link card (DESIGN_PROMPTS.md §4) slots in here */}

            {/* roster */}
            <div className="mt-6 overflow-hidden rounded-3xl border border-ink-100 bg-white">
              <div className="font-display px-7 pt-5 text-[16px] font-700 text-ink-900">
                {tt.rosterTitle} · {members.length}
              </div>
              {mode === 'transfer' && (
                <div className="mx-7 mt-3 rounded-xl bg-[var(--accent-soft)] px-3.5 py-2.5 text-[13px] text-[var(--accent-ink)]">
                  {tt.transferHint}
                </div>
              )}
              <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                  <div className="grid grid-cols-[32px_1.6fr_110px_90px_120px_130px] gap-3.5 px-7 pb-3 pt-4 text-[11.5px] font-600 uppercase tracking-[0.04em] text-ink-500">
                    <span />
                    <span>{tt.colMember}</span>
                    <span>{tt.colRole}</span>
                    <span>{tt.colRating}</span>
                    <span>{tt.colJoined}</span>
                    <span />
                  </div>
                  {members.map((m) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      isCaptainView={isCaptain}
                      mode={mode}
                      onRemove={() => setConfirm({ kind: 'remove', member: m })}
                      onMakeCaptain={() => setConfirm({ kind: 'transfer', member: m })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {confirm && confirmProps && (
        <ConfirmDialog {...confirmProps} onClose={() => setConfirm(null)} />
      )}
    </div>
  );
}
