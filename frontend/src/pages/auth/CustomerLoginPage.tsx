import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Lock, User } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { fetchClient } from '../../api/client';

export const CustomerLoginPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (identifier === 'customer' && password === 'customer') {
        login('mock-jwt-token-customer', {
          id: '2',
          name: 'Customer Demo',
          phone: '9840123456',
          mobile: '9840123456',
          role: 'CUSTOMER',
          permissions: ['customer.read']
        });
        navigate('/customer/dashboard');
        return;
      }

      // 1. Try real login via backend API (MongoDB)
      try {
        const res = await fetchClient('/customers/login', {
          method: 'POST',
          body: JSON.stringify({ identifier, password }),
        });

        if (res && res.data) {
          login(res.data.token, res.data.user);
          navigate('/customer/dashboard');
          return;
        }
      } catch (apiErr: any) {
        // If API returned a specific business status error, throw it directly
        if (
          apiErr.message?.includes('pending admin approval') || 
          apiErr.message?.includes('rejected') ||
          apiErr.message?.includes('deactivated')
        ) {
          throw apiErr;
        }
        console.warn('API customer login error, falling back to local storage:', apiErr);
      }

      // 2. Fallback to localStorage
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const customer = customers.find((c: any) => 
        (c.mobile === identifier || c.phone === identifier || c.id === identifier) && 
        (!c.password || c.password === password)
      );
      
      if (customer) {
        if (customer.status === 'PENDING_APPROVAL') {
          throw new Error('Your account is pending admin approval.');
        }
        if (customer.status === 'REJECTED') {
          throw new Error('Your account registration was rejected.');
        }
        if (customer.status === 'INACTIVE' || customer.status === 'DEACTIVATED') {
          throw new Error('Your account has been deactivated by administrator. Access restricted.');
        }
        
        login(`token-${customer.id}`, {
          id: customer.id,
          name: customer.name || customer.fullName,
          phone: customer.mobile || customer.phone || '',
          mobile: customer.mobile || customer.phone || '',
          role: 'CUSTOMER',
          permissions: ['customer.read']
        });
        navigate('/customer/dashboard');
      } else {
        throw new Error('Invalid customer credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary-50 p-8">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-sm border border-neutral-200">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 mb-3 overflow-hidden rounded-lg">
            <img src="/assets/Chit logo.jpg.jpeg" alt="Company Logo" className="w-full h-full object-contain" />
          </div>
          {/* You can update 'Company Name' below once you decide on the exact text */}
          <span className="font-bold text-2xl tracking-tight text-neutral-900 mt-2">JENISTA CHITS</span>
        </div>

        {/* Header removed per user request */}

        {error && (
          <div className="bg-danger-light text-danger p-3 rounded-md mb-6 text-sm border border-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-neutral-700">Registered Mobile Number</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-4 w-4 text-neutral-400" />
              </div>
              <Input 
                className="pl-10"
                placeholder="+91 98765 43210"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-neutral-700">Password / OTP</label>
              <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">Forgot password?</a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-neutral-400" />
              </div>
              <Input 
                type="password"
                className="pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full h-11" isLoading={isLoading}>
            Sign In to My Account
          </Button>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-500">
              New Customer? <a href="#" className="font-medium text-primary-600 hover:text-primary-700">Open an Account</a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
