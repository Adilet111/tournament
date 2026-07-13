# CLAUDE.md

Guidance for working in this repository. Read this first; it captures the
non-obvious conventions and the parts of the system that are easy to break.

## What this is

**Rally** — a bilingual (Russian default, English) web app for discovering,
joining, and organizing multi-sport competitions. It is a **frontend-only**
React/Vite app that talks to a separate backend over a REST API under `/api`.
There is no backend code in this repo.

Two surfaces share one bundle:

- **Public site** (`#` / anything but `#admin`) — landing page, browse/filter
  competitions, chat-style skill onboarding, register for events, auth.
- **Organizer dashboard** (`#admin`) — overview, competitions CRUD + lifecycle,
  registrations management, sports, plus mocked sponsors/promotions.

## Commands

```bash
npm run dev      # Vite dev server on :5173 (proxies /api → backend, see below)
npm run build    # production build to dist/
npm run preview  # serve the built bundle
npm run lint     # ESLint (scoped to src/ + config; see eslint.config.js)
```

There is no test runner yet. To verify a change, build and exercise the flow in
the browser (the dev server proxies the API).

## Architecture

```
index.html ─▶ src/main.jsx ─▶ src/App.jsx
                                 └─ LangProvider ▶ SessionProvider ▶ Router
                                        │              │               ├─ #admin + isAdmin → AdminApp
                                        │              │               └─ else            → RallyApp (public)
```

- **Routing** is a tiny hash router in `App.jsx` (`#admin` vs everything else).
  Non-admins are bounced off `#admin`. No react-router.
- **Two React contexts wrap everything:**
  - `LangContext` (`src/LangContext.jsx`) — current language + `t` (the active
    translation table). **Default language is `'ru'`.**
  - `SessionContext` (`src/SessionContext.jsx`) — signed-in user, `isAdmin`,
    and locally-stored sport profiles; synced to `localStorage` across tabs.

### Directory map

| Path | What lives here |
|------|-----------------|
| `src/App.jsx` | Root, hash router, the public **RegisterModal** |
| `src/i18n.js` | **All UI strings**, `en` + `ru`. Single source of copy. |
| `src/LangContext.jsx` / `SessionContext.jsx` | The two global contexts |
| `src/lib/api.js` | REST client for tournaments/registrations/sports/profiles |
| `src/lib/auth.js` | Google sign-in (GIS), session/token storage, `isAdmin` |
| `src/data.js` | Static reference data: sports, cities, categories, windows |
| `src/components/` | Public UI: `sections`, `interactive` (browse/participate), `auth`, `profile`, `onboarding`, `primitives`, `TweaksPanel` |
| `src/admin/` | Dashboard: `AdminApp` (router), `AdminShell` (chrome + shared UI), `AdminViews` (every view), `adminData` (mock sponsors/promotions) |
| `src/image-slot.js` | **Vendored** design-tool custom element (`<image-slot>`); dev-only image placeholders. Don't refactor. |

## Internationalization — the most important convention

**Every user-facing string goes through `src/i18n.js`.** Never hardcode display
text in a component. Usage:

```jsx
const { t } = useLang();
<h1>{t.admin.overview.totalReg}</h1>          // static string
<span>{t.card.spotsLeftFn(n)}</span>          // interpolation → *Fn helper
```

Rules of the road:
- Add keys to **both** `en` and `ru`. The build won't catch a missing key —
  it renders `undefined`.
- Dynamic/pluralized strings are functions suffixed `Fn` (e.g. `regWordFn`,
  `freePlacesFn`). Russian plurals use the `ruForm(n, one, few, many)` helper
  at the top of `i18n.js`.
- `t.data.sports` / `t.data.locations` / `t.data.categories` translate the ids
  from `src/data.js`. Look up the label from the id; never display the raw id.
- The EN/RU switch is `LangSwitcher` (`primitives.jsx`); it's in the public nav
  and the admin Topbar.

## The API layer (`src/lib/api.js`)

- Base URL: `(VITE_API_BASE || '') + '/api'`. Blank base → the Vite dev proxy
  forwards `/api/*` to `VITE_AUTH_PROXY_TARGET` (default `http://localhost:3000`).
- One helper, `request(method, path, body, token)`, does fetch + JSON parse +
  error handling for **every** call. `get/post/patch/del` are thin wrappers.
  On non-2xx it throws `Error` with `.message` (backend message) and `.status`
  (HTTP code — used by `getProfile` to turn 404 into `null`).
- **Keep the endpoint contract stable.** If you add a call, add another one-line
  wrapper in this file — don't inline `fetch` in components.

### Endpoints

| Function | Method + path | Auth | Notes |
|----------|---------------|------|-------|
| `listTournaments` | `GET /tournaments` | public | **open** only |
| `getTournament` | `GET /tournaments/:id` | public | + live `registeredCount` |
| `createTournament` | `POST /tournaments` | admin | |
| `updateTournament` | `PATCH /tournaments/:id` | admin | fields and/or `status` |
| `deleteTournament` | `DELETE /tournaments/:id` | admin | only if 0 registrations (else 409) |
| `registerForTournament` | `POST /tournaments/:id/register` | user | body `{}`, user from token |
| `listAdminTournaments` | `GET /admin/tournaments?status=` | admin | **all** statuses |
| `getAdminUser` | `GET /admin/users/:id` | admin | `{ user, profiles, registrations }` |
| `listRegistrations` | `GET /tournaments/:id/registrations?status=` | admin | joined to user + profile |
| `addRegistration` | `POST /tournaments/:id/registrations` | admin | override; bypasses gates |
| `updateRegistration` | `PATCH …/registrations/:userId` | admin | `registered`/`withdrawn` |
| `deleteRegistration` | `DELETE …/registrations/:userId` | admin | hard delete |
| `listSports` / `createSport` | `GET`/`POST /sports` | public / admin | |
| `getSportQuestions` | `GET /sports/:sport/questions` | user | onboarding questionnaire |
| `submitProfileAnswers` | `POST /sports/:sport/profile` | user | returns `placement` (rank) |
| `getProfile` | `GET /sports/:sport/profile` | user | `null` on 404 |

Auth lives separately in `src/lib/auth.js`: `POST /auth/login` exchanges a
Google ID token for a session.

### Tournament shape (what the UI reads)

`GET /tournaments/:id` and the `/admin/tournaments` array both return, per
tournament: `id, sportId, title, description, type ('paid'|'free'), location,
city, startsAt, prizePool, entryFee, currency, capacity, occupiedPlaces,
minRating, maxRating, status, createdAt, freePlaces` (single-tournament also
adds `registeredCount`).

**Gotchas that already bit us:**
- Occupancy comes from `occupiedPlaces` (list) or `registeredCount` (single) —
  read both: `registeredCount ?? occupiedPlaces ?? …`.
- `capacity` and `freePlaces` can be **`null`** (uncapped). Guard every
  display: `∞` for capacity, "Open entry" for spots. Never render raw `null`.

### Tournament lifecycle (mirrors the historical `ADMIN_LOGIC.md`)

State machine in `AdminViews.jsx` (`ALLOWED_TRANSITIONS`):

```
draft     → open, cancelled
open      → closed, cancelled
closed    → completed, open (re-open), cancelled
completed → (terminal)
cancelled → (terminal)
```

The backend re-validates transitions and the guard rails (capacity ≥
registrations, minRating ≤ maxRating, paid needs entryFee > 0). Delete is
allowed only at 0 registrations; otherwise cancel to preserve history.

## Auth & security posture — read before touching auth

- Sign-in is **Google Identity Services** in the browser → ID token → exchanged
  at `POST /auth/login`. If the backend is down, `signInWithGoogle` falls back
  to a token-only session so the UI still works.
- The session (incl. bearer token) is stored in **`localStorage`**
  (`rally.session`). This is convenient but readable by any XSS on the origin —
  see the roadmap for the httpOnly-cookie migration.
- **`isAdmin(session)` (client-side) is a cosmetic gate only.** It decides
  whether to *show* the dashboard, based on a backend `role`/`isAdmin` flag or
  the `VITE_ADMIN_EMAILS` allowlist. Real authorization is the backend's job:
  every `/admin/*` and write endpoint must reject non-admin tokens (401/403).
  Never rely on the client check for protection.
- `decodeJwt` does **not** verify signatures — it only reads display fields
  (name/email/picture). Don't use it for any trust decision.
- Sport profiles are currently stored client-side (`rally.profiles`), separate
  from the backend profile that `submitProfileAnswers` creates.

## Conventions & gotchas

- **Styling:** Tailwind v4 (via `@tailwindcss/vite`). Palette is `ink-*` (neutrals)
  + a runtime CSS variable `--accent` (set from `TweaksPanel`). Match existing
  class density; components favor explicit pixel sizes (`text-[14.5px]`).
- **`webapp/`** is the **original standalone design prototype** (raw HTML +
  screenshots), superseded by `src/`. It is **not** part of the Vite build and
  is excluded from lint. Don't edit it expecting app changes; treat it as an
  archive. (`new_code/` is likewise a scratch experiment.)
- **`ADMIN_LOGIC.md` is referenced by comments in `api.js` and `AdminViews.jsx`
  but is not currently present** in the repo. The lifecycle summary above is the
  living substitute; restore or drop the references when convenient.
- `src/components/interactive.jsx` warms a **module-level cache** (`_cache`,
  `_promise`) so Browse and Participate share one fetch. It never invalidates —
  a full reload is needed to see new tournaments. Intentional for now.
- `image-slot.js` is vendored tooling marked `@ds-adherence-ignore`; it only
  accepts `data:image/*` URLs and is read-only outside the design runtime.
- ESLint is clean for the shipped app except a few `react-refresh` hints (files
  that export both a component and a helper/constant) — cosmetic HMR warnings,
  not bugs.

## Environment variables (`.env`, see `.env.example`)

| Var | Purpose |
|-----|---------|
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth web client id (public; must match backend) |
| `VITE_API_BASE` | API base; blank → dev proxy |
| `VITE_AUTH_API_BASE` | Auth API base; blank → dev proxy |
| `VITE_AUTH_PROXY_TARGET` | Where the dev server proxies `/api/*` |
| `VITE_ADMIN_EMAILS` | Comma-separated admin allowlist (UI gate only) |

`.env` is git-ignored; only `.env.example` is tracked. Never commit real secrets
(the Google client id is public and safe to ship).

## When you change things

- Adding UI text → add `en` **and** `ru` keys in `i18n.js`, consume via `t`.
- Adding an API call → one wrapper in `api.js`, reuse `request`.
- Touching tournament occupancy/capacity → handle `null` capacity/freePlaces and
  the `occupiedPlaces`/`registeredCount` split.
- After a non-trivial change: `npm run build` (catches most breakage) and click
  through the affected flow.
