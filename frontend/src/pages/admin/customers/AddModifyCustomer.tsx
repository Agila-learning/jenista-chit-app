import { useState, useEffect } from 'react';
import { ActionLayout } from '../../../components/layout/ActionLayout';
import type { ActionType } from '../../../components/layout/ActionLayout';
import { Search, User, Phone, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { fetchClient } from '../../../api/client';
import { useAuth } from '../../../store/AuthContext';
import { isMockCustomer } from '../../../utils/cleanMockData';

export const AddModifyCustomer = () => {
  const { user } = useAuth();
  const isStaff = user?.role === 'STAFF';
  const [activeAction, setActiveAction] = useState<ActionType>('ADD');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchId, setSearchId] = useState('');
  
  const [mockCustomers, setMockCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem('mockCustomers');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((p: any) => !isMockCustomer(p)) : [];
    }
    return [];
  });
  const [activeCustomer, setActiveCustomer] = useState<any>(null);

  useEffect(() => {
    const syncWithMongo = async () => {
      try {
        const res = await fetchClient('/customers');
        if (res && res.data && Array.isArray(res.data)) {
          const localSaved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
          const mapped = res.data.map((c: any) => {
            const local = localSaved.find((lc: any) => 
              lc.id === (c.customerCode || c._id) || 
              lc.mongoId === c._id || 
              (lc.mobile && (lc.mobile === c.phone || lc.mobile === c.mobile))
            );
            const chits = (c.chits && c.chits.length > 0) ? c.chits : (local?.chits || []);
            return {
              id: c.customerCode || c._id,
              mongoId: c._id,
              name: c.fullName || c.name,
              mobile: c.phone || c.mobile,
              phone: c.phone || c.mobile,
              address: c.address,
              dob: c.dateOfBirth || local?.dob || '',
              gender: c.gender || local?.gender || '',
              pending: c.pending ?? local?.pending ?? 0,
              totalPaid: c.totalPaid ?? local?.totalPaid ?? 0,
              chits: chits,
              status: c.status || 'ACTIVE'
            };
          });
          const cleanMapped = mapped.filter((c: any) => !isMockCustomer(c));
          setMockCustomers(cleanMapped);
          localStorage.setItem('mockCustomers', JSON.stringify(cleanMapped));
        }
      } catch (e) {
        console.warn('Could not sync customers with MongoDB in AddModifyCustomer:', e);
      }
    };
    syncWithMongo();
  }, []);

  const handleActionSelect = (action: ActionType) => {
    setActiveAction(action);
    setHasSearched(false);
    setSearchId('');
    setActiveCustomer(null);
  };

  const handleClear = () => {
    setHasSearched(false);
    setSearchId('');
    setActiveCustomer(null);
  };

  const CustomerForm = ({ disabled = false, customer = null }: { disabled?: boolean, customer?: any }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [mobileInput, setMobileInput] = useState(customer?.mobile || customer?.phone || '');

    useEffect(() => {
      setMobileInput(customer?.mobile || customer?.phone || '');
    }, [customer]);

    const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
      setMobileInput(clean);
    };

    return (
      <form id="customer-form" className={`bg-white p-8 rounded-xl shadow-sm border border-neutral-200 ${disabled ? 'opacity-70 pointer-events-none' : ''}`}>
        <div className="space-y-8">
          
          {/* Personal Details */}
          <section>
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3 mb-6">
              <User className="w-5 h-5 text-primary-900" />
              <h4 className="text-lg font-bold text-neutral-800">Personal Details</h4>
            </div>
            
            <div className="max-w-md">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Full Name *</label>
                <Input name="name" defaultValue={customer?.name || ""} placeholder="Enter full name" disabled={disabled} required />
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section>
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3 mb-6">
              <Phone className="w-5 h-5 text-primary-900" />
              <h4 className="text-lg font-bold text-neutral-800">Contact Information</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Mobile Number *</label>
                <Input 
                  name="mobile" 
                  value={mobileInput}
                  onChange={handleMobileChange}
                  placeholder="Enter 10-digit mobile number (starts with 6,7,8,9)" 
                  maxLength={10}
                  disabled={disabled} 
                  required
                />
                <span className="text-[11px] text-neutral-500 mt-1 block">
                  Must start with 6, 7, 8, or 9 and be exactly 10 digits.
                </span>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">Residential Address *</label>
                <Input name="address" defaultValue={customer?.address || ""} placeholder="Enter full residential address" disabled={disabled} required />
              </div>
            </div>
          </section>

          {/* Customer Login Credentials */}
          <section>
            <div className="flex items-center space-x-2 border-b border-neutral-100 pb-3 mb-6">
              <Lock className="w-5 h-5 text-primary-900" />
              <h4 className="text-lg font-bold text-neutral-800">Customer Login Credentials</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gradient-to-r from-primary-50/60 to-neutral-50 p-6 rounded-xl border border-primary-200/80 shadow-sm">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                  User Name (Mobile Number)
                </label>
                <div className="relative">
                  <input 
                    name="username" 
                    readOnly
                    value={mobileInput || "Enter mobile number above"}
                    className="w-full h-[42px] px-3 py-2 bg-neutral-100 border border-neutral-300 rounded-md text-sm font-mono font-bold text-primary-900 cursor-not-allowed outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <p className="text-xs text-neutral-600 mt-1.5 flex items-center gap-1 font-medium">
                  The customer's 10-digit mobile number is their permanent login username.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1">
                  {customer ? 'Reset Password (optional)' : 'Login Password *'}
                </label>
                <div className="relative">
                  <input 
                    name="password"
                    type={showPassword ? "text" : "password"}
                    disabled={disabled}
                    defaultValue=""
                    placeholder={customer ? "Leave blank to keep existing password" : "Create password for customer login"}
                    className="w-full h-[42px] px-3 pr-10 py-2 bg-white border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-900 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-400"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1.5">
                  {customer 
                    ? "Enter a new password only if the customer requested a password reset." 
                    : "Set a password so the customer can immediately sign into the portal using their mobile number."}
                </p>
              </div>
            </div>
          </section>

          {/* Active Chits Section */}
          {customer?.chits && customer.chits.length > 0 && (
            <section>
              <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-6">
                <h4 className="text-lg font-bold text-slate-800">Active Chit Groups</h4>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {customer.chits.map((chit: any, idx: number) => (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-primary-700">{chit.groupId} - {chit.scheme || chit.groupName}</p>
                      <p className="text-xs text-slate-500 mt-1">Ticket: #{chit.ticketNumber} | Joined: {chit.joiningDate || 'Active'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-600">{chit.amount || chit.chitValue}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">{chit.status || 'Active'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
        </div>
      </form>
    );
  };

  const executeSearch = async () => {
    if (!searchId.trim()) return;
    try {
      const res = await fetchClient(`/customers?search=${encodeURIComponent(searchId.trim())}`);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        const foundMongo = res.data.find((c: any) => 
          (c.customerCode && c.customerCode.toLowerCase() === searchId.toLowerCase()) ||
          (c.phone && c.phone.includes(searchId)) ||
          (c.fullName && c.fullName.toLowerCase().includes(searchId.toLowerCase()))
        ) || res.data[0];

        if (foundMongo) {
          const mapped = {
            id: foundMongo.customerCode || foundMongo._id,
            mongoId: foundMongo._id,
            name: foundMongo.fullName || foundMongo.name,
            mobile: foundMongo.phone || foundMongo.mobile,
            address: foundMongo.address,
            dob: foundMongo.dateOfBirth ? new Date(foundMongo.dateOfBirth).toISOString().split('T')[0] : '',
            gender: foundMongo.gender || '',
            status: foundMongo.status || 'ACTIVE'
          };
          setActiveCustomer(mapped);
          setHasSearched(true);
          return;
        }
      }
    } catch (e) {
      console.warn('Backend search error, falling back to local:', e);
    }

    const found = mockCustomers.find(c => 
      c.id.toLowerCase() === searchId.toLowerCase() || 
      c.mobile === searchId || 
      c.name.toLowerCase().includes(searchId.toLowerCase())
    );
    if (found) {
      setActiveCustomer(found);
      setHasSearched(true);
    } else {
      alert("Customer not found!");
      setHasSearched(false);
      setActiveCustomer(null);
    }
  };

  const renderContent = (action: ActionType) => {
    if (action === 'MODIFY') {
      return (
        <div className="w-full pb-10">
          <div className="w-full space-y-6">
            <div className="card p-0 overflow-hidden bg-white border border-neutral-200 shadow-sm">
              <div className="p-8 bg-white flex justify-center">
                <div className="w-full max-w-2xl">
                  <h3 className="text-lg font-bold text-neutral-800 mb-6 text-center border-b pb-4">Search Customer to Modify</h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex border border-neutral-300 rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-primary-900 transition-all">
                      <div className="bg-neutral-100 px-4 py-2.5 flex items-center border-r border-neutral-300 w-48 text-sm font-semibold text-neutral-700 shrink-0">
                        Mobile / Customer ID
                      </div>
                      <div className="flex-1 relative flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-neutral-400" />
                        </div>
                        <input 
                          className="w-full pl-9 pr-3 py-2.5 text-sm outline-none bg-white" 
                          value={searchId}
                          onChange={(e) => setSearchId(e.target.value)}
                          placeholder="Search by 10-digit mobile or name..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-center pt-4">
                      <Button variant="primary" className="w-48" onClick={executeSearch}>
                        Search Customer
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {hasSearched && activeCustomer && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-end mt-8 mb-2 px-2">
                  <span className="px-3 py-1 bg-primary-50 text-primary-900 rounded-md text-sm font-semibold border border-primary-100 shadow-sm">
                    Modifying: {activeCustomer.name} (Username: {activeCustomer.mobile})
                  </span>
                </div>
                <CustomerForm customer={activeCustomer} />
              </div>
            )}
          </div>
        </div>
      );
    }
    
    // For ADD
    const isAdd = action === 'ADD';
    return (
      <div className="w-full pb-10">
        <div className="w-full space-y-6">
          <CustomerForm disabled={!isAdd} />
        </div>
      </div>
    );
  };

  const handleConfirm = async () => {
    if (activeAction === 'ADD') {
      const form = document.getElementById('customer-form') as HTMLFormElement;
      if (form) {
        const formData = new FormData(form);
        const nameVal = (formData.get('name') as string)?.trim() || '';
        const mobileVal = (formData.get('mobile') as string)?.trim() || '';
        const addressVal = (formData.get('address') as string)?.trim() || '';
        const passwordVal = (formData.get('password') as string)?.trim() || '';

        if (!nameVal || !mobileVal) {
          alert('Please enter at least Customer Name and Mobile Number.');
          return;
        }

        const cleanMobile = mobileVal.replace(/\D/g, '');
        if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
          alert('Mobile number must start with 6, 7, 8, or 9 and have exactly 10 digits.');
          return;
        }

        if (!passwordVal || passwordVal.length < 4) {
          alert('Please provide a login password for the customer (minimum 4 characters).');
          return;
        }

        const isDuplicate = mockCustomers.some(c => (c.mobile && c.mobile.replace(/\D/g, '') === cleanMobile) || (c.phone && c.phone.replace(/\D/g, '') === cleanMobile));
        if (isDuplicate) {
          alert('Already registered sign in to continue');
          return;
        }

        // Username is the mobile number
        const newCustomer: any = {
          id: cleanMobile,
          customerCode: cleanMobile,
          username: cleanMobile,
          name: nameVal,
          fullName: nameVal,
          mobile: cleanMobile,
          phone: cleanMobile,
          password: passwordVal,
          dob: (formData.get('dob') as string) || '',
          gender: (formData.get('gender') as string) || '',
          address: addressVal,
          status: isStaff ? 'PENDING_APPROVAL' : 'ACTIVE',
          referredBy: user?.name || (isStaff ? 'Staff User' : 'Admin User'),
          registeredBy: user?.name || (isStaff ? 'Staff User' : 'Admin User'),
          chits: [],
          pending: 0,
          totalPaid: 0,
          activeChits: 0
        };

        try {
          const res = await fetchClient('/customers', {
            method: 'POST',
            body: JSON.stringify({
              customerCode: cleanMobile,
              fullName: nameVal,
              name: nameVal,
              phone: cleanMobile,
              mobile: cleanMobile,
              address: addressVal,
              password: passwordVal,
              gender: newCustomer.gender ? newCustomer.gender.toUpperCase() : undefined,
              status: isStaff ? 'PENDING_APPROVAL' : 'ACTIVE',
              referredBy: newCustomer.referredBy,
            })
          });
          if (res && res.data) {
            newCustomer.id = res.data.customerCode || newCustomer.id;
            newCustomer.mongoId = res.data._id;
          }
        } catch (err: any) {
          const msg = err.message || '';
          if (msg.includes('Already registered') || msg.includes('409') || msg.includes('exists')) {
            alert('Already registered sign in to continue');
            return;
          }
          console.warn('Could not post customer to MongoDB directly:', err);
        }

        setMockCustomers(prev => {
          const updated = [...prev, newCustomer];
          localStorage.setItem('mockCustomers', JSON.stringify(updated));
          return updated;
        });
        window.dispatchEvent(new Event('storage'));
        
        if (isStaff) {
          alert(`Success: Customer ${newCustomer.name} has been enrolled and submitted for Admin verification!\n\nApproval Status: Pending Admin Verification`);
        } else {
          alert(`Success: Customer ${newCustomer.name} has been successfully registered and activated!\n\nCustomer Login Credentials:\nUser Name (Mobile Number): ${newCustomer.mobile}\nPassword: ${passwordVal}`);
        }
      } else {
        alert('Success: New customer has been successfully registered!');
      }
    } else if (activeAction === 'MODIFY') {
      const form = document.getElementById('customer-form') as HTMLFormElement;
      if (form && activeCustomer) {
        const formData = new FormData(form);
        const targetId = activeCustomer.mongoId || activeCustomer.id;
        const newPassword = (formData.get('password') as string)?.trim();
        const payload: any = {
          fullName: formData.get('name') as string,
          phone: formData.get('mobile') as string,
          address: formData.get('address') as string,
        };
        if (newPassword) {
          payload.password = newPassword;
        }

        try {
          await fetchClient(`/customers/${targetId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
          });
        } catch (err) {
          console.warn('Could not update customer in MongoDB:', err);
        }

        const localSaved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        const updatedLocal = localSaved.map((c: any) => {
          if (c.id === activeCustomer.id || c.mongoId === activeCustomer.mongoId) {
            return {
              ...c,
              name: payload.fullName || c.name,
              fullName: payload.fullName || c.name,
              phone: payload.phone || c.phone,
              mobile: payload.phone || c.mobile,
              address: payload.address || c.address,
              ...(newPassword ? { password: newPassword } : {})
            };
          }
          return c;
        });
        localStorage.setItem('mockCustomers', JSON.stringify(updatedLocal));
        setMockCustomers(updatedLocal);
        window.dispatchEvent(new Event('storage'));
        alert(newPassword ? 'Success: Customer details and login password have been updated!' : 'Success: Customer details have been successfully updated!');
      }
    }
    handleClear();
    setActiveAction('ADD');
  };

  const handleConfirmApprove = async () => {
    if (activeCustomer) {
      const targetId = activeCustomer.mongoId || activeCustomer.id;
      try {
        await fetchClient(`/customers/${targetId}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACTIVE' })
        });
      } catch (err) {
        console.warn('Could not approve customer status in MongoDB:', err);
      }
    }
    alert('Success: Customer details updated and approved!');
    handleClear();
    setActiveAction('ADD');
  };

  return (
    <ActionLayout 
      title="Customer Registration"
      defaultAction="ADD"
      actionLabels={{ ADD: 'Register Customer', MODIFY: 'Modify Details' }}
      allowedActions={['ADD', 'MODIFY']}
      onActionSelect={handleActionSelect}
      renderContent={renderContent}
      onClear={handleClear}
      onCancel={() => {
        handleClear();
        setActiveAction('ADD');
      }}
      onConfirm={activeAction ? handleConfirm : undefined}
      onConfirmApprove={activeAction === 'MODIFY' ? handleConfirmApprove : undefined}
    />
  );
};
