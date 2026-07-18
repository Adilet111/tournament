/* Rally — audience pages: Players explainer + simple contact pages (Organize/Sponsors/Recruiters). */
const { useState: useStateP } = React;

function PageShell({ children }) {
  return (
    <>
      <window.Nav />
      {children}
      <window.Footer />
    </>
  );
}

/* -------------------------------------------------------------- Players -- */

function PlayersPage() {
  const { Btn, Arrow, HeroEyebrow } = window;
  const pillars = [
    {
      n: "01", title: "Enjoy your time",
      body: "Join competitions across running, cycling, tennis, football and more — casual or serious, it's your call.",
    },
    {
      n: "02", title: "Find like-minded people",
      body: "Meet athletes at your level and pace. Rally matches you into events and categories where you'll actually have fun.",
    },
    {
      n: "03", title: "Build your rating",
      body: "Every competition you enter builds a skill profile and rating for your sport — a real record of how you play.",
    },
    {
      n: "04", title: "Get seen by scouts",
      body: "Your rating is visible to recruiters and scouts looking for their next signing. Compete well, get noticed.",
    },
  ];
  return (
    <PageShell>
      <section id="top" className="relative overflow-hidden pt-[128px] pb-20">
        <div className="pointer-events-none absolute -right-32 -top-24 h-[480px] w-[480px] rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <div className="flex justify-center"><HeroEyebrow>For players</HeroEyebrow></div>
          <h1 className="font-display mx-auto mt-6 text-[clamp(38px,6vw,64px)] font-700 leading-[0.98] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
            Play more.<br /><span className="text-accent">Get discovered.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[18px] leading-relaxed text-ink-500">
            Rally exists so you can enjoy competing, find people who play the way you do, and build a rating that speaks
            for itself — one scouts can actually find.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Btn variant="primary" size="lg" onClick={() => window.goRegister()}>Create your profile <Arrow /></Btn>
            <Btn variant="outline" size="lg" as="a" href="Rally - Landing Page.html#browse">Browse competitions</Btn>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {pillars.map((p) => (
              <div key={p.n} className="rounded-2xl border border-ink-100 p-7">
                <span className="font-mono text-[13px] text-ink-300">{p.n}</span>
                <h3 className="font-display mt-3 text-[21px] font-600 text-ink-900">{p.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-ink-500">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-4xl rounded-[28px] bg-ink-900 px-8 py-16 text-center text-white sm:px-14">
          <h2 className="font-display text-[clamp(28px,4vw,42px)] font-700 leading-[1.05] tracking-[-0.02em]" style={{ textWrap: "balance" }}>
            Your next result could be the one that gets you noticed.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/65">
            Register, compete, and let your rating do the talking.
          </p>
          <div className="mt-8 flex justify-center">
            <Btn variant="white" size="lg" onClick={() => window.goRegister()}>Get started <Arrow /></Btn>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

/* ------------------------------------------------------------ Contact card -- */

function ContactPage({ eyebrow, title, intro, body, submitLabel, thanksTitle, thanksBody }) {
  const { Btn, HeroEyebrow } = window;
  const [sent, setSent] = useStateP(false);
  const [form, setForm] = useStateP({ name: "", phone: "", email: "" });

  return (
    <PageShell>
      <section id="top" className="relative overflow-hidden pt-[128px] pb-24">
        <div className="pointer-events-none absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[var(--accent-soft)] blur-3xl opacity-70" />
        <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-14 px-6 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <HeroEyebrow>{eyebrow}</HeroEyebrow>
            <h1 className="font-display mt-6 text-[clamp(34px,5vw,52px)] font-700 leading-[1.02] tracking-[-0.02em] text-ink-900" style={{ textWrap: "balance" }}>
              {title}
            </h1>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-ink-500">{intro}</p>
            {body && <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-500">{body}</p>}
          </div>

          <div className="rounded-[24px] border border-ink-100 bg-white p-7 shadow-sm sm:p-8">
            {sent ? (
              <div className="py-8 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[var(--accent-soft)]">
                  <svg viewBox="0 0 16 16" className="h-6 w-6" fill="none" stroke="var(--accent-ink)" strokeWidth="1.8"><path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <h3 className="font-display mt-4 text-[20px] font-700 text-ink-900">{thanksTitle}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-500">{thanksBody}</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Jordan Ellis"
                    className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300" />
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Phone number</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 555 123 4567"
                    className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300" />
                </div>
                <div>
                  <label className="font-mono text-[11px] uppercase tracking-wide text-ink-300">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jordan.ellis@gmail.com"
                    className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-900 outline-none transition-colors focus:border-accent placeholder:text-ink-300" />
                </div>
                <Btn variant="dark" size="md" className="mt-2 w-full justify-center" type="submit">{submitLabel}</Btn>
              </form>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function OrganizePage() {
  return (
    <ContactPage
      eyebrow="For organizers"
      title="Want to run a competition?"
      intro="Leave your contact details and we'll reach out to help you get your event set up on Rally."
      submitLabel="Send my details"
      thanksTitle="Thanks — we've got it"
      thanksBody="We'll be in touch shortly to help you set up your competition." />
  );
}

function SponsorsPage() {
  return (
    <ContactPage
      eyebrow="For sponsors"
      title="Sponsor a competition."
      intro="Interested in sponsoring events on Rally? Leave your contact details and we'll follow up."
      submitLabel="Send my details"
      thanksTitle="Thanks — we've got it"
      thanksBody="We'll reach out with sponsorship opportunities that fit." />
  );
}

function RecruitersPage() {
  return (
    <ContactPage
      eyebrow="For recruiters"
      title="Find your next signing."
      intro="Rally gives every athlete a real, competition-earned rating across their sport — searchable and comparable, so you can spot rising talent early."
      body="Leave your contact details and we'll help you get set up to browse and follow rated players in the sports you scout."
      submitLabel="Send my details"
      thanksTitle="Thanks — we've got it"
      thanksBody="We'll be in touch to help you start discovering talent on Rally." />
  );
}

Object.assign(window, { PlayersPage, OrganizePage, SponsorsPage, RecruitersPage });
