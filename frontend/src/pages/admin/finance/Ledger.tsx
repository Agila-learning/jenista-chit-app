import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/common/Button';
import { 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  BookOpen, 
  Printer, 
  User, 
  Calendar, 
  Layers, 
  CreditCard, 
  RotateCcw
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/format';
import { printCashReceipt } from '../../../utils/receiptPrinter';
import { isMockGroup } from '../../../utils/cleanMockData';

export const Ledger: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, any>>({});
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);

  // Filter States
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [customDate, setCustomDate] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [schemeFilter, setSchemeFilter] = useState<string>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);

  useEffect(() => {
    // 1. Load transactions from localStorage
    const saved = localStorage.getItem('ledgerTransactions');
    let txns: any[] = [];
    if (saved) {
      try {
        txns = JSON.parse(saved);
      } catch {
        txns = [];
      }
    }

    // 2. Load customers for dynamic name resolution if missing
    const custsRaw = localStorage.getItem('mockCustomers');
    const custMap: Record<string, any> = {};
    if (custsRaw) {
      try {
        const parsed = JSON.parse(custsRaw);
        if (Array.isArray(parsed)) {
          parsed.forEach((c: any) => {
            if (c.id) custMap[c.id.toLowerCase()] = c;
            if (c.customerCode) custMap[c.customerCode.toLowerCase()] = c;
            if (c.mongoId) custMap[c.mongoId.toLowerCase()] = c;
            if (c.mobile) custMap[c.mobile.replace(/\D/g, '')] = c;
          });
        }
      } catch {}
    }
    setCustomersMap(custMap);

    // 3. Extract unique group names for filter dropdown
    const groupsRaw = localStorage.getItem('mockChitGroups');
    const groupNames = new Set<string>();
    if (groupsRaw) {
      try {
        const parsedG = JSON.parse(groupsRaw);
        if (Array.isArray(parsedG)) {
          parsedG.filter((g: any) => !isMockGroup(g)).forEach((g: any) => {
            if (g.name) groupNames.add(g.name);
            else if (g.id) groupNames.add(g.id);
          });
        }
      } catch {}
    }

    // Also collect group names from transactions themselves
    txns.forEach((t: any) => {
      if (t.groupId) groupNames.add(t.groupId);
      if (t.chitGroup) groupNames.add(t.chitGroup);
    });

    setAvailableGroups(Array.from(groupNames));
    setTransactions(txns);
  }, []);

  // Helper to resolve customer details from txn
  const resolveCustomer = (txn: any) => {
    if (txn.customerName && txn.customerName !== 'Valued Member') {
      return {
        name: txn.customerName,
        id: txn.customerId || '',
        phone: txn.mobileNumber || txn.phone || ''
      };
    }

    const cId = (txn.customerId || '').toLowerCase();
    if (cId && customersMap[cId]) {
      const match = customersMap[cId];
      return {
        name: match.name || match.fullName,
        id: match.id || match.customerCode || txn.customerId,
        phone: match.mobile || match.phone || ''
      };
    }

    // Try parsing reference e.g. "TC-11075 / CG-AUC-501"
    if (txn.reference) {
      const parts = txn.reference.split('/');
      const refId = parts[0]?.trim().toLowerCase();
      if (refId && customersMap[refId]) {
        const match = customersMap[refId];
        return {
          name: match.name || match.fullName,
          id: match.id || match.customerCode || parts[0]?.trim(),
          phone: match.mobile || match.phone || ''
        };
      }
    }

    // Try description lookup
    const desc = txn.description || '';
    if (desc.includes('for ')) {
      const candidate = desc.split('for ')[1]?.split(' ')[0];
      if (candidate && candidate.length > 2) {
        return {
          name: candidate,
          id: txn.customerId || '',
          phone: txn.mobileNumber || ''
        };
      }
    }

    return {
      name: txn.customerName || 'Valued Member',
      id: txn.customerId || txn.reference?.split('/')?.[0]?.trim() || '',
      phone: txn.mobileNumber || ''
    };
  };

  // Helper to determine transaction payment method
  const resolvePaymentMethod = (txn: any): string => {
    if (txn.paymentMethod) return txn.paymentMethod.toUpperCase();
    if (txn.paymentMode) return txn.paymentMode.toUpperCase();
    const desc = (txn.description || '').toUpperCase();
    if (desc.includes('CASH')) return 'CASH';
    if (desc.includes('UPI')) return 'UPI';
    if (desc.includes('CHEQUE')) return 'CHEQUE';
    if (desc.includes('BANK TRANSFER') || desc.includes('IMPS') || desc.includes('NEFT')) return 'BANK TRANSFER';
    if (desc.includes('ONLINE') || desc.includes('GATEWAY')) return 'ONLINE';
    return 'ONLINE';
  };

  // Helper to determine scheme (Auction, Fixed, Regular)
  const resolveScheme = (txn: any): string => {
    if (txn.scheme) return txn.scheme.toUpperCase();
    const str = `${txn.groupId || ''} ${txn.chitGroup || ''} ${txn.description || ''}`.toUpperCase();
    if (str.includes('AUC') || str.includes('AUCTION')) return 'AUCTION';
    if (str.includes('FIX') || str.includes('FIXED')) return 'FIXED';
    if (str.includes('REG') || str.includes('REGULAR')) return 'REGULAR';
    return 'AUCTION';
  };

  // Master Filter Logic
  const filtered = useMemo(() => {
    return transactions.filter(txn => {
      const cust = resolveCustomer(txn);
      const method = resolvePaymentMethod(txn);
      const scheme = resolveScheme(txn);
      const group = (txn.groupId || txn.chitGroup || txn.reference?.split('/')?.[1] || '').trim();

      // 1. Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchId = (txn.id || '').toLowerCase().includes(q);
        const matchRef = (txn.reference || '').toLowerCase().includes(q);
        const matchDesc = (txn.description || '').toLowerCase().includes(q);
        const matchCustName = cust.name.toLowerCase().includes(q);
        const matchCustId = cust.id.toLowerCase().includes(q);
        const matchPhone = cust.phone.includes(q);

        if (!matchId && !matchRef && !matchDesc && !matchCustName && !matchCustId && !matchPhone) {
          return false;
        }
      }

      // 2. Payment Method Filter
      if (paymentMethodFilter !== 'ALL') {
        if (paymentMethodFilter === 'CASH' && !method.includes('CASH')) return false;
        if (paymentMethodFilter === 'UPI' && !method.includes('UPI')) return false;
        if (paymentMethodFilter === 'BANK TRANSFER' && !method.includes('BANK') && !method.includes('IMPS') && !method.includes('NEFT')) return false;
        if (paymentMethodFilter === 'CHEQUE' && !method.includes('CHEQUE')) return false;
        if (paymentMethodFilter === 'ONLINE' && !method.includes('ONLINE') && !method.includes('UPI')) return false;
      }

      // 3. Date Filter
      if (dateFilter !== 'ALL') {
        const txnDate = txn.date ? new Date(txn.date) : null;
        if (!txnDate || isNaN(txnDate.getTime())) return false;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dateFilter === 'TODAY') {
          if (txnDate < startOfToday) return false;
        } else if (dateFilter === 'WEEK') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
          if (txnDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'MONTH') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (txnDate < startOfMonth) return false;
        } else if (dateFilter === 'CUSTOM' && customDate) {
          const target = new Date(customDate);
          if (
            txnDate.getFullYear() !== target.getFullYear() ||
            txnDate.getMonth() !== target.getMonth() ||
            txnDate.getDate() !== target.getDate()
          ) {
            return false;
          }
        }
      }

      // 4. Group Filter
      if (groupFilter !== 'ALL') {
        if (!group.toLowerCase().includes(groupFilter.toLowerCase()) && !groupFilter.toLowerCase().includes(group.toLowerCase())) {
          return false;
        }
      }

      // 5. Scheme Filter
      if (schemeFilter !== 'ALL') {
        if (!scheme.includes(schemeFilter)) return false;
      }

      return true;
    });
  }, [transactions, searchTerm, paymentMethodFilter, dateFilter, customDate, groupFilter, schemeFilter, customersMap]);

  // Compute summary for current filtered view
  const totalCredits = filtered.filter(t => t.type === 'CREDIT').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalDebits = filtered.filter(t => t.type === 'DEBIT').reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance = totalCredits - totalDebits;

  const handleResetFilters = () => {
    setSearchTerm('');
    setPaymentMethodFilter('ALL');
    setDateFilter('ALL');
    setCustomDate('');
    setGroupFilter('ALL');
    setSchemeFilter('ALL');
  };

  const hasActiveFilters = paymentMethodFilter !== 'ALL' || dateFilter !== 'ALL' || groupFilter !== 'ALL' || schemeFilter !== 'ALL' || searchTerm !== '';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider mb-2">
            <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
            Audit Ledger & Books
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            General Ledger & Cash Flow
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Complete financial audit trail with customer identification, scheme tracking, and multi-criteria filters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
          <Button 
            variant="secondary" 
            onClick={() => window.print()}
            className="text-xs font-semibold"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5 bg-white border border-slate-200/80 shadow-sm rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Filtered Balance</p>
          <h3 className={`text-2xl font-black ${balance >= 0 ? 'text-primary-900' : 'text-danger'}`}>
            {formatCurrency(balance)}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Credits minus Debits for {filtered.length} entries</p>
        </div>

        <div className="card p-5 bg-white border-l-4 border-l-success border border-slate-200/80 shadow-sm rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Credits (Inflow)</p>
          <h3 className="text-2xl font-black text-success">{formatCurrency(totalCredits)}</h3>
          <div className="flex items-center text-xs text-slate-500 mt-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-success mr-1" />
            <span>Installments & collections</span>
          </div>
        </div>

        <div className="card p-5 bg-white border-l-4 border-l-danger border border-slate-200/80 shadow-sm rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Debits (Outflow)</p>
          <h3 className="text-2xl font-black text-danger">{formatCurrency(totalDebits)}</h3>
          <div className="flex items-center text-xs text-slate-500 mt-2">
            <ArrowDownRight className="w-3.5 h-3.5 text-danger mr-1" />
            <span>Prize payouts & disbursals</span>
          </div>
        </div>
      </div>

      {/* Filters & Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Search & Filter Controls Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium" 
                placeholder="Search by Customer Name, ID, TXN ID, or Reference..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  showAdvancedFilters 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5 text-emerald-600" />
                <span>{showAdvancedFilters ? 'Hide Filters' : 'Filter Options'}</span>
              </button>
            </div>
          </div>

          {/* ADVANCED MULTI-CRITERIA FILTERS BAR */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-200/60 text-xs">
              
              {/* 1. Payment Method Filter */}
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-slate-400" />
                  Payment Method
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Methods</option>
                  <option value="CASH">Cash Only</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="BANK TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                  <option value="ONLINE">Online Portal</option>
                  <option value="CHEQUE">Cheque / DD</option>
                </select>
              </div>

              {/* 2. Date Wise Filter */}
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  Date Range
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="flex-1 h-9 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="ALL">All Dates</option>
                    <option value="TODAY">Today</option>
                    <option value="WEEK">Last 7 Days</option>
                    <option value="MONTH">This Month</option>
                    <option value="CUSTOM">Specific Date</option>
                  </select>

                  {dateFilter === 'CUSTOM' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="w-32 h-9 px-2 bg-white border border-slate-300 rounded-xl text-xs"
                    />
                  )}
                </div>
              </div>

              {/* 3. Group Wise Filter */}
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-400" />
                  Chit Group
                </label>
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Chit Groups</option>
                  {availableGroups.map(grp => (
                    <option key={grp} value={grp}>{grp}</option>
                  ))}
                </select>
              </div>

              {/* 4. Plan / Scheme Wise Filter */}
              <div>
                <label className="block text-slate-600 font-bold mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  Plan / Scheme
                </label>
                <select
                  value={schemeFilter}
                  onChange={(e) => setSchemeFilter(e.target.value)}
                  className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="ALL">All Schemes</option>
                  <option value="AUCTION">Auction Chit Plan</option>
                  <option value="FIXED">Fixed Chit Plan</option>
                  <option value="REGULAR">Regular Chit Plan</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Master Transactions Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Transaction ID & Date</th>
                <th className="py-3.5 px-4">Customer / Member</th>
                <th className="py-3.5 px-4">Scheme & Chit Group</th>
                <th className="py-3.5 px-4">Category & Method</th>
                <th className="py-3.5 px-4 text-right">Debit (Disbursal)</th>
                <th className="py-3.5 px-4 text-right">Credit (Collection)</th>
                <th className="py-3.5 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700 text-sm">No transactions found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {hasActiveFilters ? 'Try adjusting your filters or search term.' : 'Transactions will appear here as payments and disbursals occur.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((txn) => {
                  const cust = resolveCustomer(txn);
                  const method = resolvePaymentMethod(txn);
                  const scheme = resolveScheme(txn);
                  const groupDisplay = txn.groupId || txn.chitGroup || txn.reference?.split('/')?.[1]?.trim() || 'General Pool';

                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* TXN ID & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{txn.id}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {txn.date ? formatDate(new Date(txn.date)) : '—'}
                        </div>
                      </td>

                      {/* Customer / Member Name (HIGHLIGHTED) */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cust.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                          {cust.id && <span className="bg-slate-100 px-1 rounded">{cust.id}</span>}
                          {cust.phone && <span>{cust.phone}</span>}
                        </div>
                      </td>

                      {/* Scheme & Chit Group */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{groupDisplay}</div>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                          scheme === 'AUCTION' ? 'bg-amber-100 text-amber-900' :
                          scheme === 'FIXED' ? 'bg-sky-100 text-sky-900' :
                          'bg-emerald-100 text-emerald-900'
                        }`}>
                          {scheme} Scheme
                        </span>
                      </td>

                      {/* Category & Method */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {txn.category || 'TRANSACTION'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                          {method}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={txn.reference}>
                          {txn.reference}
                        </div>
                      </td>

                      {/* Debit */}
                      <td className="py-3.5 px-4 text-right">
                        {txn.type === 'DEBIT' ? (
                          <span className="text-danger font-black text-sm">{formatCurrency(txn.amount)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Credit */}
                      <td className="py-3.5 px-4 text-right">
                        {txn.type === 'CREDIT' ? (
                          <span className="text-success font-black text-sm">{formatCurrency(txn.amount)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Receipt */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {txn.type === 'CREDIT' ? (
                          <button 
                            type="button"
                            onClick={() => printCashReceipt({
                              receiptNo: txn.id,
                              date: txn.date,
                              customerName: cust.name,
                              customerId: cust.id,
                              groupName: groupDisplay,
                              paymentMode: method,
                              amount: txn.amount,
                              description: txn.description,
                              referenceNo: txn.reference,
                              collectedBy: 'Jenista Accounts'
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs transition-all"
                            title="Print Official Slip"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-500" />
                            <span>Slip</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
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
    </div>
  );
};
