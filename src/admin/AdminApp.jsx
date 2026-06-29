/* Rally Admin — app root: layout + view router. */
import { useState } from 'react';
import { useLang } from '../LangContext';
import { Sidebar, Topbar } from './AdminShell';
import { Overview, Competitions, Registrations, Sponsors, Promotions, CreateCompetition } from './AdminViews';
import { SPONSORS } from './adminData';

export function AdminApp({ onExit }) {
  const { t } = useLang();
  const m = t.admin;
  const pendingSponsors = SPONSORS.filter((s) => s.status === 'pending').length;
  const [view, setView] = useState('overview');

  const NAV = [
    { id: 'overview', label: m.nav.overview, icon: 'grid' },
    { id: 'competitions', label: m.nav.competitions, icon: 'trophy' },
    { id: 'registrations', label: m.nav.registrations, icon: 'users' },
    { id: 'sponsors', label: m.nav.sponsors, icon: 'handshake', badge: pendingSponsors || null },
    { id: 'promotions', label: m.nav.promotions, icon: 'mega' },
  ];

  const META = {
    overview: [m.nav.overview, m.meta.overviewSub],
    competitions: [m.nav.competitions, m.meta.competitionsSub],
    registrations: [m.nav.registrations, m.meta.registrationsSub],
    sponsors: [m.nav.sponsors, m.meta.sponsorsSub],
    promotions: [m.nav.promotions, m.meta.promotionsSub],
    create: [m.meta.create, m.meta.createSub],
  };
  const [title, sub] = META[view] || META.overview;

  let Body;
  if (view === 'competitions') Body = <Competitions setView={setView} />;
  else if (view === 'registrations') Body = <Registrations />;
  else if (view === 'sponsors') Body = <Sponsors />;
  else if (view === 'promotions') Body = <Promotions />;
  else if (view === 'create') Body = <CreateCompetition setView={setView} />;
  else Body = <Overview setView={setView} />;

  return (
    <div className="flex min-h-screen bg-ink-50/50">
      <Sidebar view={view} setView={setView} nav={NAV} onExit={onExit} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} sub={sub} view={view} setView={setView} nav={NAV} />
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">{Body}</main>
      </div>
    </div>
  );
}
