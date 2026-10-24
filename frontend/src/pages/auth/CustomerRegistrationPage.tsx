import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { fetchClient } from '../../api/client';

export const CustomerRegistrationPage = () => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(digits);
    if (error) setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const cleanMobile = mobile.trim().replace(/\D/g, '');

    // Validate mobile number: Must start with 6, 7, 8, or 9 and be exactly 10 digits
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      setError('Mobile number must start with 6, 7, 8, or 9 and have exactly 10 digits.');
      setIsLoading(false);
      return;
    }

    // Check if already registered locally
    const saved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    if (saved.some((c: any) => c.phone === cleanMobile || c.mobile === cleanMobile)) {
      setError('Already registered sign in to continue');
      setIsLoading(false);
      return;
    }

    try {
      await fetchClient('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          mobile: cleanMobile,
          phone: cleanMobile,
          address: address.trim(),
          password
        })
      });
      navigate('/customer-login', { state: { message: 'Registration successful! Your account is pending admin approval.' } });
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.toLowerCase().includes('already') ||
        msg.toLowerCase().includes('exists') ||
        msg.toLowerCase().includes('duplicate') ||
        msg.includes('409')
      ) {
        setError('Already registered sign in to continue');
      } else {
        setError(msg || 'Registration failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2 mb-6">
          <img src="/assets/Chit logo.jpg.jpeg" alt="Jenista Chits Logo" className="h-12 w-12 object-contain" />
          <span className="font-bold text-2xl text-primary-900 tracking-tight">Jenista Chits</span>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-neutral-900">Create your account</h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Or <Link to="/customer-login" className="font-medium text-primary-600 hover:text-primary-500">login if you already have one</Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-neutral-200">
          <form className="space-y-6" onSubmit={handleRegister}>
            <Input 
              label="Full Name" 
              type="text" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
            
            <div>
              <Input 
                label="Mobile Number" 
                type="tel" 
                required 
                value={mobile}
                onChange={handleMobileChange}
                placeholder="10-digit number (starts with 6, 7, 8, 9)"
                maxLength={10}
              />
              <span className="text-[11px] text-neutral-500 mt-1 block">
                Must start with 6, 7, 8, or 9 (exactly 10 digits)
              </span>
            </div>
            
            <Input 
              label="Address" 
              type="text" 
              required 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Your full address"
            />

            <Input 
              label="Password" 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
            />

            {error && (
              <div className="bg-danger-light/30 text-danger text-sm p-3.5 rounded-lg border border-danger/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in">
                <span className="font-medium">{error}</span>
                {error.includes('Already registered') && (
                  <Link to="/customer-login" className="underline font-bold hover:text-danger-dark shrink-0">
                    Sign in to continue →
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" className="w-full justify-center" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
