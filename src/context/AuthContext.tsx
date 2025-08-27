import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null; // Can be expanded with a proper User type
  login: (scopes?: string[]) => void;
  logout: () => void;
  setAuthenticated: (status: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<any | null>(null);

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    }
  };

  const checkSession = async () => {
    try {
      const response = await api.get('/auth/status');
      if (response.status === 200) {
        setIsAuthenticated(true);
        await fetchUser(); // Fetch user info if authenticated
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
      console.error('Session check failed:', error);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = (scopes?: string[]) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';
    let authUrl = `${backendUrl}/auth/google`;
    if (scopes && scopes.length > 0) {
      authUrl += `?scopes=${scopes.join(',')}`;
    }
    window.location.href = authUrl;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    // In a real app, you would also call a backend endpoint to clear the session
  };

  const setAuthenticated = (status: boolean) => {
    setIsAuthenticated(status);
    if (!status) {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, setAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
