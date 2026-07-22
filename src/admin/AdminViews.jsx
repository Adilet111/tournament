/* Rally Admin — dashboard views. */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCities, cityLabel } from '../lib/cities';
import { useLang } from '../LangContext';
import { apiErrorMessage } from '../i18n';
import {
  createTournament, listSports, createSport,
  listAdminTournaments, getTournament, updateTournament, deleteTournament,
  listRegistrations, addRegistration, updateRegistration, deleteRegistration, getAdminUser,
  listRemovedRegistrations, markRemovedNotified, listTeamRegistrations,
  getBracket, generateBracket, deleteBracket, reportMatchResult, getUserStats, adjustUserRating,
} from '../lib/api';
import { roundLabel as roundLabelFor, winningSlot, buildFeedersByNext, nextPow2, placementInfo } from '../lib/bracketRounds';
import { owned, REGISTRATIONS, SPONSORS, PROMOTIONS } from './adminData';
import { Card, Btn, StatusDot, Avatar, Svg, Icon, fmt, Modal } from './AdminShell';

/* Tournament lifecycle state machine (mirrors ADMIN_LOGIC.md §2). */
const ALLOWED_TRANSITIONS = {
  draft: ['open', 'cancelled'],
  open: ['closed', 'cancelled'],
  closed: ['completed', 'open', 'cancelled'],
  completed: [],
  cancelled: [],
};
const STATUS_LABEL = { draft: 'Draft', open: 'Open', closed: 'Closed', completed: 'Completed', cancelled: 'Cancelled' };
const STATUS_FILTERS = ['all', 'draft', 'open', 'closed', 'completed', 'cancelled'];

const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('en-GB', opts) : '—';

/* ---- shared bits for the participant-format block (create + edit forms;
   DESIGN_PROMPTS.md §10, NEW.md §10) ---- */
function LockIcon({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

function TeamSizeStepper({ value, onChange, min = 2, disabled = false }) {
  const btn = 'grid h-[38px] w-[34px] place-items-center text-[16px] leading-none text-ink-700 hover:enabled:bg-ink-50 disabled:text-ink-300';
  return (
    <div className={'mt-1.5 inline-flex items-center overflow-hidden rounded-xl border border-ink-100 ' + (disabled ? 'bg-ink-50' : 'bg-white')}>
      <button type="button" className={btn} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span className={'grid h-[38px] w-[44px] place-items-center border-x border-ink-100 font-mono text-[14.5px] ' + (disabled ? 'text-ink-300' : 'text-ink-900')}>{value}</span>
      <button type="button" className={btn} disabled={disabled} onClick={() => onChange(value + 1)}>+</button>
    </div>
  );
}

/* ============================================================ OVERVIEW === */
function StatCard({ label, value, sub, accent }) {
  return (
    <Card className="p-5">
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-300">{label}</div>
      <div className={'font-display mt-2 text-[30px] font-700 tracking-[-0.02em] ' + (accent ? 'text-accent' : 'text-ink-900')}>{value}</div>
      {sub && <div className="mt-1 text-[13px] text-ink-500">{sub}</div>}
    </Card>
  );
}

function MiniBars({ data, titleFn }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="flex items-end gap-2.5" style={{ height: 120 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-accent/85 transition-all hover:bg-accent"
              style={{ height: Math.max(6, (d.v / max) * 100) + '%' }} title={titleFn ? titleFn(d.v) : d.v} />
          </div>
          <span className="font-mono text-[10.5px] text-ink-400">{d.k}</span>
        </div>
      ))}
    </div>
  );
}

export function Overview({ setView }) {
  const { t } = useLang();
  const o = t.admin.overview;
  const totalReg = owned.reduce((s, c) => s + c.registered, 0);
  const totalRev = owned.reduce((s, c) => s + c.revenue, 0);
  const live = owned.filter((c) => c.status === 'live').length;
  const pendingSponsors = SPONSORS.filter((s) => s.status === 'pending').length;
  const vals = [18, 24, 31, 22, 38, 52, 41];
  const weekData = t.admin.weekDays.map((k, i) => ({ k, v: vals[i] }));
  const recent = REGISTRATIONS.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={o.totalReg} value={totalReg} sub={o.totalRegSubFn(owned.length)} />
        <StatCard label={o.revenue} value={fmt(totalRev)} sub={o.revenueSub} accent />
        <StatCard label={o.liveEvents} value={live} sub={o.liveEventsSubFn(owned.length)} />
        <StatCard label={o.sponsorRequests} value={pendingSponsors} sub={o.sponsorRequestsSub} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-[17px] font-700 text-ink-900">{o.weekTitle}</h3>
              <p className="mt-0.5 text-[13px] text-ink-500">{o.weekSub}</p>
            </div>
            <Btn variant="ghost" size="sm" onClick={() => setView('registrations')}>{o.viewAll} <Svg d={Icon.arrow} className="h-4 w-4" /></Btn>
          </div>
          <div className="mt-6"><MiniBars data={weekData} titleFn={o.barsTitleFn} /></div>
        </Card>

        <Card className="p-6">
          <h3 className="font-display text-[17px] font-700 text-ink-900">{o.capacity}</h3>
          <p className="mt-0.5 text-[13px] text-ink-500">{o.capacitySub}</p>
          <div className="mt-5 space-y-4">
            {owned.slice(0, 4).map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="truncate font-500 text-ink-900">{c.title}</span>
                  <span className="ml-2 shrink-0 font-mono text-ink-500">{c.registered}/{c.capacity}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-50">
                  <div className="h-full rounded-full bg-accent" style={{ width: c.fill + '%' }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-display text-[17px] font-700 text-ink-900">{o.recent}</h3>
          <Btn variant="ghost" size="sm" onClick={() => setView('registrations')}>{o.seeAll}</Btn>
        </div>
        <div className="divide-y divide-ink-100 border-t border-ink-100">
          {recent.map((r) => (
            <div key={r.id} className="flex items-center gap-4 px-6 py-3.5">
              <Avatar name={r.name} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-600 text-ink-900">{r.name}</div>
                <div className="truncate text-[13px] text-ink-500">{r.compTitle}</div>
              </div>
              <span className="hidden text-[13px] text-ink-500 sm:block">{t.data.categories[r.category] ?? r.category}</span>
              <span className={'hidden rounded-full px-2.5 py-1 text-[12px] font-600 sm:inline-block ' + (r.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                {r.paid ? o.paid : o.pending}
              </span>
              <span className="w-16 text-right font-mono text-[12px] text-ink-400">{r.ago}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ======================================================== COMPETITIONS ===
   Backed by GET /admin/tournaments (every status). "Manage" opens the lifecycle
   / edit / delete panel. */
export function Competitions({ setView }) {
  const { t, lang } = useLang();
  const c0 = t.admin.competitions;
  const cities = useCities();
  const [filter, setFilter] = useState('all');
  const [tournaments, setTournaments] = useState([]);
  const [sportsMap, setSportsMap] = useState({});
  const [sportSlugMap, setSportSlugMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [managing, setManaging] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAdminTournaments(filter === 'all' ? undefined : filter), listSports()])
      .then(([ts, ss]) => {
        if (cancelled) return;
        const sportsList = Array.isArray(ss) ? ss : [];
        setSportsMap(Object.fromEntries(sportsList.map((s) => [s.id, s.name])));
        setSportSlugMap(Object.fromEntries(sportsList.map((s) => [s.id, s.slug || String(s.name || '').toLowerCase()])));
        setTournaments(Array.isArray(ts) ? ts : []);
        setFetchError(null);
      })
      .catch((e) => { if (!cancelled) setFetchError(apiErrorMessage(e, t)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [filter, reloadKey, t]);

  const reload = () => setReloadKey((k) => k + 1);

  const rows = tournaments.map((tr) => {
    const registered = tr.registeredCount ?? tr.occupiedPlaces ?? tr.registered ?? null;
    const capacity = tr.capacity ?? null;
    const freePlaces = tr.freePlaces ?? (capacity != null && registered != null ? Math.max(0, capacity - registered) : null);
    return {
      raw: tr,
      id: tr.id,
      title: tr.title,
      sport: sportsMap[tr.sportId] || tr.sportId,
      location: tr.city || tr.location || '—',
      date: fmtDate(tr.startsAt),
      status: tr.status,
      capacity,
      registered,
      freePlaces,
      fill: registered != null && capacity ? Math.round((registered / capacity) * 100) : null,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((id) => (
            <button key={id} onClick={() => setFilter(id)}
              className={'rounded-full border px-3.5 py-1.5 text-[13.5px] font-600 capitalize transition-all ' +
                (filter === id ? 'border-accent bg-accent text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-ink-300')}>
              {id === 'all' ? c0.filterAll : (t.admin.status[id] || STATUS_LABEL[id])}
            </button>
          ))}
        </div>
        <Btn variant="dark" size="md" onClick={() => setView('create')}><Svg d={Icon.plus} className="h-4 w-4" /> {t.admin.newCompetition}</Btn>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[2.4fr_1fr_1.4fr_auto] gap-4 border-b border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 md:grid">
          <span>{c0.thCompetition}</span><span>{c0.thStatus}</span><span>{c0.thCapacity}</span><span></span>
        </div>
        <div className="divide-y divide-ink-100">
          {loading && <div className="px-6 py-5 text-[14px] text-ink-400">{t.admin.common.loading}</div>}
          {fetchError && <div className="px-6 py-5 text-[13.5px] text-red-500">{fetchError}</div>}
          {!loading && !fetchError && rows.length === 0 && <div className="px-6 py-5 text-[14px] text-ink-400">{c0.empty}</div>}
          {rows.map((c) => (
            <div key={c.id} className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[2.4fr_1fr_1.4fr_auto] md:items-center md:gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-50 font-mono text-[11px] font-600 uppercase text-ink-500">{(t.data.sports[c.sport] ?? c.sport ?? '???').slice(0, 3)}</span>
                <div className="min-w-0">
                  <div className="font-600 text-[15px] text-ink-900">{c.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-500">{cityLabel(cities, c.location, lang) || '—'} · {c.date}</div>
                </div>
              </div>
              <div><StatusDot status={c.status} /></div>
              <div>
                <div className="flex items-center justify-between text-[12.5px] text-ink-500">
                  <span className="font-mono">{c.registered != null ? c.registered : '—'}/{c.capacity ?? '∞'}</span>
                  <span>{c.fill != null ? c.fill + '%' : '—'}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-50 md:w-32">
                  <div className="h-full rounded-full bg-accent" style={{ width: (c.fill ?? 0) + '%' }} />
                </div>
                {c.freePlaces != null && <div className="mt-1 text-[11.5px] text-emerald-600">{c0.freePlacesFn(c.freePlaces)}</div>}
              </div>
              <div className="flex gap-2">
                <Btn variant="outline" size="sm" onClick={() => setManaging(c.raw)}>{c0.manage}</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {managing && (
        <ManageTournament
          tournament={managing}
          onOpenQueue={() => setView('notifications')}
          sportName={sportsMap[managing.sportId] || managing.sportId}
          sportSlug={sportSlugMap[managing.sportId] || ''}
          onClose={() => setManaging(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

/* ============================================================= BRACKET ===
   Bracket panel, admin tournament page (POST/DELETE /tournaments/:id/bracket,
   POST /matches/:id/result). See DESIGN_PROMPTS.md §12, NEW.md §14-17.
   Embedded inside ManageTournament below. */
function InfoIcon({ className }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 7.2v3.8M8 5.2v.1" strokeLinecap="round" />
    </svg>
  );
}

function MiniConnector() {
  return <span className="pointer-events-none absolute -right-9 top-1/2 h-px w-9 bg-ink-100" />;
}

function MiniMatchCard({ match, entryById, feedersByNext, roundLabel, isFinal, reportLabel, onOpen }) {
  if (match.status === 'walkover') {
    const p = match.participants[0];
    const entry = p && entryById.get(p.entryId);
    return (
      <div className="relative">
        <div className="flex items-center gap-1.5 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-2 text-[12px]">
          <span className="w-2.5 shrink-0 font-mono text-[10px] text-ink-300">{entry?.seed ?? ''}</span>
          <span className="flex-1 truncate font-600 text-ink-900">{p?.displayName ?? entry?.displayName ?? '—'}</span>
        </div>
        {!isFinal && <MiniConnector />}
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
    const name = feeder ? `${roundLabel(feeder.round)} ${feeder.position + 1}` : '—';
    return { seed: null, name, score: null, isWinner: false, isLoser: false, placeholder: true };
  });

  const canReport = match.status === 'pending' && match.participants.length === 2;
  const isCompleted = match.status === 'completed';

  return (
    <div className="group relative">
      <div
        onClick={isCompleted ? onOpen : undefined}
        className={'relative overflow-hidden rounded-lg border border-ink-100 bg-white ' + (isCompleted ? 'cursor-pointer transition-colors hover:border-ink-300' : '')}>
        {slots.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 border-b border-ink-50 px-2.5 py-1.5 text-[12px] last:border-b-0">
            <span className="w-2.5 shrink-0 font-mono text-[10px] text-ink-300">{s.seed ?? ''}</span>
            <span className={'flex-1 truncate ' + (s.placeholder ? 'italic text-ink-300' : s.isWinner ? 'font-600 text-ink-900' : s.isLoser ? 'text-ink-300' : 'text-ink-700')}>
              {s.name}
            </span>
            <span className={'shrink-0 font-mono text-[11.5px] ' + (s.isWinner ? 'font-700 text-accent' : 'text-ink-300')}>
              {s.score ?? (s.placeholder ? '' : '–')}
            </span>
          </div>
        ))}
        {canReport && (
          <button
            onClick={onOpen}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-accent px-2.5 py-1 text-[10.5px] font-700 text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            {reportLabel}
          </button>
        )}
      </div>
      {!isFinal && <MiniConnector />}
    </div>
  );
}

function initials(name) {
  return (name || '')
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function TrophyBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 4h12v3a6 6 0 0 1-12 0V4z" />
      <path d="M12 13v3M9 20h6" strokeLinecap="round" />
    </svg>
  );
}

/* Clickable participant card for the interactive report form — clicking
   marks it the winner (accent border/bg + "Winner" pill), per DESIGN_PROMPTS
   §13. Score is entered in a separate input below (see ReportResultModal). */
function ParticipantPickCard({ name, seedLabel, selected, winnerLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ' +
        (selected ? 'border-accent bg-[var(--accent-soft)]' : 'border-ink-100 hover:border-ink-300')
      }>
      <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] font-mono text-[12px] font-700 ' + (selected ? 'bg-white text-accent' : 'bg-ink-50 text-ink-700')}>
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-600 text-ink-900">{name}</div>
        <div className="text-[12px] text-ink-500">{seedLabel}</div>
      </div>
      {selected && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-700 text-white">
          <TrophyBadgeIcon /> {winnerLabel}
        </span>
      )}
    </button>
  );
}

/* Static participant card for the read-only completed-match view — same
   visual language, no interaction, final score shown inline. */
function ParticipantResultCard({ name, seedLabel, isWinner, score, winnerLabel, onClick }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left ' +
        (isWinner ? 'border-accent bg-[var(--accent-soft)]' : 'border-ink-100') +
        (onClick ? ' cursor-pointer transition-colors hover:border-ink-300' : '')}>
      <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-[10px] font-mono text-[12px] font-700 ' + (isWinner ? 'bg-white text-accent' : 'bg-ink-50 text-ink-300')}>
        {initials(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className={'truncate text-[14.5px] font-600 ' + (isWinner ? 'text-ink-900' : 'text-ink-300')}>{name}</div>
        <div className={'text-[12px] ' + (isWinner ? 'text-ink-500' : 'text-ink-300')}>{seedLabel}</div>
      </div>
      {isWinner && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-700 text-white">
          <TrophyBadgeIcon /> {winnerLabel}
        </span>
      )}
      <span className={'shrink-0 font-mono text-[18px] font-600 ' + (isWinner ? 'text-accent' : 'ml-auto text-ink-300')}>
        {score ?? '–'}
      </span>
    </Comp>
  );
}

function VsDivider({ label }) {
  return (
    <div className="my-2.5 flex items-center gap-3 text-[12px] font-700 text-ink-300">
      <span className="h-px flex-1 bg-ink-50" />
      {label}
      <span className="h-px flex-1 bg-ink-50" />
    </div>
  );
}

/* Rating-adjust panel (POST /admin/users/:id/sports/:sport/rating/adjust) —
   embedded inside UserDetail's profile tab when opened with a sport in
   context (e.g. from a bracket match). `delta` is signed: positive awards
   points, negative deducts them; quick-pick buttons are just a convenience,
   the number field takes any integer. */
function AdjustRatingPanel({ userId, sportSlug }) {
  const { t } = useLang();
  const bp = t.admin.bracket;
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [applied, setApplied] = useState(null); // last-applied delta, or null

  const apply = async (amount) => {
    const n = Number(amount);
    if (!n || busy) return;
    setBusy(true);
    setError(null);
    try {
      await adjustUserRating(userId, sportSlug, n);
      setApplied(n);
      setDelta('');
    } catch (e) {
      setError(apiErrorMessage(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-accent/25 bg-[var(--accent-soft)] p-4">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-500">
        {bp.adjustRating} · {t.data.sports[sportSlug] ?? sportSlug}
      </span>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn variant="outline" size="sm" disabled={busy} onClick={() => apply(10)}>+10</Btn>
        <Btn variant="outline" size="sm" disabled={busy} onClick={() => apply(25)}>+25</Btn>
        <Btn variant="outline" size="sm" disabled={busy} onClick={() => apply(-10)}>−10</Btn>
        <Btn variant="outline" size="sm" disabled={busy} onClick={() => apply(-25)}>−25</Btn>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder={bp.adjustCustomPlaceholder}
          className="w-24 rounded-xl border border-ink-200 bg-white px-3 py-2 text-center font-mono text-[14px] text-ink-900 outline-none focus:border-accent" />
        <Btn variant="primary" size="sm" disabled={!delta || busy} onClick={() => apply(delta)}>
          {busy ? bp.adjustApplying : bp.adjustApply}
        </Btn>
      </div>

      {error && <p className="mt-2.5 text-[13px] text-red-600">{error}</p>}
      {applied != null && (
        <p className="mt-2.5 text-[13px] font-600 text-emerald-700">{bp.adjustAppliedFn(applied)}</p>
      )}
    </section>
  );
}

/* Report or review a match's result (~440px modal), per DESIGN_PROMPTS §13.
   Interactive form for a pending match with both sides known (opened via
   MiniMatchCard's hover "Report result" button); read-only display for an
   already-completed match (opened by clicking the mini card itself) — results
   are immutable once reported (NEW.md §17), so there's nothing to edit. */
function ReportResultModal({ match, roundLabel, entryById, regUserMap, sportSlug, onClose, onReported }) {
  const { t, lang } = useLang();
  const bp = t.admin.bracket;
  const isCompleted = match.status === 'completed';

  const [winnerSlot, setWinnerSlot] = useState(null);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [viewUser, setViewUser] = useState(null); // userId | null

  const p1 = match.participants.find((p) => p.slot === 1);
  const p2 = match.participants.find((p) => p.slot === 2);
  const e1 = p1 && entryById.get(p1.entryId);
  const e2 = p2 && entryById.get(p2.entryId);
  const name1 = p1?.displayName ?? e1?.displayName ?? '—';
  const name2 = p2?.displayName ?? e2?.displayName ?? '—';
  const seedLabel1 = e1?.seed != null ? bp.seedFn(e1.seed) : '';
  const seedLabel2 = e2?.seed != null ? bp.seedFn(e2.seed) : '';
  // Bracket entries only carry a registrationId, not a userId directly —
  // resolve it through the tournament's registrations list (regUserMap).
  const userId1 = regUserMap?.get(e1?.registrationId) ?? p1?.userId ?? null;
  const userId2 = regUserMap?.get(e2?.registrationId) ?? p2?.userId ?? null;

  const submit = async () => {
    if (!winnerSlot || busy) return;
    setBusy(true);
    setError(null);
    try {
      await reportMatchResult(match.id, {
        winnerSlot,
        score1: score1 === '' ? undefined : Number(score1),
        score2: score2 === '' ? undefined : Number(score2),
      });
      onReported();
    } catch (e) {
      setError(apiErrorMessage(e, t));
      setBusy(false);
    }
  };

  if (isCompleted) {
    const winner = winningSlot(match);
    const playedDate = match.playedAt
      ? new Date(match.playedAt).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <Modal title={bp.resultTitleFn(roundLabel)} onClose={onClose} maxW="max-w-md">
        {playedDate && (
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-700 text-emerald-700">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8.5l3 3 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {bp.completedFn(playedDate)}
          </span>
        )}
        <ParticipantResultCard name={name1} seedLabel={seedLabel1} isWinner={winner === 1} score={p1?.score} winnerLabel={bp.winnerPill}
          onClick={userId1 ? () => setViewUser(userId1) : undefined} />
        <VsDivider label={bp.vsWord} />
        <ParticipantResultCard name={name2} seedLabel={seedLabel2} isWinner={winner === 2} score={p2?.score} winnerLabel={bp.winnerPill}
          onClick={userId2 ? () => setViewUser(userId2) : undefined} />

        {viewUser && <UserDetail userId={viewUser} sportSlug={sportSlug} onClose={() => setViewUser(null)} />}
      </Modal>
    );
  }

  return (
    <Modal title={bp.reportTitleFn(roundLabel)} onClose={onClose} maxW="max-w-md">
      <ParticipantPickCard name={name1} seedLabel={seedLabel1} selected={winnerSlot === 1} winnerLabel={bp.winnerPill} onClick={() => setWinnerSlot(1)} />
      <div className="mt-2 flex items-center gap-2.5">
        <input type="number" value={score1} onChange={(e) => setScore1(e.target.value)} placeholder="–"
          className="w-14 shrink-0 rounded-[10px] border border-ink-100 py-1.5 text-center font-mono text-[14px] text-ink-900 outline-none focus:border-accent" />
        <span className="text-[12px] text-ink-500">{bp.scoresOptional}</span>
      </div>

      <VsDivider label={bp.vsWord} />

      <ParticipantPickCard name={name2} seedLabel={seedLabel2} selected={winnerSlot === 2} winnerLabel={bp.winnerPill} onClick={() => setWinnerSlot(2)} />
      <div className="mt-2">
        <input type="number" value={score2} onChange={(e) => setScore2(e.target.value)} placeholder="–"
          className="w-14 shrink-0 rounded-[10px] border border-ink-100 py-1.5 text-center font-mono text-[14px] text-ink-900 outline-none focus:border-accent" />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-500">
        <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {bp.finalNote}
      </div>

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

      <div className="mt-5 flex justify-end gap-2.5">
        <Btn variant="outline" size="sm" onClick={onClose}>{t.admin.common.cancel}</Btn>
        <Btn variant="primary" size="sm" disabled={!winnerSlot || busy} onClick={submit}>
          {busy ? bp.reporting : bp.confirmResult}
        </Btn>
      </div>
    </Modal>
  );
}

/* Bracket panel embedded in ManageTournament. Pre-generation it explains the
   flow and (once closed) previews the size/rounds/byes the current
   registration count would produce; once generated it shows the stats chips,
   a compact bracket preview, and delete (locked once any match is played). */
function BracketPanel({ tournamentId, status, registered, isTeam, sportSlug, t }) {
  const bp = t.admin.bracket;
  const bt = t.bracket;
  const [state, setState] = useState('loading'); // loading | ready | error
  const [bracket, setBracket] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reportMatch, setReportMatch] = useState(null); // { match, roundLabel } | null

  useEffect(() => {
    let cancelled = false;
    // Bracket entries only carry a registrationId, not a userId — fetch the
    // tournament's registrations alongside so completed-match cards can
    // resolve a participant to their account (registrationId -> userId).
    Promise.all([getBracket(tournamentId), listRegistrations(tournamentId)])
      .then(([b, regs]) => {
        if (cancelled) return;
        setBracket(b);
        setRegistrations(Array.isArray(regs) ? regs : []);
        setState('ready');
      })
      .catch((e) => { if (!cancelled) { setError(apiErrorMessage(e, t)); setState('error'); } });
    return () => { cancelled = true; };
  }, [tournamentId, reloadKey, t]);

  const reload = () => setReloadKey((k) => k + 1);

  const rounds = useMemo(() => [...(bracket?.rounds || [])].sort((a, b) => a.round - b.round), [bracket]);
  const entries = useMemo(() => bracket?.entries || [], [bracket]);
  const entryById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  // registrationId (bracket entry) -> userId, via the tournament's own
  // registrations list. Defensive on the registration row's own id field.
  const regUserMap = useMemo(() => {
    const m = new Map();
    for (const r of registrations) {
      const key = r.registrationId ?? r.id;
      if (key != null) m.set(key, r.userId);
    }
    return m;
  }, [registrations]);
  const totalRounds = rounds.length;
  const label = useCallback((r) => roundLabelFor(r, totalRounds, bt), [totalRounds, bt]);
  const feedersByNext = useMemo(() => buildFeedersByNext(rounds), [rounds]);
  const hasCompletedMatch = rounds.some((r) => r.matches.some((m) => m.status === 'completed'));
  const firstRoundCount = rounds[0]?.matches.length || 0;
  const bracketSize = firstRoundCount * 2;
  const walkovers = rounds.reduce((sum, r) => sum + r.matches.filter((m) => m.status === 'walkover').length, 0);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try { await generateBracket(tournamentId); reload(); }
    catch (e) { setError(apiErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const removeBracket = async () => {
    if (busy || hasCompletedMatch) return;
    if (!window.confirm(bp.deleteConfirm)) return;
    setBusy(true);
    setError(null);
    try { await deleteBracket(tournamentId); reload(); }
    catch (e) { setError(apiErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const previewSize = nextPow2(Math.max(registered, 2));
  const previewRounds = Math.log2(previewSize);
  const previewByes = previewSize - registered;

  return (
    <section className="border-t border-ink-100 pt-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{bp.title}</span>
        {bracket?.generated && (
          <div className="group relative">
            <button
              disabled={busy || hasCompletedMatch}
              onClick={removeBracket}
              className="text-[13px] font-600 text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-ink-300 disabled:no-underline">
              {bp.deleteBracket}
            </button>
            {hasCompletedMatch && (
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-[190px] rounded-xl bg-ink-900 px-3 py-2 text-[12px] font-500 leading-snug text-white shadow-lg group-hover:block">
                {bp.deleteLockedTooltip}
              </div>
            )}
          </div>
        )}
      </div>

      {state === 'loading' && <p className="mt-2 text-[13px] text-ink-400">{t.admin.common.loading}</p>}
      {state === 'error' && (
        <div className="mt-2 text-[13px] text-red-600">
          {bp.loadFailed}{' '}
          <button onClick={reload} className="font-600 underline">{bp.retry}</button>
        </div>
      )}

      {state === 'ready' && !bracket.generated && (
        <div className="mt-2">
          <p className="max-w-md text-[13.5px] leading-relaxed text-ink-500">{bp.explanation}</p>
          {status === 'closed' && registered >= 2 && (
            <div className="mt-3 max-w-md rounded-xl border border-accent/25 bg-[var(--accent-soft)] px-3.5 py-2.5 text-[13px] text-ink-700">
              {bp.summaryFn(registered, isTeam, previewSize, previewRounds, previewByes)}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <Btn variant="primary" size="sm" disabled={status !== 'closed' || registered < 2 || busy} onClick={generate}>
              {busy ? bp.generating : bp.generate}
            </Btn>
            {status !== 'closed' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-50 px-3 py-1.5 text-[12px] font-600 text-ink-500">
                <LockIcon className="h-2.5 w-2.5" /> {bp.requiresClosed}
              </span>
            )}
          </div>
        </div>
      )}

      {state === 'ready' && bracket.generated && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-ink-50 px-3 py-1.5 text-[12px] font-600 text-ink-700">{bp.statBracketSize} <b className="font-mono font-600 text-ink-900">{bracketSize}</b></span>
            <span className="rounded-full bg-ink-50 px-3 py-1.5 text-[12px] font-600 text-ink-700">{bp.statRounds} <b className="font-mono font-600 text-ink-900">{totalRounds}</b></span>
            <span className="rounded-full bg-ink-50 px-3 py-1.5 text-[12px] font-600 text-ink-700">{bp.statEntries} <b className="font-mono font-600 text-ink-900">{entries.length}</b></span>
            <span className="rounded-full bg-ink-50 px-3 py-1.5 text-[12px] font-600 text-ink-700">{bp.statWalkovers} <b className="font-mono font-600 text-ink-900">{walkovers}</b></span>
          </div>

          <div className="mt-4 overflow-x-auto pb-2">
            <div className="flex gap-9" style={{ minHeight: firstRoundCount * 72 }}>
              {rounds.map((round) => (
                <div key={round.round} className="flex w-[190px] shrink-0 flex-col">
                  <div className="mb-2 font-mono text-[10.5px] font-700 uppercase tracking-wide text-ink-500">{label(round.round)}</div>
                  <div className="flex flex-1 flex-col justify-around gap-2">
                    {round.matches.map((m) => (
                      <MiniMatchCard
                        key={m.id}
                        match={m}
                        entryById={entryById}
                        feedersByNext={feedersByNext}
                        roundLabel={label}
                        isFinal={!m.nextMatchId}
                        reportLabel={bp.reportResult}
                        onOpen={() => setReportMatch({ match: m, roundLabel: label(m.round) })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}

      {reportMatch && (
        <ReportResultModal
          match={reportMatch.match}
          roundLabel={reportMatch.roundLabel}
          entryById={entryById}
          regUserMap={regUserMap}
          sportSlug={sportSlug}
          onClose={() => setReportMatch(null)}
          onReported={() => { setReportMatch(null); reload(); }}
        />
      )}
    </section>
  );
}

/* ---- manage one tournament: edit fields, move status, delete ---- */
function ManageTournament({ tournament, sportName, sportSlug, onClose, onChanged, onOpenQueue }) {
  const { t, lang } = useLang();
  const m = t.admin.manage;
  const statusLabel = (s) => t.admin.status[s] || STATUS_LABEL[s] || s;
  const cities = useCities();
  const [detail, setDetail] = useState(tournament);
  const [form, setForm] = useState({
    title: tournament.title ?? '',
    capacity: tournament.capacity ?? '',
    teamSize: tournament.teamSize ?? 2,
    entryFee: tournament.entryFee ?? '',
    minRating: tournament.minRating ?? '',
    maxRating: tournament.maxRating ?? '',
    minAge: tournament.minAge ?? '',
    maxAge: tournament.maxAge ?? '',
    city: tournament.city ?? '',
    startsAt: tournament.startsAt ? tournament.startsAt.slice(0, 10) : '',
    description: tournament.description ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  // Players auto-removed by the last save (tightened age gates) — from the
  // PATCH response's `removed` array.
  const [removed, setRemoved] = useState([]);

  // Pull live detail for an accurate registeredCount (drives the delete gate).
  useEffect(() => {
    let cancelled = false;
    getTournament(tournament.id).then((d) => { if (!cancelled && d) setDetail(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [tournament.id]);

  const status = detail.status;
  const registered = detail.registeredCount ?? detail.occupiedPlaces ?? detail.registered ?? 0;
  // Prefer the backend's freePlaces; fall back to capacity − registered.
  const freePlaces = detail.freePlaces ?? (detail.capacity != null ? Math.max(0, detail.capacity - registered) : null);
  const nextStatuses = ALLOWED_TRANSITIONS[status] || [];
  // participantType is immutable; teamSize is patchable only until a team
  // registers — capacity/occupiedPlaces count teams on team tournaments, so
  // `registered > 0` here means "teams already registered" (NEW.md §10).
  const isTeam = detail.participantType === 'team';
  const teamSizeLocked = registered > 0;

  const num = (v) => (v === '' || v == null ? null : Number(v));

  // Backend rejects min > max (rating or age) with a 400 — block the save here.
  const gatesOk =
    (num(form.minRating) == null || num(form.maxRating) == null || num(form.minRating) <= num(form.maxRating)) &&
    (num(form.minAge) == null || num(form.maxAge) == null || num(form.minAge) <= num(form.maxAge));

  const saveFields = async () => {
    if (!gatesOk) return;
    const patch = {};
    if (form.title.trim() !== (detail.title ?? '')) patch.title = form.title.trim();
    if (num(form.capacity) !== (detail.capacity ?? null)) patch.capacity = num(form.capacity);
    if (isTeam && !teamSizeLocked && Number(form.teamSize) !== (detail.teamSize ?? null)) patch.teamSize = Number(form.teamSize);
    const fee = form.entryFee === '' ? 0 : Number(form.entryFee);
    if (fee !== (detail.entryFee ?? 0)) patch.entryFee = fee;
    if (num(form.minRating) !== (detail.minRating ?? null)) patch.minRating = num(form.minRating);
    if (num(form.maxRating) !== (detail.maxRating ?? null)) patch.maxRating = num(form.maxRating);
    if (num(form.minAge) !== (detail.minAge ?? null)) patch.minAge = num(form.minAge);
    if (num(form.maxAge) !== (detail.maxAge ?? null)) patch.maxAge = num(form.maxAge);
    if (form.city && form.city !== (detail.city ?? '')) patch.city = form.city;
    const iso = form.startsAt ? new Date(form.startsAt).toISOString() : null;
    if ((iso?.slice(0, 10) ?? null) !== (detail.startsAt ? detail.startsAt.slice(0, 10) : null)) patch.startsAt = iso;
    if (form.description !== (detail.description ?? '')) patch.description = form.description;

    if (!Object.keys(patch).length) { setNotice(m.noChanges); setError(null); return; }
    setBusy(true); setError(null); setNotice(null); setRemoved([]);
    try {
      const updated = await updateTournament(tournament.id, patch);
      // Tightened age gates auto-remove non-qualifying players; the response
      // lists them in `removed` — surface it, don't merge it into the detail.
      const { removed: removedRows, ...rest } = updated || {};
      setDetail((d) => ({ ...d, ...(Object.keys(rest).length ? rest : patch) }));
      if (Array.isArray(removedRows) && removedRows.length) setRemoved(removedRows);
      else setNotice(m.saved);
      onChanged?.();
    } catch (e) { setError(apiErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const move = async (next) => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const updated = await updateTournament(tournament.id, { status: next });
      setDetail((d) => ({ ...d, ...(updated || {}), status: next }));
      setNotice(m.statusChangedFn(statusLabel(next)));
      onChanged?.();
    } catch (e) { setError(apiErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (registered > 0) return;
    if (!window.confirm(m.deleteConfirm)) return;
    setBusy(true); setError(null);
    try {
      await deleteTournament(tournament.id);
      onChanged?.();
      onClose();
    } catch (e) { setError(apiErrorMessage(e, t)); setBusy(false); }
  };

  const field = 'mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300';
  const lbl = 'font-mono text-[11px] uppercase tracking-wide text-ink-300';

  return (
    <Modal title={detail.title || m.fallbackTitle} sub={`${sportName ?? ''} · ${m.registeredFn(registered)}`} onClose={onClose}>
      <div className="space-y-6">
        {/* free places available */}
        {freePlaces != null && (
          <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-3.5 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{m.freePlacesLbl}</span>
            <span className="ml-auto font-display text-[18px] font-700 text-ink-900">{freePlaces}{detail.capacity != null ? <span className="ml-1 font-sans text-[12px] font-400 text-ink-400">/ {detail.capacity}</span> : null}</span>
          </div>
        )}

        {/* lifecycle */}
        <section>
          <div className="flex items-center justify-between">
            <span className={lbl}>{m.statusLbl}</span>
            <StatusDot status={status} />
          </div>
          {nextStatuses.length ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Btn key={s} variant={s === 'cancelled' ? 'outline' : 'dark'} size="sm" disabled={busy} onClick={() => move(s)}>
                  {s === 'open' && status === 'closed' ? m.reopen : statusLabel(s)}
                </Btn>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[13px] text-ink-400">{m.terminal}</p>
          )}
        </section>

        {/* editable fields */}
        <section className="space-y-4 border-t border-ink-100 pt-5">
          <div>
            <span className={lbl}>{m.titleLbl}</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={field} />
          </div>

          {/* participant format — locked (immutable after creation, NEW.md §10) */}
          <div className="flex flex-wrap items-start gap-8">
            <div>
              <span className={lbl}>{m.formatLbl}</span>
              <div className="group relative mt-1.5 inline-block">
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-[var(--accent-soft)] px-4 py-2 text-[13.5px] font-700 text-accent">
                  <LockIcon className="h-3.5 w-3.5" />
                  {isTeam ? t.card.teamBadgeFn(detail.teamSize) : t.admin.create.formatSolo}
                </span>
                <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-[140px] rounded-xl bg-ink-900 px-3 py-2 text-[12px] font-500 leading-snug text-white shadow-lg group-hover:block">
                  {m.formatLockedTooltip}
                </div>
              </div>
            </div>
            {isTeam && (
              <div>
                <span className={lbl}>{m.teamSizeLbl}</span>
                <TeamSizeStepper value={Number(form.teamSize)} min={2} disabled={teamSizeLocked} onChange={(v) => setForm({ ...form, teamSize: v })} />
                <p className={'mt-1.5 max-w-[160px] text-[12.5px] leading-snug ' + (teamSizeLocked ? 'text-amber-700' : 'text-ink-500')}>
                  {teamSizeLocked ? m.teamSizeLockedNote : m.teamSizeHelper}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={lbl}>{isTeam ? m.capacityTeamsLbl : m.capacityPlayersLbl}</span>
              <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="∞" className={field} />
              <p className="mt-1.5 text-[12.5px] leading-snug text-ink-500">{isTeam ? m.capacityTeamsHelper : m.capacityPlayersHelper}</p>
            </div>
            <div>
              <span className={lbl}>{m.entryFeeLbl}</span>
              <input type="number" value={form.entryFee} onChange={(e) => setForm({ ...form, entryFee: e.target.value })} placeholder="0" className={field} />
            </div>
            <div>
              <span className={lbl}>{m.minRatingLbl}</span>
              <input type="number" value={form.minRating} onChange={(e) => setForm({ ...form, minRating: e.target.value })} placeholder={m.nonePlaceholder} className={field} />
            </div>
            <div>
              <span className={lbl}>{m.maxRatingLbl}</span>
              <input type="number" value={form.maxRating} onChange={(e) => setForm({ ...form, maxRating: e.target.value })} placeholder={m.nonePlaceholder} className={field} />
            </div>
            <div>
              <span className={lbl}>{m.minAgeLbl}</span>
              <input type="number" min="0" value={form.minAge} onChange={(e) => setForm({ ...form, minAge: e.target.value })} placeholder={m.nonePlaceholder} className={field} />
            </div>
            <div>
              <span className={lbl}>{m.maxAgeLbl}</span>
              <input type="number" min="0" value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: e.target.value })} placeholder={m.nonePlaceholder} className={field} />
            </div>
            {!gatesOk && (
              <p className="col-span-2 text-[12.5px] font-500 text-red-500">{t.admin.create.gatesError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={lbl}>{m.cityLbl}</span>
              <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={field}>
                {form.city && !cities.some((c) => c.slug === form.city) && <option value={form.city}>{form.city}</option>}
                {cities.map((c) => <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.ru : c.en}</option>)}
              </select>
            </div>
            <div>
              <span className={lbl}>{m.startsLbl}</span>
              <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={field} />
            </div>
          </div>
          <div>
            <span className={lbl}>{m.descriptionLbl}</span>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} />
          </div>
          <Btn variant="primary" size="md" disabled={busy || !gatesOk} onClick={saveFields}>{busy ? m.saving : m.saveChanges}</Btn>
        </section>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13.5px] text-emerald-700">{notice}</div>}
        {removed.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[13.5px] font-600 text-amber-800">{m.removedFn(removed.length)}</p>
            <ul className="mt-1.5 space-y-0.5 text-[12.5px] text-amber-700">
              {removed.map((p) => (
                <li key={p.userId}>{p.name || p.email}{p.age != null ? ` · ${p.age}` : ''} — {t.admin.removedQ.reasons[p.reason] ?? p.reason}</li>
              ))}
            </ul>
            <button onClick={() => { onClose(); onOpenQueue?.(); }}
              className="mt-2.5 text-[13px] font-600 text-amber-900 underline-offset-2 hover:underline">
              {m.openQueue}
            </button>
          </div>
        )}

        <BracketPanel tournamentId={tournament.id} status={status} registered={registered} isTeam={isTeam} sportSlug={sportSlug} t={t} />

        {/* danger zone */}
        <section className="border-t border-ink-100 pt-5">
          <span className={lbl}>{m.dangerZone}</span>
          {registered > 0 ? (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
              {m.hasRegsFn(registered)}{' '}
              {m.useCancelPre}<b>{m.cancelWord}</b>{m.useCancelPost}
            </p>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[13px] text-ink-500">{m.safeDelete}</p>
              <Btn variant="outline" size="sm" className="!border-red-200 !text-red-600 hover:!bg-red-50" disabled={busy} onClick={remove}>{t.admin.common.delete}</Btn>
            </div>
          )}
        </section>
      </div>
    </Modal>
  );
}

/* ---- team registrations table (team tournaments only) — GET
   /tournaments/:id/team-registrations (NEW.md §13, DESIGN_PROMPTS.md §11).
   Read-only: rosters are frozen snapshots, there's no admin mutation on this
   endpoint (captains manage it via register-team/withdraw-team). ---- */
function TeamAvatar({ name }) {
  const initials = (name || '')
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[11px] font-700 text-accent">
      {initials}
    </span>
  );
}

function TeamRegistrationRow({ row, rg, expanded, onToggle }) {
  return (
    <div className="border-b border-ink-50 last:border-b-0">
      <button
        onClick={onToggle}
        className="grid w-full grid-cols-1 gap-2 px-6 py-3.5 text-left md:grid-cols-[1.6fr_130px_130px_130px] md:items-center md:gap-4 hover:bg-ink-50/60">
        <div className="flex items-center gap-2.5 text-[13.5px] font-600 text-ink-900">
          <TeamAvatar name={row.teamName} />
          {row.teamName}
        </div>
        <div><StatusDot status={row.status} /></div>
        <div className="font-mono text-[12.5px] text-ink-400">{fmtDate(row.registeredAt)}</div>
        <div className="flex items-center gap-1.5 text-[13px] text-ink-700">
          {rg.rosterCountFn(row.roster?.length ?? 0)}
          <svg viewBox="0 0 16 16" className={'h-3 w-3 shrink-0 text-ink-500 transition-transform ' + (expanded ? 'rotate-180' : '')} fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div className="bg-[#f8fafc] px-6 py-4 pl-14">
          <p className="mb-2.5 text-[11.5px] italic text-ink-500">{rg.rosterCaption}</p>
          <div className="space-y-1.5">
            {(row.roster ?? []).map((p, i) => (
              <div key={p.userId} className="flex items-baseline gap-2.5">
                <span className="w-3.5 shrink-0 font-mono text-[11px] text-ink-300">{i + 1}</span>
                <span className="text-[13px] font-600 text-ink-900">{p.name}</span>
                <span className="font-mono text-[12px] text-ink-500">{p.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamRegistrationsTable({ tournamentId, statusFilter, reloadKey, t }) {
  const rg = t.admin.registrations;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    listTeamRegistrations(tournamentId, statusFilter === 'all' ? undefined : statusFilter)
      .then((rs) => { if (!cancelled) { setRows(Array.isArray(rs) ? rs : []); setError(null); } })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, t)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tournamentId, statusFilter, reloadKey, t]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 text-[13.5px]">
        <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700"><b className="font-700 text-ink-900">{rows.length}</b> {rg.teamWordFn(rows.length)}</span>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1.6fr_130px_130px_130px] gap-4 border-b border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 md:grid">
          <span>{rg.thTeam}</span><span>{rg.thStatus}</span><span>{rg.thRegisteredDate}</span><span>{rg.thRoster}</span>
        </div>
        <div>
          {loading && <div className="px-6 py-5 text-[14px] text-ink-400">{t.admin.common.loading}</div>}
          {!loading && rows.length === 0 && <div className="px-6 py-5 text-[14px] text-ink-400">{rg.emptyTeams}</div>}
          {rows.map((row) => (
            <TeamRegistrationRow
              key={row.registrationId}
              row={row}
              rg={rg}
              expanded={expandedId === row.registrationId}
              onToggle={() => setExpandedId((id) => (id === row.registrationId ? null : row.registrationId))}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ======================================================= REGISTRATIONS ===
   Pick a tournament, then view/manage its participants via
   GET/POST/PATCH/DELETE /tournaments/:id/registrations. Clicking a row opens
   the full user record (GET /admin/users/:id). For team tournaments the
   solo table is swapped for the read-only TeamRegistrationsTable above. */
export function Registrations() {
  const { t } = useLang();
  const rg = t.admin.registrations;

  const [tournaments, setTournaments] = useState([]);
  const [selId, setSelId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [rowBusy, setRowBusy] = useState(null); // userId currently mutating
  const [addOpen, setAddOpen] = useState(false);
  const [viewUser, setViewUser] = useState(null);

  // Tournament selector — all statuses so admins can inspect any event.
  useEffect(() => {
    listAdminTournaments(undefined)
      .then((ts) => {
        const list = Array.isArray(ts) ? ts : [];
        setTournaments(list);
        setSelId((cur) => cur || (list[0]?.id ?? ''));
        if (list.length === 0) setLoading(false);
      })
      .catch((e) => { setError(apiErrorMessage(e, t)); setLoading(false); });
  }, [t]);

  const selected = tournaments.find((tr) => tr.id === selId);
  // Team tournaments have no per-player registrations — captains register
  // a roster via register-team, admins inspect it read-only (NEW.md §13).
  const isTeamTournament = selected?.participantType === 'team';

  // Registrations for the selected tournament (solo tournaments only — team
  // tournaments render TeamRegistrationsTable instead, below).
  useEffect(() => {
    if (!selId || isTeamTournament) return;
    let cancelled = false;
    listRegistrations(selId, statusFilter === 'all' ? undefined : statusFilter)
      .then((rs) => { if (!cancelled) { setRows(Array.isArray(rs) ? rs : []); setError(null); } })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, t)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selId, isTeamTournament, statusFilter, reloadKey, t]);

  const reload = () => setReloadKey((k) => k + 1);

  const mutate = async (userId, fn) => {
    setRowBusy(userId);
    try { await fn(); reload(); }
    catch (e) { setError(apiErrorMessage(e, t)); }
    finally { setRowBusy(null); }
  };
  const withdraw = (userId) => mutate(userId, () => updateRegistration(selId, userId, 'withdrawn'));
  const reinstate = (userId) => mutate(userId, () => updateRegistration(selId, userId, 'registered'));
  const remove = (userId) => {
    if (!window.confirm(rg.removeConfirm)) return;
    mutate(userId, () => deleteRegistration(selId, userId));
  };

  const registeredCount = rows.filter((r) => (r.status ?? 'registered') === 'registered').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{rg.event}</span>
            <select value={selId} onChange={(e) => setSelId(e.target.value)} className="bg-transparent py-2.5 text-[14px] font-500 text-ink-900 outline-none">
              {tournaments.length === 0 && <option value="">{rg.noTournaments}</option>}
              {tournaments.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <div className="flex gap-1.5">
            {[['all', rg.filterAll], ['registered', rg.filterRegistered], ['withdrawn', rg.filterWithdrawn]].map(([id, l]) => (
              <button key={id} onClick={() => setStatusFilter(id)}
                className={'rounded-full border px-3.5 py-2 text-[13.5px] font-600 ' + (statusFilter === id ? 'border-accent bg-accent text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-ink-300')}>{l}</button>
            ))}
          </div>
        </div>
        {!isTeamTournament && (
          <Btn variant="dark" size="md" disabled={!selId} onClick={() => setAddOpen(true)}><Svg d={Icon.plus} className="h-4 w-4" /> {rg.addParticipant}</Btn>
        )}
      </div>

      {isTeamTournament ? (
        <TeamRegistrationsTable tournamentId={selId} statusFilter={statusFilter} reloadKey={reloadKey} t={t} />
      ) : (
        <>
          <div className="flex flex-wrap gap-3 text-[13.5px]">
            <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700"><b className="font-700 text-ink-900">{rows.length}</b> {rg.regWordFn(rows.length)}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700"><b className="font-700">{registeredCount}</b> {rg.activeWord}</span>
            {selected?.capacity != null && <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700">{rg.capacityWord} <b className="font-700 text-ink-900">{selected.capacity}</b></span>}
            {selected?.freePlaces != null && <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700">{rg.freePlacesWord} <b className="font-700 text-ink-900">{selected.freePlaces}</b></span>}
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 md:grid">
              <span>{rg.thAthlete}</span><span>{t.admin.common.rating}</span><span>{rg.thStatus}</span><span>{rg.thWhen}</span><span></span>
            </div>
            <div className="divide-y divide-ink-100">
              {loading && <div className="px-6 py-5 text-[14px] text-ink-400">{t.admin.common.loading}</div>}
              {!loading && rows.length === 0 && <div className="px-6 py-5 text-[14px] text-ink-400">{rg.empty}</div>}
              {rows.map((r) => {
                const st = r.status ?? 'registered';
                const busy = rowBusy === r.userId;
                return (
                  <div key={r.userId} className="grid grid-cols-1 gap-2 px-6 py-3.5 md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4">
                    <button onClick={() => setViewUser(r.userId)} className="flex items-center gap-3 text-left">
                      <Avatar name={r.name || r.email || '?'} />
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-600 text-ink-900 hover:text-accent">{r.name || '—'}</div>
                        <div className="truncate text-[12.5px] text-ink-500">{r.email}</div>
                      </div>
                    </button>
                    <div className="font-mono text-[13.5px] text-ink-700">{r.rating != null ? r.rating : '—'}</div>
                    <div><StatusDot status={st} /></div>
                    <div className="font-mono text-[12.5px] text-ink-400">{fmtDate(r.registeredAt)}</div>
                    <div className="flex justify-end gap-2">
                      {st === 'registered'
                        ? <Btn variant="outline" size="sm" disabled={busy} onClick={() => withdraw(r.userId)}>{rg.withdraw}</Btn>
                        : <Btn variant="outline" size="sm" disabled={busy} onClick={() => reinstate(r.userId)}>{rg.reinstate}</Btn>}
                      <button title={rg.removeTitle} disabled={busy} onClick={() => remove(r.userId)}
                        className="grid h-9 w-9 place-items-center rounded-full border border-ink-100 text-ink-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-40">✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {addOpen && (
            <AddParticipant tournamentId={selId} tournamentTitle={selected?.title}
              onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); reload(); }} />
          )}
        </>
      )}

      {viewUser && <UserDetail userId={viewUser} onClose={() => setViewUser(null)} />}
    </div>
  );
}

/* ---- admin add-participant (override; bypasses open/rating/capacity gates) ---- */
function AddParticipant({ tournamentId, tournamentTitle, onClose, onAdded }) {
  const { t } = useLang();
  const ap = t.admin.addParticipant;
  const [userId, setUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const field = 'mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300';

  const add = async () => {
    const id = userId.trim();
    if (!id || busy) return;
    setBusy(true); setError(null);
    try { await addRegistration(tournamentId, id); onAdded(); }
    catch (e) { setError(apiErrorMessage(e, t)); setBusy(false); }
  };

  return (
    <Modal title={ap.title} sub={tournamentTitle} onClose={onClose} maxW="max-w-md">
      <p className="text-[13.5px] leading-relaxed text-ink-500">
        {ap.desc}
      </p>
      <div className="mt-4">
        <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{ap.userIdLbl}</span>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          placeholder={ap.userIdPlaceholder} className={field} autoFocus />
      </div>
      {error && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" size="md" onClick={onClose}>{t.admin.common.cancel}</Btn>
        <Btn variant="primary" size="md" disabled={!userId.trim() || busy} onClick={add}>{busy ? ap.adding : ap.add}</Btn>
      </div>
    </Modal>
  );
}

/* ---- full user record: account, all sport profiles, tournament history ---- */
/* ---- Statistics tab, admin user-detail modal (GET /users/:id/stats). See
   DESIGN_PROMPTS.md §14 — a denser twin of the public "My statistics" page
   (components/stats.jsx), reusing its record/win-rate formatting (t.stats)
   and the shared placementInfo() helper so wording matches everywhere.
   Note: the tournament-history "Format" chip can only say "Team"/"Solo" —
   unlike components/stats.jsx it has no teamSize to render "Team · 5v5",
   since GET /users/:id/stats doesn't return one (NEW.md §18). */
function MiniStatTile({ value, label, sub, featured }) {
  return (
    <div className={'rounded-xl border p-2.5 ' + (featured ? 'border-accent/30 bg-[var(--accent-soft)]' : 'border-ink-100 bg-white')}>
      <div className={'font-mono text-[20px] font-600 leading-none ' + (featured ? 'text-accent' : 'text-ink-900')}>{value}</div>
      <div className={'mt-1 text-[10.5px] font-700 uppercase tracking-wide ' + (featured ? 'text-accent' : 'text-ink-500')}>{label}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-ink-500">{sub}</div>}
    </div>
  );
}

function AdminPlacementBadge({ rank, t }) {
  const info = placementInfo(rank, t.admin.userStats, t.bracket);
  if (!info) return <span className="text-[11px] text-ink-300">—</span>;
  const cls =
    info.tone === 'gold' ? 'bg-amber-100 text-amber-800'
    : info.tone === 'silver' ? 'border border-ink-100 bg-ink-50 text-ink-700'
    : 'text-ink-500';
  return <span className={'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-700 ' + cls}>{info.label}</span>;
}

function AdminSportRow({ row, t }) {
  const st = t.admin.userStats;
  const label = t.data.sports[row.sportSlug] ?? row.sportName;
  const loss = Math.max(0, (row.matchesPlayed ?? 0) - (row.matchesWon ?? 0));
  return (
    <div className="grid grid-cols-[1.3fr_70px_100px_50px_70px_60px_70px_60px] items-center gap-2.5 border-t border-ink-50 px-3.5 py-2.5 text-[13px] first:border-t-0 hover:bg-ink-50/60">
      <span className="truncate text-[13.5px] font-600 text-ink-900">{label}</span>
      <span className="justify-self-end rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 font-mono text-[12px] font-600 text-accent">{row.rating ?? '—'}</span>
      <span className="justify-self-end font-mono text-ink-700">{row.tournamentsPlayed}</span>
      <span className="justify-self-end font-mono text-ink-700">{row.tournamentsWon}</span>
      <span className="justify-self-end font-mono text-ink-700">{row.matchesPlayed}</span>
      <span className="justify-self-end font-mono text-ink-700">{st.wlFn(row.matchesWon, loss)}</span>
      <span className="justify-self-end font-mono text-ink-700">{row.winRate != null ? t.stats.winRatePctFn(row.winRate) : '—'}</span>
      <span className="justify-self-end font-mono text-ink-700">{row.score}</span>
    </div>
  );
}

function AdminHistoryRow({ row, t, lang }) {
  const date = row.startsAt
    ? new Date(row.startsAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const formatLabel = row.participantType === 'team' ? t.admin.create.formatTeam : t.admin.create.formatSolo;
  const loss = Math.max(0, (row.matchesPlayed ?? 0) - (row.matchesWon ?? 0));
  return (
    <div className="grid grid-cols-[1.5fr_90px_90px_120px_44px_100px_64px] items-center gap-2.5 border-t border-ink-50 px-3.5 py-2.5 text-[13px] first:border-t-0 hover:bg-ink-50/60">
      <span className="truncate text-[13.5px] font-600 text-ink-900">{row.title}</span>
      <span className="text-ink-500">{date}</span>
      <span className="justify-self-start rounded-full bg-ink-50 px-2.5 py-0.5 text-[11.5px] font-600 text-ink-700">{formatLabel}</span>
      {row.teamName
        ? <span className="justify-self-start truncate rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11.5px] font-600 text-accent">{row.teamName}</span>
        : <span className="justify-self-start pl-2.5 text-ink-300">—</span>}
      <span className="justify-self-start font-mono text-ink-500">{row.seed != null ? `#${row.seed}` : '—'}</span>
      <AdminPlacementBadge rank={row.finalRank} t={t} />
      <span className="justify-self-end font-mono text-ink-700">{t.stats.recordFn(row.matchesWon ?? 0, loss)}</span>
    </div>
  );
}

function UserStatsTab({ userId, t, lang }) {
  const st = t.admin.userStats;
  const [state, setState] = useState('loading'); // loading | ready | error
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getUserStats(userId)
      .then((s) => { if (!cancelled) { setStats(s); setState('ready'); } })
      .catch((e) => { if (!cancelled) { setError(apiErrorMessage(e, t)); setState('error'); } });
    return () => { cancelled = true; };
  }, [userId, reloadKey, t]);

  const overall = stats?.overall;
  const bySport = stats?.bySport ?? [];
  const history = stats?.tournaments ?? [];
  const hasStats = overall && overall.tournamentsPlayed > 0;

  if (state === 'loading') return <div className="py-3 text-[13.5px] text-ink-400">{st.loading}</div>;
  if (state === 'error') {
    return (
      <div className="py-3 text-[13.5px] text-red-600">
        {error}{' '}
        <button onClick={() => { setState('loading'); setReloadKey((k) => k + 1); }} className="font-600 underline">{st.retry}</button>
      </div>
    );
  }
  if (!hasStats) {
    return <div className="rounded-xl border border-dashed border-ink-200 bg-white px-4 py-6 text-center text-[13px] text-ink-500">{st.emptyRow}</div>;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <MiniStatTile value={overall.tournamentsPlayed} label={st.tilePlayed} />
        <MiniStatTile value={overall.tournamentsWon} label={st.tileWon} />
        <MiniStatTile value={overall.podiumFinishes} label={st.tilePodiums} />
        <MiniStatTile value={overall.matchesPlayed} label={st.tileMatches} sub={t.stats.recordFn(overall.matchesWon, overall.matchesLost)} />
        <MiniStatTile value={overall.winRate != null ? t.stats.winRatePctFn(overall.winRate) : '—'} label={st.tileWinRate} />
        <MiniStatTile value={overall.score} label={st.tileScore} featured />
      </div>

      {bySport.length > 0 && (
        <>
          <div className="mb-2 mt-5 text-[13px] font-700 text-ink-700">{st.bySport}</div>
          <div className="overflow-hidden rounded-xl border border-ink-100">
            <div className="hidden grid-cols-[1.3fr_70px_100px_50px_70px_60px_70px_60px] gap-2.5 bg-ink-50/60 px-3.5 py-2 font-mono text-[10.5px] font-700 uppercase tracking-wide text-ink-500 sm:grid">
              <span>{st.thSport}</span>
              <span className="justify-self-end">{st.thRating}</span>
              <span className="justify-self-end">{st.thTournaments}</span>
              <span className="justify-self-end">{st.thWon}</span>
              <span className="justify-self-end">{st.thMatches}</span>
              <span className="justify-self-end">{st.thWL}</span>
              <span className="justify-self-end">{st.thWinRate}</span>
              <span className="justify-self-end">{st.thScore}</span>
            </div>
            {bySport.map((row) => <AdminSportRow key={row.sportId} row={row} t={t} />)}
          </div>
        </>
      )}

      {history.length > 0 && (
        <>
          <div className="mb-2 mt-5 text-[13px] font-700 text-ink-700">{st.history}</div>
          <div className="overflow-x-auto rounded-xl border border-ink-100">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-[1.5fr_90px_90px_120px_44px_100px_64px] gap-2.5 bg-ink-50/60 px-3.5 py-2 font-mono text-[10.5px] font-700 uppercase tracking-wide text-ink-500">
                <span>{st.thTitle}</span><span>{st.thDate}</span><span>{st.thFormat}</span><span>{st.thTeam}</span><span>{st.thSeed}</span><span>{st.thPlacement}</span><span className="justify-self-end">{st.thRecord}</span>
              </div>
              {history.map((row) => <AdminHistoryRow key={row.tournamentId} row={row} t={t} lang={lang} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function UserDetail({ userId, sportSlug, onClose }) {
  const { t, lang } = useLang();
  const ud = t.admin.userDetail;
  const [tab, setTab] = useState('profile'); // profile | registrations | statistics
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getAdminUser(userId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, t)); });
    return () => { cancelled = true; };
  }, [userId, t]);

  const u = data?.user;
  const profiles = data?.profiles ?? [];
  const regs = data?.registrations ?? [];
  const lbl = 'font-mono text-[11px] uppercase tracking-wide text-ink-300';
  const tabs = [
    ['profile', ud.tabProfile],
    ['registrations', ud.tabRegistrations],
    ['statistics', ud.tabStatistics],
  ];

  return (
    <Modal title={u?.name || ud.fallbackTitle} sub={u?.email} onClose={onClose} maxW={tab === 'statistics' ? 'max-w-3xl' : 'max-w-lg'}>
      {!data && !error && <div className="text-[14px] text-ink-400">{t.admin.common.loading}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}
      {data && (
        <div>
          <div className="mb-5 flex gap-1 border-b border-ink-100">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={'-mb-px border-b-2 px-4 py-2.5 text-[13.5px] font-600 ' + (tab === id ? 'border-accent text-accent' : 'border-transparent text-ink-500 hover:text-ink-700')}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <div className="space-y-6">
              {sportSlug && <AdjustRatingPanel userId={userId} sportSlug={sportSlug} />}

              <section>
                <span className={lbl}>{ud.account}</span>
                <div className="mt-2 grid grid-cols-2 gap-3 text-[14px]">
                  <div><div className="text-ink-400 text-[12px]">{ud.role}</div><div className="font-500 capitalize text-ink-900">{u?.role ?? '—'}</div></div>
                  <div><div className="text-ink-400 text-[12px]">{ud.joined}</div><div className="font-500 text-ink-900">{fmtDate(u?.createdAt)}</div></div>
                </div>
              </section>

              <section className="border-t border-ink-100 pt-5">
                <span className={lbl}>{ud.profilesFn(profiles.length)}</span>
                <div className="mt-2 space-y-2">
                  {profiles.length === 0 && <div className="text-[13.5px] text-ink-400">{ud.noProfiles}</div>}
                  {profiles.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-ink-100 px-3.5 py-2.5">
                      <span className="text-[14px] font-600 capitalize text-ink-900">{p.sport ?? p.sportName ?? p.sportId ?? '—'}</span>
                      <span className="font-mono text-[13.5px] text-ink-700">{p.rating != null ? p.rating : '—'}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'registrations' && (
            <section>
              <span className={lbl}>{ud.historyFn(regs.length)}</span>
              <div className="mt-2 space-y-2">
                {regs.length === 0 && <div className="text-[13.5px] text-ink-400">{ud.noRegs}</div>}
                {regs.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-600 text-ink-900">{r.tournamentTitle ?? r.title ?? r.tournamentId}</div>
                      <div className="text-[12px] text-ink-400">{fmtDate(r.startsAt)}{r.tournamentStatus ? ' · ' + (t.admin.status[r.tournamentStatus] || STATUS_LABEL[r.tournamentStatus] || r.tournamentStatus) : ''}</div>
                    </div>
                    <StatusDot status={r.status ?? 'registered'} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === 'statistics' && <UserStatsTab userId={userId} t={t} lang={lang} />}
        </div>
      )}
    </Modal>
  );
}

/* ============================================================ SPONSORS === */
export function Sponsors() {
  const { t } = useLang();
  const sp = t.admin.sponsors;
  const active = SPONSORS.filter((s) => s.status === 'active');
  const dealValue = active.reduce((s, x) => s + x.deal, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5"><div className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{sp.active}</div><div className="font-display mt-2 text-[28px] font-700 text-ink-900">{active.length}</div></Card>
        <Card className="p-5"><div className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{sp.dealValue}</div><div className="font-display mt-2 text-[28px] font-700 text-accent">{fmt(dealValue)}</div></Card>
        <Card className="p-5"><div className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{sp.pending}</div><div className="font-display mt-2 text-[28px] font-700 text-ink-900">{SPONSORS.filter((s) => s.status === 'pending').length}</div></Card>
        <Card className="p-5 !bg-ink-900 text-white">
          <div className="font-mono text-[11px] uppercase tracking-wide text-white/50">{sp.find}</div>
          <p className="mt-1.5 text-[13px] leading-snug text-white/70">{sp.findSub}</p>
          <Btn variant="primary" size="sm" className="mt-3">{sp.browse} <Svg d={Icon.arrow} className="h-4 w-4" /></Btn>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SPONSORS.map((s) => (
          <Card key={s.id} className="flex flex-col p-5 transition-all hover:border-ink-200 hover:shadow-md">
            <div className="flex items-start gap-3">
              <Avatar name={s.name} size={42} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-[17px] font-700 text-ink-900">{s.name}</div>
                <div className="text-[13px] text-ink-500">{s.category}</div>
              </div>
              <StatusDot status={s.status} />
            </div>
            <div className="mt-4 flex items-center gap-4 text-[13px] text-ink-500">
              <span>{sp.reach} <span className="font-500 text-ink-700">{s.reach}</span></span>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
              <div><span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{sp.deal}</span><div className="font-display text-[18px] font-700 text-ink-900">{fmt(s.deal)}</div></div>
              {s.status === 'pending' ? (
                <div className="flex gap-2"><Btn variant="outline" size="sm">{sp.decline}</Btn><Btn variant="primary" size="sm">{sp.approve}</Btn></div>
              ) : s.status === 'invited' ? (
                <Btn variant="outline" size="sm">{sp.resend}</Btn>
              ) : (
                <Btn variant="outline" size="sm">{sp.viewDeal}</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ========================================================== PROMOTIONS === */
export function Promotions() {
  const { t } = useLang();
  const pr = t.admin.promotions;
  const totalSpend = PROMOTIONS.reduce((s, p) => s + p.spend, 0);
  const cardIcons = [Icon.search, Icon.users, Icon.mega];
  const activeCount = PROMOTIONS.filter((p) => p.status === 'active').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-[13.5px]">
          <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700"><b className="font-700 text-ink-900">{activeCount}</b> {pr.activeWordFn(activeCount)}</span>
          <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700"><b className="font-700 text-ink-900">{fmt(totalSpend)}</b> {pr.totalSpend}</span>
        </div>
        <Btn variant="dark" size="md"><Svg d={Icon.plus} className="h-4 w-4" /> {pr.newPromotion}</Btn>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {pr.cards.map(([title, desc], i) => (
          <Card key={title} className="p-5">
            <Svg d={cardIcons[i]} className="h-6 w-6 text-accent" strokeWidth={1.6} />
            <h3 className="font-display mt-3 text-[16px] font-700 text-ink-900">{title}</h3>
            <p className="mt-1 text-[13px] leading-snug text-ink-500">{desc}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-4 border-b border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 lg:grid">
          <span>{pr.thCampaign}</span><span>{pr.thType}</span><span>{pr.thStatus}</span><span>{pr.thSpend}</span><span>{pr.thResult}</span><span></span>
        </div>
        <div className="divide-y divide-ink-100">
          {PROMOTIONS.map((p) => {
            const comp = owned.find((c) => c.id === p.comp);
            return (
              <div key={p.id} className="grid grid-cols-1 gap-2 px-6 py-4 lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] lg:items-center lg:gap-4">
                <div><div className="font-600 text-[14.5px] text-ink-900">{p.name}</div><div className="text-[12.5px] text-ink-500">{comp ? comp.title : '—'} · {p.metric}</div></div>
                <div className="text-[13.5px] text-ink-700">{p.type}</div>
                <div><StatusDot status={p.status} /></div>
                <div className="font-display text-[14.5px] font-700 text-ink-900">{p.spend ? fmt(p.spend) : t.admin.free}{p.budget ? <span className="ml-1 font-sans text-[11px] font-400 text-ink-400">/ {fmt(p.budget)}</span> : null}</div>
                <div className="text-[13.5px] font-500 text-ink-700">{p.result}</div>
                <div className="flex justify-end"><button className="grid h-9 w-9 place-items-center rounded-full border border-ink-100 text-ink-500 hover:bg-ink-50"><Svg d={Icon.dots} className="h-4 w-4" /></button></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ============================================================== SPORTS === */
export function Sports() {
  const { t } = useLang();
  const sv = t.admin.sportsView;
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    listSports()
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch((e) => setFetchError(apiErrorMessage(e, t)))
      .finally(() => setLoading(false));
  }, [t]);

  const trimmed = name.trim();
  const dupe = trimmed && list.some((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  const valid = trimmed && !dupe;

  const add = async () => {
    if (!valid || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      const slug = trimmed.toLowerCase().replace(/\s+/g, '-');
      const created = await createSport({ name: trimmed, slug });
      setList((l) => [...l, created]);
      setName('');
    } catch (e) {
      setAddError(apiErrorMessage(e, t));
    } finally {
      setAdding(false);
    }
  };

  const field = 'w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300';

  return (
    <div className="space-y-5">
      <Card className="p-5 lg:p-6">
        <h3 className="font-display text-[16px] font-700 text-ink-900">{sv.addTitle}</h3>
        <p className="mt-0.5 text-[13.5px] text-ink-500">{sv.addSub}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
              placeholder={sv.placeholder}
              className={field + (dupe ? ' border-red-300 focus:border-red-400' : '')} />
            {dupe && <div className="mt-1.5 text-[12.5px] font-500 text-red-500">{sv.existsFn(trimmed)}</div>}
            {addError && <div className="mt-1.5 text-[12.5px] font-500 text-red-500">{addError}</div>}
          </div>
          <Btn variant="dark" size="md" onClick={add} disabled={!valid || adding}>
            <Svg d={Icon.plus} className="h-4 w-4" /> {adding ? sv.adding : sv.add}
          </Btn>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="font-display text-[17px] font-700 text-ink-900">{sv.allTitle}</h3>
          <span className="rounded-full bg-ink-50 px-3 py-1 text-[13px] font-600 text-ink-700">{list.length}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr] gap-4 border-y border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400">
          <span className="w-8">#</span><span>{sv.thSport}</span><span>{sv.thSlug}</span>
        </div>
        <div className="divide-y divide-ink-100">
          {loading && (
            <div className="px-6 py-5 text-[14px] text-ink-400">{t.admin.common.loading}</div>
          )}
          {fetchError && (
            <div className="px-6 py-5 text-[13.5px] text-red-500">{fetchError}</div>
          )}
          {!loading && !fetchError && list.length === 0 && (
            <div className="px-6 py-5 text-[14px] text-ink-400">{sv.empty}</div>
          )}
          {list.map((s, i) => (
            <div key={s.slug ?? s.name} className="grid grid-cols-[auto_1fr_1fr] items-center gap-4 px-6 py-3.5">
              <span className="w-8 font-mono text-[13px] text-ink-400">{String(i + 1).padStart(2, '0')}</span>
              <span className="text-[15px] font-600 text-ink-900">{s.name}</span>
              <span className="font-mono text-[13px] text-ink-400">{s.slug}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ======================================================= NOTIFICATIONS ===
   Queue of players auto-removed when a tournament's age gates tightened
   (GET /admin/removed-registrations). Contact them, then tick them off via
   POST /admin/removed-registrations/mark-notified. */
export function RemovedNotifications() {
  const { t } = useLang();
  const q = t.admin.removedQ;
  const [tab, setTab] = useState('pending'); // pending | handled
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listRemovedRegistrations(tab === 'handled' ? { notified: true } : {})
      .then((d) => { if (!cancelled) { setRows(Array.isArray(d) ? d : []); setError(null); } })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, t)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading/selection resets live in the handlers (not the effect) so the
  // effect never sets state synchronously.
  const switchTab = (id) => { if (id !== tab) { setTab(id); setLoading(true); setSelected(new Set()); } };
  const reload = () => { setLoading(true); setSelected(new Set()); setReloadKey((k) => k + 1); };

  const rowId = (r) => r.id ?? r.userId;
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(rowId(r)));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map(rowId)));

  const markNotified = async () => {
    if (!selected.size || busy) return;
    setBusy(true); setError(null);
    try {
      await markRemovedNotified([...selected]);
      reload(); // rows leave the pending view
    } catch (e) { setError(apiErrorMessage(e, t)); }
    finally { setBusy(false); }
  };

  const check = 'h-4 w-4 accent-[var(--accent)]';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[['pending', q.pendingTab], ['handled', q.handledTab]].map(([id, label]) => (
            <button key={id} onClick={() => switchTab(id)}
              className={'rounded-full border px-3.5 py-1.5 text-[13.5px] font-500 transition-all ' +
                (tab === id ? 'border-accent bg-accent text-white shadow-sm' : 'border-ink-100 bg-white text-ink-700 hover:border-ink-300')}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'pending' && (
          <Btn variant="primary" size="sm" disabled={!selected.size || busy} onClick={markNotified}>
            {busy ? t.admin.manage.saving : q.markNotifiedFn(selected.size)}
          </Btn>
        )}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}

      <Card>
        <div className="hidden border-b border-ink-100 px-6 py-3 font-mono text-[10.5px] uppercase tracking-wide text-ink-300 md:grid md:grid-cols-[auto_1.8fr_1.5fr_1.2fr_0.5fr_0.8fr_0.9fr] md:items-center md:gap-4">
          <span>{tab === 'pending' ? <input type="checkbox" className={check} checked={allChecked} onChange={toggleAll} /> : <span className="w-4" />}</span>
          <span>{q.thPlayer}</span><span>{q.thTournament}</span><span>{q.thReason}</span><span>{q.thAge}</span><span>{q.thLimits}</span><span>{q.thRemoved}</span>
        </div>
        {loading && <div className="px-6 py-5 text-[14px] text-ink-400">{t.admin.common.loading}</div>}
        {!loading && rows.length === 0 && (
          <div className="px-6 py-5 text-[14px] text-ink-400">{tab === 'pending' ? q.emptyPending : q.emptyHandled}</div>
        )}
        {!loading && rows.map((r) => (
          <div key={rowId(r)} className="grid grid-cols-1 gap-2 border-b border-ink-100 px-6 py-4 last:border-b-0 md:grid-cols-[auto_1.8fr_1.5fr_1.2fr_0.5fr_0.8fr_0.9fr] md:items-center md:gap-4">
            <span>
              {tab === 'pending'
                ? <input type="checkbox" className={check} checked={selected.has(rowId(r))} onChange={() => toggle(rowId(r))} />
                : <span className="inline-block w-4" />}
            </span>
            <div className="min-w-0">
              <div className="truncate text-[14.5px] font-600 text-ink-900">{r.name || '—'}</div>
              <div className="truncate text-[12.5px] text-ink-500">{r.email}</div>
            </div>
            <div className="truncate text-[13.5px] text-ink-700">{r.tournamentTitle || r.tournamentId}</div>
            <div><span className="rounded-full bg-ink-50 px-2.5 py-1 text-[12px] font-500 text-ink-700">{q.reasons[r.reason] ?? r.reason}</span></div>
            <div className="font-mono text-[13px] text-ink-700">{r.age ?? '—'}</div>
            <div className="font-mono text-[13px] text-ink-500">{r.minAge ?? 0}–{r.maxAge ?? 120}</div>
            <div className="text-[13px] text-ink-500">{fmtDate(r.removedAt)}</div>
          </div>
        ))}
      </Card>
    </div>
  );
}

/* ============================================================== CREATE === */
export function CreateCompetition({ setView }) {
  const { t, lang } = useLang();
  const cr = t.admin.create;
  const [f, setF] = useState({
    title: '', sport: '', location: '', date: '', price: '', capacity: '',
    // Rating / age gates — backend defaults: no effective restriction.
    minRating: '0', maxRating: '100000', minAge: '0', maxAge: '120',
  });
  // Participant format (NEW.md §10) — immutable after creation, so it's only
  // ever picked here. `teamSize` is only sent (and only shown) for 'team'.
  const [participantType, setParticipantType] = useState('solo');
  const [teamSize, setTeamSize] = useState(5);
  const isTeam = participantType === 'team';
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [apiSports, setApiSports] = useState([]);
  const cities = useCities();
  useEffect(() => { listSports().then((d) => setApiSports(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  // Rating/age gates: blank falls back to the backend's "open" default, and a
  // typed 0 stays 0 (Number(v) || d would swallow it). Backend rejects
  // min > max with a 400, so block it here too.
  const gate = (v, dflt) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? Math.trunc(n) : dflt; };
  const gates = {
    minRating: gate(f.minRating, 0),
    maxRating: gate(f.maxRating, 100000),
    minAge: gate(f.minAge, 0),
    maxAge: gate(f.maxAge, 120),
  };
  const gatesOk =
    gates.minRating >= 0 && gates.minAge >= 0 &&
    gates.minRating <= gates.maxRating && gates.minAge <= gates.maxAge;
  const valid = f.title.trim() && f.sport && f.location && f.date && f.capacity && gatesOk;

  const publish = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    // `city` is the canonical slug from /cities — the browse filter matches on it.
    const city = f.location;
    const entryFee = Number(f.price) || 0;
    const capacity = Number(f.capacity);
    try {
      await createTournament({
        sportId: f.sport,
        title: f.title.trim(),
        type: entryFee > 0 ? 'paid' : 'free',
        city,
        capacity,
        participantType,
        ...(isTeam ? { teamSize } : {}),
        ...gates,
        startsAt: f.date ? new Date(f.date).toISOString() : new Date().toISOString(),
        entryFee,
        // Fields without a form input yet — reasonable placeholders for now:
        description: 'Single elimination tournament',
        location: `${cityLabel(cities, city, 'en')} venue`,
        prizePool: 0,
        currency: 'KZT',
        bracketInfo: `${capacity}-player single elimination`,
      });
      setView('competitions');
    } catch (e) {
      setError(apiErrorMessage(e, t));
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300';
  const lbl = 'font-mono text-[11px] uppercase tracking-wide text-ink-300';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button onClick={() => setView('competitions')} className="text-[14px] font-500 text-ink-500 hover:text-ink-900">{cr.back}</button>
      <Card className="p-6 lg:p-8">
        <h2 className="font-display text-[24px] font-700 tracking-[-0.01em] text-ink-900">{cr.title}</h2>
        <p className="mt-1 text-[14.5px] text-ink-500">{cr.sub}</p>

        <div className="mt-7 space-y-5">
          <div>
            <span className={lbl}>{cr.nameLbl}</span>
            <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder={cr.namePlaceholder} className={field} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <span className={lbl}>{cr.sportLbl}</span>
              <select value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })} className={field}>
                <option value="">{cr.selectSport}</option>
                {apiSports.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <span className={lbl}>{cr.cityLbl}</span>
              <select value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={field}>
                <option value="">{cr.selectCity}</option>
                {cities.map((c) => <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.ru : c.en}</option>)}
              </select>
            </div>
            <div>
              <span className={lbl}>{cr.dateLbl}</span>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={field} />
            </div>
            <div>
              <span className={lbl}>{isTeam ? cr.capacityTeamsLbl : cr.capacityLbl}</span>
              <input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} placeholder={isTeam ? cr.capacityTeamsPlaceholder : cr.capacityPlaceholder} className={field} />
            </div>
          </div>

          {/* participant format — immutable after creation (NEW.md §10) */}
          <div className="border-t border-ink-100 pt-5">
            <h3 className="text-[15px] font-700 text-ink-900">{cr.formatSectionTitle}</h3>
            <div className="mt-4 flex flex-wrap gap-8">
              <div>
                <span className={lbl}>{cr.formatLbl}</span>
                <div className="mt-1.5 inline-flex rounded-full bg-ink-50 p-1">
                  {['solo', 'team'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setParticipantType(v)}
                      className={
                        'rounded-full px-5 py-2 text-[13.5px] font-600 transition-colors ' +
                        (participantType === v ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-700')
                      }>
                      {v === 'solo' ? cr.formatSolo : cr.formatTeam}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 max-w-[220px] text-[12.5px] leading-snug text-ink-500">{cr.formatHelper}</p>
              </div>
              {isTeam && (
                <div>
                  <span className={lbl}>{cr.teamSizeLbl}</span>
                  <TeamSizeStepper value={teamSize} min={2} onChange={setTeamSize} />
                  <p className="mt-1.5 text-[12.5px] text-ink-500">{cr.teamSizeHelper}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <span className={lbl}>{cr.priceLbl}</span>
            <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder={cr.pricePlaceholder} className={field} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <span className={lbl}>{cr.minRatingLbl}</span>
              <input type="number" min="0" value={f.minRating} onChange={(e) => setF({ ...f, minRating: e.target.value })} className={field} />
            </div>
            <div>
              <span className={lbl}>{cr.maxRatingLbl}</span>
              <input type="number" min="0" value={f.maxRating} onChange={(e) => setF({ ...f, maxRating: e.target.value })} className={field} />
            </div>
            <div>
              <span className={lbl}>{cr.minAgeLbl}</span>
              <input type="number" min="0" max="120" value={f.minAge} onChange={(e) => setF({ ...f, minAge: e.target.value })} className={field} />
            </div>
            <div>
              <span className={lbl}>{cr.maxAgeLbl}</span>
              <input type="number" min="0" max="120" value={f.maxAge} onChange={(e) => setF({ ...f, maxAge: e.target.value })} className={field} />
            </div>
            <p className="col-span-2 text-[12.5px] text-ink-400 sm:col-span-4">{cr.gatesHint}</p>
            {!gatesOk && (
              <p className="col-span-2 text-[12.5px] font-500 text-red-500 sm:col-span-4">{cr.gatesError}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700" role="alert">
            {error}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-5">
          <Btn variant="ghost" size="md" onClick={() => setView('competitions')}>{cr.cancel}</Btn>
          <div className="flex gap-2">
            <Btn variant="outline" size="md" disabled={!valid || submitting}>{cr.saveDraft}</Btn>
            <Btn variant="primary" size="md" disabled={!valid || submitting} onClick={publish}>
              {submitting ? cr.publishing : <>{cr.publish} <Svg d={Icon.arrow} className="h-4 w-4" /></>}
            </Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}
