import { useState, useEffect, useRef } from 'react';
import { SPORTS } from '../data';
import { useCities } from '../lib/cities';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { Logo, Btn, Arrow, SportTag, Pill, LangSwitcher, useReveal, scrollToId } from './primitives';

/* ---- signed-in user menu ---- */
function initials(name) {
  return (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}

function UserMenu({ onCreateProfile }) {
  const { t } = useLang();
  const { user, signOut, isAdmin } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const name = user?.name || t.account.defaultName;
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-ink-100 py-1 pl-1 pr-3 transition-colors hover:border-ink-300">
        {user?.picture
          ? <img src={user.picture} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
          : <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[13px] font-700 text-white">{initials(name)}</span>}
        <span className="text-[14px] font-600 text-ink-900">{name.split(' ')[0]}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-xl">
          <div className="border-b border-ink-100 px-4 py-3">
            <div className="text-[14px] font-600 text-ink-900">{name}</div>
            {user?.email && <div className="truncate text-[12.5px] text-ink-500">{user.email}</div>}
          </div>
          <div className="p-2">
            <button onClick={() => { setOpen(false); window.location.hash = 'profile'; }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-600 text-ink-900 hover:bg-ink-50">
              <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] text-accent" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></svg>
              {t.account.myProfile}
            </button>
            <button onClick={() => { setOpen(false); onCreateProfile(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-600 text-ink-900 hover:bg-ink-50">
              <span className="text-accent">＋</span> {t.account.createProfile}
            </button>
            {isAdmin && (
              <button onClick={() => { setOpen(false); window.location.hash = 'admin'; }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-600 text-ink-900 hover:bg-ink-50">
                <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] text-accent" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4-3 6.5-7 9-4-2.5-7-5-7-9V7z" /></svg>
                {t.account.admin}
              </button>
            )}
            <button onClick={() => { setOpen(false); signOut(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-500 text-ink-500 hover:bg-ink-50">
              {t.account.signOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Nav ---- */
export function Nav({ onAuth, onCreateProfile }) {
  const { t } = useLang();
  const { isAuthed, isAdmin, signOut } = useSession();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  /* Audience pages: the tabs link to dedicated hash routes (see App.jsx).
     "Main" (#top) lands on the same page as clicking the logo. The current
     tab is derived from the hash — any non-audience hash means the landing. */
  const links = [
    { label: t.nav.main,       hash: "top" },
    { label: t.nav.players,    hash: "players" },
    { label: t.nav.organize,   hash: "organize" },
    { label: t.nav.sponsors,   hash: "sponsors" },
    { label: t.nav.recruiters, hash: "recruiters" },
  ];
  const route = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  const current = links.some((l) => l.hash === route) ? route : "top";
  return (
    <header className={"fixed inset-x-0 top-0 z-40 transition-all " + (scrolled ? "border-b border-ink-100 bg-white/85 backdrop-blur-md" : "border-b border-transparent bg-transparent")}>
      <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a key={l.hash} href={"#" + l.hash}
              className={"rounded-full px-3.5 py-2 text-[14.5px] transition-colors " + (l.hash === current
                ? "bg-ink-50 font-600 text-ink-900"
                : "font-500 text-ink-700 hover:bg-ink-50 hover:text-ink-900")}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <LangSwitcher />
          {isAuthed ? (
            <UserMenu onCreateProfile={onCreateProfile} />
          ) : (
            <>
              <Btn variant="ghost" size="sm" onClick={() => onAuth("signin")}>{t.nav.signIn}</Btn>
              <Btn variant="primary" size="sm" onClick={() => onAuth("signup")}>{t.nav.register} <Arrow /></Btn>
            </>
          )}
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
            {links.map((l) => (
              <a key={l.hash} href={"#" + l.hash} onClick={() => setOpen(false)}
                className={"rounded-lg px-3 py-2.5 text-left text-[15px] " + (l.hash === current
                  ? "bg-ink-50 font-600 text-ink-900"
                  : "font-500 text-ink-700 hover:bg-ink-50")}>{l.label}</a>
            ))}
            <div className="mt-2 flex items-center justify-between">
              <LangSwitcher />
            </div>
            {isAuthed ? (
              <div className="mt-2 flex flex-col gap-2">
                <Btn variant="primary" size="sm" className="justify-center" onClick={() => { window.location.hash = 'profile'; setOpen(false); }}>{t.account.myProfile}</Btn>
                <Btn variant="outline" size="sm" className="justify-center" onClick={() => { onCreateProfile(); setOpen(false); }}>{t.account.createProfile}</Btn>
                {isAdmin && (
                  <Btn variant="dark" size="sm" className="justify-center" onClick={() => { window.location.hash = 'admin'; setOpen(false); }}>{t.account.admin}</Btn>
                )}
                <Btn variant="outline" size="sm" className="justify-center" onClick={() => { signOut(); setOpen(false); }}>{t.account.signOut}</Btn>
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <Btn variant="outline" size="sm" className="flex-1" onClick={() => { onAuth("signin"); setOpen(false); }}>{t.nav.signIn}</Btn>
                <Btn variant="primary" size="sm" className="flex-1" onClick={() => { onAuth("signup"); setOpen(false); }}>{t.nav.register}</Btn>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ---- Hero variants ---- */
export function HeroEyebrow({ children }) {
  return (
    <div className="inline-flex items-center gap-2.5 rounded-full border border-ink-100 bg-white px-3.5 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-500">{children}</span>
    </div>
  );
}

function HeroSplit() {
  const { t } = useLang();
  const h = t.hero;
  return (
    <section id="top" className="relative overflow-hidden pt-[120px] pb-20">
      <div className="pointer-events-none absolute -right-32 -top-24 h-[480px] w-[480px] rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <HeroEyebrow>{h.eyebrow}</HeroEyebrow>
          <h1 className="font-display mt-6 text-[clamp(40px,6vw,68px)] font-700 leading-[0.98] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
            {h.h1_1}<br />{h.h1_2}<br /><span className="text-accent">{h.h1_accent}</span>
          </h1>
          <p className="mt-6 max-w-md text-[18px] leading-relaxed text-ink-500">{h.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Btn variant="primary" size="lg" onClick={() => scrollToId("browse")}>{h.findCta} <Arrow /></Btn>
            <Btn variant="outline" size="lg" onClick={() => scrollToId("organize")}>{h.organizeCta}</Btn>
          </div>
          <div className="mt-8 flex items-center gap-6 text-[14px] text-ink-500">
            <span><b className="font-display text-ink-900">1,240+</b> {h.stat_events}</span>
            <span className="h-4 w-px bg-ink-100" />
            <span><b className="font-display text-ink-900">52k</b> {h.stat_athletes}</span>
            <span className="h-4 w-px bg-ink-100" />
            <span><b className="font-display text-ink-900">8</b> {h.stat_sports}</span>
          </div>
        </div>
        <div className="relative">
          <image-slot id="hero-split" shape="rounded" radius="22"
            placeholder="drop hero image — athlete in motion"
            class="block w-full"
            style={{ width: "100%", aspectRatio: "4/5", borderRadius: "22px" }}></image-slot>
          <div className="absolute -bottom-6 -left-6 w-[260px] rounded-2xl border border-ink-100 bg-white p-4 shadow-xl">
            <SportTag sport="running" />
            <div className="mt-2 font-display text-[17px] font-600 leading-snug text-ink-900">Thames Half Marathon</div>
            <div className="mt-1 text-[13px] text-ink-500">{h.card_location}</div>
            <div className="mt-3 flex items-center justify-between">
              <Pill tone="accent">{h.card_spots}</Pill>
              <span className="font-display text-[15px] font-600 text-ink-900">5 000 ₸</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroCentered() {
  const { t, lang } = useLang();
  const h = t.hero;
  const cities = useCities();
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
        <div className="flex justify-center"><HeroEyebrow>{h.c_eyebrow}</HeroEyebrow></div>
        <h1 className="font-display mx-auto mt-6 max-w-3xl text-[clamp(42px,7vw,76px)] font-700 leading-[0.96] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
          {h.c_h1}<br /><span className="text-accent">{h.c_h1_accent}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500">{h.c_body}</p>
        <div className="mx-auto mt-9 flex max-w-2xl flex-col items-stretch gap-2 rounded-2xl border border-ink-100 bg-white p-2 shadow-lg sm:flex-row sm:rounded-full">
          <div className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:rounded-full">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{h.c_sportLbl}</span>
            <select value={sport} onChange={(e) => setSport(e.target.value)}
              className="w-full bg-transparent py-3 text-[15px] font-500 text-ink-900 outline-none">
              <option value="">{h.c_anySport}</option>
              {SPORTS.map((s) => <option key={s.id} value={s.id}>{t.data.sports[s.id]}</option>)}
            </select>
          </div>
          <div className="hidden w-px bg-ink-100 sm:block" />
          <div className="flex flex-1 items-center gap-2 rounded-xl px-3 sm:rounded-full">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{h.c_cityLbl}</span>
            <select value={loc} onChange={(e) => setLoc(e.target.value)}
              className="w-full bg-transparent py-3 text-[15px] font-500 text-ink-900 outline-none">
              <option value="">{h.c_anywhere}</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{lang === 'ru' ? c.ru : c.en}</option>)}
            </select>
          </div>
          <Btn variant="primary" size="lg" className="sm:!px-6" onClick={go}>{h.c_searchCta} <Arrow /></Btn>
        </div>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-ink-500">
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{h.c_popular}</span>
          {["running", "cycling", "tennis", "padel"].map((s) => (
            <button key={s} onClick={() => { window.dispatchEvent(new CustomEvent("rally:filter", { detail: { sport: s } })); scrollToId("browse"); }}
              className="rounded-full border border-ink-100 px-3 py-1.5 text-[13px] font-500 text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50">
              {t.data.sports[s]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroEditorial() {
  const { t } = useLang();
  const h = t.hero;
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
              <span className="font-mono text-[12px] uppercase tracking-[0.16em] text-white/70">{h.e_eyebrow}</span>
              <h1 className="font-display mt-4 text-[clamp(40px,6vw,72px)] font-700 leading-[0.98] tracking-[-0.02em] text-white" style={{ textWrap: "balance" }}>
                {h.e_h1}
              </h1>
              <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-white/80">{h.e_body}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Btn variant="white" size="lg" onClick={() => scrollToId("browse")}>{h.findCta} <Arrow /></Btn>
                <Btn size="lg" className="border border-white/30 bg-white/0 text-white hover:bg-white/10" onClick={() => scrollToId("organize")}>{h.organizeCta}</Btn>
              </div>
            </div>
            <div className="mt-9 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {[["1,240+", h.e_stat_events], ["38", h.e_stat_cities], ["52k", h.e_stat_athletes]].map(([n, l]) => (
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

export function Hero({ style }) {
  if (style === "centered") return <HeroCentered />;
  if (style === "editorial") return <HeroEditorial />;
  return <HeroSplit />;
}

/* ---- Organizer ---- */
export function Organizer() {
  const { t } = useLang();
  const o = t.organizer;
  const ref = useReveal();
  return (
    <section id="organize" ref={ref} className="bg-ink-900 py-24 text-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="reveal max-w-2xl">
          <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-white/50">{o.eyebrow}</span>
          <h2 className="font-display mt-4 text-[clamp(32px,4.4vw,52px)] font-700 leading-[1.02] tracking-[-0.02em]">
            {o.title}
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-white/65">{o.body}</p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {o.features.map((f, i) => (
            <div key={f.tag} className="reveal flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]" style={{ transitionDelay: i * 70 + "ms" }}>
              <div className="ph mb-5 grid h-32 place-items-center rounded-xl" style={{ backgroundColor: "#1e293b", backgroundImage: "repeating-linear-gradient(135deg,#27364b 0,#27364b 1px,transparent 1px,transparent 11px)" }}>
                <span className="ph-label" style={{ color: "#64748b" }}>{f.label}</span>
              </div>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em]" style={{ color: "color-mix(in srgb, var(--accent) 70%, white)" }}>{f.tag}</span>
              <h3 className="font-display mt-2 text-[20px] font-600 leading-snug">{f.title}</h3>
              <p className="mt-2.5 flex-1 text-[14.5px] leading-relaxed text-white/55">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="reveal mt-10 flex flex-wrap items-center gap-4">
          <Btn variant="white" size="lg">{o.cta} <Arrow /></Btn>
          <span className="text-[14px] text-white/45">{o.priceNote}</span>
        </div>
      </div>
    </section>
  );
}

/* ---- FinalCTA ---- */
export function FinalCTA({ onAuth }) {
  const { t } = useLang();
  const f = t.finalCta;
  return (
    <section id="register" className="px-6 py-24">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-[var(--accent)] px-8 py-20 text-center text-white sm:px-16">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-black/10 blur-2xl" />
        <div className="relative">
          <h2 className="font-display mx-auto max-w-2xl text-[clamp(34px,5vw,58px)] font-700 leading-[1.0] tracking-[-0.02em]" style={{ textWrap: "balance" }}>
            {f.title}
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[18px] leading-relaxed text-white/85">{f.body}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Btn variant="white" size="lg" onClick={() => onAuth("signup")}>{f.competeCta} <Arrow /></Btn>
            <Btn size="lg" className="border border-white/40 bg-white/0 text-white hover:bg-white/10" onClick={() => scrollToId("organize")}>{f.organizeCta}</Btn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---- Footer ---- */
export function Footer() {
  const { t } = useLang();
  const f = t.footer;
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-ink-500">{f.tagline}</p>
          </div>
          {f.cols.map((c) => (
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
          <span>{f.copyright}</span>
          <div className="flex gap-5">
            <a href="#" className="hover:text-ink-900">{f.privacy}</a>
            <a href="#" className="hover:text-ink-900">{f.terms}</a>
            <a href="#" className="hover:text-ink-900">{f.cookies}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
