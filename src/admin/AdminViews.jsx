/* Rally Admin — dashboard views. */
import { useState, useEffect } from 'react';
import { LOCATIONS, CATEGORIES } from '../data';
import { useLang } from '../LangContext';
import { apiErrorMessage } from '../i18n';
import {
  createTournament, listSports, createSport,
  listAdminTournaments, getTournament, updateTournament, deleteTournament,
  listRegistrations, addRegistration, updateRegistration, deleteRegistration, getAdminUser,
} from '../lib/api';
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

/* Skill category -> rating band. Placeholder ranges — the min/max rating sent
   to the backend is derived from the selected category pills. Adjust these
   (or replace ratingRange) once the rating model is finalised. */
const CATEGORY_RATINGS = {
  open: [0, 3000],
  amateur: [0, 1200],
  intermediate: [1200, 1800],
  pro: [1800, 3000],
};

function ratingRange(cats) {
  const bands = cats.map((c) => CATEGORY_RATINGS[c]).filter(Boolean);
  if (!bands.length) return [0, 3000];
  return [Math.min(...bands.map((b) => b[0])), Math.max(...bands.map((b) => b[1]))];
}

// "London, UK" -> "London"
const cityName = (id) => {
  const loc = LOCATIONS.find((l) => l.id === id);
  return loc ? loc.label.split(',')[0].trim() : id;
};

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
  const { t } = useLang();
  const c0 = t.admin.competitions;
  const [filter, setFilter] = useState('all');
  const [tournaments, setTournaments] = useState([]);
  const [sportsMap, setSportsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [managing, setManaging] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listAdminTournaments(filter === 'all' ? undefined : filter), listSports()])
      .then(([ts, ss]) => {
        if (cancelled) return;
        setSportsMap(Object.fromEntries((Array.isArray(ss) ? ss : []).map((s) => [s.id, s.name])));
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
                  <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-500">{c.location} · {c.date}</div>
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
          sportName={sportsMap[managing.sportId] || managing.sportId}
          onClose={() => setManaging(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}

/* ---- manage one tournament: edit fields, move status, delete ---- */
function ManageTournament({ tournament, sportName, onClose, onChanged }) {
  const { t } = useLang();
  const m = t.admin.manage;
  const statusLabel = (s) => t.admin.status[s] || STATUS_LABEL[s] || s;
  const [detail, setDetail] = useState(tournament);
  const [form, setForm] = useState({
    title: tournament.title ?? '',
    capacity: tournament.capacity ?? '',
    entryFee: tournament.entryFee ?? '',
    minRating: tournament.minRating ?? '',
    maxRating: tournament.maxRating ?? '',
    startsAt: tournament.startsAt ? tournament.startsAt.slice(0, 10) : '',
    description: tournament.description ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

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

  const num = (v) => (v === '' || v == null ? null : Number(v));

  const saveFields = async () => {
    const patch = {};
    if (form.title.trim() !== (detail.title ?? '')) patch.title = form.title.trim();
    if (num(form.capacity) !== (detail.capacity ?? null)) patch.capacity = num(form.capacity);
    const fee = form.entryFee === '' ? 0 : Number(form.entryFee);
    if (fee !== (detail.entryFee ?? 0)) patch.entryFee = fee;
    if (num(form.minRating) !== (detail.minRating ?? null)) patch.minRating = num(form.minRating);
    if (num(form.maxRating) !== (detail.maxRating ?? null)) patch.maxRating = num(form.maxRating);
    const iso = form.startsAt ? new Date(form.startsAt).toISOString() : null;
    if ((iso?.slice(0, 10) ?? null) !== (detail.startsAt ? detail.startsAt.slice(0, 10) : null)) patch.startsAt = iso;
    if (form.description !== (detail.description ?? '')) patch.description = form.description;

    if (!Object.keys(patch).length) { setNotice(m.noChanges); setError(null); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const updated = await updateTournament(tournament.id, patch);
      setDetail((d) => ({ ...d, ...(updated || patch) }));
      setNotice(m.saved);
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className={lbl}>{m.capacityLbl}</span>
              <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} placeholder="∞" className={field} />
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
          </div>
          <div>
            <span className={lbl}>{m.startsLbl}</span>
            <input type="date" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className={field} />
          </div>
          <div>
            <span className={lbl}>{m.descriptionLbl}</span>
            <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} />
          </div>
          <Btn variant="primary" size="md" disabled={busy} onClick={saveFields}>{busy ? m.saving : m.saveChanges}</Btn>
        </section>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}
        {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-[13.5px] text-emerald-700">{notice}</div>}

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

/* ======================================================= REGISTRATIONS ===
   Pick a tournament, then view/manage its participants via
   GET/POST/PATCH/DELETE /tournaments/:id/registrations. Clicking a row opens
   the full user record (GET /admin/users/:id). */
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

  // Registrations for the selected tournament.
  useEffect(() => {
    if (!selId) return;
    let cancelled = false;
    listRegistrations(selId, statusFilter === 'all' ? undefined : statusFilter)
      .then((rs) => { if (!cancelled) { setRows(Array.isArray(rs) ? rs : []); setError(null); } })
      .catch((e) => { if (!cancelled) setError(apiErrorMessage(e, t)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selId, statusFilter, reloadKey, t]);

  const reload = () => setReloadKey((k) => k + 1);
  const selected = tournaments.find((tr) => tr.id === selId);

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
        <Btn variant="dark" size="md" disabled={!selId} onClick={() => setAddOpen(true)}><Svg d={Icon.plus} className="h-4 w-4" /> {rg.addParticipant}</Btn>
      </div>

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
function UserDetail({ userId, onClose }) {
  const { t } = useLang();
  const ud = t.admin.userDetail;
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

  return (
    <Modal title={u?.name || ud.fallbackTitle} sub={u?.email} onClose={onClose}>
      {!data && !error && <div className="text-[14px] text-ink-400">{t.admin.common.loading}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[13.5px] text-red-700">{error}</div>}
      {data && (
        <div className="space-y-6">
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

          <section className="border-t border-ink-100 pt-5">
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

/* ============================================================== CREATE === */
export function CreateCompetition({ setView }) {
  const { t } = useLang();
  const cr = t.admin.create;
  const [f, setF] = useState({ title: '', sport: '', location: '', date: '', price: '', capacity: '', cats: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [apiSports, setApiSports] = useState([]);
  useEffect(() => { listSports().then((d) => setApiSports(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  const toggleCat = (id) => setF((s) => ({ ...s, cats: s.cats.includes(id) ? s.cats.filter((x) => x !== id) : [...s.cats, id] }));
  const valid = f.title.trim() && f.sport && f.location && f.date && f.capacity;

  const publish = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const [minRating, maxRating] = ratingRange(f.cats);
    const city = cityName(f.location);
    const entryFee = Number(f.price) || 0;
    const capacity = Number(f.capacity);
    try {
      await createTournament({
        sportId: f.sport,
        title: f.title.trim(),
        type: entryFee > 0 ? 'paid' : 'free',
        city,
        capacity,
        minRating,
        maxRating,
        startsAt: f.date ? new Date(f.date).toISOString() : new Date().toISOString(),
        entryFee,
        // Fields without a form input yet — reasonable placeholders for now:
        description: 'Single elimination tournament',
        location: `${city} venue`,
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
                {LOCATIONS.map((l) => <option key={l.id} value={l.id}>{t.data.locations[l.id] ?? l.label}</option>)}
              </select>
            </div>
            <div>
              <span className={lbl}>{cr.dateLbl}</span>
              <input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={field} />
            </div>
            <div>
              <span className={lbl}>{cr.capacityLbl}</span>
              <input type="number" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} placeholder={cr.capacityPlaceholder} className={field} />
            </div>
          </div>
          <div>
            <span className={lbl}>{cr.priceLbl}</span>
            <input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder={cr.pricePlaceholder} className={field} />
          </div>
          <div>
            <span className={lbl}>{cr.categoriesLbl}</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => toggleCat(c.id)}
                  className={'rounded-full border px-3.5 py-2 text-[13.5px] font-600 transition-all ' + (f.cats.includes(c.id) ? 'border-accent bg-accent text-white' : 'border-ink-200 text-ink-700 hover:border-ink-300')}>
                  {t.data.categories[c.id] ?? c.label}
                </button>
              ))}
            </div>
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
