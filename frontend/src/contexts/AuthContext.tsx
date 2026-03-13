import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Family, AuthStatus } from '../types';
import { api, ApiError } from '../api/client';

interface AuthContextType {
  user: User | null;
  family: Family | null;
  status: AuthStatus;
  inviteId: string | null;
  inviteFamilyName: string | null;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  family: null,
  status: 'loading',
  inviteId: null,
  inviteFamilyName: null,
  refetch: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [inviteId, setInviteId] = useState<string | null>(null);
  const [inviteFamilyName, setInviteFamilyName] = useState<string | null>(null);

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
      } else if (data.status === 'invite_pending' && data.invite) {
        setInviteId(data.invite.id);
        setInviteFamilyName(data.invite.familyName);
        setStatus('invite_pending');
      } else if (data.status === 'no_access') {
        setStatus('no_access');
      } else {
        setStatus('setup_needed');
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        // No JWT - CF Access should redirect, but show no_access
        setStatus('no_access');
      } else {
        setStatus('no_access');
      }
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <AuthContext.Provider
      value={{ user, family, status, inviteId, inviteFamilyName, refetch: fetchMe }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
