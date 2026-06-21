import { useEffect, useRef } from 'react';
import { useLang } from '../LangContext';

export function Logo({ className = "" }) {
  return (
    <a href="#top" className={"group flex items-center gap-2.5 " + className}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink-900 transition-transform group-hover:-rotate-6">
        <span className="block h-3 w-3 rotate-45 bg-accent" />
      </span>
      <span className="font-display text-[22px] font-700 tracking-tight text-ink-900">Rally</span>
    </a>
  );
}

export function Placeholder({ label, className = "", style }) {
  return (
    <div className={"ph grid place-items-center " + className} style={style}>
      <span className="ph-label">{label}</span>
    </div>
  );
}

export function SportTag({ sport, className = "" }) {
  const { t } = useLang();
  return (
    <span className={"inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-500 " + className}>
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {t.data.sports[sport] ?? sport}
    </span>
  );
}

export function Pill({ children, tone = "default", className = "" }) {
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

export function Btn({ children, variant = "primary", size = "md", as = "button", className = "", ...rest }) {
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

export function Arrow({ className = "" }) {
  return (
    <svg viewBox="0 0 16 16" className={"h-4 w-4 " + className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LangSwitcher() {
  const { lang, setLang } = useLang();
  const btn = (code) =>
    "px-2.5 py-1 text-[13px] font-600 transition-colors " +
    (lang === code
      ? "bg-ink-900 text-white"
      : "text-ink-500 hover:text-ink-900");
  return (
    <div className="flex overflow-hidden rounded-full border border-ink-100">
      <button onClick={() => setLang("en")} className={btn("en")}>EN</button>
      <button onClick={() => setLang("ru")} className={btn("ru")}>RU</button>
    </div>
  );
}

export function useReveal() {
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

export function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
}
