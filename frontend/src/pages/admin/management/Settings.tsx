import { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { 
  Building2, Shield, Bell, 
  FileCheck, ShieldCheck, MapPin, Plus, Trash2, CheckCircle2
} from 'lucide-react';
import { cn } from '../../../utils/cn';

// Default Models
const DEFAULT_ORG = { 
  name: 'Jenista Chits Pvt. Ltd.', 
  cin: 'U67190TZ2020PTC033361', 
  gstin: '33AAAAJ0000A1Z5', 
  foreman: 'FR-TN-2020-0042', 
  address: 'D.No. 4/342/4, Mani Road, Pudukkottai', 
  city: 'Thoothukudi', 
  state: 'Tamil Nadu', 
  pin: '628103', 
  email: 'jenistachits@gmail.com' 
};

const DEFAULT_BRANCHES = [
  { id: 'B001', name: 'Head Office', location: 'Thoothukudi', manager: 'Admin User' },
  { id: 'B002', name: 'Branch Office', location: 'Hosur', manager: 'Branch Manager' }
];

const DEFAULT_ROLES = [
  { id: 'SUPER_ADMIN', name: 'SUPER_ADMIN', users: 2, access: 'Full System Access' },
  { id: 'BRANCH_MANAGER', name: 'BRANCH_MANAGER', users: 14, access: 'Branch Operations & Reporting' },
  { id: 'ACCOUNTANT', name: 'ACCOUNTANT', users: 5, access: 'Ledger, Disbursals (Read/Write)' },
  { id: 'COLLECTION_AGENT', name: 'COLLECTION_AGENT', users: 45, access: 'Record Payments, View Assigned Users' },
];

const DEFAULT_KYC = { aadharRequired: true, panRequired: true, addressProof: false, autoVerify: false };
const DEFAULT_NOTIFS = { emailAlerts: true, smsAlerts: true, dailyReports: false, loginAlerts: true };

export const Settings = () => {
  const [activeTab, setActiveTab] = useState('organization');
  
  // States
  const [org, setOrg] = useState(DEFAULT_ORG);
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [kyc, setKyc] = useState(DEFAULT_KYC);
  const [notifs, setNotifs] = useState(DEFAULT_NOTIFS);

  const [savedAlert, setSavedAlert] = useState(false);

  // Load from local storage
  useEffect(() => {
    const sOrg = localStorage.getItem('appSettings_org');
    if (sOrg) setOrg(JSON.parse(sOrg));

    const sBranches = localStorage.getItem('appSettings_branches');
    if (sBranches) setBranches(JSON.parse(sBranches));

    const sRoles = localStorage.getItem('appSettings_roles');
    if (sRoles) setRoles(JSON.parse(sRoles));

    const sKyc = localStorage.getItem('appSettings_kyc');
    if (sKyc) setKyc(JSON.parse(sKyc));

    const sNotifs = localStorage.getItem('appSettings_notifs');
    if (sNotifs) setNotifs(JSON.parse(sNotifs));
  }, []);

  // Show generic save alert
  const triggerSaveAlert = () => {
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  const handleSaveOrg = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('appSettings_org', JSON.stringify(org));
    triggerSaveAlert();
  };

  const handleSaveKyc = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('appSettings_kyc', JSON.stringify(kyc));
    triggerSaveAlert();
  };

  const handleSaveNotifs = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('appSettings_notifs', JSON.stringify(notifs));
    triggerSaveAlert();
  };

  const addBranch = () => {
    const newBranch = { id: `B00${branches.length + 1}`, name: 'New Branch', location: 'Location', manager: 'Manager Name' };
    const updated = [...branches, newBranch];
    setBranches(updated);
    localStorage.setItem('appSettings_branches', JSON.stringify(updated));
  };

  const updateBranch = (idx: number, field: string, value: string) => {
    const updated = [...branches];
    updated[idx] = { ...updated[idx], [field]: value };
    setBranches(updated);
    localStorage.setItem('appSettings_branches', JSON.stringify(updated));
  };

  const deleteBranch = (idx: number) => {
    const updated = branches.filter((_, i) => i !== idx);
    setBranches(updated);
    localStorage.setItem('appSettings_branches', JSON.stringify(updated));
  };

  const addRole = () => {
    const newRole = { id: `ROLE_${Date.now()}`, name: 'NEW_ROLE', users: 0, access: 'Basic Access' };
    const updated = [...roles, newRole];
    setRoles(updated);
    localStorage.setItem('appSettings_roles', JSON.stringify(updated));
  };

  const updateRole = (idx: number, field: string, value: string) => {
    const updated = [...roles];
    updated[idx] = { ...updated[idx], [field]: value };
    setRoles(updated);
    localStorage.setItem('appSettings_roles', JSON.stringify(updated));
  };

  const deleteRole = (idx: number) => {
    const updated = roles.filter((_, i) => i !== idx);
    setRoles(updated);
    localStorage.setItem('appSettings_roles', JSON.stringify(updated));
  };

  const settingsTabs = [
    { id: 'organization', name: 'Organization Profile', icon: Building2 },
    { id: 'branches', name: 'Branch Management', icon: MapPin },
    { id: 'roles', name: 'Roles & Permissions', icon: Shield },
    { id: 'kyc', name: 'KYC Configuration', icon: FileCheck },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6 relative pb-16">
      
      {/* Floating Save Alert */}
      {savedAlert && (
        <div className="fixed top-20 right-8 z-50 bg-success-light text-success border border-success/20 px-6 py-4 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold">Settings saved successfully!</span>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-primary-900 tracking-tight">System Settings</h1>
        <p className="text-sm text-neutral-500">Configure global parameters, branches, and organizational controls.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Settings Navigation */}
        <div className="lg:col-span-1 space-y-1 bg-white p-2 rounded-xl border border-neutral-200 shadow-sm sticky top-6">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-3 text-sm font-bold rounded-lg transition-colors",
                activeTab === tab.id 
                  ? "bg-primary-50 text-primary-900" 
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <tab.icon className={cn(
                "w-5 h-5 flex-shrink-0",
                activeTab === tab.id ? "text-primary-900" : "text-neutral-400"
              )} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Settings Content Area */}
        <div className="lg:col-span-3">
          
          {/* 1. ORGANIZATION PROFILE */}
          {activeTab === 'organization' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="flex items-center space-x-3 p-6 border-b border-neutral-100 bg-neutral-50">
                <div className="p-2 bg-primary-100 rounded-lg text-primary-900">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-900">Organization Profile</h2>
                  <p className="text-sm text-neutral-500">Update company details and legal registration numbers.</p>
                </div>
              </div>

              <form onSubmit={handleSaveOrg} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Company Name</label>
                    <Input value={org.name} onChange={e => setOrg({...org, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Registration Number (CIN)</label>
                    <Input value={org.cin} onChange={e => setOrg({...org, cin: e.target.value})} required />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">GSTIN</label>
                    <Input value={org.gstin} onChange={e => setOrg({...org, gstin: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Foreman Registration No.</label>
                    <Input value={org.foreman} onChange={e => setOrg({...org, foreman: e.target.value})} required />
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-neutral-100">
                  <h3 className="text-sm font-bold text-primary-900 flex items-center"><MapPin className="w-4 h-4 mr-2"/> Registered Office</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Street Address</label>
                      <Input value={org.address} onChange={e => setOrg({...org, address: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">City</label>
                      <Input value={org.city} onChange={e => setOrg({...org, city: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">State</label>
                      <Input value={org.state} onChange={e => setOrg({...org, state: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">PIN Code</label>
                      <Input value={org.pin} onChange={e => setOrg({...org, pin: e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Contact Email</label>
                      <Input type="email" value={org.email} onChange={e => setOrg({...org, email: e.target.value})} required />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t border-neutral-100">
                  <Button type="submit" variant="primary" className="w-full sm:w-auto px-8">Save Changes</Button>
                </div>
              </form>
            </div>
          )}

          {/* 2. BRANCH MANAGEMENT */}
          {activeTab === 'branches' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 rounded-lg text-primary-900">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary-900">Branch Management</h2>
                    <p className="text-sm text-neutral-500">Configure operating branches and locations.</p>
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={addBranch} className="flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Add Branch
                </Button>
              </div>

              <div className="p-6 space-y-4">
                {branches.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">No branches added yet.</div>
                ) : (
                  branches.map((b, i) => (
                    <div key={b.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col md:flex-row gap-4 items-start md:items-end">
                      <div className="flex-1 space-y-2 w-full">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Branch ID</label>
                        <Input value={b.id} onChange={e => updateBranch(i, 'id', e.target.value)} className="bg-white font-mono" />
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Name</label>
                        <Input value={b.name} onChange={e => updateBranch(i, 'name', e.target.value)} className="bg-white font-bold" />
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Location</label>
                        <Input value={b.location} onChange={e => updateBranch(i, 'location', e.target.value)} className="bg-white" />
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">Manager</label>
                        <Input value={b.manager} onChange={e => updateBranch(i, 'manager', e.target.value)} className="bg-white" />
                      </div>
                      <Button variant="secondary" onClick={() => deleteBranch(i)} className="!px-3 !py-2.5 !text-danger hover:!bg-danger-light hover:!border-danger-200 shrink-0">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  ))
                )}
                <div className="flex justify-end pt-4">
                  <Button variant="primary" className="px-8" onClick={triggerSaveAlert}>Save Branches</Button>
                </div>
              </div>
            </div>
          )}

          {/* 3. ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary-100 rounded-lg text-primary-900">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary-900">Roles & Permissions</h2>
                    <p className="text-sm text-neutral-500">Manage access controls for internal staff.</p>
                  </div>
                </div>
                <Button variant="primary" size="sm" onClick={addRole} className="flex items-center">
                  <Plus className="w-4 h-4 mr-1" /> Create Role
                </Button>
              </div>
              
              <div className="p-6 space-y-4">
                {roles.map((r, i) => (
                  <div key={r.id} className="p-5 bg-white border border-neutral-200 shadow-sm rounded-xl flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                    <div className="flex items-center space-x-4 w-full lg:w-1/3">
                      <div className="p-2.5 bg-neutral-100 rounded-lg text-neutral-600 shrink-0">
                        <ShieldCheck className="w-5 h-5 text-primary-700" />
                      </div>
                      <div className="w-full space-y-1">
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Role Identifier</label>
                        <input 
                          value={r.name} 
                          onChange={e => updateRole(i, 'name', e.target.value)} 
                          className="w-full text-primary-900 font-bold focus:outline-none focus:ring-1 focus:ring-primary-900 rounded p-1 -ml-1 border border-transparent focus:border-neutral-200"
                        />
                      </div>
                    </div>
                    
                    <div className="w-full lg:flex-1 space-y-1">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Access Scope Description</label>
                      <input 
                        value={r.access} 
                        onChange={e => updateRole(i, 'access', e.target.value)} 
                        className="w-full text-sm text-neutral-600 focus:outline-none focus:ring-1 focus:ring-primary-900 rounded p-1 -ml-1 border border-transparent focus:border-neutral-200"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between w-full lg:w-auto shrink-0 space-x-6">
                      <div className="text-right flex items-center space-x-3">
                        <div className="flex flex-col items-end">
                          <p className="text-sm font-bold text-primary-900">{r.users}</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase">Assigned</p>
                        </div>
                      </div>
                      <Button variant="secondary" onClick={() => deleteRole(i)} className="!px-3 !py-2 !text-danger hover:!bg-danger-light hover:!border-danger-200">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-4">
                  <Button variant="primary" className="px-8" onClick={triggerSaveAlert}>Save Roles</Button>
                </div>
              </div>
            </div>
          )}

          {/* 4. KYC CONFIGURATION */}
          {activeTab === 'kyc' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="flex items-center space-x-3 p-6 border-b border-neutral-100 bg-neutral-50">
                <div className="p-2 bg-primary-100 rounded-lg text-primary-900">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-900">KYC Configuration</h2>
                  <p className="text-sm text-neutral-500">Set document requirements and verification rules.</p>
                </div>
              </div>

              <form onSubmit={handleSaveKyc} className="p-6 space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={kyc.aadharRequired} 
                      onChange={e => setKyc({...kyc, aadharRequired: e.target.checked})} 
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="ml-4">
                      <span className="block font-bold text-neutral-900">Aadhar Card Verification Required</span>
                      <span className="block text-sm text-neutral-500">Mandatory for all new customer onboarding.</span>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={kyc.panRequired} 
                      onChange={e => setKyc({...kyc, panRequired: e.target.checked})} 
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="ml-4">
                      <span className="block font-bold text-neutral-900">PAN Card Required</span>
                      <span className="block text-sm text-neutral-500">Mandatory for high-value groups (&gt; ₹2,00,000).</span>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={kyc.addressProof} 
                      onChange={e => setKyc({...kyc, addressProof: e.target.checked})} 
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="ml-4">
                      <span className="block font-bold text-neutral-900">Secondary Address Proof Required</span>
                      <span className="block text-sm text-neutral-500">Require additional proof like utility bills.</span>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={kyc.autoVerify} 
                      onChange={e => setKyc({...kyc, autoVerify: e.target.checked})} 
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div className="ml-4">
                      <span className="block font-bold text-neutral-900">Enable Auto-Verification via API</span>
                      <span className="block text-sm text-neutral-500">Uses 3rd party providers to verify ID numbers automatically.</span>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-6 border-t border-neutral-100">
                  <Button type="submit" variant="primary" className="px-8">Save Rules</Button>
                </div>
              </form>
            </div>
          )}

          {/* 5. NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="flex items-center space-x-3 p-6 border-b border-neutral-100 bg-neutral-50">
                <div className="p-2 bg-primary-100 rounded-lg text-primary-900">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary-900">Notification Preferences</h2>
                  <p className="text-sm text-neutral-500">Configure global alert systems and automated reports.</p>
                </div>
              </div>

              <form onSubmit={handleSaveNotifs} className="p-6 space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <div>
                      <span className="block font-bold text-neutral-900">Email Alerts</span>
                      <span className="block text-sm text-neutral-500">Send transactional emails to customers.</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifs.emailAlerts} onChange={e => setNotifs({...notifs, emailAlerts: e.target.checked})} />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <div>
                      <span className="block font-bold text-neutral-900">SMS Alerts (OTP & Reminders)</span>
                      <span className="block text-sm text-neutral-500">Send texts for upcoming auction dates and payments.</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifs.smsAlerts} onChange={e => setNotifs({...notifs, smsAlerts: e.target.checked})} />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <div>
                      <span className="block font-bold text-neutral-900">Admin Login Alerts</span>
                      <span className="block text-sm text-neutral-500">Email Super Admins when new devices log in.</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifs.loginAlerts} onChange={e => setNotifs({...notifs, loginAlerts: e.target.checked})} />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <div>
                      <span className="block font-bold text-neutral-900">Daily Digest Reports</span>
                      <span className="block text-sm text-neutral-500">Receive EOD collection summaries.</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={notifs.dailyReports} onChange={e => setNotifs({...notifs, dailyReports: e.target.checked})} />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-6 border-t border-neutral-100">
                  <Button type="submit" variant="primary" className="px-8">Save Preferences</Button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
