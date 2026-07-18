/* Rally — shared UI + structural sections.
   Exports components to window for use by interactive.jsx and app.jsx. */
const { useState, useEffect, useRef } = React;

/* ----------------------------------------------------------- primitives -- */

function Logo({ className = "" }) {
  return (
    <a href="#top" className={"group flex items-center gap-2.5 " + className}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink-900 transition-transform group-hover:-rotate-6">
        <span className="block h-3 w-3 rotate-45 bg-accent" />
      </span>
      <span className="font-display text-[22px] font-700 tracking-tight text-ink-900">Rally</span>
    </a>
  );
}

/* striped placeholder with mono caption */
function Placeholder({ label, className = "", style }) {
  return (
    <div className={"ph grid place-items-center " + className} style={style}>
      <span className="ph-label">{label}</span>
    </div>
  );
}

function SportTag({ sport, className = "" }) {
  const label = window.RALLY.sportLabel(sport);
  return (
    <span className={"inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 " + className}>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {label}
    </span>
  );
}

function Pill({ children, tone = "default", className = "" }) {
  const tones = {
    default: "bg-ink-50 text-ink-700",
    accent: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
    outline: "border border-ink-100 text-ink-700",
  };
  return (
    <span className={"inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-500 " + tones[tone] + " " + className}>
      {children}
    </span>
  );
}

function Btn({ children, variant = "primary", size = "md", as = "button", className = "", ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-600 transition-all ring-accent active:translate-y-px disabled:opacity-40 disabled:pointer-events-none";
  const sizes = { sm: "px-4 py-2 text-[14px]", md: "px-5 py-2.5 text-[15px]", lg: "px-7 py-3.5 text-[16px]" };
  const variants = {
    primary: "bg-accent text-white shadow-sm hover:brightness-110 hover:shadow-md",
    dark: "bg-ink-900 text-white hover:bg-ink-700",
    ghost: "text-ink-700 hover:bg-ink-50",
    outline: "border border-ink-200 text-ink-900 hover:border-ink-300 hover:bg-ink-50",
    white: "bg-white text-ink-900 hover:bg-ink-50",
  };
  const Comp = as;
  return (
    <Comp className={[base, sizes[size], variants[variant], className].join(" ")} {...rest}>
      {children}
    </Comp>
  );
}

function Arrow({ className = "" }) {
  return (
    <svg viewBox="0 0 16 16" className={"h-4 w-4 " + className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* scroll reveal hook */
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 }
    );
    el.querySelectorAll(".reveal").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);
  return ref;
}

function goRegister(mode) {
  window.location.href = "Register.html" + (mode === "signin" ? "#signin" : "");
}

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
}

/* ------------------------------------------------------------------ Nav -- */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  /* ===== NEW AUDIENCE PAGES: nav now links to the 4 dedicated pages ===== */
  const links = [
    { label: "Players", href: "Players.html" },
    { label: "Organize", href: "Organize.html" },
    { label: "Sponsors", href: "Sponsors.html" },
    { label: "Recruiters", href: "Recruiters.html" },
  ];
  const isLink = (l) => !!l.href;
  /* ===== END NEW AUDIENCE PAGES ===== */
  return (
    <header className={"fixed inset-x-0 top-0 z-40 transition-all " + (scrolled ? "border-b border-ink-100 bg-white/85 backdrop-blur-md" : "border-b border-transparent bg-transparent")}>
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => isLink(l) ? (
            <a key={l.label} href={l.href}
              className="rounded-full px-3.5 py-2 text-[14.5px] font-500 text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900">
              {l.label}
            </a>
          ) : (
            <button key={l.id} onClick={() => scrollToId(l.id)}
              className="rounded-full px-3.5 py-2 text-[14.5px] font-500 text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900">
              {l.label}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Btn variant="ghost" size="sm" onClick={() => goRegister("signin")}>Sign in</Btn>
          <Btn variant="primary" size="sm" onClick={() => goRegister()}>Register <Arrow /></Btn>
        </div>
        <button className="grid h-10 w-10 place-items-center rounded-lg hover:bg-ink-50 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <div className="space-y-1.5">
            <span className="block h-0.5 w-5 bg-ink-900" />
            <span className="block h-0.5 w-5 bg-ink-900" />
          </div>
        </button>
      </div>
      {open && (
        <div className="border-t border-ink-100 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => isLink(l) ? (
              <a key={l.label} href={l.href} className="rounded-lg px-3 py-2.5 text-left text-[15px] font-500 text-ink-700 hover:bg-ink-50">{l.label}</a>
            ) : (
              <button key={l.id} onClick={() => { scrollToId(l.id); setOpen(false); }}
                className="rounded-lg px-3 py-2.5 text-left text-[15px] font-500 text-ink-700 hover:bg-ink-50">{l.label}</button>
            ))}
            <div className="mt-2 flex gap-2">
              <Btn variant="outline" size="sm" className="flex-1" onClick={() => goRegister("signin")}>Sign in</Btn>
              <Btn variant="primary" size="sm" className="flex-1" onClick={() => goRegister()}>Register</Btn>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* --------------------------------------------------------------- Heroes -- */

function HeroEyebrow({ children }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-ink-100 bg-white px-3.5 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-500">{children}</span>
    </div>
  );
}

/* A — Split: text left, image right with floating card */
function HeroSplit() {
  return (
    <section id="top" className="relative overflow-hidden pt-[120px] pb-20">
      <div className="pointer-events-none absolute -right-32 -top-24 h-[480px] w-[480px] rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <HeroEyebrow>Multi-sport · 38 cities</HeroEyebrow>
          <h1 className="font-display mt-6 text-[clamp(40px,6vw,68px)] font-700 leading-[0.98] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
            Find your next<br />competition.<br /><span className="text-accent">Show up. Compete.</span>
          </h1>
          <p className="mt-6 max-w-md text-[18px] leading-relaxed text-ink-500">
            Browse open events across running, cycling, tennis and more — filter by sport, city, date and your skill category, then register in minutes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn variant="primary" size="lg" onClick={() => scrollToId("browse")}>Find a competition <Arrow /></Btn>
            <Btn variant="outline" size="lg" onClick={() => scrollToId("organize")}>Organize an event</Btn>
          </div>
          <div className="mt-8 flex items-center gap-6 text-[14px] text-ink-500">
            <span><b className="font-display text-ink-900">1,240+</b> events</span>
            <span className="h-4 w-px bg-ink-100" />
            <span><b className="font-display text-ink-900">52k</b> athletes</span>
            <span className="h-4 w-px bg-ink-100" />
            <span><b className="font-display text-ink-900">8</b> sports</span>
          </div>
        </div>
        <div className="relative">
          <image-slot id="hero-split" shape="rounded" radius="22"
            placeholder="drop hero image — athlete in motion"
            className="block w-full"
            style={{ width: "100%", aspectRatio: "4/5", borderRadius: "22px" }}></image-slot>
          <div className="absolute -bottom-6 -left-6 w-[260px] rounded-2xl border border-ink-100 bg-white p-4 shadow-xl">
            <SportTag sport="running" />
            <div className="mt-2 font-display text-[17px] font-600 leading-snug text-ink-900">Thames Half Marathon</div>
            <div className="mt-1 text-[13px] text-ink-500">London · Jun 18 · 21.1 km</div>
            <div className="mt-3 flex items-center justify-between">
              <Pill tone="accent">41 spots left</Pill>
              <span className="font-display text-[15px] font-600 text-ink-900">£32</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* B — Centered with inline search */
function HeroCentered() {
  const R = window.RALLY;
  const [sport, setSport] = useState("");
  const [loc, setLoc] = useState("");
  const go = () => {
    window.dispatchEvent(new CustomEvent("rally:filter", { detail: { sport, location: loc } }));
    scrollToId("browse");
  };
  return (
    <section id="top" className="relative overflow-hidden pt-[128px] pb-16 text-center">
      <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-60" />
      <div className="relative mx-auto max-w-3xl px-6">
        <div className="flex justify-center"><HeroEyebrow>Multi-sport competitions</HeroEyebrow></div>
        <h1 className="font-display mx-auto mt-6 max-w-3xl text-[clamp(42px,7vw,76px)] font-700 leading-[0.96] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
          Every competition,<br /><span className="text-accent">one place to compete.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500">
          Search open events by sport and city, filter by date and skill category, and register to take part.
        </p>
        <div className="mx-auto mt-9 flex max-w-2xl flex-col items-stretch gap-2 rounded-2xl border border-ink-100 bg-white p-2 shadow-lg sm:flex-row sm:rounded-full">
          <div className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:rounded-full">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Sport</span>
            <select value={sport} onChange={(e) => setSport(e.target.value)}
              className="w-full bg-transparent py-3 text-[15px] font-500 text-ink-900 outline-none">
              <option value="">Any sport</option>
              {R.SPORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div className="hidden w-px bg-ink-100 sm:block" />
          <div className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:rounded-full">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">City</span>
            <select value={loc} onChange={(e) => setLoc(e.target.value)}
              className="w-full bg-transparent py-3 text-[15px] font-500 text-ink-900 outline-none">
              <option value="">Anywhere</option>
              {R.LOCATIONS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <Btn variant="primary" size="lg" className="sm:!px-6" onClick={go}>Search <Arrow /></Btn>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-ink-500">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Popular</span>
          {["running", "cycling", "tennis", "padel"].map((s) => (
            <button key={s} onClick={() => { window.dispatchEvent(new CustomEvent("rally:filter", { detail: { sport: s } })); scrollToId("browse"); }}
              className="rounded-full border border-ink-100 px-3 py-1.5 text-[13px] font-500 text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50">
              {R.sportLabel(s)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/* C — Editorial full-bleed image with overlay */
function HeroEditorial() {
  return (
    <section id="top" className="relative pt-[68px]">
      <div className="relative mx-auto max-w-[1400px] px-4">
        <div className="relative overflow-hidden rounded-[28px]">
          <image-slot id="hero-editorial" shape="rect"
            placeholder="drop full-bleed image — race start line"
            style={{ display: "block", width: "100%", height: "640px" }}></image-slot>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-ink-900/10" />
          <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
            <div className="max-w-2xl">
              <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/70">Multi-sport · 8 disciplines</span>
              <h1 className="font-display mt-4 text-[clamp(40px,6vw,72px)] font-700 leading-[0.98] tracking-[-0.02em] text-white" style={{ textWrap: "balance" }}>
                Your next start line is waiting.
              </h1>
              <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-white/80">
                Browse and register for open competitions near you — or organize your own.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Btn variant="white" size="lg" onClick={() => scrollToId("browse")}>Find a competition <Arrow /></Btn>
                <Btn size="lg" className="border border-white/30 bg-white/0 text-white hover:bg-white/10" onClick={() => scrollToId("organize")}>Organize an event</Btn>
              </div>
            </div>
            <div className="mt-9 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {[["1,240+", "open events"], ["38", "cities"], ["52k", "athletes"]].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-[28px] font-700 text-white">{n}</div>
                  <div className="text-[13px] text-white/60">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Hero({ style }) {
  if (style === "centered") return <HeroCentered />;
  if (style === "editorial") return <HeroEditorial />;
  return <HeroSplit />;
}

/* ------------------------------------------------------------- Organizer -- */

function Organizer() {
  const ref = useReveal();
  const features = [
    { tag: "Create & manage", title: "Set up a competition in minutes", body: "Pick a sport, set dates and categories, define capacity and pricing, then publish. Manage registrations, brackets and check-ins from one dashboard.", label: "dashboard preview" },
    { tag: "Find sponsors", title: "Connect with brands that fit", body: "List sponsorship slots, share your audience reach, and match with sponsors looking for events like yours — handled through Rally.", label: "sponsor matching" },
    { tag: "Promote", title: "Run ads & promotions", body: "Boost your event in search, send targeted invites to nearby athletes, and offer early-bird codes to fill your start line faster.", label: "promotion tools" },
  ];
  return (
    <section id="organize" ref={ref} className="bg-ink-900 py-24 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal max-w-2xl">
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/50">For organizers</span>
          <h2 className="font-display mt-4 text-[clamp(32px,4.4vw,52px)] font-700 leading-[1.02] tracking-[-0.02em]">
            Run your own competition.
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-white/65">
            Everything you need to launch, fill and grow an event — from registration and brackets to sponsorship and promotion.
          </p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.tag} className="reveal flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]" style={{ transitionDelay: i * 70 + "ms" }}>
              <div className="ph mb-5 grid h-32 place-items-center rounded-xl" style={{ backgroundColor: "#1e293b", backgroundImage: "repeating-linear-gradient(135deg,#27364b 0,#27364b 1px,transparent 1px,transparent 11px)" }}>
                <span className="ph-label" style={{ color: "#64748b" }}>{f.label}</span>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent" style={{ color: "color-mix(in srgb, var(--accent) 70%, white)" }}>{f.tag}</span>
              <h3 className="font-display mt-2 text-[20px] font-600 leading-snug">{f.title}</h3>
              <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-white/55">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="reveal mt-10 flex flex-wrap items-center gap-4">
          <Btn variant="white" size="lg" as="a" href="Admin.html">Start organizing <Arrow /></Btn>
          <span className="text-[14px] text-white/45">Free to publish · 4% per paid registration</span>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- FinalCTA -- */

function FinalCTA() {
  return (
    <section id="register" className="px-6 py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[var(--accent)] px-8 py-20 text-center text-white sm:px-16">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <h2 className="font-display mx-auto max-w-2xl text-[clamp(34px,5vw,58px)] font-700 leading-[1.0] tracking-[-0.02em]" style={{ textWrap: "balance" }}>
            Ready to compete?
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[18px] leading-relaxed text-white/85">
            Create a free account, find an event that fits, and claim your spot on the start line.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Btn variant="white" size="lg" onClick={() => goRegister()}>Register & compete <Arrow /></Btn>
            <Btn size="lg" className="border border-white/40 bg-white/0 text-white hover:bg-white/10" onClick={() => scrollToId("organize")}>I want to organize</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Footer -- */

function Footer() {
  const cols = [
    { h: "Compete", items: ["Browse events", "How it works", "Skill categories", "Cities"] },
    { h: "Organize", items: ["Create a competition", "Sponsorship", "Promotion", "Pricing"] },
    { h: "Company", items: ["About", "Careers", "Press", "Contact"] },
  ];
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-500">
              The home for organizing and joining sports competitions — for athletes and organizers alike.
            </p>
          </div>
          {cols.map((c) => (
            <div key={c.h}>
              <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-300">{c.h}</div>
              <ul className="mt-4 space-y-2.5">
                {c.items.map((it) => (
                  <li key={it}><a href="#" className="text-[14.5px] text-ink-700 transition-colors hover:text-accent">{it}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-ink-100 pt-6 text-[13px] text-ink-500 sm:flex-row sm:items-center">
          <span>© 2026 Rally. A concept design.</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-ink-900">Privacy</a>
            <a href="#" className="hover:text-ink-900">Terms</a>
            <a href="#" className="hover:text-ink-900">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, {
  Logo, Placeholder, SportTag, Pill, Btn, Arrow, useReveal, scrollToId, goRegister,
  Nav, Hero, HeroSplit, HeroCentered, HeroEditorial, HeroEyebrow /* NEW: used by audience-pages.jsx */, Organizer, FinalCTA, Footer,
});
