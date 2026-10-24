import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { EyeOff } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

export const AdminLoginPage = () => {
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
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const cleanId = identifier.trim().toLowerCase();

      // 1. Admin Login
      if (cleanId === 'admin' && password === 'admin') {
        login('mock-jwt-token-admin', {
          id: '1',
          name: 'System Admin',
          role: 'SUPER_ADMIN',
          permissions: ['*']
        });
        navigate('/admin/dashboard');
        return;
      } 
      
      // 2. Staff Login (Field & Collection Staff)
      if (cleanId === 'staff' && password === 'staff') {
        login('mock-jwt-token-staff', {
          id: 'staff-1',
          name: 'Rajesh Kumar (Staff)',
          role: 'STAFF',
          permissions: ['receipts.create', 'receipts.read', 'customers.create', 'customers.read']
        });
        navigate('/staff/dashboard');
        return;
      }

      // 3. Fallback or custom employee checks
      throw new Error('Invalid employee credentials. Please enter valid Admin or Staff login.');
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
          <span className="font-bold text-2xl tracking-tight text-neutral-900 mt-2">JENISTA CHITS</span>
        </div>

        {error && (
          <div className="bg-danger-light text-danger p-3 rounded-md mb-6 text-sm border border-danger font-sans">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 font-sans">
          <div className="space-y-1 relative">
            <Input 
              className="w-full border-neutral-300 focus:border-primary-500 focus:ring-primary-500 rounded-md h-12 px-4"
              placeholder="Username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1 relative">
            <Input 
              type="password"
              className="w-full border-neutral-300 focus:border-primary-500 focus:ring-primary-500 rounded-md h-12 px-4 pr-10"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <EyeOff className="w-5 h-5" />
            </button>
          </div>

          <Button type="submit" variant="primary" className="w-full h-11" isLoading={isLoading}>
            Submit
          </Button>

          <div className="flex justify-between items-center pt-2">
            <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Forgot Password?
            </a>
            <span className="text-xs text-neutral-400">v 1.0.6</span>
          </div>
        </form>
      </div>
    </div>
  );
};
