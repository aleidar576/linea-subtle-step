import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { lojistaAuthApi, type LojistaUser, type LoginResponse } from '@/services/saas-api';
import { queryClient } from '@/config/queryClient';

interface LojistaAuthContextType {
  user: LojistaUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ require2FA?: boolean; tempToken?: string }>;
  verifyLogin2FA: (tempToken: string, code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const LojistaAuthContext = createContext<LojistaAuthContextType | null>(null);

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 min

export const LojistaAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LojistaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const logout = useCallback(() => {
    localStorage.removeItem('lojista_token');
    queryClient.clear();
    setUser(null);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (user) {
      timerRef.current = setTimeout(logout, INACTIVITY_TIMEOUT);
    }
  }, [user, logout]);

  // Activity listeners
  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [user, resetTimer]);

  // Check session on mount
  useEffect(() => {
    const token = localStorage.getItem('lojista_token');
    if (!token) { setLoading(false); return; }

    lojistaAuthApi.me()
      .then(res => {
        if (res.user && res.user.role === 'lojista') {
          setUser(res.user);
        } else {
          localStorage.removeItem('lojista_token');
        }
      })
      .catch(() => localStorage.removeItem('lojista_token'))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<{ require2FA?: boolean; tempToken?: string }> => {
    const res = await lojistaAuthApi.login(email, password);
    if ('require2FA' in res && res.require2FA) {
      return { require2FA: true, tempToken: res.tempToken };
    }
    if ('token' in res) {
      localStorage.setItem('lojista_token', res.token);
      setUser(res.user);
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
    }
    return {};
  };

  const verifyLogin2FA = async (tempToken: string, code: string) => {
    const res = await lojistaAuthApi.verifyLogin2FA(tempToken, code);
    localStorage.setItem('lojista_token', res.token);
    setUser(res.user);
    queryClient.invalidateQueries({ queryKey: ['lojas'] });
    queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
  };

  return (
    <LojistaAuthContext.Provider value={{ user, loading, login, verifyLogin2FA, logout, isAuthenticated: !!user }}>
      {children}
    </LojistaAuthContext.Provider>
  );
};

export const useLojistaAuth = () => {
  const ctx = useContext(LojistaAuthContext);
  if (!ctx) throw new Error('useLojistaAuth must be used within LojistaAuthProvider');
  return ctx;
};
