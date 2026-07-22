/* Rally — join-by-invite landing page (#/teams/join/<token>).
   The only way into a team (NEW.md §5): a captain shares this link
   (teamJoinUrl, built from GET /teams/:id/invite), the invitee opens it and
   we call POST /teams/join/:token. Signed-out visitors are prompted to sign
   in first, then the join is retried automatically. See DESIGN_PROMPTS.md §5. */
import { useEffect, useRef, useState } from 'react';
import { useLang } from '../LangContext';
import { useSession } from '../SessionContext';
import { apiErrorMessage } from '../i18n';
import { joinTeamByToken, getTeam, listSports } from '../lib/api';
import { goHome, goToProfile, goToTeam } from '../lib/nav';
import { Logo, Btn, LangSwitcher } from './primitives';
import { AuthPage } from './auth';

function teamInitials(name) {
  return (name || '')
    .split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}

function Card({ children }) {
  return (
    <div className="mx-auto w-full max-w-[440px] rounded-3xl border border-ink-100 bg-white p-8 text-center shadow-sm">
      {children}
    </div>
  );
}

export function JoinTeamPage({ token }) {
  const { t } = useLang();
  const tt = t.teams;
  const { isAuthed, authReady } = useSession();

  // joining | success | already-member | invalid | blocked | error — only
  // meaningful once authReady && isAuthed; otherwise derived directly below
  // (avoids a setState-in-effect just to mirror auth state into `state`).
  const [state, setState] = useState('joining');
  const [team, setTeam] = useState(null);
  const [sportLabel, setSportLabel] = useState('');
  const [memberCount, setMemberCount] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!authReady || !isAuthed || attempted.current) return;
    attempted.current = true;
    joinTeamByToken(token)
      .then(async ({ team: joinedTeam }) => {
        setTeam(joinedTeam);
        try {
          const [sports, detail] = await Promise.all([listSports(), getTeam(joinedTeam.id)]);
          const slug = (Array.isArray(sports) ? sports : []).find((s) => s.id === joinedTeam.sportId)?.slug;
          setSportLabel(slug ? (t.data.sports[slug] ?? slug) : '');
          setMemberCount(Array.isArray(detail?.members) ? detail.members.length : null);
        } catch {
          /* best-effort — the success screen still works without the chip row */
        }
        setState('success');
      })
      .catch((e) => {
        if (e.code === 'already_member') setState('already-member');
        else if (e.code === 'removed_from_team') setState('blocked');
        else if (e.code === 'invalid_invite' || e.status === 404) setState('invalid');
        else { setErrorMsg(apiErrorMessage(e, t)); setState('error'); }
      });
  }, [authReady, isAuthed, token, t]);

  return (
    <div className="flex min-h-screen flex-col bg-ink-50/60">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-[68px] max-w-4xl items-center justify-between px-6">
          <Logo />
          <LangSwitcher />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        {!authReady && (
          <Card>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
          </Card>
        )}

        {authReady && !isAuthed && (
          <Card>
            <h1 className="font-display text-[22px] font-700 text-ink-900">{tt.joinHeading}</h1>
            <p className="mt-2 text-[14.5px] text-ink-500">{tt.joinSignInHint}</p>
            <Btn variant="dark" size="md" className="mt-6 w-full justify-center" onClick={() => setAuthOpen(true)}>{tt.joinSignInCta}</Btn>
          </Card>
        )}

        {authReady && isAuthed && state === 'joining' && (
          <Card>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-accent" />
            <p className="mt-4 text-[14.5px] text-ink-500">{tt.joining}</p>
          </Card>
        )}

        {state === 'success' && (
          <Card>
            <span className="font-display mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[22px] font-700 text-accent">
              {teamInitials(team?.name)}
            </span>
            <h1 className="font-display mt-4 text-[22px] font-700 text-ink-900">{tt.joinWelcomeFn(team?.name ?? '')}</h1>
            {(sportLabel || memberCount != null) && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[13.5px] text-ink-500">
                {sportLabel && <span className="rounded-full bg-ink-50 px-3 py-1.5">{sportLabel}</span>}
                {memberCount != null && <span className="rounded-full bg-ink-50 px-3 py-1.5">{tt.membersFn(memberCount)}</span>}
              </div>
            )}
            <Btn variant="dark" size="md" className="mt-6 w-full justify-center" onClick={() => goToTeam(team.id)}>{tt.openTeamPage}</Btn>
          </Card>
        )}

        {state === 'already-member' && (
          <Card>
            <div className="rounded-2xl bg-[var(--accent-soft)] px-4 py-3 text-[13.5px] font-600 text-[var(--accent-ink)]">{tt.joinAlreadyMember}</div>
            <Btn variant="dark" size="md" className="mt-5 w-full justify-center" onClick={goToProfile}>{tt.openMyTeams}</Btn>
          </Card>
        )}

        {state === 'invalid' && (
          <Card>
            <h1 className="font-display text-[20px] font-700 text-ink-900">{tt.joinInvalidTitle}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{tt.joinInvalidBody}</p>
            <Btn variant="outline" size="md" className="mt-6 w-full justify-center" onClick={goHome}>{tt.goToRally}</Btn>
          </Card>
        )}

        {state === 'blocked' && (
          <Card>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" /><path d="M8 8l8 8" strokeLinecap="round" />
              </svg>
            </span>
            <h1 className="font-display mt-4 text-[20px] font-700 text-ink-900">{tt.joinBlockedTitle}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{tt.joinBlockedBody}</p>
            <Btn variant="outline" size="md" className="mt-6 w-full justify-center" onClick={goHome}>{tt.browseTournaments}</Btn>
          </Card>
        )}

        {state === 'error' && (
          <Card>
            <p className="text-[14px] text-red-600">{errorMsg}</p>
            <Btn variant="outline" size="md" className="mt-5 w-full justify-center" onClick={goHome}>{tt.goToRally}</Btn>
          </Card>
        )}
      </main>

      {authOpen && <AuthPage mode="signin" onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
