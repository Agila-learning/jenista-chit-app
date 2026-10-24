import { useState, useEffect } from 'react';
import { 
  Landmark, 
  Plus, 
  Edit3, 
  Trash2, 
  Copy, 
  QrCode, 
  Search, 
  Building2, 
  CreditCard, 
  ShieldCheck, 
  Users, 
  Layers, 
  FileText, 
  Check, 
  X,
  Eye,
  Wallet,
  Upload
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import type { BankAccount } from '../../../utils/bankAccountsData';
import { 
  getStoredBankAccounts, 
  saveStoredBankAccounts, 
  getStoredBankAssignments, 
  assignBankToGroup, 
  assignBankToCustomer,
  getBankReceivedStats,
  generateUpiQrBadge
} from '../../../utils/bankAccountsData';
import { isMockGroup, isMockCustomer } from '../../../utils/cleanMockData';

type TabType = 'ACCOUNTS' | 'GROUP_ASSIGNMENTS' | 'CUSTOMER_ASSIGNMENTS' | 'STATEMENT';

export const ManageBanks = () => {
  const [activeTab, setActiveTab] = useState<TabType>('ACCOUNTS');
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [assignments, setAssignments] = useState(getStoredBankAssignments());
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');

  // Groups and Customers from localStorage
  const [groups, setGroups] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Search & Filter
  const [customerSearch, setCustomerSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [qrModalBank, setQrModalBank] = useState<BankAccount | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    bankName: '',
    accountHolderName: 'Jenista Chits Pvt Ltd',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    accountType: 'CURRENT' as 'CURRENT' | 'SAVINGS',
    upiId: '',
    qrCodeUrl: '',
    isDefault: false,
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
    notes: ''
  });

  const loadData = () => {
    const b = getStoredBankAccounts();
    setBanks(b);
    setAssignments(getStoredBankAssignments());

    const g = (JSON.parse(localStorage.getItem('mockChitGroups') || '[]')).filter((group: any) => !isMockGroup(group));
    setGroups(g);

    const c = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((cust: any) => !isMockCustomer(cust));
    setCustomers(c);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenAddModal = () => {
    setEditingBank(null);
    setFormData({
      bankName: '',
      accountHolderName: 'Jenista Chits Pvt Ltd',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      accountType: 'CURRENT',
      upiId: '',
      qrCodeUrl: '',
      isDefault: banks.length === 0,
      status: 'ACTIVE',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: BankAccount) => {
    setEditingBank(b);
    setFormData({
      bankName: b.bankName,
      accountHolderName: b.accountHolderName,
      accountNumber: b.accountNumber,
      ifscCode: b.ifscCode,
      branch: b.branch,
      accountType: b.accountType,
      upiId: b.upiId,
      qrCodeUrl: b.qrCodeUrl || '',
      isDefault: b.isDefault,
      status: b.status,
      notes: b.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setFormData(prev => ({ ...prev, qrCodeUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.bankName || !formData.accountNumber || !formData.ifscCode || !formData.upiId) {
      alert('Please fill in Bank Name, Account Number, IFSC Code, and UPI ID.');
      return;
    }

    let updatedBanks: BankAccount[];
    if (editingBank) {
      updatedBanks = banks.map(b => {
        if (b.id === editingBank.id) {
          return {
            ...b,
            ...formData,
            isDefault: formData.isDefault
          };
        }
        return formData.isDefault ? { ...b, isDefault: false } : b;
      });
    } else {
      const newBank: BankAccount = {
        id: `BANK-${Date.now().toString().slice(-4)}`,
        ...formData,
        totalReceived: 0,
        transactionsCount: 0,
        createdAt: new Date().toISOString()
      };
      if (formData.isDefault) {
        updatedBanks = [newBank, ...banks.map(b => ({ ...b, isDefault: false }))];
      } else {
        updatedBanks = [...banks, newBank];
      }
    }

    saveStoredBankAccounts(updatedBanks);
    setBanks(updatedBanks);
    setIsModalOpen(false);
  };

  const handleDeleteBank = (id: string, name: string) => {
    if (banks.length <= 1) {
      alert('You must have at least one company bank account registered.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    const updated = banks.filter(b => b.id !== id);
    if (!updated.some(b => b.isDefault) && updated.length > 0) {
      updated[0].isDefault = true;
    }
    saveStoredBankAccounts(updated);
    setBanks(updated);
  };

  const handleSetDefault = (id: string) => {
    const updated = banks.map(b => ({
      ...b,
      isDefault: b.id === id
    }));
    saveStoredBankAccounts(updated);
    setBanks(updated);
  };

  const handleToggleStatus = (id: string) => {
    const updated = banks.map(b => {
      if (b.id === id) {
        return {
          ...b,
          status: (b.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE') as 'ACTIVE' | 'INACTIVE'
        };
      }
      return b;
    });
    saveStoredBankAccounts(updated);
    setBanks(updated);
  };

  const handleGroupBankChange = (groupId: string, bankId: string) => {
    assignBankToGroup(groupId, bankId);
    setAssignments(getStoredBankAssignments());
  };

  const handleCustomerBankChange = (customerId: string, bankId: string) => {
    assignBankToCustomer(customerId, bankId);
    setAssignments(getStoredBankAssignments());
  };

  // Aggregated Stats
  const totalCollectionsAllBanks = banks.reduce((sum, b) => {
    const stats = getBankReceivedStats(b.id);
    return sum + stats.totalReceived;
  }, 0);

  const totalTransactionsAllBanks = banks.reduce((sum, b) => {
    const stats = getBankReceivedStats(b.id);
    return sum + stats.transactionsCount;
  }, 0);

  const defaultBank = banks.find(b => b.isDefault) || banks[0];

  // Master Ledger entries for Statement tab
  const allLedger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
  const creditLedger = allLedger.filter((t: any) => t.type === 'CREDIT');

  const filteredStatementTransactions = creditLedger.filter((t: any) => {
    if (selectedBankFilter === 'ALL') return true;
    const targetB = banks.find(b => b.id === selectedBankFilter);
    if (!targetB) return true;
    return (
      t.bankAccountId === targetB.id ||
      t.bankName === targetB.bankName ||
      t.paymentMode?.includes(targetB.bankName) ||
      t.description?.includes(targetB.bankName)
    );
  });

  const filteredCustomers = customers.filter((c: any) => {
    const q = customerSearch.toLowerCase();
    const phone = c.mobile || c.phone || '';
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.fullName || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q) ||
      phone.includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary-950 via-primary-900 to-amber-950 text-white p-6 sm:p-8 rounded-2xl shadow-md relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="p-2.5 bg-primary-800/80 border border-primary-700 rounded-xl text-accent">
              <Landmark className="w-7 h-7" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
                Manage Company Bank Accounts
              </h1>
              <p className="text-xs sm:text-sm text-primary-200 mt-0.5">
                Configure UPI & Bank Transfer details, customize receiving accounts per group & customer, and track incoming receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-accent hover:bg-accent-light text-primary-950 font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2 hover:scale-105"
          >
            <Plus className="w-4 h-4" /> Add Bank Account
          </button>
        </div>

        {/* Decorative background glow */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Funds Received</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-neutral-900 mt-2 font-mono">
            {formatCurrency(totalCollectionsAllBanks)}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Across all active company bank accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Registered Accounts</span>
            <span className="p-2 bg-primary-50 text-primary-800 rounded-lg"><Building2 className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-primary-950 mt-2 font-mono">
            {banks.length} <span className="text-sm font-semibold text-neutral-500 font-sans">({banks.filter(b => b.status === 'ACTIVE').length} Active)</span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">Ready for UPI & NEFT/IMPS transfers</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Total Bank Receipts</span>
            <span className="p-2 bg-amber-50 text-amber-700 rounded-lg"><CreditCard className="w-4 h-4" /></span>
          </div>
          <div className="text-2xl font-black text-neutral-900 mt-2 font-mono">
            {totalTransactionsAllBanks}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Verified online and bank ledger transactions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Default Master Bank</span>
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <div className="text-base font-bold text-neutral-900 mt-2 truncate">
            {defaultBank ? defaultBank.bankName : 'None'}
          </div>
          <p className="text-xs font-mono text-neutral-500 truncate mt-0.5">
            {defaultBank?.accountNumber ? `A/C •••• ${defaultBank.accountNumber.slice(-4)}` : '—'} · {defaultBank?.upiId || '—'}
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${
            activeTab === 'ACCOUNTS'
              ? 'border-primary-900 text-primary-900 bg-white shadow-2xs font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <Building2 className="w-4 h-4" /> Company Bank Accounts ({banks.length})
        </button>

        <button
          onClick={() => setActiveTab('GROUP_ASSIGNMENTS')}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${
            activeTab === 'GROUP_ASSIGNMENTS'
              ? 'border-primary-900 text-primary-900 bg-white shadow-2xs font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <Layers className="w-4 h-4" /> Group Bank Allocation ({groups.length})
        </button>

        <button
          onClick={() => setActiveTab('CUSTOMER_ASSIGNMENTS')}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${
            activeTab === 'CUSTOMER_ASSIGNMENTS'
              ? 'border-primary-900 text-primary-900 bg-white shadow-2xs font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <Users className="w-4 h-4" /> Customer Bank Allocation ({customers.length})
        </button>

        <button
          onClick={() => setActiveTab('STATEMENT')}
          className={`px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all whitespace-nowrap border-b-2 flex items-center gap-2 ${
            activeTab === 'STATEMENT'
              ? 'border-primary-900 text-primary-900 bg-white shadow-2xs font-black'
              : 'border-transparent text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <FileText className="w-4 h-4" /> Track Received Funds & Statement
        </button>
      </div>

      {/* TAB 1: BANK ACCOUNTS LIST */}
      {activeTab === 'ACCOUNTS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks.map((b) => {
              const stats = getBankReceivedStats(b.id);

              return (
                <div 
                  key={b.id} 
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md flex flex-col justify-between ${
                    b.isDefault 
                      ? 'border-primary-600 ring-2 ring-primary-500/20' 
                      : b.status === 'INACTIVE' 
                        ? 'border-neutral-200 opacity-60' 
                        : 'border-neutral-200'
                  }`}
                >
                  {/* Card Header (Card design) */}
                  <div className={`p-5 text-white relative overflow-hidden ${
                    b.isDefault 
                      ? 'bg-gradient-to-r from-primary-950 to-primary-800' 
                      : 'bg-gradient-to-r from-slate-900 to-slate-800'
                  }`}>
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-lg text-white tracking-wide">{b.bankName}</h3>
                          {b.isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-amber-950 uppercase tracking-wider">
                              Default Master
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 font-medium">{b.accountHolderName}</p>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs font-mono text-slate-300 relative z-10">
                      <span>{b.accountType} A/C</span>
                      <span>{b.branch}</span>
                    </div>

                    {/* Subtle decorative circles */}
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full pointer-events-none -mr-8 -mb-8"></div>
                  </div>

                  {/* Card Body - Details */}
                  <div className="p-5 space-y-3.5 flex-1 bg-white">
                    {/* Account Number */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Account Number</p>
                        <p className="font-mono text-sm font-bold text-neutral-900 tracking-wider">{b.accountNumber}</p>
                      </div>
                      <button
                        onClick={() => handleCopy(b.accountNumber, `acc-${b.id}`)}
                        className="p-1.5 hover:bg-neutral-200 text-neutral-500 rounded-lg transition-colors"
                        title="Copy Account Number"
                      >
                        {copiedKey === `acc-${b.id}` ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* IFSC Code & Branch */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">IFSC Code</p>
                          <p className="font-mono text-xs font-bold text-neutral-900">{b.ifscCode}</p>
                        </div>
                        <button
                          onClick={() => handleCopy(b.ifscCode, `ifsc-${b.id}`)}
                          className="p-1 hover:bg-neutral-200 text-neutral-500 rounded transition-colors"
                          title="Copy IFSC"
                        >
                          {copiedKey === `ifsc-${b.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Branch</p>
                        <p className="text-xs font-semibold text-neutral-800 truncate" title={b.branch}>{b.branch}</p>
                      </div>
                    </div>

                    {/* UPI ID */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/80">
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">UPI ID / VPA</p>
                        <p className="font-mono text-xs font-bold text-amber-950 truncate" title={b.upiId}>{b.upiId}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {b.qrCodeUrl && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                            <Check className="w-3 h-3 text-emerald-700" /> Custom QR
                          </span>
                        )}
                        <button
                          onClick={() => handleCopy(b.upiId, `upi-${b.id}`)}
                          className="p-1.5 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors"
                          title="Copy UPI ID"
                        >
                          {copiedKey === `upi-${b.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setQrModalBank(b)}
                          className="p-1.5 bg-amber-200/80 hover:bg-amber-300 text-amber-950 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                          title="View QR Code"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Live Tracker - Amount Received */}
                    <div className="p-3 bg-neutral-900 text-white rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Total Received</span>
                        <span className="text-lg font-black text-amber-400 font-mono">
                          {formatCurrency(stats.totalReceived)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-semibold text-neutral-400 block">Verified Receipts</span>
                        <span className="text-xs font-bold bg-neutral-800 px-2 py-0.5 rounded-full text-white">
                          {stats.transactionsCount} txns
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {!b.isDefault && (
                        <button
                          onClick={() => handleSetDefault(b.id)}
                          className="text-[11px] font-bold text-primary-700 hover:text-primary-900 hover:underline"
                        >
                          Make Default
                        </button>
                      )}
                      <span className="text-neutral-300">•</span>
                      <button
                        onClick={() => handleToggleStatus(b.id)}
                        className={`text-[11px] font-bold ${b.status === 'ACTIVE' ? 'text-amber-700 hover:text-amber-900' : 'text-emerald-700 hover:text-emerald-900'}`}
                      >
                        {b.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200 rounded-lg transition-colors"
                        title="Edit Details"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBank(b.id, b.bankName)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Bank"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GROUP CUSTOMIZATION */}
      {activeTab === 'GROUP_ASSIGNMENTS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <h2 className="text-lg font-bold text-neutral-900">Customize Receiving Bank Per Chit Group</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Select which company bank account receives monthly chit installment payments for each specific group.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Group Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Plan Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Chit Value</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Assigned Receiving Bank</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">UPI VPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white whitespace-nowrap">
                {groups.map((g) => {
                  const assignedBankId = assignments.groupAssignments[g.id] || assignments.groupAssignments[g.name] || defaultBank?.id;
                  const currentBank = banks.find(b => b.id === assignedBankId) || defaultBank;

                  return (
                    <tr key={g.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary-900 text-sm">{g.name || g.id}</div>
                        <div className="text-xs font-mono text-neutral-500">{g.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-neutral-100 text-neutral-700">
                          {g.type || 'Regular'} Plan
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-neutral-900">
                        {formatCurrency(g.value || 100000)}
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={assignedBankId}
                          onChange={(e) => handleGroupBankChange(g.id, e.target.value)}
                          className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                          {banks.filter(b => b.status === 'ACTIVE').map(b => (
                            <option key={b.id} value={b.id}>
                              {b.bankName} (A/C •••• {b.accountNumber.slice(-4)}) {b.isDefault ? '★ Default' : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                          {currentBank?.upiId || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER CUSTOMIZATION */}
      {activeTab === 'CUSTOMER_ASSIGNMENTS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden space-y-4">
          <div className="p-6 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Customize Receiving Bank Per Individual Customer</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Assign a dedicated company bank account for an individual customer. Overrides the group default.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search customer by name/phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Enrolled Chit Plan</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Assigned Bank Account</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Assignment Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white whitespace-nowrap">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 text-sm">
                      No customers found matching search.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c: any) => {
                    const custId = c.id || c.customerCode;
                    const customBankId = assignments.customerAssignments[custId];
                    const firstChit = Array.isArray(c.chits) && c.chits[0];
                    const groupBankId = firstChit ? assignments.groupAssignments[firstChit.groupId] : null;
                    const effectiveBank = banks.find(b => b.id === (customBankId || groupBankId || defaultBank?.id)) || defaultBank;

                    return (
                      <tr key={custId} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-neutral-900 text-sm">{c.name || c.fullName}</div>
                          <div className="text-xs font-mono text-neutral-400">{custId}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-neutral-600">
                          {c.mobile || c.phone || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold text-neutral-800">
                            {firstChit?.groupName || firstChit?.groupId || 'Active Scheme'}
                          </div>
                          {firstChit?.ticketNumber && (
                            <span className="text-[10px] text-neutral-400 font-mono">Ticket #{firstChit.ticketNumber}</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={customBankId || 'INHERIT'}
                            onChange={(e) => handleCustomerBankChange(custId, e.target.value)}
                            className="px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                          >
                            <option value="INHERIT">
                              Inherit from Group / Default ({effectiveBank?.bankName})
                            </option>
                            {banks.filter(b => b.status === 'ACTIVE').map(b => (
                              <option key={b.id} value={b.id}>
                                Custom: {b.bankName} (A/C •••• {b.accountNumber.slice(-4)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          {customBankId ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-900 border border-primary-200">
                              Custom Individual Override
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                              Group Default
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STATEMENT & TRACKING TAB */}
      {activeTab === 'STATEMENT' && (
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden space-y-4">
          <div className="p-6 border-b border-neutral-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Bank Inward Receipts Statement</h2>
              <p className="text-xs text-neutral-500 mt-1">
                Real-time tracking of all customer installment deposits received per bank account.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Filter By Bank:</label>
              <select
                value={selectedBankFilter}
                onChange={(e) => setSelectedBankFilter(e.target.value)}
                className="px-3.5 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="ALL">All Registered Banks</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} (A/C •••• {b.accountNumber.slice(-4)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50 whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Receipt No.</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Group / Chit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Payment Mode</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Amount Received</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white whitespace-nowrap">
                {filteredStatementTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-neutral-400 text-sm">
                      No transactions recorded for this bank account filter yet.
                    </td>
                  </tr>
                ) : (
                  filteredStatementTransactions.map((t: any, idx: number) => (
                    <tr key={t.id || idx} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="px-6 py-4 text-xs text-neutral-600 font-medium">
                        {t.date ? new Date(t.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '14 Oct 2026'}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-neutral-900">
                        {t.id || `REC-${1000 + idx}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-neutral-900">{t.customerName || 'Customer'}</div>
                        <div className="text-[11px] font-mono text-neutral-400">{t.customerId || 'CUST'}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-neutral-700">
                        {t.groupId || t.reference || 'Regular Chit'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {t.paymentMode || (t.description?.includes('UPI') ? 'UPI' : 'Bank Transfer')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-sm text-emerald-700 font-mono">
                        +{formatCurrency(Number(t.amount || 0))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {t.paymentScreenshot || t.screenshotUrl ? (
                          <span className="text-xs text-primary-700 font-bold inline-flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400 italic">Direct Entry</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT BANK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header - Fixed */}
            <div className="px-6 py-3.5 bg-primary-950 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-base sm:text-lg">{editingBank ? 'Edit Bank Account' : 'Add Company Bank Account'}</h3>
                <p className="text-xs text-primary-200 mt-0.5">Enter details for customer UPI & Bank Transfer receipts.</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBank} className="flex-1 overflow-hidden flex flex-col min-h-0">
              {/* Scrollable Form Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5 min-h-0 overscroll-contain">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Bank, ICICI Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Account Type *
                    </label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => setFormData({ ...formData, accountType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="CURRENT">Current Account</option>
                      <option value="SAVINGS">Savings Account</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Account Holder Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jenista Chits Pvt Ltd"
                    value={formData.accountHolderName}
                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50200084729104"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      IFSC Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC0000123"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      Branch Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. T. Nagar Branch, Chennai"
                      value={formData.branch}
                      onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      UPI ID / VPA *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. jenistachits@hdfcbank"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>

                {/* Upload QR Code Field */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1 flex items-center justify-between">
                    <span>Upload Official UPI QR Code</span>
                    {formData.qrCodeUrl ? (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, qrCodeUrl: '' }))}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition-colors"
                      >
                        ✕ Remove Custom QR
                      </button>
                    ) : (
                      <span className="text-[10px] text-neutral-400 font-normal">Auto-generates if not uploaded</span>
                    )}
                  </label>

                  {formData.qrCodeUrl ? (
                    <div className="flex items-center gap-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl">
                      <img 
                        src={formData.qrCodeUrl} 
                        alt="Uploaded QR Code Preview" 
                        className="w-14 h-14 object-contain rounded-lg border border-neutral-300 bg-white p-1 shrink-0 shadow-2xs" 
                      />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold text-neutral-900 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Custom QR Image Uploaded
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          Customers will see this exact QR code in their payment screens.
                        </p>
                        <label className="text-[11px] font-bold text-primary-700 hover:text-primary-900 hover:underline cursor-pointer inline-flex items-center gap-1 mt-1">
                          <Upload className="w-3 h-3" /> Replace QR Image
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleQrUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="flex items-center justify-between gap-3 p-2.5 border-2 border-dashed border-neutral-300 hover:border-primary-500 rounded-xl cursor-pointer bg-neutral-50/70 hover:bg-white transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0 group-hover:border-primary-300">
                          <Upload className="w-4 h-4 text-neutral-400 group-hover:text-primary-600 transition-colors" />
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-bold text-neutral-700 group-hover:text-primary-900 block">
                            Upload Official QR Code Image
                          </span>
                          <span className="text-[10px] text-neutral-400 block">
                            GPay, PhonePe, Paytm, or Standee QR (PNG, JPG, SVG)
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-primary-700 group-hover:underline px-2 shrink-0">
                        Browse
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleQrUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                    Internal Notes / Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Primary collections account for regular plans and default company UPI"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded accent-primary-600"
                    />
                    <span className="text-xs font-bold text-neutral-700">Set as Company Default Master Account</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.status === 'ACTIVE'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'ACTIVE' : 'INACTIVE' })}
                      className="w-4 h-4 text-emerald-600 rounded accent-emerald-600"
                    />
                    <span className="text-xs font-bold text-neutral-700">Active</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer - Fixed at bottom */}
              <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-200 text-xs font-bold text-neutral-600 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-900 hover:bg-primary-800 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  {editingBank ? 'Save Changes' : 'Create Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR PREVIEW MODAL */}
      {qrModalBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="font-extrabold text-neutral-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-700" /> UPI Scan & Pay QR
              </h3>
              <button onClick={() => setQrModalBank(null)} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 inline-block shadow-inner max-w-full">
              <img 
                src={qrModalBank.qrCodeUrl || generateUpiQrBadge(qrModalBank.upiId, qrModalBank.accountHolderName)} 
                alt="UPI QR Code" 
                className="w-48 h-48 mx-auto object-contain rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <p className="font-bold text-neutral-900 text-sm">{qrModalBank.accountHolderName}</p>
              <p className="font-mono text-xs text-amber-900 font-semibold bg-amber-50 py-1 px-3 rounded-full inline-block border border-amber-200">
                {qrModalBank.upiId}
              </p>
              <p className="text-[11px] text-neutral-500 pt-1">{qrModalBank.bankName} · {qrModalBank.branch}</p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleCopy(qrModalBank.upiId, 'modal-upi')}
                className="w-full py-2 bg-primary-900 text-white rounded-xl text-xs font-bold hover:bg-primary-800 transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedKey === 'modal-upi' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                Copy UPI ID
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
