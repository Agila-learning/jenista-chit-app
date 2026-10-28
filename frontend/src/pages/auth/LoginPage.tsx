import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { 
  ArrowLeft,
  ArrowRight, 
  Search, 
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { fetchClient } from '../../api/client';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const cleanId = identifier.trim();

    try {
      // 1. Role Check: ADMIN Credentials
      if (cleanId.toLowerCase() === 'admin' && password === 'admin') {
        login('mock-jwt-token-admin', {
          id: '1',
          name: 'System Admin',
          role: 'SUPER_ADMIN',
          permissions: ['*']
        });
        navigate('/admin/dashboard');
        return;
      }

      // 2. Role Check: STAFF Credentials
      if (cleanId.toLowerCase() === 'staff' && password === 'staff') {
        login('mock-jwt-token-staff', {
          id: 'staff-1',
          name: 'Rajesh Kumar (Collection Staff)',
          role: 'STAFF',
          permissions: ['receipts.create', 'receipts.read', 'customers.create', 'customers.read']
        });
        navigate('/staff/dashboard');
        return;
      }

      // 3. Try Backend Employee / Admin Authentication
      try {
        const empRes = await fetchClient('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: cleanId, password }),
        });

        if (empRes && empRes.data) {
          const role = empRes.data.user?.role || empRes.data.user?.roles?.[0] || 'STAFF';
          login(empRes.data.accessToken || empRes.data.token, empRes.data.user);
          if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
            navigate('/admin/dashboard');
          } else {
            navigate('/staff/dashboard');
          }
          return;
        }
      } catch (empErr: any) {
        // If not an employee account, fall through to check customer accounts
        console.debug('Not employee account, checking customer login...', empErr?.message);
      }

      // 4. Try Backend Customer Authentication
      try {
        const custRes = await fetchClient('/customers/login', {
          method: 'POST',
          body: JSON.stringify({ identifier: cleanId, password }),
        });

        if (custRes && custRes.data) {
          login(custRes.data.token, custRes.data.user);
          navigate('/customer/dashboard');
          return;
        }
      } catch (custErr: any) {
        if (
          custErr.message?.includes('pending admin approval') || 
          custErr.message?.includes('rejected') ||
          custErr.message?.includes('deactivated')
        ) {
          throw custErr;
        }
      }

      // 5. Fallback Customer Check (Local Storage Mock Data)
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const customer = customers.find((c: any) => 
        (c.mobile === cleanId || c.phone === cleanId || c.id === cleanId || c.customerCode === cleanId) && 
        (!c.password || c.password === password)
      );
      
      if (customer) {
        if (customer.status === 'PENDING_APPROVAL') {
          throw new Error('Your account is pending admin approval.');
        }
        if (customer.status === 'REJECTED') {
          throw new Error('Your registration was not approved.');
        }
        if (customer.status === 'INACTIVE' || customer.status === 'DEACTIVATED') {
          throw new Error('Your account has been deactivated. Please contact administrator.');
        }
        
        login(`token-${customer.id}`, {
          id: customer.id,
          name: customer.name || customer.fullName,
          phone: customer.mobile || customer.phone,
          role: 'CUSTOMER',
          permissions: ['customer.read']
        });
        navigate('/customer/dashboard');
        return;
      }

      // If credentials do not match any role:
      throw new Error('Invalid credentials. Please verify your Mobile Number, User ID, or Username and Password.');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 bg-neutral-50 text-neutral-900 relative overflow-hidden">
      {/* Subtle light background decorative radial accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Responsive Navigation Bar with Proper Back Button */}
      <div className="w-full max-w-md mx-auto mb-4 flex items-center justify-between px-1 relative z-10">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-100/80 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-all active:scale-95 group"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-800 uppercase tracking-wider bg-blue-50/90 px-3 py-1.5 rounded-full border border-blue-200/80 shadow-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          Secure Unified Portal
        </span>
      </div>

      {/* Main Single Login Card */}
      <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner matching Signup page style */}
        <div className="bg-gradient-to-b from-slate-50 to-white px-6 pt-7 pb-5 text-center border-b border-slate-100 relative">
          <Link to="/" className="inline-block hover:scale-105 transition-transform">
            <div className="w-16 h-16 mx-auto mb-3 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/80 flex items-center justify-center">
              <img src="/assets/Chit logo.jpg.jpeg" alt="Jenista Chits Logo" className="w-full h-full object-contain" />
            </div>
          </Link>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Jenista Chit Funds</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">Single Portal for Customers, Field Staff & Administrators</p>
        </div>

        <div className="p-6 sm:p-8">
          {/* Error Banner */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Unified Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Number, Customer ID, or Username
              </label>
              <div className="relative">
                <Input
                  placeholder="e.g. 9840123456, TC-11075, staff, or admin"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="h-11 text-xs sm:text-sm rounded-xl pl-9 bg-white border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-normal">
                  Case-sensitive
                </span>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 text-xs sm:text-sm rounded-xl pl-9 pr-10 bg-white border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-xs sm:text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Verifying credentials...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* New Member Registration Link matching signup page */}
          <div className="mt-6 text-center text-xs text-slate-600 pt-5 border-t border-slate-100">
            Don't have an account yet?{' '}
            <Link to="/register" className="font-bold text-blue-700 hover:text-blue-800 hover:underline">
              Create new account
            </Link>
          </div>

          {/* Direct Track Chit Link */}
          <div className="mt-3.5 text-center">
            <Link
              to="/#track-chit"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 font-medium transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Track chit status without login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
