import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Family, AuthStatus } from '../types';
import { api, ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  family: Family | null;
  status: AuthStatus;
  inviteId: string | null;
  inviteFamilyName: string | null;
  isDemo: boolean;
  startDemo: () => Promise<void>;
  requestSignIn: (email: string) => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  family: null,
  status: 'loading',
  inviteId: null,
  inviteFamilyName: null,
  isDemo: false,
  startDemo: async () => {},
  requestSignIn: async () => {},
  refetch: () => {},
});

function usingDemoJWT(): boolean {
  const hasCF = !!document.cookie.match(/CF_Authorization=/);
  const hasSession = !!localStorage.getItem('session_jwt');
  return !hasCF && !hasSession && !!localStorage.getItem('demo_jwt');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteFamilyName, setInviteFamilyName] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchMe = useCallback(async () => {
    setStatus('loading');
    try {
      const data = await api.get<{
        status: string;
        user?: User;
        family?: Family;
        invite?: { id: string; familyName: string };
      }>('/auth/me');

      if (data.status === 'ok' && data.user) {
        setUser(data.user);
        setFamily(data.family || null);
        setStatus('ok');
        setIsDemo(usingDemoJWT());
      } else if (data.status === 'invite_pending' && data.invite) {
        setInviteId(data.invite.id);
        setInviteFamilyName(data.invite.familyName);
        setStatus('invite_pending');
        setIsDemo(false);
      } else if (data.status === 'no_access') {
        setStatus('no_access');
        setIsDemo(false);
      } else {
        setStatus('setup_needed');
        setIsDemo(false);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // Clear stale JWTs
        localStorage.removeItem('session_jwt');
        if (usingDemoJWT()) {
          localStorage.removeItem('demo_jwt');
        }
        setStatus('no_access');
      } else {
        setStatus('no_access');
      }
      setIsDemo(false);
    }
  }, []);

  const startDemo = useCallback(async () => {
    const data = await api.post<{ token: string }>('/auth/demo');
    localStorage.setItem('demo_jwt', data.token);
    await fetchMe();
  }, [fetchMe]);

  const requestSignIn = useCallback(async (email: string) => {
    await api.post('/auth/signin/request', { email });
  }, []);

  useEffect(() => {
    // Handle magic-link redirect: ?session=<jwt>
    const params = new URLSearchParams(window.location.search);
    const session = params.get('session');
    if (session) {
      localStorage.setItem('session_jwt', session);
      window.history.replaceState({}, '', window.location.pathname);
    }
    fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{ user, family, status, inviteId, inviteFamilyName, isDemo, startDemo, requestSignIn, refetch: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
