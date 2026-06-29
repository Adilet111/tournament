/* Rally Admin — shared primitives + sidebar/topbar shell. */
import { useLang } from '../LangContext';

export const fmt = (n) => '£' + n.toLocaleString('en-GB');

/* ---- icons (inline, stroke-based to match the clean system) ---- */
export const Icon = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  trophy: 'M7 4h10v3a5 5 0 0 1-10 0zM7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3M9 14h6M12 14v4M8 21h8M10 18h4',
  users: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM3 21v-1a6 6 0 0 1 12 0v1M17 13a6 6 0 0 1 4 6v1',
  handshake: 'M12 11l2-2 3 3 4-4M12 11l-2-2-3 3-4-4M3 8l5 5 2-1M21 8l-5 5-2-1M8 13v3l4 3 4-3v-3',
  mega: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 8a4 4 0 0 1 0 8M18 5a8 8 0 0 1 0 14',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M3 8h10M9 4l4 4-4 4',
  out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  dots: 'M5 12h.01M12 12h.01M19 12h.01',
  ball: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c-3 2.5-3 15.5 0 18M12 3c3 2.5 3 15.5 0 18',
};

export function Svg({ d, className = 'h-[18px] w-[18px]', strokeWidth = 1.7 }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split('M').filter(Boolean).map((seg, i) => <path key={i} d={'M' + seg} />)}
    </svg>
  );
}

export function AdminLogo({ onExit }) {
  const { t } = useLang();
  return (
    <button onClick={onExit} className="group flex items-center gap-2.5">
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink-900 transition-transform group-hover:-rotate-6">
        <span className="block h-3 w-3 rotate-45 bg-accent" />
      </span>
      <span className="font-display text-[20px] font-700 tracking-tight text-ink-900">Rally</span>
      <span className="rounded-md bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-500">{t.admin.badge}</span>
    </button>
  );
}

export function StatusDot({ status }) {
  const { t } = useLang();
  const colors = {
    live: 'bg-emerald-500', active: 'bg-emerald-500', open: 'bg-emerald-500',
    draft: 'bg-ink-300', closed: 'bg-ink-400',
    pending: 'bg-amber-500', invited: 'bg-blue-500',
    paused: 'bg-amber-500', ended: 'bg-ink-300',
  };
  const color = colors[status] || 'bg-ink-300';
  const label = t.admin.status[status] || status;
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-500 text-ink-700">
      <span className={'h-2 w-2 rounded-full ' + color} /> {label}
    </span>
  );
}

export function Tag({ children }) {
  return <span className="rounded-md border border-ink-100 px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-wide text-ink-500">{children}</span>;
}

export function Avatar({ name, size = 34 }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('');
  const hue = (name.charCodeAt(0) * 47 + name.charCodeAt(name.length - 1) * 13) % 360;
  return (
    <span className="grid shrink-0 place-items-center rounded-full font-600 text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 45% 48%)` }}>
      {initials}
    </span>
  );
}

export function Btn({ children, variant = 'primary', size = 'md', as = 'button', className = '', ...rest }) {
  const base = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-600 transition-all active:translate-y-px disabled:opacity-40 disabled:pointer-events-none';
  const sizes = { sm: 'px-3.5 py-2 text-[13.5px]', md: 'px-4 py-2.5 text-[14.5px]' };
  const variants = {
    primary: 'bg-accent text-white shadow-sm hover:brightness-110',
    dark: 'bg-ink-900 text-white hover:bg-ink-700',
    outline: 'border border-ink-200 text-ink-900 hover:border-ink-300 hover:bg-ink-50',
    ghost: 'text-ink-700 hover:bg-ink-50',
  };
  const Comp = as;
  return <Comp className={[base, sizes[size], variants[variant], className].join(' ')} {...rest}>{children}</Comp>;
}

export function Card({ children, className = '' }) {
  return <div className={'rounded-2xl border border-ink-100 bg-white ' + className}>{children}</div>;
}

/* ---- Sidebar ---- */
export function Sidebar({ view, setView, nav, onExit }) {
  const { t } = useLang();
  return (
    <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-ink-100 bg-white px-4 py-5 lg:flex">
      <div className="px-2"><AdminLogo onExit={onExit} /></div>
      <nav className="mt-7 flex flex-col gap-1">
        {nav.map((n) => {
          const on = view === n.id;
          return (
            <button key={n.id} onClick={() => setView(n.id)}
              className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-600 transition-all ' +
                (on ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'text-ink-700 hover:bg-ink-50')}>
              <Svg d={Icon[n.icon]} className={'h-[18px] w-[18px] ' + (on ? 'text-accent' : 'text-ink-500')} />
              {n.label}
              {n.badge ? <span className="ml-auto rounded-full bg-accent px-1.5 py-0.5 text-[11px] font-700 text-white">{n.badge}</span> : null}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto">
        <Btn variant="dark" size="md" className="w-full" onClick={() => setView('create')}>
          <Svg d={Icon.plus} className="h-4 w-4" /> {t.admin.newCompetition}
        </Btn>
        <button onClick={onExit} className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-500 text-ink-500 hover:bg-ink-50 hover:text-ink-900">
          <Svg d={Icon.out} className="h-[17px] w-[17px]" /> {t.admin.backToSite}
        </button>
      </div>
    </aside>
  );
}

/* ---- Topbar ---- */
export function Topbar({ title, sub, view, setView, nav }) {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="flex items-center gap-4 px-6 py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-700 tracking-[-0.01em] text-ink-900">{title}</h1>
          {sub && <p className="mt-0.5 truncate text-[14px] text-ink-500">{sub}</p>}
        </div>
        <label className="hidden items-center gap-2 rounded-full border border-ink-100 bg-white px-3.5 py-2 md:flex">
          <Svg d={Icon.search} className="h-4 w-4 text-ink-300" />
          <input placeholder={t.admin.searchPlaceholder} className="w-36 bg-transparent text-[14px] text-ink-900 outline-none placeholder:text-ink-300" />
        </label>
        <button className="relative grid h-10 w-10 place-items-center rounded-full border border-ink-100 text-ink-700 hover:bg-ink-50">
          <Svg d={Icon.bell} className="h-[18px] w-[18px]" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent" />
        </button>
        <div className="flex items-center gap-2.5">
          <Avatar name="River Club" size={36} />
          <div className="hidden leading-tight sm:block">
            <div className="text-[14px] font-600 text-ink-900">{t.admin.orgName}</div>
            <div className="text-[12px] text-ink-500">{t.admin.orgRole}</div>
          </div>
        </div>
      </div>
      {/* mobile nav */}
      <div className="flex gap-1 overflow-x-auto border-t border-ink-100 px-4 py-2 lg:hidden">
        {nav.map((n) => (
          <button key={n.id} onClick={() => setView(n.id)}
            className={'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-600 ' + (view === n.id ? 'bg-accent text-white' : 'text-ink-700')}>
            {n.label}
          </button>
        ))}
      </div>
    </header>
  );
}
