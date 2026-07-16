/* Rally — sign-in / registration overlay (Vite/ESM build).
   Rendered on top of the app from App.jsx. Open via Nav "Sign in" / "Register". */
import { useState, useEffect } from 'react';
import { signInWithGoogle, loginWithProvider, sessionFromLogin } from '../lib/auth';
import { useSession } from '../SessionContext';
import { useLang } from '../LangContext';

/* ---- brand logo (button, so it can close the overlay) ---- */
function AuthLogo({ onClick }) {
  return (
    <button onClick={onClick} className="group inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink-900 transition-transform group-hover:-rotate-6">
        <span className="block h-3 w-3 rotate-45 bg-accent" />
      </span>
      <span className="font-display text-[22px] font-700 tracking-tight text-ink-900">Rally</span>
    </button>
  );
}

/* ---- provider icons ---- */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29A7.21 7.21 0 0 1 4.89 12c0-.8.14-1.57.38-2.29V6.62H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.18 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.54c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.02-3.77-2.05-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.82 3.15-.47 7.81 1.3 10.37.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.27 3.15-2.53 1-1.45 1.41-2.86 1.43-2.93-.03-.01-2.74-1.05-2.77-4.16zM14.6 4.6c.72-.87 1.2-2.08 1.07-3.29-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.32-.58 3.03-1.45z" />
    </svg>
  );
}

function ProviderButton({ icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="ring-accent flex w-full items-center justify-center gap-3 whitespace-nowrap rounded-xl border border-ink-200 bg-white px-4 py-3 text-[15px] font-600 text-ink-900 transition-all hover:border-ink-300 hover:bg-ink-50 active:translate-y-px">
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TextField({ label, type = "text", value, onChange, placeholder, autoComplete }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{label}</span>
      <input type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="ring-accent mt-1.5 w-full rounded-xl border border-ink-200 px-3.5 py-3 text-[15px] text-ink-900 outline-none transition-colors placeholder:text-ink-300 focus:border-accent" />
    </label>
  );
}

/* ---- the registration card ---- */
function RegisterCard({ initialMode = "signup", onClose }) {
  const { signIn } = useSession();
  const { t } = useLang();
  const a = t.auth;
  const [mode, setMode] = useState(initialMode); // signup | signin
  const [form, setForm] = useState({ name: "", email: "", password: "", birthDate: "" });
  const [stage, setStage] = useState("form"); // form | provider | birthdate | done
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(null);
  // Google ID token held only while the birthdate stage may need to re-send
  // POST /auth/login with a birthDate (never persisted).
  const [pendingIdToken, setPendingIdToken] = useState(null);
  const [savingBirth, setSavingBirth] = useState(false);

  const isSignup = mode === "signup";
  const emailOk = /\S+@\S+\.\S+/.test(form.email);
  const valid = emailOk && form.password.length >= 6 && (!isSignup || form.name.trim().length > 1);

  /* Provider sign-in: get an ID token from the provider in the browser, then
     exchange it at POST /auth/login. The backend registers-or-logs-in. If the
     account still has no birthDate, ask for it and re-send the login. */
  const oauth = async (name) => {
    setProvider(name);
    setError(null);
    setStage("provider");
    try {
      if (name === "Google") {
        const { session, idToken } = await signInWithGoogle(isSignup ? form.birthDate || undefined : undefined);
        if (session.user?.birthDate == null) {
          setPendingIdToken(idToken);
          setStage("birthdate");
          return;
        }
        signIn(session);
      } else {
        throw new Error(a.notConfiguredFn(name));
      }
      setStage("done");
    } catch (err) {
      setError(err.message || a.signinFailed);
      setStage("form");
    }
  };

  /* Birthdate stage: re-send /auth/login with the same ID token + birthDate. */
  const saveBirthDate = async () => {
    if (!form.birthDate || savingBirth) return;
    setSavingBirth(true);
    setError(null);
    try {
      const backend = await loginWithProvider("google", pendingIdToken, form.birthDate);
      signIn(sessionFromLogin(backend, pendingIdToken));
      setPendingIdToken(null);
      setStage("done");
    } catch (err) {
      setError(err.message || a.signinFailed);
    } finally {
      setSavingBirth(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setProvider(null);
    signIn({ provider: "email", user: { name: form.name || form.email, email: form.email } });
    setStage("done");
  };

  if (stage === "provider") {
    return (
      <div className="grid min-h-[420px] place-items-center text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink-100 border-t-accent" />
          <p className="mt-5 text-[15px] font-600 text-ink-900">{a.connectingFn(provider)}</p>
          <p className="mt-1 text-[13.5px] text-ink-500">{a.redirectNote}</p>
        </div>
      </div>
    );
  }

  if (stage === "birthdate") {
    return (
      <div className="grid min-h-[420px] place-items-center">
        <div className="w-full max-w-xs text-center">
          <h2 className="font-display text-[24px] font-700 text-ink-900">{a.birthTitle}</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{a.birthBody}</p>
          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-[13.5px] text-red-700" role="alert">
              {error}
            </div>
          )}
          <div className="mt-5 text-left">
            <TextField label={a.birthDateLbl} type="date" value={form.birthDate}
              onChange={(v) => setForm({ ...form, birthDate: v })} autoComplete="bday" />
          </div>
          <button onClick={saveBirthDate} disabled={!form.birthDate || savingBirth}
            className="ring-accent mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-600 text-white transition-all hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none">
            {savingBirth ? a.birthSaving : a.birthSave}
          </button>
        </div>
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="grid min-h-[420px] place-items-center text-center">
        <div>
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)]">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <h2 className="font-display mt-5 text-[24px] font-700 text-ink-900">
            {isSignup ? a.createdTitle : a.welcomeTitle}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
            {provider
              ? a.providerDoneFn(provider)
              : a.emailDoneFn(form.name ? form.name.split(" ")[0] : "")}
          </p>
          <div className="mt-7 flex flex-col gap-2.5">
            <button onClick={onClose}
              className="ring-accent inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-600 text-white transition-all hover:brightness-110">
              {a.browseCompetitions}
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button onClick={() => { setStage("form"); setProvider(null); }}
              className="text-[14px] font-500 text-ink-500 hover:text-ink-900">{a.back}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* mode toggle */}
      <div className="inline-flex rounded-full border border-ink-100 bg-ink-50 p-1">
        {[["signup", a.toggleSignup], ["signin", a.toggleSignin]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={"whitespace-nowrap rounded-full px-4 py-1.5 text-[13.5px] font-600 transition-all " +
              (mode === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900")}>
            {label}
          </button>
        ))}
      </div>

      <h1 className="font-display mt-6 text-[clamp(28px,4vw,36px)] font-700 leading-tight tracking-[-0.02em] text-ink-900">
        {isSignup ? a.joinTitle : a.welcomeTitle}
      </h1>
      <p className="mt-2 text-[15.5px] text-ink-500">
        {isSignup ? a.signupSubtitle : a.signinSubtitle}
      </p>

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* providers */}
      <div className="mt-7 space-y-2.5">
        <ProviderButton icon={<GoogleIcon />} label={a.continueWithFn("Google")} onClick={() => oauth("Google")} />
        <ProviderButton icon={<AppleIcon />} label={a.continueWithFn("Apple")} onClick={() => oauth("Apple")} />
      </div>

      {/* divider */}
      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-ink-100" />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-300">{a.orWithEmail}</span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>

      {/* email form */}
      <form onSubmit={submit} className="space-y-3.5">
        {isSignup && (
          <>
            <TextField label={a.nameLbl} value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder={a.namePlaceholder} autoComplete="name" />
            <TextField label={a.birthDateLbl} type="date" value={form.birthDate} onChange={(v) => setForm({ ...form, birthDate: v })} autoComplete="bday" />
          </>
        )}
        <TextField label={a.emailLbl} type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="alex@email.com" autoComplete="email" />
        <TextField label={a.passwordLbl} type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder={a.passwordPlaceholder} autoComplete={isSignup ? "new-password" : "current-password"} />

        <button type="submit" disabled={!valid}
          className="ring-accent mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-5 py-3.5 text-[15px] font-600 text-white transition-all hover:bg-ink-700 active:translate-y-px disabled:opacity-40 disabled:pointer-events-none">
          {isSignup ? a.submitSignup : a.submitSignin}
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-500">
        {isSignup ? a.termsPre : a.troublePre}
        {isSignup
          ? (<><a href="#" className="font-500 text-ink-900 underline-offset-2 hover:underline">{a.terms}</a>{a.and}<a href="#" className="font-500 text-ink-900 underline-offset-2 hover:underline">{a.privacy}</a>.</>)
          : (<a href="#" className="font-500 text-accent hover:underline">{a.resetPassword}</a>)}
      </p>
    </div>
  );
}

/* ---- full-screen auth overlay ---- */
export function AuthPage({ mode = "signup", onClose }) {
  const { t } = useLang();
  const a = t.auth;
  /* lock body scroll + close on Escape while open */
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
        {/* left — brand / visual panel */}
        <aside className="relative hidden overflow-hidden bg-ink-900 lg:block">
          <image-slot id="auth-visual" shape="rect" placeholder="drop image — athletes at the start line"
            style={{ display: "block", position: "absolute", inset: 0, width: "100%", height: "100%" }}></image-slot>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-ink-900/30" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <AuthLogo onClick={onClose} />
            <div>
              <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/60">{a.panelEyebrow}</span>
              <h2 className="font-display mt-4 max-w-md text-[clamp(28px,3.4vw,42px)] font-700 leading-[1.05] tracking-[-0.02em] text-white" style={{ textWrap: "balance" }}>
                {a.panelTitle}
              </h2>
              <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/70">
                {a.panelBody}
              </p>
              <div className="mt-8 grid max-w-sm grid-cols-3 gap-5 border-t border-white/15 pt-6">
                {[["1,240+", a.panelStatEvents], ["52k", a.panelStatAthletes], ["8", a.panelStatSports]].map(([n, l]) => (
                  <div key={l}>
                    <div className="font-display text-[24px] font-700 text-white">{n}</div>
                    <div className="text-[12.5px] text-white/55">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* right — form panel */}
        <main className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between p-6 lg:hidden">
            <AuthLogo onClick={onClose} />
            <button onClick={onClose} className="text-[14px] font-500 text-ink-500 hover:text-ink-900">{a.backShort}</button>
          </div>
          <div className="hidden justify-end p-6 lg:flex">
            <button onClick={onClose} className="text-[14px] font-500 text-ink-500 hover:text-ink-900">{a.backToSite}</button>
          </div>
          <div className="flex flex-1 items-center justify-center px-6 pb-12">
            <div className="w-full max-w-[400px]">
              <RegisterCard initialMode={mode} onClose={onClose} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
