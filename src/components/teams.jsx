/* Rally — teams UI (public site).
   MyTeamsSection lives on the profile page: it lists the signed-in user's
   active teams from GET /teams/mine and owns the CreateTeamModal (POST /teams),
   reloading the list after a successful create. `onOpenTeam` stays optional
   until the team detail page (DESIGN_PROMPTS.md §3) lands — without a handler
   the cards are not clickable. */
import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../LangContext';
import { apiErrorMessage } from '../i18n';
import { createTeam, listMyTeams, listSports } from '../lib/api';
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

export function TeamLogo({ team, size = 'h-12 w-12 text-[16px]' }) {
  return team.logoUrl ? (
    <img src={team.logoUrl} alt="" className={`${size} rounded-xl bg-ink-50 object-cover`} />
  ) : (
    <span className={`${size} grid place-items-center rounded-xl bg-[var(--accent-soft)] font-700 text-accent`}>
      {teamInitials(team.name)}
    </span>
  );
}

export function RoleBadge({ role }) {
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
      <Btn size="sm" className="mt-5" onClick={onCreate}>
        <PlusIcon />
        {tt.createTeam}
      </Btn>
    </div>
  );
}

/* Live 40px preview next to the logo URL input — falls back to the team-name
   initials while the field is empty or the image fails to load. Keyed by the
   URL where it's rendered, so `broken` resets whenever the URL changes. */
function LogoPreview({ url, name }) {
  const [broken, setBroken] = useState(false);
  const src = url.trim();
  if (!src || broken) {
    return (
      <span className="font-display grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[var(--accent-soft)] text-[14px] font-700 text-accent">
        {teamInitials(name)}
      </span>
    );
  }
  return <img src={src} alt="" onError={() => setBroken(true)} className="h-10 w-10 shrink-0 rounded-[10px] bg-ink-50 object-cover" />;
}

const inputCls =
  'w-full rounded-xl border bg-white px-3 py-2.5 text-[14.5px] text-ink-900 outline-none transition-colors ' +
  'placeholder:text-ink-300 focus:border-accent ';

function FieldLabel({ children, hint }) {
  return (
    <label className="mb-1.5 block text-[12px] font-600 uppercase tracking-[0.04em] text-ink-500">
      {children}
      {hint && <span className="ml-1 font-400 normal-case">({hint})</span>}
    </label>
  );
}

export function CreateTeamModal({ onClose, onCreated, initialSportSlug }) {
  const { t } = useLang();
  const tt = t.teams;

  const [sports, setSports] = useState([]);
  const [sportsState, setSportsState] = useState('loading'); // loading | ready | error
  const [sportId, setSportId] = useState('');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [pending, setPending] = useState(false);
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const loadSports = useCallback(() => {
    let cancelled = false;
    (async () => {
      const list = await listSports();
      if (cancelled) return;
      const arr = Array.isArray(list) ? list : [];
      setSports(arr);
      const preselected = initialSportSlug
        && arr.find((s) => (s.slug || String(s.name || '').toLowerCase()) === initialSportSlug)?.id;
      setSportId((cur) => cur || preselected || arr[0]?.id || '');
      setSportsState('ready');
    })().catch(() => { if (!cancelled) setSportsState('error'); });
    return () => { cancelled = true; };
  }, [initialSportSlug]);

  useEffect(() => loadSports(), [loadSports]);

  const sportLabel = (s) => t.data.sports[s.slug || String(s.name || '').toLowerCase()] ?? s.name ?? s.slug;

  const submit = async (e) => {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setNameError('');
    setError('');
    try {
      const team = await createTeam({
        sportId,
        name: name.trim(),
        ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : {}),
      });
      onCreated?.(team);
    } catch (err) {
      // team_name_taken is a field-level error on the name; everything else
      // (bad_request, not_found, …) lands in the generic banner via t.errors.
      if (err?.code === 'team_name_taken') setNameError(tt.nameTaken);
      else setError(apiErrorMessage(err, t));
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="relative w-full max-w-[440px] rounded-3xl border border-ink-100 bg-white p-6 shadow-2xl">
        <h3 className="font-display text-[19px] font-700 text-ink-900">{tt.createTitle}</h3>
        <p className="mt-1 text-[13.5px] text-ink-500">{tt.createSubtitle}</p>

        <div className="mt-5">
          <FieldLabel>{tt.sportLabel}</FieldLabel>
          <select
            value={sportId}
            onChange={(e) => setSportId(e.target.value)}
            disabled={sportsState !== 'ready'}
            className={inputCls + 'border-ink-100 disabled:text-ink-300'}>
            {sportsState === 'ready'
              ? sports.map((s) => <option key={s.id} value={s.id}>{sportLabel(s)}</option>)
              : <option>…</option>}
          </select>
          {sportsState === 'error' ? (
            <div className="mt-1.5 text-[12.5px] text-red-600">
              {tt.sportsLoadFailed}{' '}
              <button type="button" onClick={() => { setSportsState('loading'); loadSports(); }} className="font-600 text-accent hover:underline">
                {tt.retry}
              </button>
            </div>
          ) : (
            <div className="mt-1.5 text-[12.5px] text-ink-500">{tt.sportHelper}</div>
          )}
        </div>

        <div className="mt-4.5">
          <FieldLabel>{tt.nameLabel}</FieldLabel>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(''); }}
            placeholder={tt.namePlaceholder}
            autoFocus
            className={inputCls + (nameError ? 'border-red-500' : 'border-ink-100')}
          />
          {nameError && (
            <div className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-red-600">
              <svg viewBox="0 0 16 16" className="mt-px h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="8" cy="8" r="6.3" />
                <path d="M8 5.5v3.2M8 10.8v.1" strokeLinecap="round" />
              </svg>
              <span>{nameError}</span>
            </div>
          )}
        </div>

        <div className="mt-4.5">
          <FieldLabel hint={tt.logoOptional}>{tt.logoLabel}</FieldLabel>
          <div className="flex items-center gap-3">
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={tt.logoPlaceholder}
              className={inputCls + 'border-ink-100 flex-1'}
            />
            <LogoPreview key={logoUrl} url={logoUrl} name={name || tt.namePlaceholder} />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <Btn type="button" variant="outline" size="sm" onClick={onClose}>{tt.cancel}</Btn>
          <Btn type="submit" size="sm" disabled={pending || sportsState !== 'ready' || !sportId || !name.trim()}>
            {pending ? tt.creating : tt.createTeam}
          </Btn>
        </div>
        <p className="mt-3.5 text-[12px] leading-relaxed text-ink-500">{tt.captainNote}</p>
      </form>
    </div>
  );
}

export function MyTeamsSection({ onOpenTeam }) {
  const { t } = useLang();
  const tt = t.teams;

  const [state, setState] = useState('loading'); // loading | ready | error
  const [teams, setTeams] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);

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
        <Btn size="sm" onClick={() => setCreateOpen(true)}>
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
            <EmptyTeams onCreate={() => setCreateOpen(true)} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => <TeamCard key={team.id} team={team} onOpen={onOpenTeam} />)}
            </div>
          )
        )}
      </div>

      {createOpen && (
        <CreateTeamModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            // The 201 carries the team (incl. its one-time inviteToken); the
            // invite card on the team page re-fetches it via /invite, so here
            // we just refresh the list.
            setCreateOpen(false);
            setState('loading');
            load();
          }}
        />
      )}
    </section>
  );
}
