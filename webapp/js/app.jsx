/* Rally — app composition, registration modal, tweaks. */
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroStyle": "split",
  "accent": "#1d4ed8",
  "displayFont": "Schibsted Grotesk"
}/*EDITMODE-END*/;

/* ---- registration modal ---- */
function RegisterModal({ comp, onClose }) {
  const { Btn, SportTag, Pill } = window;
  const R = window.RALLY;
  const [stage, setStage] = useStateA("form");
  const [form, setForm] = useStateA({ name: "", email: "", cat: comp ? comp.cats[0] : "" });
  useEffectA(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, []);
  if (!comp) return null;
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ph relative h-28">
          <span className="ph-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{R.sportLabel(comp.sport).toLowerCase()} photo</span>
          <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-700 backdrop-blur hover:bg-white" aria-label="Close">✕</button>
        </div>
        {stage === "form" ? (
          <div className="p-6">
            <SportTag sport={comp.sport} />
            <h3 className="font-display mt-1.5 text-[22px] font-700 leading-snug text-ink-900">{comp.title}</h3>
            <div className="mt-1 text-[13.5px] text-ink-500">{R.locationLabel(comp.location)} · {comp.date} · {comp.distance}</div>
            <div className="mt-5 space-y-3">
              <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Alex Morgan" />
              <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="alex@email.com" />
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Category</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {comp.cats.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, cat: c })}
                      className={"rounded-full border px-3 py-1.5 text-[13px] font-500 transition-all " + (form.cat === c ? "border-accent bg-accent text-white" : "border-ink-100 text-ink-700 hover:border-ink-300")}>
                      {R.categoryLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
              <div><span className="font-display text-[22px] font-700 text-ink-900">£{comp.price}</span><span className="ml-1 text-[12px] text-ink-500">entry</span></div>
              <Btn variant="primary" size="md" disabled={!valid} onClick={() => setStage("done")}>Confirm & register</Btn>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="font-display mt-4 text-[22px] font-700 text-ink-900">You're in, {form.name.split(" ")[0] || "athlete"}!</h3>
            <p className="mx-auto mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
              Your spot for <b className="text-ink-900">{comp.title}</b> ({R.categoryLabel(form.cat)}) is reserved. A confirmation is on its way to {form.email}.
            </p>
            <Btn variant="dark" size="md" className="mt-6" onClick={onClose}>Done</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="ring-accent mt-1.5 w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent" />
    </label>
  );
}

/* ---- root ---- */
function App() {
  const { Nav, Hero, Browse, Participate, Organizer, FinalCTA, Footer } = window;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect } = window;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [reg, setReg] = useStateA(null);

  useEffectA(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", `color-mix(in srgb, ${t.accent} 9%, white)`);
    root.style.setProperty("--accent-ink", `color-mix(in srgb, ${t.accent} 62%, black)`);
    root.style.setProperty("--font-display", `'${t.displayFont}'`);
  }, [t.accent, t.displayFont]);

  return (
    <div id="top">
      <Nav />
      <main>
        <Hero style={t.heroStyle} />
        <Browse onRegister={setReg} />
        <Participate onRegister={setReg} />
        <Organizer />
        <FinalCTA />
      </main>
      <Footer />
      {reg && <RegisterModal comp={reg} onClose={() => setReg(null)} />}

      <TweaksPanel>
        <TweakSection label="Hero" />
        <TweakRadio label="Hero style" value={t.heroStyle}
          options={["split", "centered", "editorial"]}
          onChange={(v) => setTweak("heroStyle", v)} />
        <TweakSection label="Brand" />
        <TweakColor label="Accent" value={t.accent}
          options={["#1d4ed8", "#0d9488", "#e2580b", "#7c3aed", "#0f172a"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSelect label="Headline font" value={t.displayFont}
          options={["Schibsted Grotesk", "Space Grotesk", "Hanken Grotesk"]}
          onChange={(v) => setTweak("displayFont", v)} />
      </TweaksPanel>

      <style>{`@keyframes fadein{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
