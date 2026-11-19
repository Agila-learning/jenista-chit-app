import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  User, 
  Phone, 
  Layers, 
  CreditCard, 
  AlertCircle, 
  ArrowRight, 
  Printer, 
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../utils/format';
import { fetchClient } from '../../api/client';
import { isMockCustomer } from '../../utils/cleanMockData';

interface Customer360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMobile?: string;
}

export const Customer360Modal: React.FC<Customer360ModalProps> = ({
  isOpen,
  onClose,
  initialMobile = ''
}) => {
  const navigate = useNavigate();
  const [mobileQuery, setMobileQuery] = useState(initialMobile);
  const [isSearching, setIsSearching] = useState(false);
  const [customer, setCustomer] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (initialMobile) {
      setMobileQuery(initialMobile);
      handleSearch(initialMobile);
    }
  }, [initialMobile, isOpen]);

  // Execute Search by mobile number or customer code
  const handleSearch = async (phoneToSearch?: string) => {
    const raw = (phoneToSearch !== undefined ? phoneToSearch : mobileQuery).trim();
    if (!raw) {
      setSearchError('Please enter a 10-digit mobile number or customer ID.');
      return;
    }
    const cleanDigits = raw.replace(/\D/g, '');
    setIsSearching(true);
    setSearchError(null);

    try {
      const diskCusts = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((c: any) => !isMockCustomer(c));

      // 1. Search in localStorage customers
      let matched = diskCusts.find((c: any) => {
        const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
        const cId = String(c.id || c.customerCode || '').toLowerCase();
        const cName = String(c.name || c.fullName || '').toLowerCase();
        return (cleanDigits && cMobile === cleanDigits) ||
          (cleanDigits.length >= 7 && cMobile.includes(cleanDigits)) ||
          (cId && cId === raw.toLowerCase()) ||
          (cName && cName.includes(raw.toLowerCase()));
      });

      // 2. Search in chitGroupMemberships
      if (!matched) {
        const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
        const mMatched = memberships.find((m: any) => {
          const mMobile = (m.mobile || m.phone || '').replace(/\D/g, '');
          const mId = String(m.customerId || '').toLowerCase();
          return (cleanDigits && mMobile === cleanDigits) || (mId && mId === raw.toLowerCase());
        });
        if (mMatched) {
          matched = {
            id: mMatched.customerId || cleanDigits,
            name: mMatched.customerName || 'Customer',
            mobile: mMatched.mobile || cleanDigits,
            phone: mMatched.mobile || cleanDigits,
            status: 'ACTIVE',
            chits: []
          };
        }
      }

      // 3. Fallback: Query MongoDB backend API
      if (!matched) {
        try {
          const res = await fetchClient(`/customers?search=${encodeURIComponent(raw)}`);
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            const foundMongo = res.data.find((c: any) => {
              const mPhone = (c.phone || c.mobile || '').replace(/\D/g, '');
              return (cleanDigits && mPhone === cleanDigits) ||
                (c.customerCode && c.customerCode.toLowerCase() === raw.toLowerCase()) ||
                (c.fullName && c.fullName.toLowerCase().includes(raw.toLowerCase()));
            }) || res.data[0];

            if (foundMongo) {
              matched = {
                id: foundMongo.customerCode || foundMongo._id,
                mongoId: foundMongo._id,
                name: foundMongo.fullName || foundMongo.name,
                mobile: foundMongo.phone || foundMongo.mobile,
                phone: foundMongo.phone || foundMongo.mobile,
                address: foundMongo.address,
                status: foundMongo.status || 'ACTIVE',
                chits: foundMongo.chits || []
              };
            }
          }
        } catch (apiErr) {
          console.warn('Backend customer search fallback:', apiErr);
        }
      }

      if (matched) {
        setCustomer(matched);
        setSearchError(null);
      } else {
        setCustomer(null);
        setSearchError(`No customer found with mobile number "${raw}". Please check the number or register a new customer.`);
      }
    } finally {
      setIsSearching(false);
    }
  };

  // Compile full 360 data across customer.chits, chitGroupMemberships, and ledger
  const customer360 = useMemo(() => {
    if (!customer) return null;

    const custId = customer.id || customer.customerCode || customer.mongoId;
    const cleanPhone = (customer.mobile || customer.phone || '').replace(/\D/g, '');

    // 1. Gather all enrolled memberships and chits
    const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const matchingMemberships = memberships.filter((m: any) => {
      const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
      return (
        m.customerId === custId ||
        m.customerId === customer.customerCode ||
        m.customerId === customer.mongoId ||
        (cleanPhone && mPhone === cleanPhone)
      );
    });

    const custChits = Array.isArray(customer.chits) ? customer.chits : [];

    // Deduplicate and combine into distinct plans
    const planMap = new Map<string, any>();

    matchingMemberships.forEach((m: any) => {
      const gId = m.groupId || m.groupName;
      const tNum = String(m.ticketNumber || '1').trim();
      const planKey = `${gId}_#${tNum}`;
      planMap.set(planKey, {
        id: m.id || planKey,
        groupId: m.groupId,
        groupName: m.groupName || m.groupId,
        ticketNumber: tNum,
        scheme: m.scheme || 'Regular',
        chitValue: Number(m.chitValue) || 100000,
        monthlyInstallment: Number(m.monthlyInstallment) || 5000,
        duration: Number(m.duration || m.months) || 20,
        months: Number(m.duration || m.months) || 20,
        joiningDate: m.joiningDate || m.joinedAt || customer.createdAt,
        dueDate: m.dueDate,
        paymentStatus: m.paymentStatus || 'DUE'
      });
    });

    custChits.forEach((ch: any) => {
      const gId = ch.groupId || ch.groupName;
      const tNum = String(ch.ticketNumber || '1').trim();
      const planKey = `${gId}_#${tNum}`;
      if (!planMap.has(planKey)) {
        planMap.set(planKey, {
          id: ch.id || planKey,
          groupId: ch.groupId,
          groupName: ch.groupName || ch.groupId,
          ticketNumber: tNum,
          scheme: ch.scheme || 'Regular',
          chitValue: Number(ch.chitValue) || 100000,
          monthlyInstallment: Number(ch.monthlyInstallment) || 5000,
          duration: Number(ch.duration || ch.months) || 20,
          months: Number(ch.duration || ch.months) || 20,
          joiningDate: ch.joiningDate || customer.createdAt,
          dueDate: ch.dueDate,
          paymentStatus: ch.paymentStatus || 'DUE'
        });
      }
    });

    const allPlans = Array.from(planMap.values());

    // 2. Match Ledger Transactions
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const customerPayments = ledger.filter((t: any) => {
      const tCustId = String(t.customerId || '').trim();
      const tDesc = String(t.description || '').toLowerCase();
      const tRef = String(t.reference || '').toLowerCase();
      const cNameLow = String(customer.name || '').toLowerCase();

      return (
        tCustId === custId ||
        (cleanPhone && tDesc.includes(cleanPhone)) ||
        (cleanPhone && tRef.includes(cleanPhone)) ||
        (cNameLow && tDesc.includes(cNameLow))
      );
    });

    // 3. Calculate metrics for each plan
    const enrichedPlans = allPlans.map(plan => {
      const planGIdentifier = String(plan.groupId || plan.groupName || '').toLowerCase();
      const planTicket = String(plan.ticketNumber || '');

      // Transactions belonging to this specific chit plan
      const planTxns = customerPayments.filter((t: any) => {
        const tDesc = String(t.description || '').toLowerCase();
        const tRef = String(t.reference || '').toLowerCase();
        const tGroupId = String(t.groupId || '').toLowerCase();

        const matchesGroup = tGroupId.includes(planGIdentifier) || tDesc.includes(planGIdentifier) || tRef.includes(planGIdentifier);
        const matchesTicket = !planTicket || tDesc.includes(`ticket #${planTicket}`) || tDesc.includes(`ticket ${planTicket}`) || tRef.includes(`#${planTicket}`);
        return matchesGroup && (allPlans.length === 1 || matchesTicket || planTxnsFallback(t, plan));
      });

      function planTxnsFallback(t: any, p: any) {
        return (t.groupId && String(t.groupId).toLowerCase() === String(p.groupId).toLowerCase());
      }

      const totalPaidForPlan = planTxns.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      const monthlyDue = plan.monthlyInstallment > 0 ? plan.monthlyInstallment : 5000;
      const duration = plan.duration > 0 ? plan.duration : 20;

      // Calculate paid months
      const distinctMonthsPaidSet = new Set<number>();
      planTxns.forEach((t: any) => {
        if (t.month && Number(t.month) > 0) {
          distinctMonthsPaidSet.add(Number(t.month));
        }
      });

      const calculatedMonthsPaid = distinctMonthsPaidSet.size > 0 
        ? distinctMonthsPaidSet.size 
        : Math.min(duration, Math.floor(totalPaidForPlan / monthlyDue));

      const pendingMonths = Math.max(0, duration - calculatedMonthsPaid);
      const totalChitValue = plan.chitValue > 0 ? plan.chitValue : (monthlyDue * duration);
      const pendingAmount = Math.max(0, totalChitValue - totalPaidForPlan);
      const progressPercent = Math.min(100, Math.round((calculatedMonthsPaid / duration) * 100));

      return {
        ...plan,
        totalPaid: totalPaidForPlan,
        monthsPaid: calculatedMonthsPaid,
        pendingMonths,
        pendingAmount,
        progressPercent,
        transactions: planTxns
      };
    });

    // 4. Group Aggregation
    const distinctGroups = Array.from(new Set(enrichedPlans.map(p => p.groupName || p.groupId)));
    const totalPortfolioValue = enrichedPlans.reduce((sum, p) => sum + p.chitValue, 0);
    const totalCustomerPaid = enrichedPlans.reduce((sum, p) => sum + p.totalPaid, 0);
    const totalCustomerPending = enrichedPlans.reduce((sum, p) => sum + p.pendingAmount, 0);
    const totalMonthsSubscribed = enrichedPlans.reduce((sum, p) => sum + p.duration, 0);
    const totalMonthsPaidAll = enrichedPlans.reduce((sum, p) => sum + p.monthsPaid, 0);
    const overallProgress = totalMonthsSubscribed > 0 ? Math.round((totalMonthsPaidAll / totalMonthsSubscribed) * 100) : 0;

    return {
      customer,
      plans: enrichedPlans,
      distinctGroups,
      totalGroupsCount: distinctGroups.length,
      totalPlansCount: enrichedPlans.length,
      totalPortfolioValue,
      totalCustomerPaid,
      totalCustomerPending,
      overallProgress,
      allPayments: customerPayments
    };
  }, [customer]);

  if (!isOpen) return null;

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-[#102B63] to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 font-bold shadow-inner">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base tracking-tight text-white">Customer 360 Statement & History</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Mobile Lookup
                </span>
              </div>
              <p className="text-xs text-blue-200">
                View all registered groups, plans, paid months, and complete account breakdown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {customer360 && (
              <button
                type="button"
                onClick={handlePrintStatement}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition border border-white/20"
                title="Print Complete Statement"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-blue-200 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Escape)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Number Search Input Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="flex flex-col sm:flex-row gap-2.5 max-w-2xl mx-auto"
          >
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={mobileQuery}
                onChange={e => {
                  setMobileQuery(e.target.value);
                  if (searchError) setSearchError(null);
                }}
                placeholder="Enter 10-digit mobile number or customer code..."
                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-2xs font-mono"
                autoFocus
              />
              {mobileQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileQuery('');
                    setCustomer(null);
                    setSearchError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !mobileQuery.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              <span>Lookup Customer (F9)</span>
            </button>
          </form>

          {searchError && (
            <div className="mt-3 max-w-2xl mx-auto p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{searchError}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/admin/customers/add');
                }}
                className="font-bold underline text-rose-900 hover:text-rose-700 shrink-0"
              >
                + Register Customer
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {!customer360 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                <Search className="w-8 h-8" />
              </div>
              <h4 className="font-extrabold text-base text-slate-800">Ready to Look Up Customer</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Enter any subscriber's mobile number above to view all their registered chit groups, plans chosen, paid months, and complete transaction history.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* 1. Customer Profile Card */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/40 to-slate-50 rounded-2xl border border-blue-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#102B63] text-amber-300 font-black text-xl flex items-center justify-center shrink-0 border border-white/20 shadow-sm">
                    {(customer360.customer.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base sm:text-lg font-black text-slate-900">
                        {customer360.customer.name || customer360.customer.fullName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {customer360.customer.status || 'ACTIVE'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                        ID: {customer360.customer.id || customer360.customer.customerCode}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-slate-500 text-xs">
                      <span className="flex items-center gap-1 font-mono font-bold text-slate-700">
                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                        {customer360.customer.mobile || customer360.customer.phone || '—'}
                      </span>
                      {customer360.customer.address && (
                        <span className="text-slate-500">
                          📍 {customer360.customer.address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/admin/customers/${customer360.customer.id}/schedule`);
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    <span>Open Customer Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate(`/admin/receipts?customerId=${encodeURIComponent(customer360.customer.id || '')}`);
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Record Payment</span>
                  </button>
                </div>
              </div>

              {/* 2. Top KPI Summary Cards (5 Metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Groups Registered</span>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {customer360.totalGroupsCount} <span className="text-xs font-semibold text-slate-400">Groups</span>
                  </div>
                  <div className="text-[10px] text-blue-700 font-bold truncate mt-0.5">
                    {customer360.distinctGroups.join(', ') || 'No groups'}
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plans / Tickets</span>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {customer360.totalPlansCount} <span className="text-xs font-semibold text-slate-400">Plans</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Active Subscriptions
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Portfolio Value</span>
                  <div className="text-lg sm:text-xl font-black text-slate-900 mt-1">
                    {formatCurrency(customer360.totalPortfolioValue)}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                    Combined Chit Values
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-emerald-200 rounded-2xl shadow-2xs bg-emerald-50/20">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Amount Paid</span>
                  <div className="text-lg sm:text-xl font-black text-emerald-700 mt-1">
                    {formatCurrency(customer360.totalCustomerPaid)}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    {customer360.overallProgress}% of portfolio paid
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-rose-200 rounded-2xl shadow-2xs bg-rose-50/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Total Pending Dues</span>
                  <div className="text-lg sm:text-xl font-black text-rose-700 mt-1">
                    {formatCurrency(customer360.totalCustomerPending)}
                  </div>
                  <div className="text-[10px] text-rose-700 font-bold mt-0.5">
                    Remaining Balance
                  </div>
                </div>
              </div>

              {/* 3. Detailed Plan-by-Plan Breakdown (The Core Feature) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <h4 className="font-black text-sm text-slate-900">
                      Chit Plans Enrolled ({customer360.plans.length})
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Showing month-by-month paid status for every plan
                  </span>
                </div>

                {customer360.plans.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                    This customer is not yet enrolled in any chit groups.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customer360.plans.map((plan: any, idx: number) => {
                      const isComplete = plan.monthsPaid >= plan.duration;
                      return (
                        <div 
                          key={`${plan.groupId}_${plan.ticketNumber}_${idx}`}
                          className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs hover:border-blue-300 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-800 font-black flex items-center justify-center font-mono text-xs border border-blue-200 shrink-0">
                                #{plan.ticketNumber}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-bold text-slate-900 text-sm">
                                    {plan.groupName}
                                  </h5>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                    {plan.scheme || 'Regular'} Plan
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  Group ID: {plan.groupId} • Ticket: #{plan.ticketNumber}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  navigate(`/admin/receipts?chitGroup=${encodeURIComponent(plan.groupName)}&customerId=${encodeURIComponent(customer360.customer.id)}`);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Pay Installment</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  navigate(`/admin/customers/${customer360.customer.id}/schedule?group=${encodeURIComponent(plan.groupName)}`);
                                }}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>Passbook</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Plan Value & Installment Details */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chit Value</span>
                              <span className="font-black text-slate-900 text-sm">
                                {formatCurrency(plan.chitValue)}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monthly Installment</span>
                              <span className="font-black text-blue-700 text-sm">
                                {formatCurrency(plan.monthlyInstallment)} / mo
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Months Paid</span>
                              <span className="font-black text-emerald-700 text-sm">
                                {plan.monthsPaid} <span className="text-slate-400 text-xs font-semibold">/ {plan.duration} Mos</span>
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Amount Paid vs Pending</span>
                              <span className="font-bold text-slate-800 text-xs block">
                                <span className="text-emerald-700 font-black">{formatCurrency(plan.totalPaid)}</span>
                                <span className="text-slate-400"> / </span>
                                <span className="text-rose-700 font-black">{formatCurrency(plan.pendingAmount)} due</span>
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar & Month Pills Matrix */}
                          <div className="pt-2">
                            <div className="flex justify-between items-center text-[11px] mb-1.5 font-bold">
                              <span className="text-slate-600">
                                Payment Schedule Completion ({plan.progressPercent}%)
                              </span>
                              <span className={isComplete ? 'text-emerald-700' : 'text-amber-700'}>
                                {isComplete ? 'All Months Completed ✓' : `${plan.pendingMonths} Months Remaining`}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-3">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${isComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${plan.progressPercent}%` }}
                              />
                            </div>

                            {/* Month-by-month pill pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {Array.from({ length: plan.duration }, (_, i) => {
                                const mNum = i + 1;
                                const isMonthPaid = mNum <= plan.monthsPaid;
                                return (
                                  <span
                                    key={mNum}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                                      isMonthPaid 
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                        : 'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}
                                    title={`Month ${mNum}: ${isMonthPaid ? 'Paid' : 'Due'}`}
                                  >
                                    <span>M{mNum}</span>
                                    {isMonthPaid && <span className="text-[9px]">✓</span>}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Payment History Receipts Log */}
              {customer360.allPayments.length > 0 && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-black text-xs sm:text-sm text-slate-900">
                        Recent Payment Receipts Recorded ({customer360.allPayments.length})
                      </h4>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-[11px]">
                      <thead>
                        <tr className="text-slate-400 font-bold uppercase text-[10px] text-left">
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 px-3">Description / Group</th>
                          <th className="py-2 px-3">Mode</th>
                          <th className="py-2 px-3">Reference / UTR</th>
                          <th className="py-2 pl-3 text-right">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {customer360.allPayments.slice(0, 10).map((t: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 pr-3 font-mono text-slate-600">
                              {t.date || formatDate(t.createdAt || Date.now())}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {t.description || t.reference || 'Installment Payment'}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-600">
                              {t.paymentMode || t.mode || 'Cash'}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-500">
                              {t.reference || t.receiptNo || '—'}
                            </td>
                            <td className="py-2 pl-3 text-right font-black text-emerald-700 font-mono">
                              {formatCurrency(Number(t.amount) || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono font-bold">Esc</kbd> to close · Shortcut <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 font-mono font-bold">F9</kbd>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
