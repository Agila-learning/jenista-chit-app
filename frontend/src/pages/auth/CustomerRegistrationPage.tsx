import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { fetchClient } from '../../api/client';
import { addSystemNotification } from '../../utils/notificationsData';
import { isMockGroup } from '../../utils/cleanMockData';

export const CustomerRegistrationPage = () => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Load dynamic chit groups created by Admin from storage / backend
    const loadGroups = () => {
      try {
        const diskGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
        const clean = diskGroups.filter((g: any) => !isMockGroup(g));
        setAvailableGroups(clean);
        if (clean.length > 0) {
          setSelectedGroupId(clean[0].id || clean[0].name);
        }
      } catch (e) {
        console.warn('Error loading groups for registration:', e);
      }
    };
    loadGroups();
    window.addEventListener('storage', loadGroups);
    return () => window.removeEventListener('storage', loadGroups);
  }, []);

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
      let createdCustomerCode = `TC-${Math.floor(Math.random() * 90000) + 10000}`;
      let createdMongoId = null;

      try {
        const res = await fetchClient('/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            mobile: cleanMobile,
            phone: cleanMobile,
            address: address.trim(),
            password
          })
        });
        if (res && res.data) {
          createdCustomerCode = res.data.customerCode || createdCustomerCode;
          createdMongoId = res.data._id;
        }
      } catch (apiErr: any) {
        console.warn('Backend customer registration fallback:', apiErr);
      }

      // Find selected group metadata
      const targetGroup = availableGroups.find((g: any) => (g.id === selectedGroupId || g.name === selectedGroupId)) || availableGroups[0];
      const now = new Date();
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const currentMonthName = now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const paymentStartsMonthName = nextMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      const assignedChits = targetGroup ? [{
        groupId: targetGroup.id,
        groupName: targetGroup.name,
        chitValue: Number(targetGroup.value || 100000),
        monthlyInstallment: Math.round(Number(targetGroup.value || 100000) / Number(targetGroup.duration || targetGroup.months || 20)),
        duration: Number(targetGroup.duration || targetGroup.months || 20),
        months: Number(targetGroup.duration || targetGroup.months || 20),
        ticketNumber: `#0${(Array.isArray(targetGroup.enrolledMembers) ? targetGroup.enrolledMembers.length : 0) + 1}`,
        scheme: targetGroup.scheme || 'Regular',
        joiningDate: now.toISOString(),
        monthJoined: currentMonthName,
        paymentStartsMonth: paymentStartsMonthName,
        dueDate: nextMonthDate.toISOString().split('T')[0],
        paymentStatus: 'DUE',
        installmentsPaid: 0
      }] : [];

      // Record in local cache in PENDING_APPROVAL status
      const newEntry = {
        id: createdCustomerCode,
        customerCode: createdCustomerCode,
        mongoId: createdMongoId,
        name: name.trim(),
        fullName: name.trim(),
        mobile: cleanMobile,
        phone: cleanMobile,
        address: address.trim(),
        password,
        status: 'PENDING_APPROVAL',
        registeredBy: 'Self Registered',
        requestedGroupId: targetGroup?.id,
        requestedGroupName: targetGroup?.name,
        joiningDate: now.toISOString(),
        monthJoined: currentMonthName,
        paymentStartsMonth: paymentStartsMonthName,
        chits: assignedChits,
        pending: 0,
        totalPaid: 0,
        createdAt: now.toISOString()
      };
      const updatedCustomers = [newEntry, ...saved];
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));
      window.dispatchEvent(new Event('storage'));

      // Dispatch live real-time notification to Admin
      addSystemNotification({
        type: 'NEW_REGISTRATION',
        title: 'New Customer Registered - Approval Required',
        message: `${name.trim()} (${cleanMobile}) registered for group "${targetGroup?.name || 'Chit Plan'}". Approval is required before credentials can be used.`,
        targetRole: 'ADMIN',
        metadata: {
          customerId: createdCustomerCode,
          customerName: name.trim(),
          phone: cleanMobile,
          groupId: targetGroup?.id,
          groupName: targetGroup?.name
        }
      });

      navigate('/customer-login', { 
        state: { 
          message: 'Registration submitted! Your account is pending admin approval. Credentials will be active once approved by administrator.' 
        } 
      });
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
            
            {availableGroups.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-neutral-700">
                  Select Chit Group to Join *
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full h-11 px-3 border border-neutral-300 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  required
                >
                  {availableGroups.map((g: any) => (
                    <option key={g.id || g.name} value={g.id || g.name}>
                      {g.name} — ₹{Number(g.value || 100000).toLocaleString('en-IN')} ({g.duration || g.months || 20} Months · {g.scheme || 'Regular'})
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-emerald-700 font-semibold block">
                  ✓ Monthly payments will start from next month post Admin approval.
                </span>
              </div>
            )}

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
