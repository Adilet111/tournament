import { useState, useEffect } from 'react';
import { LangProvider, useLang } from './LangContext';
import { SessionProvider, useSession } from './SessionContext';
import { Nav, Hero, Organizer, FinalCTA, Footer } from './components/sections';
import { Browse, Participate } from './components/interactive';
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSelect } from './components/TweaksPanel';
import { Btn, SportTag } from './components/primitives';
import { AuthPage } from './components/auth';
import { ProfileModal } from './components/profile';
import { ProfileOnboarding } from './components/onboarding';
import { AdminApp } from './admin/AdminApp';
import { ProfilePage } from './components/profilePage';
import { getProfile, submitProfileAnswers, registerForTournament } from './lib/api';

const TWEAK_DEFAULTS = {
  heroStyle: "split",
  accent: "#1d4ed8",
  displayFont: "Schibsted Grotesk",
};

function RegisterModal({ comp, onClose }) {
  const { t } = useLang();
  const r = t.register;
  const { user, isAuthed, addProfile } = useSession();
  const [stage, setStage] = useState("form");
  const [form, setForm] = useState({ cat: comp ? comp.cats[0] : "" });
  // Backend skill-profile check for the clicked tournament's sport slug.
  const [profileState, setProfileState] = useState("loading"); // loading | found | missing | error
  const [checkKey, setCheckKey] = useState(0);
  const [onboarding, setOnboarding] = useState(false); // chat-style profile builder
  const [registerState, setRegisterState] = useState("idle"); // idle | submitting | error

  // Confirm registration: POST /tournaments/:id/register, then show the success
  // screen. The signed-in user is identified by the auth cookie.
  const submitRegistration = async () => {
    if (registerState === "submitting") return;
    setRegisterState("submitting");
    try {
      await registerForTournament(comp.id);
      setRegisterState("idle");
      setStage("done");
    } catch {
      setRegisterState("error");
    }
  };
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const sportSlug = comp?.sport;
  // On open (and on retry), GET /profiles/<sport slug> to see whether a profile
  // already exists. The modal is keyed per tournament so it remounts (state
  // resets to "loading") whenever a different competition is opened.
  useEffect(() => {
    if (!sportSlug) return;
    let cancelled = false;
    getProfile(sportSlug)
      .then((p) => { if (!cancelled) setProfileState(p ? "found" : "missing"); })
      .catch(() => { if (!cancelled) setProfileState("error"); });
    return () => { cancelled = true; };
  }, [sportSlug, isAuthed, checkKey]);
  if (!comp) return null;
  const hasProfile = profileState === "found";
  // Registration is gated on having a skill profile for this sport — the
  // signed-in user's name/email are taken from their account, not re-entered.
  const valid = hasProfile && !!form.cat;
  const sportName = t.data.sports[comp.sport] || comp.sport;

  // "Create profile" launches the chat-style onboarding instead of a plain form.
  if (onboarding) {
    return (
      <ProfileOnboarding
        sport={comp.sport}
        sportLabel={sportName}
        name={user?.name || ""}
        onClose={() => setOnboarding(false)}
        onSubmit={(answers) => submitProfileAnswers(comp.sport, answers)}
        onComplete={(answers, rank) => {
          // The backend has scored the answers; persist the profile + rank and
          // flip the modal to "found".
          addProfile({
            sport: comp.sport,
            displayName: user?.name || "",
            answers,
            division: rank?.division?.key,
            tier: rank?.tier,
            rating: rank?.rating,
            rankLabel: rank?.label,
          });
          setOnboarding(false);
          setProfileState("found");
        }}
      />
    );
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ph relative h-28">
          <span className="ph-label absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{t.data.sports[comp.sport]?.toLowerCase()} {r.photoLabel}</span>
          <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink-700 backdrop-blur hover:bg-white" aria-label="Close">✕</button>
        </div>
        {stage === "form" ? (
          <div className="p-6">
            <SportTag sport={comp.sport} />
            <h3 className="font-display mt-1.5 text-[22px] font-700 leading-snug text-ink-900">{comp.title}</h3>
            <div className="mt-1 text-[13.5px] text-ink-500">{t.data.locations[comp.location]} · {comp.date} · {comp.distance}</div>
            <div className="mt-5 space-y-3">
              {profileState === "loading" && (
                <div className="flex items-center gap-2 py-1 text-[13px] text-ink-500">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
                  {r.checkingFn(sportName.toLowerCase())}
                </div>
              )}
              {profileState === "found" && (
                <div>
                  <div className="mb-3 flex items-center gap-1.5 text-[12.5px] font-600 text-[var(--accent-ink)]">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {r.profileReadyFn(sportName)}
                  </div>
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
              )}
              {profileState === "missing" && (
                <div className="rounded-2xl border border-dashed border-accent/40 bg-[var(--accent-soft)] p-4 text-center">
                  <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-white text-[var(--accent-ink)] shadow-sm">
                    <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="8.5" width="12" height="8" rx="2" /><path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" strokeLinecap="round" /></svg>
                  </span>
                  <p className="mt-2.5 text-[14px] font-700 text-ink-900">{r.createFirstFn(sportName)}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{r.unlockNote}</p>
                  <Btn variant="dark" size="md" className="mt-3.5 w-full justify-center" onClick={() => setOnboarding(true)}>{r.createProfileFn(sportName)}</Btn>
                </div>
              )}
              {profileState === "error" && (
                <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-4 text-center">
                  <p className="text-[13.5px] text-ink-500">{isAuthed ? r.checkFailed : r.signInToCheck}</p>
                  <button onClick={() => { setProfileState("loading"); setCheckKey((k) => k + 1); }} className="mt-2 text-[13.5px] font-600 text-accent hover:underline">{r.retry}</button>
                </div>
              )}
            </div>
            <div className="mt-6 border-t border-ink-100 pt-4">
              <div className="flex items-center justify-between">
                <div><span className="font-display text-[22px] font-700 text-ink-900">£{comp.price}</span><span className="ml-1 text-[12px] text-ink-500">{r.entry}</span></div>
                <Btn variant="primary" size="md" disabled={!valid || registerState === "submitting"} onClick={submitRegistration}>
                  {registerState === "submitting" ? r.registering : r.confirmCta}
                </Btn>
              </div>
              {!hasProfile && (
                <p className="mt-2.5 text-right text-[12px] text-ink-400">
                  {profileState === "missing" ? r.createToRegisterFn(sportName) : r.completeCheck}
                </p>
              )}
              {registerState === "error" && (
                <p className="mt-2.5 text-right text-[12px] font-500 text-red-500">{r.registerFailed}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="font-display mt-4 text-[22px] font-700 text-ink-900">
              {r.successTitleFn((user?.name || "").split(" ")[0] || r.fallbackAthlete)}
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
              {r.successBodyFn(comp.title, t.data.categories[form.cat], user?.email || "")}
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
      {reg && <RegisterModal key={reg.id} comp={reg} onClose={() => setReg(null)} />}
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

/* Tiny hash router: '#admin' shows the organizer dashboard, '#profile' the
   signed-in user's profile page, anything else the landing page. Non-admins are
   bounced off '#admin'; signed-out users are bounced off '#profile'. */
const readRoute = () => {
  const h = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  return h === 'admin' || h === 'profile' ? h : 'home';
};

function Router() {
  const { isAdmin, isAuthed, authReady } = useSession();
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Redirect users away from routes they can't see (non-admins off #admin,
  // signed-out users off #profile). Wait for the /auth/me answer first —
  // otherwise a signed-in admin would be bounced home on every page refresh.
  useEffect(() => {
    if (!authReady) return;
    if (route === 'admin' && !isAdmin) window.location.hash = '';
    if (route === 'profile' && !isAuthed) window.location.hash = '';
  }, [route, isAdmin, isAuthed, authReady]);

  if (route === 'admin' && isAdmin) {
    return <AdminApp onExit={() => { window.location.hash = ''; }} />;
  }
  if (route === 'profile' && isAuthed) {
    return <ProfilePage onExit={() => { window.location.hash = ''; }} />;
  }
  return <RallyApp />;
}

/* Shown when any API call answers 401 while the user was signed in (the
   SessionProvider flips `sessionExpired`). Offers to sign back in via the
   regular auth modal, or dismiss and keep browsing signed out. */
function SessionExpiredNotice() {
  const { t } = useLang();
  const se = t.sessionExpired;
  const { sessionExpired, clearSessionExpired } = useSession();
  const [authOpen, setAuthOpen] = useState(false);

  if (!sessionExpired) return null;
  if (authOpen) {
    return <AuthPage mode="signin" onClose={() => { setAuthOpen(false); clearSessionExpired(); }} />;
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-[fadein_.2s_ease]" onMouseDown={clearSessionExpired} />
      <div className="relative w-full max-w-sm rounded-3xl border border-ink-100 bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="5" y="10.5" width="14" height="9" rx="2" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="font-display mt-4 text-[20px] font-700 text-ink-900">{se.title}</h3>
        <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-ink-500">{se.body}</p>
        <div className="mt-6 flex flex-col gap-2">
          <Btn variant="primary" size="md" className="w-full justify-center" onClick={() => setAuthOpen(true)}>{se.signInCta}</Btn>
          <button onClick={clearSessionExpired} className="py-1.5 text-[13.5px] font-500 text-ink-500 hover:text-ink-900">{se.dismiss}</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <SessionProvider>
        <Router />
        <SessionExpiredNotice />
      </SessionProvider>
    </LangProvider>
  );
}
