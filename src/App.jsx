import { useState, useEffect } from 'react';
import { LangProvider, useLang } from './LangContext';
import { SessionProvider } from './SessionContext';
import { Nav, Hero, Organizer, FinalCTA, Footer } from './components/sections';
import { Browse, Participate } from './components/interactive';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect } from './components/TweaksPanel';
import { Btn, SportTag } from './components/primitives';
import { AuthPage } from './components/auth';
import { ProfileModal } from './components/profile';

const TWEAK_DEFAULTS = {
  heroStyle: "split",
  accent: "#1d4ed8",
  displayFont: "Schibsted Grotesk",
};

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="ring-accent mt-1.5 w-full rounded-xl border border-ink-100 px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent" />
    </label>
  );
}

function RegisterModal({ comp, onClose }) {
  const { t } = useLang();
  const r = t.register;
  const [stage, setStage] = useState("form");
  const [form, setForm] = useState({ name: "", email: "", cat: comp ? comp.cats[0] : "" });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  if (!comp) return null;
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ph relative h-28">
          <span className="ph-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{t.data.sports[comp.sport]?.toLowerCase()} photo</span>
          <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-700 backdrop-blur hover:bg-white" aria-label="Close">✕</button>
        </div>
        {stage === "form" ? (
          <div className="p-6">
            <SportTag sport={comp.sport} />
            <h3 className="font-display mt-1.5 text-[22px] font-700 leading-snug text-ink-900">{comp.title}</h3>
            <div className="mt-1 text-[13.5px] text-ink-500">{t.data.locations[comp.location]} · {comp.date} · {comp.distance}</div>
            <div className="mt-5 space-y-3">
              <Field label={r.nameLbl} value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder={r.namePlaceholder} />
              <Field label={r.emailLbl} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="alex@email.com" />
              <div>
                <label className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{r.categoryLbl}</label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {comp.cats.map((c) => (
                    <button key={c} onClick={() => setForm({ ...form, cat: c })}
                      className={"rounded-full border px-3 py-1.5 text-[13px] font-500 transition-all " + (form.cat === c ? "border-accent bg-accent text-white" : "border-ink-100 text-ink-700 hover:border-ink-300")}>
                      {t.data.categories[c]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
              <div><span className="font-display text-[22px] font-700 text-ink-900">£{comp.price}</span><span className="ml-1 text-[12px] text-ink-500">{r.entry}</span></div>
              <Btn variant="primary" size="md" disabled={!valid} onClick={() => setStage("done")}>{r.confirmCta}</Btn>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="font-display mt-4 text-[22px] font-700 text-ink-900">
              {r.successTitleFn(form.name.split(" ")[0] || (t === t ? "athlete" : "атлет"))}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
              {r.successBodyFn(comp.title, t.data.categories[form.cat], form.email)}
            </p>
            <Btn variant="dark" size="md" className="mt-6" onClick={onClose}>{r.doneCta}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

function RallyApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [reg, setReg] = useState(null);
  const [authMode, setAuthMode] = useState(null); // "signin" | "signup" | null
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", `color-mix(in srgb, ${t.accent} 9%, white)`);
    root.style.setProperty("--accent-ink", `color-mix(in srgb, ${t.accent} 62%, black)`);
    root.style.setProperty("--font-display", `'${t.displayFont}'`);
  }, [t.accent, t.displayFont]);

  return (
    <div id="top">
      <Nav onAuth={setAuthMode} onCreateProfile={() => setProfileOpen(true)} />
      <main>
        <Hero style={t.heroStyle} />
        <Browse onRegister={setReg} />
        <Participate onRegister={setReg} />
        <Organizer />
        <FinalCTA onAuth={setAuthMode} />
      </main>
      <Footer />
      {reg && <RegisterModal comp={reg} onClose={() => setReg(null)} />}
      {authMode && <AuthPage mode={authMode} onClose={() => setAuthMode(null)} />}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}

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

export default function App() {
  return (
    <LangProvider>
      <SessionProvider>
        <RallyApp />
      </SessionProvider>
    </LangProvider>
  );
}
