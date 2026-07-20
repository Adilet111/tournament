# Claude Design prompts — Teams / Brackets / Stats

Copy one block at a time into Claude design. Every prompt is self-contained and
repeats the Rally style guide, so order doesn't matter. Copy is in English —
translate to `ru` in `i18n.js` at implementation time.

**Shared style preamble (already embedded in each prompt):**

> Design for "Rally", a multi-sport tournament web app. Light theme, white
> background. Neutrals: slate ink scale — #0f172a headings, #334155 body,
> #64748b secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue
> #1d4ed8, soft accent tint #eff4ff, dark accent #1e3a8a. Fonts: Schibsted
> Grotesk for display headings, Hanken Grotesk for body. Cards are white,
> rounded-2xl (16px radius), 1px #e2e8f0 border, no heavy shadows. Buttons and
> chips are pill-shaped (fully rounded); primary buttons solid accent blue with
> white text, secondary buttons white with 1px border. Text is compact:
> 13–15px body, 11–12px uppercase tracking-wide labels. Generous whitespace,
> clean and sporty, no gradients, no dark mode.

---

## Public site

### 1 — My Teams section

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards with 1px #e2e8f0 borders, pill-shaped buttons and
chips, compact 13–15px text.

Design a "My Teams" section for the user profile page. Contents:
- Section header row: title "My teams", count badge, and a primary pill button
  "Create team" on the right.
- A responsive grid (3 columns desktop, 1 mobile) of team cards. Each card
  shows: a 48px team logo (square, rounded-xl; if no logo, a letter avatar with
  the team's initials on the soft accent tint #eff4ff), team name (16px
  semibold), sport chip (e.g. "Football"), a role badge — "Captain" (solid
  accent pill) or "Member" (outlined pill) — and "7 members" in secondary gray.
  The whole card is clickable with a subtle hover border color change to accent.
- Also design the empty state: centered illustration placeholder, text "You're
  not on any team yet", subtext "Create a team or ask a captain for an invite
  link", and the "Create team" button.
```

### 2 — Create Team modal

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards with 1px #e2e8f0 borders, pill-shaped buttons,
compact 13–15px text. Inputs: white, 1px border, rounded-xl, 12px uppercase
gray labels above.

Design a "Create team" modal dialog (max width ~440px, centered over a dimmed
backdrop). Fields top to bottom:
- Sport — select dropdown (options like Football, Basketball, Tennis) with
  helper text "One team belongs to one sport".
- Team name — text input, placeholder "Astana Wolves".
- Logo URL — optional text input with a small live 40px logo preview to its
  right (letter-avatar fallback).
- Footer: secondary "Cancel" + primary "Create team" buttons, right-aligned.
Also show the error variant of the same modal: the name field with a red border
and inline error "A team with this name already exists in this sport."
Note under the footer in small gray text: "You'll become the team captain and
get an invite link to share."
```

### 3 — Team detail page

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards with 1px #e2e8f0 borders, pill buttons/chips,
compact 13–15px text.

Design a team detail page (captain's view). Layout:
- Header card: 64px team logo, team name "Astana Wolves" as display heading,
  sport chip "Football", "Created July 19, 2026" in gray, and my role badge
  "Captain". Header right side: an overflow area with two quiet destructive-ish
  actions: "Transfer captaincy" (secondary pill) and "Delete team" (red-text
  ghost button). Show the delete button in a disabled state with a small
  tooltip "Teams with tournament history can't be deleted".
- Below: an invite-link card (just reserve the slot — designed separately).
- Roster card: header "Roster · 7", then a table/list of members. Each row:
  32px avatar, name "Aigerim S." (semibold) with email below in 12px gray,
  role pill ("Captain" solid accent / "Member" outlined), rating in the team's
  sport as a mono number "1480" (em-dash when no rating), joined date, and for
  the captain a row-level "Remove" ghost button in red (hidden on their own
  row).
Also design a second, member's-view variant of the header: no transfer/delete
buttons, instead a single secondary "Leave team" button; and show it disabled
with helper text "Captains must transfer captaincy before leaving."
```

### 4 — Invite link card

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards, pill buttons, compact 13–15px text, Geist Mono
for code-like strings.

Design an "Invite link" card for a team page (captain only). This is the ONLY
way to add members, so it should feel prominent:
- Card on the soft accent tint background (#eff4ff) with accent-colored 1px
  border. Title "Invite players", subtext "Anyone with this link can join the
  team. Share it in your team chat."
- A read-only input showing the URL
  "https://rally.app/teams/join/Nq8xK2vR5tY7uW9zB1cD4eF6" in 12px mono, with a
  primary "Copy link" pill button attached to its right. Include a "Copied ✓"
  success state of the button.
- Below, a quiet "Rotate link" text button with a rotate icon and warning
  helper text in 12px gray: "Generates a new link and kills the old one
  instantly. Do this after removing a member."
- Also design the confirm popover for rotate: "Rotate invite link? Everyone
  with the old link will lose access." with Cancel / Rotate buttons.
```

### 5 — Join-by-invite landing page

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards, pill buttons, compact 13–15px text.

Design a full-page invite landing screen (a user opened a team invite link).
Centered single card (~480px) on a subtle #f1f5f9 page background. Design 4
states as separate frames:
1. Signed-out: "You've been invited to join a team on Rally" heading, subtext
   "Sign in to accept the invitation", and a "Continue with Google" button.
2. Success: team logo (letter avatar), "Welcome to Astana Wolves 🎉" heading,
   "Football · 7 members" chip row, primary button "Open team page".
3. Link invalid: neutral sad state — "This invite link is no longer valid",
   subtext "The captain may have rotated the link. Ask them for a fresh one.",
   secondary button "Go to Rally".
4. Blocked: "You can't rejoin this team" heading with red-tinted icon, subtext
   "You were removed from this team by the captain.", secondary button "Browse
   tournaments". Also include a tiny fifth variant: an info banner "You're
   already a member of this team" with an "Open team page" link.
```

### 6 — Tournament card & detail, team variant

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards, pill buttons, compact 13–15px text.

Design a full-page invite landing screen (a user opened a team invite link).
Centered single card (~480px) on a subtle #f1f5f9 page background. Design 4
states as separate frames:
1. Signed-out: "You've been invited to join a team on Rally" heading, subtext
   "Sign in to accept the invitation", and a "Continue with Google" button.
2. Success: team logo (letter avatar), "Welcome to Astana Wolves 🎉" heading,
   "Football · 7 members" chip row, primary button "Open team page".
3. Link invalid: neutral sad state — "This invite link is no longer valid",
   subtext "The captain may have rotated the link. Ask them for a fresh one.",
   secondary button "Go to Rally".
4. Blocked: "You can't rejoin this team" heading with red-tinted icon, subtext
   "You were removed from this team by the captain.", secondary button "Browse
   tournaments". Also include a tiny fifth variant: an info banner "You're
   already a member of this team" with an "Open team page" link.
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards, pill buttons/chips, compact 13–15px text.

Design two artifacts for TEAM tournaments (5v5 format):
1. A tournament card for a browse grid: title "City Cup 5v5", chips row —
   sport "Football", a distinctive "Team · 5v5" badge (accent tint background,
   should stand out from the other chips), "Paid" chip; then location "Central
   Arena, Almaty", date "Aug 1, 15:00", prize pool "500 000 ₸", and a spots
   line that counts TEAMS: "3 of 16 team slots left" with a thin progress bar.
2. The registration block of a tournament detail page: instead of a solo
   "Register" button, a primary button "Register your team" with helper text
   "Only team captains can register a roster". Include a second variant of the
   block for a non-captain user: disabled button with the note "You're not a
   captain of any Football team — create one or ask your captain", plus a
   "Create team" secondary link-button. And a third variant after successful
   registration: a green-tinted confirmation "Astana Wolves is registered" with
   a quiet "Withdraw team" text button underneath.

```

### 7 — Team registration modal (roster picker)

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. White rounded-2xl cards, pill buttons, compact 13–15px text.

Design a 2-step "Register team" modal (~520px) for tournament "City Cup 5v5"
(needs exactly 5 players). 
Step 1 "Choose team": radio-style list of my captained Football teams, each row
with logo, name, member count; teams from other sports are not shown. Footer:
Cancel / Next.
Step 2 "Pick your roster" — the main frame, design this in detail:
- Sticky sub-header with a counter "3 of 5 selected" that turns accent-colored
  when exactly 5.
- Checkbox list of active team members: avatar, name, rating (mono, dash if
  none). Some rows carry warning states that make them ineligible — render the
  checkbox disabled and add a small red/amber 12px note under the name:
  "No Football profile yet", "Rating 1900 is above the limit (max 1700)",
  "Already registered in this tournament with Steppe Eagles", "Age outside
  allowed range".
- Footer: back button, primary "Register roster" (disabled until exactly 5
  selected), and a note "The roster is frozen for this tournament — later team
  changes won't affect it."
Also design an error banner variant at the top of step 2: red-tinted banner
"Registration failed: Daniyar K., Miras T. don't meet the rating requirement."
```

### 8 — Public bracket view

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. Geist Mono for scores. White rounded-2xl cards, compact 13–15px text.

Design a single-elimination bracket view for a tournament page, 8-entry
bracket, 3 rounds, horizontally scrollable. Round columns titled
"Quarterfinals", "Semifinals", "Final" (11px uppercase gray labels), connected
by thin #e2e8f0 connector lines.
Match cards (~220px wide): two participant rows, each with seed number (small
gray "1"), name ("Astana Wolves"), and score in mono on the right. States to
show across the bracket:
- completed match: winner row semibold with accent-colored score (3), loser row
  grayed (1), small checkmark;
- pending match with both sides known: neutral rows, scores as "–";
- pending match with an unknown side: placeholder row in italic gray "Winner of
  QF2";
- walkover/bye: a flattened muted card, single name + "bye" chip, no scores.
Above the bracket: a champion callout strip once the final is done — trophy
icon, "Champion — Astana Wolves", runner-up in gray next to it.
Also design the empty state: centered "The bracket hasn't been generated yet.
Check back after registration closes."
```

### 9 — My Stats page

```
Design for "Rally", a multi-sport tournament web app. Light theme, white
background. Neutrals: slate ink scale — #0f172a headings, #334155 body, #64748b
secondary, #e2e8f0 borders, #f1f5f9 subtle fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Schibsted Grotesk for headings, Hanken Grotesk for
body. Geist Mono for numbers. White rounded-2xl cards, pill chips, compact
13–15px text.

Design a "My statistics" page. Three sections top to bottom:
1. Overall stat-tile row (6 tiles): Tournaments played 3, Tournaments won 1,
   Podium finishes 2, Matches 9 (with "7W–2L" underneath), Win rate 78%, and a
   featured "Rally score" tile 145 highlighted on the soft accent tint. Big
   mono numbers (~28px), 11px uppercase gray labels.
2. "By sport" — one row-card per sport: sport icon + name "Football", rating
   pill "1480", then inline mini-stats: 2 tournaments, 1 won, 6 matches,
   win rate 83%, score 125.
3. "Tournament history" — list rows: tournament title "City Cup 5v5", date,
   sport chip, team chip "Astana Wolves" (omit for solo entries), seed "#1",
   placement badge — gold "Champion" pill for rank 1, silver "Runner-up" for 2,
   plain "Semifinal" otherwise — and match record "3W–0L" in mono.
Also design the empty state: "No stats yet — they'll appear after your first
tournament bracket is played", with a "Browse tournaments" button.
```

## Admin dashboard (denser, more utilitarian than the public site, same palette)

### 10 — Tournament form: solo/team fields

```
Design for the admin dashboard of "Rally", a multi-sport tournament web app.
Light theme, white background, utilitarian density. Neutrals: slate ink scale —
#0f172a headings, #64748b secondary, #e2e8f0 borders, #f1f5f9 fills. Accent:
royal blue #1d4ed8, soft tint #eff4ff. Fonts: Hanken Grotesk. Inputs: white,
1px border, rounded-xl, 12px uppercase gray labels. Pill buttons.

Design one section of the "Create tournament" admin form — the participant
format block:
- A segmented control "Format": two options "Solo" and "Team", Team selected.
  Helper text: "Can't be changed after the tournament is created."
- When Team is selected, a "Team size" number stepper appears next to it
  (value 5, min 2) with helper "Players per roster".
- The existing "Capacity" number field relabeled contextually: label reads
  "Capacity (teams)" with helper "Number of team slots, empty = unlimited".
Also design the edit-mode variant: the segmented control replaced by a static
read-only badge "Team · 5v5" with a lock icon and tooltip "Format is fixed
after creation", and the Team size field shown disabled with the note
"Locked — teams are already registered."
```

### 11 — Team registrations table (admin)

```
Design for the admin dashboard of "Rally", a multi-sport tournament web app.
Light theme, white background, utilitarian density. Neutrals: slate ink scale —
#0f172a headings, #64748b secondary, #e2e8f0 borders, #f1f5f9 fills. Accent:
royal blue #1d4ed8, soft tint #eff4ff. Fonts: Hanken Grotesk, Geist Mono for
ids/emails. Compact tables: 13px cells, 11px uppercase gray column headers,
row hover #f8fafc.

Design the "Team registrations" view for an admin tournament page:
- Toolbar: status filter pills "All / Registered / Withdrawn", count on the
  right "12 teams".
- Table columns: Team (logo letter-avatar + name "Astana Wolves"), Status pill
  (green-tinted "registered" / gray "withdrawn"), Registered date, Roster
  ("5 players" + chevron).
- One row expanded: an inset panel on #f8fafc listing the frozen roster —
  numbered rows with player name and email in 12px mono gray. A small caption
  in the panel: "Roster snapshot — later team changes don't apply here."
- Empty state: "No teams registered yet."
```

### 12 — Bracket management panel (admin)

```
Design for the admin dashboard of "Rally", a multi-sport tournament web app.
Light theme, white background, utilitarian density. Neutrals: slate ink scale —
#0f172a headings, #64748b secondary, #e2e8f0 borders, #f1f5f9 fills. Accent:
royal blue #1d4ed8, soft tint #eff4ff. Fonts: Hanken Grotesk, Geist Mono for
numbers. White rounded-2xl cards, pill buttons.

Design a "Bracket" panel for an admin tournament page, three states as
separate frames:
1. Pre-generation, tournament still open: explanation card "Close registration
   to generate the bracket. Seeding uses player/team ratings; byes resolve
   automatically." with a disabled primary button "Generate bracket" and a
   hint chip "Requires status: closed".
2. Pre-generation, tournament closed: same card, button enabled, plus a
   summary line "12 teams registered → bracket of 16, 4 rounds, 4 byes".
3. Generated: a stats chip row (Bracket size 16 · Rounds 4 · Entries 12 ·
   Walkovers 4), a compact bracket preview beneath (same match-card style as
   the public bracket but smaller), where PENDING matches with both sides
   known show a small accent "Report result" button on hover. Top-right: a
   red-text ghost button "Delete bracket"; also show its disabled variant with
   tooltip "Matches have been played — the bracket is locked."
```

### 13 — Report result modal (admin)

```
Design for the admin dashboard of "Rally", a multi-sport tournament web app.
Light theme, white background. Neutrals: slate ink scale — #0f172a headings,
#64748b secondary, #e2e8f0 borders, #f1f5f9 fills. Accent: royal blue #1d4ed8,
soft tint #eff4ff. Fonts: Hanken Grotesk, Geist Mono for scores. White
rounded-2xl modal, pill buttons.

Design a "Report result" modal (~440px) for a bracket match:
- Header: "Quarterfinal 2 · Report result".
- Two large selectable participant cards stacked with "vs" between them:
  "Astana Wolves (seed 1)" and "Steppe Eagles (seed 8)". Clicking one marks it
  as the winner — selected card gets an accent border, a "Winner" pill, and a
  trophy icon.
- Under each card a small optional score input (mono, centered, placeholder
  "–"), with a caption "Scores are optional".
- A warning note in 12px gray with an info icon: "Results are final and can't
  be edited. The winner advances to the semifinal automatically."
- Footer: Cancel / primary "Confirm result" (disabled until a winner is
  picked).
Also design the read-only variant for an already completed match: both cards
static, winner highlighted with scores 3:1, a green "Completed · Aug 1, 16:05"
badge, no buttons.
```

### 14 — Admin user stats tab

```
Design for the admin dashboard of "Rally", a multi-sport tournament web app.
Light theme, white background, utilitarian density. Neutrals: slate ink scale —
#0f172a headings, #64748b secondary, #e2e8f0 borders, #f1f5f9 fills. Accent:
royal blue #1d4ed8, soft tint #eff4ff. Fonts: Hanken Grotesk, Geist Mono for
numbers. Compact tables and stat tiles, 13px cells.

Design a "Statistics" tab inside an admin user-detail page (tabs: Profile ·
Registrations · Statistics — Statistics active). Content, denser than the
public stats page:
- A compact 6-tile stat strip: Tournaments 3, Won 1, Podiums 2, Matches 9
  (7W–2L), Win rate 78%, Score 145. Small tiles, mono numbers ~20px.
- "By sport" table: Sport, Rating, Tournaments, Won, Matches, W–L, Win rate,
  Score — one row per sport, right-aligned mono numbers.
- "Tournament history" table: Title, Date, Format ("Team · 5v5" or "Solo"),
  Team ("Astana Wolves" or —), Seed, Placement (Champion/Runner-up/Semifinal
  badge), Record ("3W–0L").
- Empty state row: "This user hasn't played any bracket matches yet."
```