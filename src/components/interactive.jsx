import { useState, useEffect, useMemo } from 'react';
import { WINDOWS, CATEGORIES } from '../data';
import { listTournaments, listSports } from '../lib/api';
import { fetchCities, useCities, citySlug, cityLabel } from '../lib/cities';
import { useLang } from '../LangContext';
import { Btn, Arrow, Pill, SportTag, useReveal } from './primitives';

/* ---- normalize API tournament into the shape the UI expects ---- */
const computeWindow = (startsAt) => {
  if (!startsAt) return 'later';
  const diff = (new Date(startsAt) - Date.now()) / 86400000;
  if (diff <= 7) return 'week';
  if (diff <= 30) return 'month';
  return 'later';
};

const computeCats = (min, max) => {
  const cats = [];
  if (min === 0 && max >= 3000) cats.push('open');
  if (min < 1200) cats.push('amateur');
  if (min < 1800 && max > 1200) cats.push('intermediate');
  if (max > 1800) cats.push('pro');
  return cats.length ? cats : ['open'];
};

const normalizeT = (t, slugMap, cities) => ({
  id: t.id,
  title: t.title,
  sport: slugMap[t.sportId] || '',
  // Canonical city slug (matches /cities); legacy free-text cities that don't
  // resolve keep their lowercased text so they never collide with a slug.
  location: citySlug(cities, t.city) || (t.city || '').toLowerCase(),
  city: t.city || '',
  window: computeWindow(t.startsAt),
  date: t.startsAt ? new Date(t.startsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
  price: t.entryFee ?? 0,
  // Free places left. null capacity => uncapped (freePlaces also null).
  spots: t.freePlaces ?? (t.capacity != null ? Math.max(0, t.capacity - (t.occupiedPlaces ?? 0)) : null),
  capacity: t.capacity ?? null,
  cats: computeCats(t.minRating ?? 0, t.maxRating ?? 3000),
  distance: '',
  currency: t.currency || 'KZT',
});

/* ---- shared fetch — one request, both Browse and Participate reuse it ----
   Caches both the normalized tournaments and the sports list from the API, so
   the sport filter pills are driven by real data, not hardcoded ids. */
let _cache = null;
let _promise = null;

const EMPTY = { tournaments: [], sports: [] };

function useTournaments() {
  const [data, setData] = useState(_cache || EMPTY);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    if (_cache) { setData(_cache); setLoading(false); return; }
    if (!_promise) {
      _promise = Promise.all([listTournaments(), listSports(), fetchCities()])
        .then(([ts, ss, cities]) => {
          const sports = (Array.isArray(ss) ? ss : []).map((s) => ({
            id: s.id,
            slug: s.slug || String(s.name || '').toLowerCase(),
            name: s.name,
          }));
          const slugMap = Object.fromEntries(sports.map((s) => [s.id, s.slug]));
          _cache = {
            tournaments: (Array.isArray(ts) ? ts : []).map((t) => normalizeT(t, slugMap, cities)),
            sports,
          };
          return _cache;
        })
        .catch(() => { _promise = null; return EMPTY; });
    }
    _promise.then((d) => { setData(d); setLoading(false); });
  }, []);

  return { tournaments: data.tournaments, sports: data.sports, loading };
}

/* ---- CompetitionCard ---- */
function CompetitionCard({ c, onRegister }) {
  const { t, lang } = useLang();
  const cities = useCities();
  const uncapped = c.spots == null;
  const lowSpots = !uncapped && c.spots <= 15;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-all hover:-translate-y-1 hover:border-ink-200 hover:shadow-xl">
      <div className="ph relative h-36">
        <span className="ph-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{t.data.sports[c.sport]?.toLowerCase()} photo</span>
        <div className="absolute left-3 top-3"><span className="rounded-full bg-white/90 px-2.5 py-1 backdrop-blur"><SportTag sport={c.sport} /></span></div>
        <div className="absolute right-3 top-3">
          <Pill tone={lowSpots ? "accent" : "default"} className="!bg-white/90 backdrop-blur">
            {uncapped ? t.card.openEntry : t.card.spotsLeftFn(c.spots)}
          </Pill>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[19px] font-600 leading-snug text-ink-900">{c.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-500">
          <span>{cityLabel(cities, c.city || c.location, lang)}</span>
          <span className="h-1 w-1 rounded-full bg-ink-300" />
          <span>{c.date}</span>
          <span className="h-1 w-1 rounded-full bg-ink-300" />
          <span>{c.distance}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {c.cats.map((cat) => (
            <span key={cat} className="rounded-md border border-ink-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">
              {t.data.categories[cat]}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
          <div>
            <span className="font-display text-[20px] font-700 text-ink-900">{c.price.toLocaleString('ru-RU')} ₸</span>
            <span className="ml-1 text-[12px] text-ink-500">{t.card.entryLbl}</span>
          </div>
          <Btn variant="dark" size="sm" onClick={() => onRegister(c)}>{t.card.registerBtn}</Btn>
        </div>
      </div>
    </article>
  );
}

/* ---- Browse ---- */
function FilterChip({ active, children, onClick }) {
  return (
    <button onClick={onClick}
      className={"shrink-0 rounded-full border px-3.5 py-1.5 text-[13.5px] font-500 transition-all " +
        (active ? "border-accent bg-accent text-white shadow-sm" : "border-ink-100 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50")}>
      {children}
    </button>
  );
}

export function Browse({ onRegister }) {
  const { t, lang } = useLang();
  const b = t.browse;
  const ref = useReveal();
  const { tournaments, sports, loading } = useTournaments();
  const cities = useCities();
  const [sport, setSport] = useState("");
  const [location, setLocation] = useState("");
  const [win, setWin] = useState("");
  const [cat, setCat] = useState("");

  useEffect(() => {
    const onFilter = (e) => {
      const d = e.detail || {};
      if (d.sport !== undefined) setSport(d.sport);
      if (d.location !== undefined) setLocation(d.location);
      if (d.window !== undefined) setWin(d.window);
      if (d.category !== undefined) setCat(d.category);
    };
    window.addEventListener("rally:filter", onFilter);
    return () => window.removeEventListener("rally:filter", onFilter);
  }, []);

  const results = useMemo(() => tournaments.filter((c) =>
    (!sport || c.sport === sport) &&
    (!location || c.location === location) &&
    (!win || c.window === win) &&
    (!cat || c.cats.includes(cat))
  ), [tournaments, sport, location, win, cat]);

  const active = sport || location || win || cat;
  const reset = () => { setSport(""); setLocation(""); setWin(""); setCat(""); };

  return (
    <section id="browse" ref={ref} className="bg-ink-50/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-500">{b.eyebrow}</span>
            <h2 className="font-display mt-3 text-[clamp(30px,4vw,46px)] font-700 leading-[1.04] tracking-[-0.02em] text-ink-900">
              {b.title}
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-500">{b.subtitle}</p>
        </div>

        <div className="reveal mt-8 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{b.sportLbl}</span>
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                <FilterChip active={!sport} onClick={() => setSport("")}>{b.allSports}</FilterChip>
                {sports.map((s) => (
                  <FilterChip key={s.id} active={sport === s.slug} onClick={() => setSport(s.slug)}>
                    {t.data.sports[s.slug] ?? s.name}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-ink-100 pt-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{b.cityLbl}</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-transparent py-2.5 text-[14.5px] font-500 text-ink-900 outline-none">
                <option value="">{b.anywhere}</option>
                {cities.map((c) => <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.ru : c.en}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{b.whenLbl}</span>
              <select value={win} onChange={(e) => setWin(e.target.value)} className="w-full bg-transparent py-2.5 text-[14.5px] font-500 text-ink-900 outline-none">
                <option value="">{b.anyTime}</option>
                {WINDOWS.map((w) => <option key={w.id} value={w.id}>{t.data.windows[w.id]}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{b.levelLbl}</span>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full bg-transparent py-2.5 text-[14.5px] font-500 text-ink-900 outline-none">
                <option value="">{b.allLevels}</option>
                {CATEGORIES.map((k) => <option key={k.id} value={k.id}>{t.data.categories[k.id]}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="reveal mt-7 flex items-center justify-between">
          <p className="text-[14.5px] text-ink-500">{loading ? '…' : b.foundFn(results.length)}</p>
          {active && (
            <button onClick={reset} className="text-[14px] font-500 text-accent hover:underline">{b.clearFilters}</button>
          )}
        </div>

        {loading ? (
          <div className="reveal mt-5 grid place-items-center rounded-2xl border border-dashed border-ink-200 bg-white py-20">
            <p className="text-[15px] text-ink-400">Loading tournaments…</p>
          </div>
        ) : results.length > 0 ? (
          <div className="reveal mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((c) => <CompetitionCard key={c.id} c={c} onRegister={onRegister} />)}
          </div>
        ) : (
          <div className="reveal mt-5 grid place-items-center rounded-2xl border border-dashed border-ink-200 bg-white py-20 text-center">
            <p className="font-display text-[20px] font-600 text-ink-900">{b.noMatchTitle}</p>
            <p className="mt-2 text-[14.5px] text-ink-500">{b.noMatchSub}</p>
            <button onClick={reset} className="mt-5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-600 text-white">{b.resetFilters}</button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---- Participate ---- */
export function Participate({ onRegister }) {
  const { t, lang } = useLang();
  const p = t.participate;
  const ref = useReveal();

  const { tournaments, sports } = useTournaments();
  const cities = useCities();
  const sportOptions = sports.map((s) => ({ id: s.slug, label: s.name }));
  const cityOptions = cities.map((c) => ({ id: c.slug, label: lang === 'ru' ? c.ru : c.en }));

  const STEPS = p.steps.map((s, i) => ({
    ...s,
    key: ["sport", "location", "window", "category"][i],
    list: [sportOptions, cityOptions, WINDOWS, CATEGORIES][i],
  }));

  const [step, setStep] = useState(0);
  const [sel, setSel] = useState({ sport: "", location: "", window: "", category: "" });
  const done = step >= STEPS.length;

  const matches = useMemo(() => tournaments.filter((c) =>
    (!sel.sport    || c.sport === sel.sport) &&
    (!sel.location || c.location === sel.location) &&
    (!sel.window   || c.window === sel.window) &&
    (!sel.category || c.cats.includes(sel.category))
  ), [tournaments, sel]);

  const pick = (key, val) => {
    setSel((s) => ({ ...s, [key]: val }));
    setTimeout(() => setStep((n) => n + 1), 160);
  };
  const restart = () => { setSel({ sport: "", location: "", window: "", category: "" }); setStep(0); };
  const seeMatches = () => {
    window.dispatchEvent(new CustomEvent("rally:filter", { detail: sel }));
    window.scrollTo({ top: document.getElementById("browse").offsetTop - 70, behavior: "smooth" });
  };

  const tLabel = (key, id) => {
    if (key === "sport")    return t.data.sports[id] ?? sportOptions.find((s) => s.id === id)?.label ?? id;
    if (key === "location") return cityLabel(cities, id, lang);
    if (key === "window")   return t.data.windows[id] ?? id;
    if (key === "category") return t.data.categories[id] ?? id;
    return id;
  };

  const cur = STEPS[Math.min(step, STEPS.length - 1)];

  return (
    <section id="participate" ref={ref} className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-500">{p.eyebrow}</span>
          <h2 className="font-display mt-3 text-[clamp(30px,4.4vw,50px)] font-700 leading-[1.02] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
            {p.title}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-ink-500">{p.body}</p>
        </div>

        <div className="reveal mx-auto mt-12 flex max-w-2xl items-center justify-between">
          {STEPS.map((s, i) => {
            const state = done || i < step ? "done" : i === step ? "active" : "todo";
            return (
              <div key={s.key} className="contents">
                <button onClick={() => (i <= step || done) && setStep(i)}
                  className="flex flex-col items-center gap-2"
                  disabled={i > step && !done}>
                  <span className={"grid h-10 w-10 place-items-center rounded-full font-display text-[15px] font-600 transition-all " +
                    (state === "done" ? "bg-accent text-white" : state === "active" ? "border-2 border-accent bg-white text-accent" : "border border-ink-200 bg-white text-ink-300")}>
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className={"text-[12.5px] font-500 " + (state === "todo" ? "text-ink-300" : "text-ink-900")}>{s.label}</span>
                  <span className="h-4 text-[11px] text-ink-500">{sel[s.key] ? tLabel(s.key, sel[s.key]) : ""}</span>
                </button>
                {i < STEPS.length - 1 && <span className={"mx-1 h-px flex-1 " + (i < step || done ? "bg-accent" : "bg-ink-100")} />}
              </div>
            );
          })}
        </div>

        <div className="reveal mx-auto mt-10 max-w-3xl rounded-3xl border border-ink-100 bg-white p-8 shadow-sm sm:p-10">
          {!done ? (
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-[24px] font-600 text-ink-900">{cur.q}</h3>
                <span className="font-mono text-[12px] text-ink-300">{p.stepOf} {step + 1} {p.stepOfSep} {STEPS.length}</span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {cur.list.map((opt) => {
                  const isSel = sel[cur.key] === opt.id;
                  const label = tLabel(cur.key, opt.id);
                  return (
                    <button key={opt.id} onClick={() => pick(cur.key, opt.id)}
                      className={"group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all " +
                        (isSel ? "border-accent bg-[var(--accent-soft)]" : "border-ink-100 hover:border-ink-300 hover:bg-ink-50")}>
                      <span className={"grid h-9 w-9 place-items-center rounded-lg font-mono text-[13px] font-500 " + (isSel ? "bg-accent text-white" : "bg-ink-50 text-ink-500 group-hover:bg-white")}>
                        {label.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-[15px] font-600 leading-tight text-ink-900">{label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}
                  className="text-[14.5px] font-500 text-ink-500 hover:text-ink-900 disabled:opacity-0">{p.back}</button>
                <button onClick={() => setStep((n) => n + 1)}
                  className="text-[14.5px] font-500 text-ink-500 hover:text-accent">{p.skip}</button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">{p.selectionLabel}</span>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {STEPS.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-ink-50 px-3.5 py-1.5 text-[14px] font-500 text-ink-900">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink-300">{s.label}</span>
                    {sel[s.key] ? tLabel(s.key, sel[s.key]) : p.any}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-[17px] text-ink-700">{p.matchFn(matches.length)}</p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Btn variant="primary" size="lg" onClick={matches.length ? () => onRegister(matches[0]) : seeMatches} disabled={!matches.length}>
                  {matches.length ? p.registerTop : p.noMatches} <Arrow />
                </Btn>
                <Btn variant="outline" size="lg" onClick={seeMatches}>{p.seeAllMatches}</Btn>
                <button onClick={restart} className="text-[14.5px] font-500 text-ink-500 hover:text-ink-900">{p.startOver}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
