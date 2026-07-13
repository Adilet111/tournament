/* Rally — session + sport-profile state.
   The signed-in user lives in memory only; the real session is the httpOnly
   auth cookie the backend sets at login. On startup we ask GET /auth/me who we
   are (authReady flips true once that answer lands). Sport profiles are still
   kept in localStorage — they're display data, not credentials. */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getCurrentUser,
  logoutServer,
  getProfiles,
  setProfiles as persistProfiles,
  isAdmin,
} from './lib/auth';

const SessionContext = createContext(null);

const newId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2));

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [profiles, setProfiles] = useState(getProfiles);

  // Startup: the server says whether the cookie is (still) a valid session.
  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((user) => {
        if (!cancelled && user) setSession({ user });
      })
      .catch(() => {
        /* backend unreachable — treat as signed out */
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  // Keep profiles in sync if another tab edits them.
  useEffect(() => {
    const sync = () => setProfiles(getProfiles());
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const signIn = useCallback((s) => {
    setSession(s);
  }, []);

  const signOut = useCallback(() => {
    logoutServer(); // clears the httpOnly cookie; best-effort
    setSession(null);
    // Protected surfaces live under #admin — bounce to the public site.
    if (window.location.hash.startsWith('#admin')) window.location.hash = '';
  }, []);

  // Global 401 rule: any API call that comes back unauthorized clears the
  // user state and sends the user back to the public site to sign in again.
  useEffect(() => {
    const onUnauthorized = () => {
      setSession(null);
      if (window.location.hash.startsWith('#admin')) window.location.hash = '';
    };
    window.addEventListener('rally:unauthorized', onUnauthorized);
    return () => window.removeEventListener('rally:unauthorized', onUnauthorized);
  }, []);

  const addProfile = useCallback((profile) => {
    setProfiles((prev) => {
      const next = [...prev, { id: newId(), createdAt: Date.now(), ...profile }];
      persistProfiles(next);
      return next;
    });
  }, []);

  const removeProfile = useCallback((id) => {
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id);
      persistProfiles(next);
      return next;
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        user: session?.user || null,
        isAuthed: !!session,
        authReady,
        isAdmin: isAdmin(session),
        signIn,
        signOut,
        profiles,
        addProfile,
        removeProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
