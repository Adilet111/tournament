# Rally — Roadmap

Where the project stands and what it needs to become a real product. Ordered by
priority. See `CLAUDE.md` for how the code is structured today.

## Current state (honest snapshot)

- ✅ Full bilingual UI (RU default / EN), all copy centralized in `i18n.js`.
- ✅ Public site: landing, browse/filter, chat onboarding, register flow.
- ✅ Organizer dashboard: overview, competitions CRUD + lifecycle,
  registrations management, sports, add-participant, user detail.
- ✅ Google sign-in + backend token exchange, with graceful offline fallback.
- ✅ Clean `npm audit` (0 vulns); API client de-duplicated behind one helper.
- ⚠️ Sponsors & Promotions dashboard views are **mock data** (`adminData.js`).
- ⚠️ Session/token in `localStorage`; client-side admin gate is cosmetic.
- ⚠️ No tests, no CI, no error monitoring, no TypeScript.
- ⚠️ `webapp/` legacy prototype still in the tree; `ADMIN_LOGIC.md` referenced
  but missing.

---

## P0 — Security & correctness (do first)

1. **Move the session token out of `localStorage`.**
   Prefer an httpOnly, `Secure`, `SameSite` cookie set by the backend at
   `/auth/login`; the SPA stops reading the raw token. Removes the XSS
   token-theft vector. Requires a backend change — coordinate the contract.
2. **Confirm backend enforces authorization on every `/admin/*` and write
   endpoint.** The client `isAdmin` check is UI-only. Add an integration test
   that hits admin endpoints with a non-admin token and expects 401/403.
3. **Add a Content-Security-Policy** (and ideally SRI on the Google Fonts /
   GIS includes). Lock script/connect/img/style sources; this is where a
   `localStorage` token would otherwise leak.
4. **Input validation & error surfaces.** Currently backend errors bubble up as
   raw messages. Define a small error taxonomy and user-friendly, translated
   messages for the common cases (401 expired, 409 capacity/duplicate, network).

## P1 — Make it trustworthy to change

5. **Adopt TypeScript** (or JSDoc + `checkJs`). The tournament/registration
   shapes (`occupiedPlaces`/`freePlaces`/nullable `capacity`,
   `registeredCount`) have already caused display bugs; types would prevent the
   next one. Start with `src/lib/api.js` return types.
6. **Test suite.** Vitest + React Testing Library. Priority coverage:
   - `i18n` completeness (every `en` key exists in `ru` and vice-versa).
   - `api.js` request shaping + `getProfile` 404→null + error `.status`.
   - Tournament lifecycle transition guard (`ALLOWED_TRANSITIONS`).
   - Capacity/`freePlaces` rendering with `null` values.
7. **CI** (GitHub Actions): `lint` + `build` + `test` on PR.
8. **Restore or remove `ADMIN_LOGIC.md`.** Either recreate the canonical spec
   the comments point to, or delete the two references and rely on `CLAUDE.md`.
9. **Delete/archive `webapp/`** once nothing else needs the screenshots, so the
   repo has one source of truth. (Not part of the build today.)

## P2 — Complete the product

10. **Real Sponsors & Promotions.** Replace `adminData.js` mocks with endpoints
    (`/admin/sponsors`, `/admin/promotions`) and wire the existing views.
11. **Backend-driven reference data.** `src/data.js` hardcodes cities and
    categories, but the public card already localizes cities from the API.
    Move locations/categories server-side so organizers aren't limited to 6
    cities / 4 categories. Keep the id→label i18n pattern.
12. **Currency handling.** The admin hardcodes `£` (`fmt` in `AdminShell.jsx`)
    while tournaments carry `currency` (KZT etc.). Format money from the
    tournament's `currency`, not a fixed symbol.
13. **Server-backed sport profiles.** Today profiles live in `localStorage`
    (`rally.profiles`) *and* the backend (`submitProfileAnswers`). Make the
    backend the source of truth; use `getProfile` on load.
14. **Search & pagination.** The admin Topbar search box is inert; competitions
    and registrations lists fetch everything. Add query params + pagination for
    scale.
15. **Bracket / schedule management.** The create form promises "add brackets,
    schedule and rules after publishing" — build those views (`bracketInfo` is
    already on the model).
16. **CSV export.** The registrations "Export CSV" button is present but not
    wired.

## P3 — Polish & scale

17. **Accessibility pass.** Focus traps in modals, `aria-live` on async status,
    keyboard nav for filter pills, color-contrast audit of `--accent`.
18. **Performance.** Code-split the admin bundle (`AdminApp`) behind the
    `#admin` route so public visitors don't download it. Add `React.lazy`.
19. **Cache invalidation** for the `interactive.jsx` module cache (refetch after
    a registration, or adopt a data layer like TanStack Query).
20. **Design-system cleanup.** Two `Btn` implementations exist
    (`components/primitives.jsx` and `admin/AdminShell.jsx`); unify. Resolve the
    `react-refresh` lint hints by splitting shared constants/hooks out of
    component files.
21. **Observability.** Error boundary + a client error reporter (Sentry-style);
    structured logging on the backend.
22. **Additional auth providers.** The UI shows an Apple button that throws
    "not configured" — implement or hide it.

---

## Suggested sequencing

- **Milestone 1 (harden):** P0 items 1–4, plus P1 items 6–7. Ship with
  confidence that admin data is protected and regressions are caught.
- **Milestone 2 (typed + complete):** P1 item 5, P2 items 10–13. The dashboard
  becomes fully real (no mocks, correct currency, server profiles).
- **Milestone 3 (scale):** P2 items 14–16, P3 items 18–19. Handle real event
  volumes and finish the organizer toolset.
