import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authApi } from '@/services/api';
import { queryClient } from '@/config/queryClient';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  // Check existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setLoading(false);
      return;
    }

    authApi.me()
      .then(({ user }) => {
        setUser(user);
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { token, user } = await authApi.login(email, password);
      localStorage.setItem('auth_token', token);
      setUser(user);
      queryClient.invalidateQueries({ queryKey: ['lojas'] });
      queryClient.invalidateQueries({ queryKey: ['admin-lojistas'] });
      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Erro ao fazer login' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    queryClient.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
