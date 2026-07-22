import { useState } from 'react';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { Nav, Footer, HeroEyebrow } from './sections';
import { Btn, Arrow, scrollToId } from './primitives';
import { AuthPage } from './auth';
import { goHome } from '../lib/nav';

/* Audience pages: Players explainer + contact pages (Organize/Sponsors/Recruiters).
   Rendered as hash routes (#players/#organize/#sponsors/#recruiters) by the
   router in App.jsx. All copy lives in t.audience (i18n.js). */

/* Leave the audience page for the landing page, then scroll to a section once
   the landing has re-rendered. */
function goHomeSection(id) {
  goHome();
  setTimeout(() => scrollToId(id), 80);
}

/* Shared chrome: Nav + Footer + the auth/profile modals Nav expects.
   `children` may be a function to receive `openAuth` for in-page CTAs. */
function PageShell({ children }) {
  const [authMode, setAuthMode] = useState(null); // "signin" | "signup" | null
  return (
    <div id="top">
      <Nav onAuth={setAuthMode} />
      <main>{typeof children === 'function' ? children(setAuthMode) : children}</main>
      <Footer />
      {authMode && <AuthPage mode={authMode} onClose={() => setAuthMode(null)} />}
      <style>{`@keyframes fadein{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}

/* ---- Players ---- */
export function PlayersPage() {
  const { t } = useLang();
  const p = t.audience.players;
  const { isAuthed } = useSession();
  return (
    <PageShell>
      {(openAuth) => (
        <>
          <section className="relative overflow-hidden pt-[128px] pb-20">
            <div className="pointer-events-none absolute -right-32 -top-24 h-[480px] w-[480px] rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
            <div className="relative mx-auto max-w-3xl px-6 text-center">
              <div className="flex justify-center"><HeroEyebrow>{p.eyebrow}</HeroEyebrow></div>
              <h1 className="font-display mx-auto mt-6 text-[clamp(38px,6vw,64px)] font-700 leading-[0.98] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
                {p.h1_1}<br /><span className="text-accent">{p.h1_accent}</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500">{p.body}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Btn variant="primary" size="lg" onClick={() => (isAuthed ? goHomeSection("browse") : openAuth("signup"))}>{p.createCta} <Arrow /></Btn>
                <Btn variant="outline" size="lg" onClick={() => goHomeSection("browse")}>{p.browseCta}</Btn>
              </div>
            </div>
          </section>

          <section className="px-6 pb-24">
            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {p.pillars.map((pl, i) => (
                  <div key={pl.title} className="rounded-2xl border border-ink-100 p-7">
                    <span className="font-mono text-[13px] text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-display mt-3 text-[21px] font-600 text-ink-900">{pl.title}</h3>
                    <p className="mt-2.5 text-[15px] leading-relaxed text-ink-500">{pl.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-6 pb-24">
            <div className="mx-auto max-w-4xl rounded-[28px] bg-ink-900 px-8 py-16 text-center text-white sm:px-14">
              <h2 className="font-display text-[clamp(28px,4vw,42px)] font-700 leading-[1.05] tracking-[-0.02em]" style={{ textWrap: "balance" }}>
                {p.ctaTitle}
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/65">{p.ctaBody}</p>
              <div className="mt-8 flex justify-center">
                <Btn variant="white" size="lg" onClick={() => (isAuthed ? goHomeSection("browse") : openAuth("signup"))}>{p.ctaBtn} <Arrow /></Btn>
              </div>
            </div>
          </section>
        </>
      )}
    </PageShell>
  );
}

/* ---- Contact card shared by Organize / Sponsors / Recruiters ---- */
function ContactPage({ copy }) {
  const { t } = useLang();
  const c = t.audience.contact;
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const field = (key, label, placeholder, type = "text") => (
    <div>
      <label className="font-mono text-[11px] uppercase tracking-wide text-ink-300">{label}</label>
      <input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        type={type} placeholder={placeholder}
        className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300" />
    </div>
  );

  return (
    <PageShell>
      <section className="relative overflow-hidden pt-[128px] pb-24">
        <div className="pointer-events-none absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
        <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-14 px-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <HeroEyebrow>{copy.eyebrow}</HeroEyebrow>
            <h1 className="font-display mt-6 text-[clamp(34px,5vw,52px)] font-700 leading-[1.02] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
              {copy.title}
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-500">{copy.intro}</p>
            {copy.body && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-500">{copy.body}</p>}
          </div>

          <div className="rounded-[24px] border border-ink-100 bg-white p-7 shadow-sm sm:p-8">
            {sent ? (
              <div className="py-8 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)]">
                  <svg viewBox="0 0 16 16" className="h-6 w-6" fill="none" stroke="var(--accent-ink)" strokeWidth="1.8"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <h3 className="font-display mt-4 text-[20px] font-700 text-ink-900">{c.thanksTitle}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{copy.thanksBody}</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
                {field("name", c.nameLbl, c.namePh)}
                {field("phone", c.phoneLbl, c.phonePh, "tel")}
                {field("email", c.emailLbl, c.emailPh, "email")}
                <Btn variant="dark" size="md" className="mt-2 w-full justify-center" type="submit">{c.submit}</Btn>
              </form>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function OrganizePage() {
  const { t } = useLang();
  return <ContactPage copy={t.audience.organize} />;
}

export function SponsorsPage() {
  const { t } = useLang();
  return <ContactPage copy={t.audience.sponsors} />;
}

export function RecruitersPage() {
  const { t } = useLang();
  return <ContactPage copy={t.audience.recruiters} />;
}
