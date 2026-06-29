/* Rally Admin — dashboard views. */
import { useState } from 'react';
import { SPORTS, LOCATIONS, CATEGORIES } from '../data';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { getAuthToken } from '../lib/auth';
import { createTournament } from '../lib/api';
import { owned, REGISTRATIONS, SPONSORS, PROMOTIONS } from './adminData';
import { Card, Btn, StatusDot, Avatar, Svg, Icon, fmt } from './AdminShell';

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

function MiniBars({ data }) {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div className="flex items-end gap-2.5" style={{ height: 120 }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-accent/85 transition-all hover:bg-accent"
              style={{ height: Math.max(6, (d.v / max) * 100) + '%' }} title={d.v + ' registrations'} />
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
          <div className="mt-6"><MiniBars data={weekData} /></div>
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

/* ======================================================== COMPETITIONS === */
export function Competitions({ setView }) {
  const { t } = useLang();
  const c0 = t.admin.competitions;
  const [filter, setFilter] = useState('all');
  const rows = owned.filter((c) => filter === 'all' || c.status === filter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[['all', c0.filterAll], ['live', c0.filterLive], ['draft', c0.filterDrafts], ['closed', c0.filterClosed]].map(([id, l]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={'rounded-full border px-3.5 py-1.5 text-[13.5px] font-600 transition-all ' +
                (filter === id ? 'border-accent bg-accent text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-ink-300')}>
              {l}
            </button>
          ))}
        </div>
        <Btn variant="dark" size="md" onClick={() => setView('create')}><Svg d={Icon.plus} className="h-4 w-4" /> {t.admin.newCompetition}</Btn>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[2.4fr_1fr_1.2fr_1fr_auto] gap-4 border-b border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 md:grid">
          <span>{c0.thCompetition}</span><span>{c0.thStatus}</span><span>{c0.thCapacity}</span><span>{c0.thRevenue}</span><span></span>
        </div>
        <div className="divide-y divide-ink-100">
          {rows.map((c) => (
            <div key={c.id} className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[2.4fr_1fr_1.2fr_1fr_auto] md:items-center md:gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink-50 font-mono text-[11px] font-600 uppercase text-ink-500">{(t.data.sports[c.sport] ?? c.sport).slice(0, 3)}</span>
                <div className="min-w-0">
                  <div className="font-600 text-[15px] text-ink-900">{c.title}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-ink-500">{t.data.locations[c.location] ?? c.location} · {c.date}</div>
                </div>
              </div>
              <div><StatusDot status={c.status} /></div>
              <div>
                <div className="flex items-center justify-between text-[12.5px] text-ink-500"><span className="font-mono">{c.registered}/{c.capacity}</span><span>{c.fill}%</span></div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-50 md:w-32"><div className="h-full rounded-full bg-accent" style={{ width: c.fill + '%' }} /></div>
              </div>
              <div className="font-display text-[15px] font-700 text-ink-900">{fmt(c.revenue)}</div>
              <div className="flex gap-2">
                <Btn variant="outline" size="sm">{c0.manage}</Btn>
                <button className="grid h-9 w-9 place-items-center rounded-full border border-ink-100 text-ink-500 hover:bg-ink-50"><Svg d={Icon.dots} className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ======================================================= REGISTRATIONS === */
export function Registrations() {
  const { t } = useLang();
  const rg = t.admin.registrations;
  const [comp, setComp] = useState('all');
  const [paid, setPaid] = useState('all');
  const rows = REGISTRATIONS.filter((r) =>
    (comp === 'all' || r.comp === comp) && (paid === 'all' || (paid === 'paid') === r.paid));
  const paidTotal = rows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 rounded-xl border border-ink-100 bg-white px-3">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{rg.event}</span>
            <select value={comp} onChange={(e) => setComp(e.target.value)} className="bg-transparent py-2.5 text-[14px] font-500 text-ink-900 outline-none">
              <option value="all">{rg.allEvents}</option>
              {owned.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <div className="flex gap-1.5">
            {[['all', rg.filterAll], ['paid', rg.filterPaid], ['unpaid', rg.filterUnpaid]].map(([id, l]) => (
              <button key={id} onClick={() => setPaid(id)}
                className={'rounded-full border px-3.5 py-2 text-[13.5px] font-600 ' + (paid === id ? 'border-accent bg-accent text-white' : 'border-ink-100 bg-white text-ink-700 hover:border-ink-300')}>{l}</button>
            ))}
          </div>
        </div>
        <Btn variant="outline" size="md"><Svg d={Icon.out} className="h-[16px] w-[16px]" /> {rg.exportCsv}</Btn>
      </div>

      <div className="flex flex-wrap gap-3 text-[13.5px]">
        <span className="rounded-full bg-ink-50 px-3 py-1.5 text-ink-700"><b className="font-700 text-ink-900">{rows.length}</b> {rg.regWordFn(rows.length)}</span>
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700"><b className="font-700">{fmt(paidTotal)}</b> {rg.collected}</span>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[2fr_1.6fr_1fr_1fr_0.8fr] gap-4 border-b border-ink-100 px-6 py-3 font-mono text-[11px] uppercase tracking-wide text-ink-400 md:grid">
          <span>{rg.thAthlete}</span><span>{rg.thEvent}</span><span>{rg.thCategory}</span><span>{rg.thStatus}</span><span>{rg.thWhen}</span>
        </div>
        <div className="divide-y divide-ink-100">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-1 gap-2 px-6 py-3.5 md:grid-cols-[2fr_1.6fr_1fr_1fr_0.8fr] md:items-center md:gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={r.name} />
                <div className="min-w-0"><div className="text-[14.5px] font-600 text-ink-900">{r.name}</div><div className="truncate text-[12.5px] text-ink-500">{r.email}</div></div>
              </div>
              <div className="truncate text-[14px] text-ink-700">{r.compTitle}</div>
              <div className="text-[13.5px] text-ink-500">{t.data.categories[r.category] ?? r.category}</div>
              <div><span className={'rounded-full px-2.5 py-1 text-[12px] font-600 ' + (r.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{r.paid ? rg.paidFn(r.amount) : rg.pending}</span></div>
              <div className="font-mono text-[12.5px] text-ink-400">{r.ago}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
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

/* ============================================================== CREATE === */
export function CreateCompetition({ setView }) {
  const { t } = useLang();
  const cr = t.admin.create;
  const { session } = useSession();
  const [f, setF] = useState({ title: '', sport: '', location: '', date: '', price: '', capacity: '', cats: [] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
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
      }, getAuthToken(session));
      setView('competitions');
    } catch (e) {
      setError(e.message);
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
                {SPORTS.map((s) => <option key={s.id} value={s.id}>{t.data.sports[s.id] ?? s.label}</option>)}
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
