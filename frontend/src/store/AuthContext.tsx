import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'BRANCH_MANAGER' | 'STAFF' | 'COLLECTION_AGENT' | 'ACCOUNTANT' | 'CUSTOMER';

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  mobile?: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: AuthUser) => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for token and hydrate user
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (token: string, userData: AuthUser) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasPermission }}>
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
