/* Rally — session + sport-profile state.
   Holds the logged-in user (from OAuth) and the user's sport profiles, kept in
   sync with localStorage so a reload (or another tab) preserves the state. */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getSession,
  setSession as persistSession,
  clearSession,
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
  const [session, setSession] = useState(getSession);
  const [profiles, setProfiles] = useState(getProfiles);

  // Keep state in sync if another tab signs in/out or edits profiles.
  useEffect(() => {
    const sync = () => {
      setSession(getSession());
      setProfiles(getProfiles());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const signIn = useCallback((s) => {
    persistSession(s);
    setSession(s);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
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
