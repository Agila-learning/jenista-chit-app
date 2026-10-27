import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, UserRole } from '../types';
import { secureStorage } from '../services/storage';
import { apiClient } from '../services/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginAsAdminOrStaff: (identifier: string, pass: string) => Promise<void>;
  loginAsCustomer: (identifier: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await secureStorage.getItem('auth_token');
        const storedUser = await secureStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.warn('Failed to restore auth session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const loginAsAdminOrStaff = async (identifier: string, pass: string): Promise<void> => {
    const cleanId = identifier.trim().toLowerCase();

    // 1. Try backend authentication if available
    try {
      const res = await apiClient<{ data: { token: string; user: AuthUser } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: cleanId, password: pass }),
      });
      if (res && res.data && res.data.token) {
        const u = res.data.user;
        const t = res.data.token;
        await secureStorage.setItem('auth_token', t);
        await secureStorage.setItem('auth_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
        return;
      }
    } catch {
      // Fall through to known role credentials from web app
    }

    // 2. Direct Admin check
    if (cleanId === 'admin' && pass === 'admin') {
      const adminUser: AuthUser = {
        id: '1',
        name: 'System Admin',
        role: 'SUPER_ADMIN',
        permissions: ['*'],
      };
      const t = 'jwt-admin-token-mobile';
      await secureStorage.setItem('auth_token', t);
      await secureStorage.setItem('auth_user', JSON.stringify(adminUser));
      setToken(t);
      setUser(adminUser);
      return;
    }

    // 3. Direct Staff check
    if (cleanId === 'staff' && pass === 'staff') {
      const staffUser: AuthUser = {
        id: 'staff-1',
        name: 'Rajesh Kumar (Staff)',
        role: 'STAFF',
        permissions: [
          'receipts.create',
          'receipts.read',
          'customers.create',
          'customers.read',
        ],
      };
      const t = 'jwt-staff-token-mobile';
      await secureStorage.setItem('auth_token', t);
      await secureStorage.setItem('auth_user', JSON.stringify(staffUser));
      setToken(t);
      setUser(staffUser);
      return;
    }

    throw new Error('Invalid credentials. Please enter valid Admin or Staff username and password.');
  };

  const loginAsCustomer = async (identifier: string, pass: string): Promise<void> => {
    const cleanMobile = identifier.trim().replace(/\s+/g, '');

    // 1. Check quick customer demo credentials
    if (cleanMobile.toLowerCase() === 'customer' && pass === 'customer') {
      const demoCust: AuthUser = {
        id: '2',
        name: 'Customer Demo',
        phone: '9840123456',
        mobile: '9840123456',
        role: 'CUSTOMER',
        permissions: ['customer.read'],
      };
      const t = 'jwt-customer-token-demo';
      await secureStorage.setItem('auth_token', t);
      await secureStorage.setItem('auth_user', JSON.stringify(demoCust));
      setToken(t);
      setUser(demoCust);
      return;
    }

    // 2. Real API customer login
    try {
      const res = await apiClient<{ data: { token: string; user: any } }>('/customers/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: cleanMobile, password: pass }),
      });
      if (res && res.data && res.data.token) {
        const u: AuthUser = {
          id: res.data.user.id || res.data.user._id || res.data.user.customerCode,
          name: res.data.user.name || res.data.user.fullName || 'Customer',
          phone: res.data.user.phone || res.data.user.mobile,
          mobile: res.data.user.mobile || res.data.user.phone,
          role: 'CUSTOMER',
          permissions: ['customer.read'],
          status: res.data.user.status,
        };
        const t = res.data.token;
        await secureStorage.setItem('auth_token', t);
        await secureStorage.setItem('auth_user', JSON.stringify(u));
        setToken(t);
        setUser(u);
        return;
      }
    } catch (apiErr: any) {
      if (
        apiErr.message?.includes('pending admin approval') ||
        apiErr.message?.includes('rejected') ||
        apiErr.message?.includes('deactivated')
      ) {
        throw apiErr;
      }
    }

    // 3. Fallback: Lookup customer from backend customers endpoint
    try {
      const custRes = await apiClient<{ data: any[] }>(`/customers`);
      if (custRes && custRes.data && Array.isArray(custRes.data)) {
        const matched = custRes.data.find((c) => {
          const ph = (c.phone || c.mobile || '').replace(/\D/g, '');
          const idClean = (c.customerCode || c._id || '').toLowerCase();
          const qClean = cleanMobile.replace(/\D/g, '');
          return ph === qClean || idClean === cleanMobile.toLowerCase();
        });

        if (matched) {
          if (matched.status === 'PENDING_APPROVAL') {
            throw new Error('Your account is pending admin approval.');
          }
          if (matched.status === 'REJECTED') {
            throw new Error('Your registration was rejected.');
          }
          if (matched.status === 'INACTIVE' || matched.status === 'DEACTIVATED') {
            throw new Error('Your account has been deactivated by administrator.');
          }

          const custUser: AuthUser = {
            id: matched.customerCode || matched._id,
            name: matched.fullName || matched.name,
            phone: matched.phone || matched.mobile,
            mobile: matched.mobile || matched.phone,
            role: 'CUSTOMER',
            permissions: ['customer.read'],
            status: matched.status || 'ACTIVE',
          };
          const t = `token-${custUser.id}`;
          await secureStorage.setItem('auth_token', t);
          await secureStorage.setItem('auth_user', JSON.stringify(custUser));
          setToken(t);
          setUser(custUser);
          return;
        }
      }
    } catch (e: any) {
      if (e.message && !e.message.includes('API Error')) {
        throw e;
      }
    }

    throw new Error('Invalid mobile number or credentials. Please check and try again.');
  };

  const logout = async (): Promise<void> => {
    try {
      await secureStorage.removeItem('auth_token');
      await secureStorage.removeItem('auth_user');
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const hasPermission = (perm: string): boolean => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return user.permissions?.includes(perm) || false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        loginAsAdminOrStaff,
        loginAsCustomer,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
