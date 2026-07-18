New audience pages — files to add
=================================

NEW files (copy as-is into your project root / js folder):
- Players.html        Explainer page for players (mission, pillars, CTA)
- Organize.html        Simple contact page for people who want to organize a competition
- Sponsors.html        Simple contact page for sponsors
- Recruiters.html       Contact page + explanation for recruiters/scouts
- js/audience-pages.jsx NEW. Contains PlayersPage, ContactPage (shared), OrganizePage, SponsorsPage, RecruitersPage

UPDATED file (overwrite your existing copy):
- js/sections.jsx      Nav now links to the 4 new pages (search "NEW AUDIENCE PAGES" comment
                        markers inside the file for the exact changed lines), and exports HeroEyebrow.

Nothing else needs to change — the HTML pages load js/data.js + js/sections.jsx + js/audience-pages.jsx directly, independent of your main landing page.
