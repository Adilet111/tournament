/* Rally — registration / sign-up page component.
   Renders into #root on Register.html. Self-contained (no dependency on sections.jsx). */
const { useState, useEffect } = React;

/* ---- brand logo (local copy so this page stands alone) ---- */
function AuthLogo() {
  return (
    <a href="Rally - Landing Page.html" className="group inline-flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink-900 transition-transform group-hover:-rotate-6">
        <span className="block h-3 w-3 rotate-45 bg-accent" />
      </span>
      <span className="font-display text-[22px] font-700 tracking-tight text-ink-900">Rally</span>
    </a>
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

/* ---- the registration card (reusable component) ---- */
function RegisterCard() {
  const [mode, setMode] = useState(
    typeof window !== "undefined" && window.location.hash === "#signin" ? "signin" : "signup"
  ); // signup | signin
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [stage, setStage] = useState("form"); // form | provider | done
  const [provider, setProvider] = useState(null);

  const isSignup = mode === "signup";
  const emailOk = /\S+@\S+\.\S+/.test(form.email);
  const valid = emailOk && form.password.length >= 6 && (!isSignup || form.name.trim().length > 1);

  /* In a real app these go to your OAuth endpoint, e.g.
     window.location.href = '/auth/google'  (server starts the OAuth flow)
     Here we simulate the redirect + return. */
  const oauth = (name) => {
    setProvider(name);
    setStage("provider");
    setTimeout(() => setStage("done"), 1400);
  };
  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    setProvider(null);
    setStage("done");
  };

  if (stage === "provider") {
    return (
      <div className="grid min-h-[420px] place-items-center text-center">
        <div>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-ink-100 border-t-accent" />
          <p className="mt-5 text-[15px] font-600 text-ink-900">Connecting to {provider}…</p>
          <p className="mt-1 text-[13.5px] text-ink-500">You'll be redirected to authorize Rally.</p>
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
            {isSignup ? "Account created" : "Welcome back"}
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-[14.5px] leading-relaxed text-ink-500">
            {provider
              ? `Signed in with ${provider}. You're all set to find a competition.`
              : `You're registered${form.name ? ", " + form.name.split(" ")[0] : ""}. Time to pick your start line.`}
          </p>
          <div className="mt-7 flex flex-col gap-2.5">
            <a href="Rally - Landing Page.html#browse"
              className="ring-accent inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-600 text-white transition-all hover:brightness-110">
              Browse competitions
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <button onClick={() => { setStage("form"); setProvider(null); }}
              className="text-[14px] font-500 text-ink-500 hover:text-ink-900">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* mode toggle */}
      <div className="inline-flex rounded-full border border-ink-100 bg-ink-50 p-1">
        {[["signup", "Create account"], ["signin", "Sign in"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)}
            className={"whitespace-nowrap rounded-full px-4 py-1.5 text-[13.5px] font-600 transition-all " +
              (mode === m ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900")}>
            {label}
          </button>
        ))}
      </div>

      <h1 className="font-display mt-6 text-[clamp(28px,4vw,36px)] font-700 leading-tight tracking-[-0.02em] text-ink-900">
        {isSignup ? "Join Rally" : "Welcome back"}
      </h1>
      <p className="mt-2 text-[15.5px] text-ink-500">
        {isSignup ? "Create an account to register and compete." : "Sign in to manage your competitions."}
      </p>

      {/* providers */}
      <div className="mt-7 space-y-2.5">
        <ProviderButton icon={<GoogleIcon />} label="Continue with Google" onClick={() => oauth("Google")} />
        <ProviderButton icon={<AppleIcon />} label="Continue with Apple" onClick={() => oauth("Apple")} />
      </div>

      {/* divider */}
      <div className="my-6 flex items-center gap-4">
        <span className="h-px flex-1 bg-ink-100" />
        <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-300">or with email</span>
        <span className="h-px flex-1 bg-ink-100" />
      </div>

      {/* email form */}
      <form onSubmit={submit} className="space-y-3.5">
        {isSignup && (
          <TextField label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Alex Morgan" autoComplete="name" />
        )}
        <TextField label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="alex@email.com" autoComplete="email" />
        <TextField label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="At least 6 characters" autoComplete={isSignup ? "new-password" : "current-password"} />

        <button type="submit" disabled={!valid}
          className="ring-accent mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink-900 px-5 py-3.5 text-[15px] font-600 text-white transition-all hover:bg-ink-700 active:translate-y-px disabled:opacity-40 disabled:pointer-events-none">
          {isSignup ? "Create account" : "Sign in"}
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-500">
        {isSignup ? "By creating an account you agree to Rally's " : "Trouble signing in? "}
        {isSignup
          ? (<><a href="#" className="font-500 text-ink-900 underline-offset-2 hover:underline">Terms</a> & <a href="#" className="font-500 text-ink-900 underline-offset-2 hover:underline">Privacy Policy</a>.</>)
          : (<a href="#" className="font-500 text-accent hover:underline">Reset your password</a>)}
      </p>
    </div>
  );
}

/* ---- full page layout ---- */
function RegisterPage() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* left — brand / visual panel */}
      <aside className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <image-slot id="auth-visual" shape="rect" placeholder="drop image — athletes at the start line"
          style={{ display: "block", position: "absolute", inset: 0, width: "100%", height: "100%" }}></image-slot>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-ink-900/30" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <AuthLogo />
          <div>
            <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/60">Compete · Organize</span>
            <h2 className="font-display mt-4 max-w-md text-[clamp(28px,3.4vw,42px)] font-700 leading-[1.05] tracking-[-0.02em] text-white" style={{ textWrap: "balance" }}>
              One account. Every start line.
            </h2>
            <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-white/70">
              Register for competitions across 8 sports and 38 cities — or organize your own and find sponsors.
            </p>
            <div className="mt-8 grid max-w-sm grid-cols-3 gap-5 border-t border-white/15 pt-6">
              {[["1,240+", "events"], ["52k", "athletes"], ["8", "sports"]].map(([n, l]) => (
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
          <AuthLogo />
          <a href="Rally - Landing Page.html" className="text-[14px] font-500 text-ink-500 hover:text-ink-900">← Back</a>
        </div>
        <div className="hidden justify-end p-6 lg:flex">
          <a href="Rally - Landing Page.html" className="text-[14px] font-500 text-ink-500 hover:text-ink-900">← Back to site</a>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-12">
          <div className="w-full max-w-[400px]">
            <RegisterCard />
          </div>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<RegisterPage />);
