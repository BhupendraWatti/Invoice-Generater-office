'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserDto } from '@docflow/shared-types';
import { api } from '../lib/api';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: UserDto | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = async () => {
    try {
      const profile = await api.auth.getProfile();
      setUser(profile);
    } catch (e) {
      setUser(null);
      if (pathname !== '/login') {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch only on client mount, or when accessing non-login pages
    if (pathname !== '/login') {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [pathname]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.auth.login(email, pass);
      if (res.status === 'SUCCESS' && res.user) {
        setUser(res.user);
        router.push('/');
      }
      return res;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
