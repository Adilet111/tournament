/* Rally — interactive sections: Browse + Filter, Competition cards, Participate stepper. */
const { useState: useStateI, useEffect: useEffectI, useMemo, useRef: useRefI } = React;

/* --------------------------------------------------------- CompetitionCard -- */
function CompetitionCard({ c, onRegister }) {
  const R = window.RALLY;
  const { Pill, SportTag, Btn } = window;
  const lowSpots = c.spots <= 15;
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white transition-all hover:-translate-y-1 hover:border-ink-200 hover:shadow-xl">
      <div className="ph relative h-36">
        <span className="ph-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{R.sportLabel(c.sport).toLowerCase()} photo</span>
        <div className="absolute left-3 top-3"><span className="rounded-full bg-white/90 px-2.5 py-1 backdrop-blur"><SportTag sport={c.sport} /></span></div>
        <div className="absolute right-3 top-3">
          <Pill tone={lowSpots ? "accent" : "default"} className={lowSpots ? "!bg-white/90 backdrop-blur" : "!bg-white/90 backdrop-blur"}>
            {`${c.spots} spots left`}
          </Pill>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[19px] font-600 leading-snug text-ink-900">{c.title}</h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-ink-500">
          <span>{R.locationLabel(c.location)}</span>
          <span className="h-1 w-1 rounded-full bg-ink-300" />
          <span>{c.date}</span>
          <span className="h-1 w-1 rounded-full bg-ink-300" />
          <span>{c.distance}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {c.cats.map((cat) => (
            <span key={cat} className="rounded-md border border-ink-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">{R.categoryLabel(cat)}</span>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-ink-100 pt-4">
          <div>
            <span className="font-display text-[20px] font-700 text-ink-900">£{c.price}</span>
            <span className="ml-1 text-[12px] text-ink-500">entry</span>
          </div>
          <Btn variant="dark" size="sm" onClick={() => onRegister(c)}>Register</Btn>
        </div>
      </div>
    </article>
  );
}

/* ----------------------------------------------------------------- Browse -- */
function FilterChip({ active, children, onClick }) {
  return (
    <button onClick={onClick}
      className={"shrink-0 rounded-full border px-3.5 py-1.5 text-[13.5px] font-500 transition-all " +
        (active ? "border-accent bg-accent text-white shadow-sm" : "border-ink-100 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50")}>
      {children}
    </button>
  );
}

function Browse({ onRegister }) {
  const R = window.RALLY;
  const { useReveal } = window;
  const ref = useReveal();
  const [sport, setSport] = useStateI("");
  const [location, setLocation] = useStateI("");
  const [win, setWin] = useStateI("");
  const [cat, setCat] = useStateI("");

  // listen for hero search events
  useEffectI(() => {
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

  const results = useMemo(() => R.COMPETITIONS.filter((c) =>
    (!sport || c.sport === sport) &&
    (!location || c.location === location) &&
    (!win || c.window === win) &&
    (!cat || c.cats.includes(cat))
  ), [sport, location, win, cat]);

  const active = sport || location || win || cat;
  const reset = () => { setSport(""); setLocation(""); setWin(""); setCat(""); };

  return (
    <section id="browse" ref={ref} className="bg-ink-50/60 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-500">Upcoming competitions</span>
            <h2 className="font-display mt-3 text-[clamp(30px,4vw,46px)] font-700 leading-[1.04] tracking-[-0.02em] text-ink-900">
              Browse what's open now.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-500">
            Filter by sport, city, date and skill category to find a competition that fits.
          </p>
        </div>

        {/* Filters */}
        <div className="reveal mt-8 rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Sport</span>
              <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
                <FilterChip active={!sport} onClick={() => setSport("")}>All</FilterChip>
                {R.SPORTS.map((s) => (
                  <FilterChip key={s.id} active={sport === s.id} onClick={() => setSport(s.id)}>{s.label}</FilterChip>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-ink-100 pt-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">City</span>
              <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-transparent py-2.5 text-[14.5px] font-500 text-ink-900 outline-none">
                <option value="">Anywhere</option>
                {R.LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">When</span>
              <select value={win} onChange={(e) => setWin(e.target.value)} className="w-full bg-transparent py-2.5 text-[14.5px] font-500 text-ink-900 outline-none">
                <option value="">Any time</option>
                {R.WINDOWS.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-ink-100 px-3">
              <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Level</span>
              <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full bg-transparent py-2.5 text-[14.5px] font-500 text-ink-900 outline-none">
                <option value="">All levels</option>
                {R.CATEGORIES.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        {/* Result meta */}
        <div className="reveal mt-7 flex items-center justify-between">
          <p className="text-[14.5px] text-ink-500">
            <b className="font-display text-ink-900">{results.length}</b> {results.length === 1 ? "competition" : "competitions"} found
          </p>
          {active && (
            <button onClick={reset} className="text-[14px] font-500 text-accent hover:underline">Clear filters</button>
          )}
        </div>

        {/* Grid */}
        {results.length > 0 ? (
          <div className="reveal mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((c) => <CompetitionCard key={c.id} c={c} onRegister={onRegister} />)}
          </div>
        ) : (
          <div className="reveal mt-5 grid place-items-center rounded-2xl border border-dashed border-ink-200 bg-white py-20 text-center">
            <p className="font-display text-[20px] font-600 text-ink-900">No competitions match those filters</p>
            <p className="mt-2 text-[14.5px] text-ink-500">Try widening your search.</p>
            <button onClick={reset} className="mt-5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-600 text-white">Reset filters</button>
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- Participate -- */
/* 4-step guided selector: sport -> location -> time -> category -> register */
function Participate({ onRegister }) {
  const R = window.RALLY;
  const { useReveal, Btn, Arrow } = window;
  const ref = useReveal();
  const STEPS = [
    { key: "sport", label: "Sport", q: "What do you compete in?", list: R.SPORTS },
    { key: "location", label: "Location", q: "Where do you want to race?", list: R.LOCATIONS },
    { key: "window", label: "Time", q: "When works for you?", list: R.WINDOWS },
    { key: "category", label: "Category", q: "What's your level?", list: R.CATEGORIES },
  ];
  const [step, setStep] = useStateI(0);
  const [sel, setSel] = useStateI({ sport: "", location: "", window: "", category: "" });
  const done = step >= STEPS.length;

  const matches = useMemo(() => R.COMPETITIONS.filter((c) =>
    (!sel.sport || c.sport === sel.sport) &&
    (!sel.location || c.location === sel.location) &&
    (!sel.window || c.window === sel.window) &&
    (!sel.category || c.cats.includes(sel.category))
  ), [sel]);

  const pick = (key, val) => {
    setSel((s) => ({ ...s, [key]: val }));
    setTimeout(() => setStep((n) => n + 1), 160);
  };
  const restart = () => { setSel({ sport: "", location: "", window: "", category: "" }); setStep(0); };
  const seeMatches = () => {
    window.dispatchEvent(new CustomEvent("rally:filter", { detail: sel }));
    window.scrollTo({ top: document.getElementById("browse").offsetTop - 70, behavior: "smooth" });
  };

  const cur = STEPS[Math.min(step, STEPS.length - 1)];

  return (
    <section id="participate" ref={ref} className="py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-500">How to participate</span>
          <h2 className="font-display mt-3 text-[clamp(30px,4.4vw,50px)] font-700 leading-[1.02] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
            Four steps to your start line.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[17px] leading-relaxed text-ink-500">
            Choose a sport, a location, a time and your category — then register.
          </p>
        </div>

        {/* Stepper rail */}
        <div className="reveal mx-auto mt-12 flex max-w-2xl items-center justify-between">
          {STEPS.map((s, i) => {
            const state = done || i < step ? "done" : i === step ? "active" : "todo";
            return (
              <React.Fragment key={s.key}>
                <button
                  onClick={() => (i <= step || done) && setStep(i)}
                  className="flex flex-col items-center gap-2"
                  disabled={i > step && !done}>
                  <span className={"grid h-10 w-10 place-items-center rounded-full font-display text-[15px] font-600 transition-all " +
                    (state === "done" ? "bg-accent text-white" : state === "active" ? "border-2 border-accent bg-white text-accent" : "border border-ink-200 bg-white text-ink-300")}>
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className={"text-[12.5px] font-500 " + (state === "todo" ? "text-ink-300" : "text-ink-900")}>{s.label}</span>
                  <span className="h-4 text-[11px] text-ink-500">{sel[s.key] ? labelOf(R, s.key, sel[s.key]) : ""}</span>
                </button>
                {i < STEPS.length - 1 && <span className={"mx-1 h-px flex-1 " + (i < step || done ? "bg-accent" : "bg-ink-100")} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Panel */}
        <div className="reveal mx-auto mt-10 max-w-3xl rounded-3xl border border-ink-100 bg-white p-8 shadow-sm sm:p-10">
          {!done ? (
            <div>
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-[24px] font-600 text-ink-900">{cur.q}</h3>
                <span className="font-mono text-[12px] text-ink-300">Step {step + 1} / {STEPS.length}</span>
              </div>
              <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {cur.list.map((opt) => {
                  const isSel = sel[cur.key] === opt.id;
                  return (
                    <button key={opt.id} onClick={() => pick(cur.key, opt.id)}
                      className={"group flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all " +
                        (isSel ? "border-accent bg-[var(--accent-soft)]" : "border-ink-100 hover:border-ink-300 hover:bg-ink-50")}>
                      <span className={"grid h-9 w-9 place-items-center rounded-lg font-mono text-[13px] font-500 " + (isSel ? "bg-accent text-white" : "bg-ink-50 text-ink-500 group-hover:bg-white")}>
                        {opt.label.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-[15px] font-600 leading-tight text-ink-900">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}
                  className="text-[14.5px] font-500 text-ink-500 hover:text-ink-900 disabled:opacity-0">← Back</button>
                <button onClick={() => setStep((n) => n + 1)}
                  className="text-[14.5px] font-500 text-ink-500 hover:text-accent">Skip this step →</button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent">Your selection</span>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {STEPS.map((s) => (
                  <span key={s.key} className="inline-flex items-center gap-2 rounded-full border border-ink-100 bg-ink-50 px-3.5 py-1.5 text-[14px] font-500 text-ink-900">
                    <span className="font-mono text-[10px] uppercase tracking-wide text-ink-300">{s.label}</span>
                    {sel[s.key] ? labelOf(R, s.key, sel[s.key]) : "Any"}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-[17px] text-ink-700">
                <b className="font-display text-[22px] text-ink-900">{matches.length}</b> {matches.length === 1 ? "competition matches" : "competitions match"} your pick.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Btn variant="primary" size="lg" onClick={matches.length ? () => onRegister(matches[0]) : seeMatches} disabled={!matches.length}>
                  {matches.length ? "Register for top match" : "No matches"} <Arrow />
                </Btn>
                <Btn variant="outline" size="lg" onClick={seeMatches}>See all matches</Btn>
                <button onClick={restart} className="text-[14.5px] font-500 text-ink-500 hover:text-ink-900">Start over</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function labelOf(R, key, id) {
  if (key === "sport") return R.sportLabel(id);
  if (key === "location") return R.locationLabel(id);
  if (key === "window") return R.windowLabel(id);
  if (key === "category") return R.categoryLabel(id);
  return id;
}

Object.assign(window, { CompetitionCard, Browse, Participate });
