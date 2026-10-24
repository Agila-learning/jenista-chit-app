import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  UserPlus, 
  Wallet, 
  Clock, 
  CheckCircle2, 
  Search, 
  Printer, 
  Phone, 
  MessageCircle, 
  AlertCircle, 
  ArrowUpRight, 
  IndianRupee, 
  X,
  RotateCw,
  Layers,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import { printCashReceipt } from '../../utils/receiptPrinter';
import { useAuth } from '../../store/AuthContext';
import { fetchClient } from '../../api/client';
import { isMockCustomer, isMockGroup } from '../../utils/cleanMockData';

export const StaffDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'dues' | 'receipts' | 'registrations'>('dues');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('ALL');

  // Core Data States
  const [customers, setCustomers] = useState<any[]>([]);
  const [chitGroups, setChitGroups] = useState<any[]>([]);
  const [staffReceipts, setStaffReceipts] = useState<any[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);

  // Handover Modal State
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
  });
  const [handoverRemarks, setHandoverRemarks] = useState('');
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const triggerAlert = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const loadAllData = () => {
    // 1. Load customers
    const c = localStorage.getItem('mockCustomers');
    if (c) {
      try {
        const parsed = JSON.parse(c);
        const cleanCusts = Array.isArray(parsed) ? parsed.filter((cust: any) => !isMockCustomer(cust)) : [];
        setCustomers(cleanCusts);
        // Filter registrations added by staff or marked pending
        const staffRegs = cleanCusts.filter((cust: any) => 
          cust.referredBy?.toLowerCase().includes('staff') || 
          cust.status === 'PENDING_APPROVAL' ||
          cust.registeredBy?.includes(user?.name || '')
        );
        setMyRegistrations(staffRegs);
      } catch {
        setCustomers([]);
        setMyRegistrations([]);
      }
    } else {
      setCustomers([]);
      setMyRegistrations([]);
    }

    // 2. Load Chit Groups
    const g = localStorage.getItem('mockChitGroups');
    if (g) {
      try {
        const parsed = JSON.parse(g);
        const cleanGroups = Array.isArray(parsed) ? parsed.filter((group: any) => !isMockGroup(group)) : [];
        setChitGroups(cleanGroups);
      } catch {
        setChitGroups([]);
      }
    } else {
      setChitGroups([]);
    }

    // 3. Load Receipts
    const recs = localStorage.getItem('staffReceipts');
    if (recs) {
      try {
        const parsed = JSON.parse(recs);
        const cleanRecs = Array.isArray(parsed)
          ? parsed.filter((r: any) => !isMockCustomer({ id: r.customerId, name: r.customerName }) && !isMockGroup({ id: r.chitGroup, name: r.chitGroup }))
          : [];
        setStaffReceipts(cleanRecs);
      } catch {
        setStaffReceipts([]);
      }
    } else {
      setStaffReceipts([]);
    }

    // 4. Load Handovers
    const ho = localStorage.getItem('staffHandovers');
    if (ho) setHandovers(JSON.parse(ho));

    // Also sync live from backend if online
    fetchClient('/customers')
      .then((res: any) => {
        if (res && res.data && Array.isArray(res.data)) {
          const mapped = res.data.map((item: any) => ({
            id: item.customerCode || item._id,
            mongoId: item._id,
            name: item.fullName || item.name,
            mobile: item.phone || item.mobile,
            pending: item.pending ?? 5000,
            status: item.status || 'ACTIVE',
            chits: item.chits || [],
            referredBy: item.referredBy
          }));
          setCustomers(mapped.filter((c: any) => !isMockCustomer(c)));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadAllData();

    const handleStorageChange = () => loadAllData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // Calculations for Today's Stats
  const todayReceipts = staffReceipts.filter((r: any) => r.date === todayStr);
  const todayCashTotal = todayReceipts
    .filter((r: any) => (r.mode || '').toUpperCase() === 'CASH')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const todayOnlineTotal = todayReceipts
    .filter((r: any) => (r.mode || '').toUpperCase() !== 'CASH')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const todayTotalCollected = todayCashTotal + todayOnlineTotal;

  // Active Handover status for today
  const todayHandover = handovers.find((h: any) => h.date === todayStr);
  const isShiftSettled = todayHandover && todayHandover.status === 'SETTLED';
  const isHandoverPending = todayHandover && todayHandover.status === 'PENDING_APPROVAL';

  // Physical cash remaining in hand (if settled, 0; if pending handover, still shows amount being held)
  const physicalCashInHand = isShiftSettled ? 0 : todayCashTotal;

  // Due List calculation
  const dueCustomers = customers.filter(c => {
    const hasDues = (c.pending && c.pending > 0) || (c.chits && c.chits.some((ch: any) => ch.pendingDue > 0));
    const matchesGroup = selectedGroupFilter === 'ALL' || (c.chits && c.chits.some((ch: any) => ch.groupName === selectedGroupFilter));
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(q) || 
      c.mobile?.includes(q) || 
      c.id?.toLowerCase().includes(q);
    return hasDues && matchesGroup && matchesSearch;
  });

  // Handle Quick Print from Recent Receipts
  const handlePrintReceipt = (r: any) => {
    printCashReceipt({
      receiptNo: r.receiptNo,
      date: r.date,
      customerName: r.customerName,
      customerId: r.customerId,
      customerMobile: r.mobileNumber,
      groupName: r.chitGroup,
      paymentMode: r.mode || 'CASH',
      amount: r.amount,
      description: `Chit Installment - Month ${r.monthNumber || '1'}`,
      referenceNo: r.referenceNo,
      collectedBy: r.executive || user?.name || 'Staff User'
    });
  };

  // WhatsApp reminder click
  const handleWhatsAppReminder = (c: any) => {
    const dueAmt = c.pending || 5000;
    const text = encodeURIComponent(
      `Hello ${c.name}, this is a reminder from Jenista Chits regarding your pending chit installment of ${formatCurrency(dueAmt)}. Kindly pay at your earliest or contact us. Thank you!`
    );
    window.open(`https://wa.me/91${c.mobile?.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  // Handle Quick Collect Navigation
  const handleQuickCollect = (c: any) => {
    navigate(`/admin/receipts?customerId=${c.id}&amount=${c.pending || 5000}`);
  };

  // Submit Day-End Handover to Admin
  const handleSubmitHandover = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHandover(true);

    const calculatedDenomTotal = Object.entries(denominations).reduce(
      (sum, [note, count]) => sum + Number(note) * (count || 0),
      0
    );

    const handoverRecord = {
      id: `HO-${Date.now().toString().slice(-6)}`,
      date: todayStr,
      submittedAt: new Date().toISOString(),
      staffId: user?.id || 'staff-1',
      staffName: user?.name || 'Rajesh Kumar (Staff)',
      totalCashCollected: todayCashTotal,
      totalOnlineCollected: todayOnlineTotal,
      totalCollected: todayTotalCollected,
      receiptsCount: todayReceipts.length,
      countedDenominations: denominations,
      countedTotal: calculatedDenomTotal > 0 ? calculatedDenomTotal : todayCashTotal,
      remarks: handoverRemarks,
      status: 'PENDING_APPROVAL', // PENDING_APPROVAL | SETTLED | REJECTED
    };

    const existingHandovers = JSON.parse(localStorage.getItem('staffHandovers') || '[]');
    const updated = [handoverRecord, ...existingHandovers.filter((h: any) => h.date !== todayStr)];
    localStorage.setItem('staffHandovers', JSON.stringify(updated));
    setHandovers(updated);

    setIsSubmittingHandover(false);
    setIsHandoverModalOpen(false);
    triggerAlert('Day-End Handover submitted to Admin for verification and sign-off.');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Action Notification Alert */}
      {actionSuccessMsg && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{actionSuccessMsg}</span>
        </div>
      )}

      {/* Staff Header Greeting & Shift Banner */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-primary-900 tracking-tight">
              Welcome, {user?.name || 'Rajesh Kumar'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-900 border border-primary-200">
              Collection & Field Executive
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1 flex items-center gap-2">
            <span>Branch: Head Office</span>
            <span>•</span>
            <span>Date: {formatDate(todayStr)}</span>
            <span>•</span>
            <span className="font-mono text-xs text-neutral-400">ID: {user?.id || 'EMP-204'}</span>
          </p>
        </div>

        {/* Shift Settlement Status Indicator */}
        <div className="flex items-center gap-3">
          {isShiftSettled ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Shift Settled with Admin</span>
            </div>
          ) : isHandoverPending ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold animate-pulse">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Handover Submitted (Awaiting Admin Acceptance)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
              <span>Active Collection Shift</span>
            </div>
          )}

          <button
            onClick={() => navigate('/admin/manage-plans')}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="View Regular, Fixed & Auction Plans"
          >
            <Layers className="w-4 h-4 text-amber-700" />
            <span className="hidden sm:inline">Chit Plans & Schemes</span>
          </button>

          <button 
            onClick={loadAllData}
            title="Refresh Live Data"
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Collections Today */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Today's Collections</span>
            <div className="p-2 bg-primary-50 rounded-xl text-primary-900">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-neutral-900">{formatCurrency(todayTotalCollected)}</h3>
            <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                Cash: {formatCurrency(todayCashTotal)}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                UPI: {formatCurrency(todayOnlineTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Receipts Issued */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Receipts Raised Today</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-neutral-900">{todayReceipts.length}</h3>
            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
              <span>Average {todayReceipts.length > 0 ? formatCurrency(Math.round(todayTotalCollected / todayReceipts.length)) : '₹0'} / receipt</span>
            </p>
          </div>
        </div>

        {/* Metric 3: Physical Cash in Hand (to Handover) */}
        <div className={`rounded-2xl p-5 border shadow-xs transition-all ${
          isShiftSettled 
            ? 'bg-emerald-50/50 border-emerald-200' 
            : physicalCashInHand > 0 
              ? 'bg-amber-50/40 border-amber-300' 
              : 'bg-white border-neutral-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Physical Cash in Hand</span>
            <div className={`p-2 rounded-xl ${isShiftSettled ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-neutral-900">{formatCurrency(physicalCashInHand)}</h3>
            <p className="text-xs font-medium mt-2 text-neutral-600">
              {isShiftSettled ? 'Handover completed & reconciled' : 'Pending Day-End Handover to Admin'}
            </p>
          </div>
        </div>

        {/* Metric 4: New Registrations Added */}
        <div className="bg-white rounded-2xl p-5 border border-neutral-200 shadow-xs hover:border-neutral-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">My Registrations</span>
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-700">
              <UserPlus className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-neutral-900">{myRegistrations.length}</h3>
            <p className="text-xs text-neutral-500 mt-2 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">{myRegistrations.filter(r => r.status === 'ACTIVE').length} Active</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">{myRegistrations.filter(r => r.status === 'PENDING_APPROVAL').length} Pending</span>
            </p>
          </div>
        </div>
      </div>

      {/* Primary Quick Action Bar */}
      <div className="bg-primary-900 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Quick Executive Actions</h2>
          <p className="text-xs text-primary-200 mt-0.5">Instant tools for daily collections, customer enrollment, and shift handover.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Quick Action 1: Raise Receipt */}
          <button
            onClick={() => navigate('/admin/receipts')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Receipt className="w-4 h-4" />
            <span>Raise Receipt</span>
          </button>

          {/* Quick Action 2: Register Customer */}
          <button
            onClick={() => navigate('/admin/customers/add')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl transition-all border border-white/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Customer</span>
          </button>

          {/* Quick Action 3: Day-End Handover */}
          <button
            onClick={() => setIsHandoverModalOpen(true)}
            disabled={todayCashTotal === 0 && todayReceipts.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95"
          >
            <Wallet className="w-4 h-4" />
            <span>Day-End Handover</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Workspaces */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
        {/* Workspace Tab Headers */}
        <div className="flex border-b border-neutral-200 bg-neutral-50/70 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dues')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'dues' 
                ? 'bg-white text-primary-900 shadow-xs border border-neutral-200' 
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span>Pending Due & Defaulters ({dueCustomers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'receipts' 
                ? 'bg-white text-primary-900 shadow-xs border border-neutral-200' 
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <Receipt className="w-4 h-4 text-primary-600" />
            <span>Today's Receipts Log ({todayReceipts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('registrations')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'registrations' 
                ? 'bg-white text-primary-900 shadow-xs border border-neutral-200' 
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            <span>My Registered Customers ({myRegistrations.length})</span>
          </button>
        </div>

        {/* Tab 1: Due & Defaulter List */}
        {activeTab === 'dues' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search customer by name, mobile, or ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-semibold text-neutral-500 whitespace-nowrap">Group:</span>
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-bold bg-white text-neutral-700"
                >
                  <option value="ALL">All Chit Groups</option>
                  {chitGroups.map(g => (
                    <option key={g.id} value={g.name || g.id}>{g.name || g.id}</option>
                  ))}
                </select>
              </div>
            </div>

            {dueCustomers.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                <p className="text-base font-semibold text-neutral-600">All assigned dues are clear!</p>
                <p className="text-xs text-neutral-400">No overdue customers found matching your filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Customer Details</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Chit Plan / Ticket</th>
                      <th className="py-3 px-4 text-right">Pending Due</th>
                      <th className="py-3 px-4 text-center">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {dueCustomers.map((c) => {
                      const dueAmount = c.pending || 5000;
                      const chitInfo = (c.chits && c.chits[0]) ? (c.chits[0].groupName || c.chits[0].ticketNo) : 'CHIT-SCHEME';

                      return (
                        <tr key={c.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-neutral-900">{c.name}</div>
                            <div className="text-xs font-mono text-neutral-400">{c.id}</div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">
                            {c.mobile || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-xs font-semibold">
                              {chitInfo}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className="font-black text-rose-600 text-sm">
                              {formatCurrency(dueAmount)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => navigate(`/admin/customers/${c.id}/schedule?group=${encodeURIComponent(c.chits?.[0]?.groupId || c.groupId || '')}`)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                                title="View Due Amount, Due Date, and Pre-Chart Schedule"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                                <span>Due Chart</span>
                              </button>
                              <button
                                onClick={() => handleQuickCollect(c)}
                                className="px-3 py-1.5 bg-primary-900 hover:bg-primary-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Collect</span>
                              </button>
                              <button
                                onClick={() => handleWhatsAppReminder(c)}
                                title="Send WhatsApp Payment Reminder"
                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs transition-colors"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                              <a
                                href={`tel:${c.mobile}`}
                                title="Call Member"
                                className="p-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs transition-colors"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Today's Receipts Log */}
        {activeTab === 'receipts' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-neutral-900 text-base">Collections Recorded Today</h3>
              <button
                onClick={() => navigate('/admin/receipts')}
                className="text-xs font-bold text-primary-700 hover:underline flex items-center gap-1"
              >
                <span>+ Raise Another Receipt</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {todayReceipts.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 space-y-3">
                <Receipt className="w-10 h-10 mx-auto text-neutral-300" />
                <p className="text-base font-semibold text-neutral-600">No receipts raised today yet.</p>
                <button
                  onClick={() => navigate('/admin/receipts')}
                  className="px-4 py-2 bg-primary-900 text-white rounded-xl text-xs font-bold"
                >
                  Raise First Receipt
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Receipt No.</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Chit Group</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Print / Slip</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {todayReceipts.map((r: any) => (
                      <tr key={r.receiptNo} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-primary-900">
                          {r.receiptNo}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-neutral-900">{r.customerName}</div>
                          <div className="text-xs text-neutral-400 font-mono">{r.customerId}</div>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-neutral-700">
                          {r.chitGroup || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                            r.mode === 'CASH' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}>
                            {r.mode || 'CASH'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-neutral-900">
                          {formatCurrency(Number(r.amount) || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handlePrintReceipt(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Voucher</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: My Customer Registrations */}
        {activeTab === 'registrations' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">Customers Onboarded by You</h3>
                <p className="text-xs text-neutral-500">Track onboarding and Admin approval status.</p>
              </div>
              <button
                onClick={() => navigate('/admin/customers/add')}
                className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                + Register New Customer
              </button>
            </div>

            {myRegistrations.length === 0 ? (
              <div className="py-16 text-center text-neutral-400 space-y-3">
                <UserPlus className="w-10 h-10 mx-auto text-neutral-300" />
                <p className="text-base font-semibold text-neutral-600">No customers registered yet.</p>
                <button
                  onClick={() => navigate('/admin/customers/add')}
                  className="px-4 py-2 bg-primary-900 text-white rounded-xl text-xs font-bold"
                >
                  Start First Registration
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-neutral-200 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 text-xs uppercase font-bold">
                    <tr>
                      <th className="py-3 px-4">Customer ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Approval Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {myRegistrations.map((cust) => {
                      const isPending = cust.status === 'PENDING_APPROVAL';

                      return (
                        <tr key={cust.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-xs text-neutral-600">
                            {cust.id}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-neutral-900">
                            {cust.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">
                            {cust.mobile || cust.phone || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            {isPending ? (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5 w-fit">
                                <Clock className="w-3 h-3" />
                                <span>Pending Admin Approval</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Active & Verified</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => navigate('/admin/receipts')}
                              className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                            >
                              Collect Installment
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Day-End Handover Settlement Modal */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  Day-End Cash Handover & Closing
                </h3>
                <p className="text-xs text-primary-200 mt-0.5">Submit your collected physical cash to Admin for reconciliation.</p>
              </div>
              <button 
                onClick={() => setIsHandoverModalOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitHandover} className="p-6 space-y-5">
              {/* Cash Summary Banner */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Total Cash to Hand Over</span>
                  <span className="text-xl font-black text-emerald-700">{formatCurrency(todayCashTotal)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">Receipts Count</span>
                  <span className="text-xl font-black text-neutral-900">{todayReceipts.length} Receipts</span>
                </div>
              </div>

              {/* Cash Denominations Counter (Convenience Tool) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Denomination Tally (Optional Note Counter)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['500', '200', '100', '50', '20', '10'].map((denom) => (
                    <div key={denom} className="flex items-center bg-neutral-50 rounded-lg border border-neutral-200 px-2 py-1.5 text-xs">
                      <span className="font-bold text-neutral-500 w-12">₹{denom} ×</span>
                      <input
                        type="number"
                        min="0"
                        value={denominations[denom] || ''}
                        onChange={(e) => setDenominations({ ...denominations, [denom]: Number(e.target.value) || 0 })}
                        placeholder="0"
                        className="w-full bg-transparent font-bold text-neutral-900 outline-none text-right"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Handover Remarks */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Handover Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={handoverRemarks}
                  onChange={(e) => setHandoverRemarks(e.target.value)}
                  placeholder="e.g., Handed over in cash envelope to Admin"
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsHandoverModalOpen(false)}
                  className="px-4 py-2 bg-neutral-100 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHandover}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Send to Admin</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
