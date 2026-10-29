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
  RotateCcw,
  Download,
  FileSpreadsheet,
  Clock,
  Pencil,
  Trash2,
  CheckCircle2,
  X
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

  // Edit Transaction Modal state
  const [editingTxn, setEditingTxn] = useState<any | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMode, setEditMode] = useState<string>('Cash');
  const [editDate, setEditDate] = useState<string>('');
  const [editRef, setEditRef] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  const handleOpenEditLedger = (txn: any) => {
    setEditingTxn(txn);
    setEditAmount(String(txn.amount || ''));
    setEditMode(txn.paymentMode || txn.method || (txn.description?.toLowerCase().includes('upi') ? 'UPI' : 'Cash'));
    const isoDate = txn.date ? new Date(txn.date).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
    setEditDate(isoDate);
    setEditRef(txn.referenceNo || txn.reference || '');
    setEditDesc(txn.description || '');
  };

  const handleSaveEditLedger = () => {
    if (!editingTxn || !editAmount || Number(editAmount) <= 0) return;

    const newAmount = Number(editAmount);
    const oldAmount = Number(editingTxn.amount) || 0;
    const diff = newAmount - oldAmount;
    const newIsoDate = editDate ? new Date(editDate).toISOString() : editingTxn.date;

    const saved = localStorage.getItem('ledgerTransactions');
    const txns: any[] = saved ? JSON.parse(saved) : [];

    const updatedTxns = txns.map((t: any) => {
      if (t.id === editingTxn.id) {
        return {
          ...t,
          amount: newAmount,
          paymentMode: editMode,
          method: editMode,
          referenceNo: editRef,
          reference: editRef || t.reference,
          description: editDesc || t.description,
          date: newIsoDate,
          lastEditedAt: new Date().toISOString()
        };
      }
      return t;
    });

    localStorage.setItem('ledgerTransactions', JSON.stringify(updatedTxns));
    setTransactions(updatedTxns);

    const custId = editingTxn.customerId || editingTxn.reference?.split('/')?.[0]?.trim();
    if (custId) {
      const custsRaw = localStorage.getItem('mockCustomers');
      if (custsRaw) {
        const custs = JSON.parse(custsRaw);
        const updatedCusts = custs.map((c: any) => {
          if (c.id === custId || c.customerCode === custId || c.mongoId === custId) {
            return {
              ...c,
              totalPaid: Math.max(0, (Number(c.totalPaid) || 0) + diff),
              pending: Math.max(0, (Number(c.pending) || 0) - diff)
            };
          }
          return c;
        });
        localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
      }
    }

    window.dispatchEvent(new Event('storage'));
    setEditingTxn(null);
  };

  const handleDeleteLedgerTxn = (txnId: string) => {
    if (!window.confirm(`Are you sure you want to void / delete transaction ${txnId}? This will reverse the payment entry.`)) return;

    const saved = localStorage.getItem('ledgerTransactions');
    const txns: any[] = saved ? JSON.parse(saved) : [];
    const target = txns.find((t: any) => t.id === txnId);
    const removedAmount = target ? Number(target.amount) || 0 : 0;

    const updatedTxns = txns.filter((t: any) => t.id !== txnId);
    localStorage.setItem('ledgerTransactions', JSON.stringify(updatedTxns));
    setTransactions(updatedTxns);

    const custId = target?.customerId || target?.reference?.split('/')?.[0]?.trim();
    if (custId && target?.type === 'CREDIT') {
      const custsRaw = localStorage.getItem('mockCustomers');
      if (custsRaw) {
        const custs = JSON.parse(custsRaw);
        const updatedCusts = custs.map((c: any) => {
          if (c.id === custId || c.customerCode === custId || c.mongoId === custId) {
            return {
              ...c,
              totalPaid: Math.max(0, (Number(c.totalPaid) || 0) - removedAmount),
              pending: (Number(c.pending) || 0) + removedAmount
            };
          }
          return c;
        });
        localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
      }
    }

    window.dispatchEvent(new Event('storage'));
    setEditingTxn(null);
  };

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

  // 1. Export Colourful Excel (.xls) for Ledger
  const handleExportColourfulExcel = () => {
    if (filtered.length === 0) {
      alert("No transactions available to export");
      return;
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const nowTimeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const rowsHtml = filtered.map((txn, idx) => {
      const isZebra = idx % 2 === 1;
      const rowBg = isZebra ? '#F8FAFC' : '#FFFFFF';
      const cust = resolveCustomer(txn);
      const scheme = resolveScheme(txn);
      const groupName = (txn.groupId || txn.chitGroup || txn.reference?.split('/')?.[1] || 'General Chit Fund').trim();
      const isCredit = txn.type === 'CREDIT';

      let schemeBadgeBg = '#FEF3C7';
      let schemeBadgeColor = '#92400E';
      if (scheme === 'Auction') {
        schemeBadgeBg = '#F3E8FF';
        schemeBadgeColor = '#6B21A8';
      } else if (scheme === 'Fixed') {
        schemeBadgeBg = '#DCFCE7';
        schemeBadgeColor = '#166534';
      }

      const typeBg = isCredit ? '#DCFCE7' : '#FEE2E2';
      const typeColor = isCredit ? '#166534' : '#991B1B';

      return `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #64748B;">${idx + 1}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #334155;">${formatDate(txn.date)}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 12px; font-weight: bold; color: #0B1A30;">${cust.name}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #475569; font-family: monospace;">${cust.id || '—'}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #334155; mso-number-format:'\\@';">${cust.phone || '—'}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">
            <span style="background-color: ${schemeBadgeBg}; color: ${schemeBadgeColor}; padding: 3px 8px; border-radius: 12px; font-weight: bold; font-size: 10px; text-transform: uppercase;">
              ${scheme}
            </span>
          </td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; font-weight: 600; color: #1E293B;">${groupName}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">
            <span style="background-color: ${typeBg}; color: ${typeColor}; padding: 3px 8px; border-radius: 10px; font-weight: bold; font-size: 10px;">
              ${txn.type}
            </span>
          </td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #475569;">${txn.paymentMethod || 'CASH'}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: right; font-size: 12px; font-weight: bold; color: ${isCredit ? '#15803D' : '#DC2626'};">
            ${isCredit ? '+' : '-'} ₹ ${Number(txn.amount || 0).toLocaleString('en-IN')}
          </td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">${txn.description || '—'}</td>
        </tr>
      `;
    }).join('');

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>General_Ledger</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #0B1A30; color: #FFFFFF; font-weight: bold; font-size: 11px; padding: 12px 10px; text-align: left; border: 1px solid #002244; }
          .title-header { background-color: #0B1A30; color: #FFBF32; font-size: 18px; font-weight: bold; padding: 16px; text-align: center; }
          .summary-cell { background-color: #F1F5F9; color: #0F172A; font-size: 11px; padding: 8px 12px; border: 1px solid #CBD5E1; }
          .total-row { background-color: #0B1A30; color: #FFFFFF; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="11" class="title-header">
              JENISTA CHIT FUNDS (P) LTD - AUDIT GENERAL LEDGER & CASH FLOW
            </td>
          </tr>
          <tr>
            <td colspan="11" style="background-color: #1E293B; color: #E2E8F0; text-align: center; font-size: 11px; padding: 6px;">
              Generated on ${todayStr} at ${nowTimeStr} | Total Entries: ${filtered.length} | Net Balance: ₹ ${balance.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr><td colspan="11" style="height: 10px;"></td></tr>

          <tr>
            <td colspan="3" class="summary-cell" style="font-weight: bold;">TOTAL CREDITS (INFLOW):</td>
            <td colspan="2" class="summary-cell" style="font-weight: bold; color: #166534;">+ ₹ ${totalCredits.toLocaleString('en-IN')}</td>
            <td colspan="3" class="summary-cell" style="font-weight: bold;">TOTAL DEBITS (OUTFLOW):</td>
            <td colspan="3" class="summary-cell" style="font-weight: bold; color: #DC2626;">- ₹ ${totalDebits.toLocaleString('en-IN')}</td>
          </tr>
          <tr><td colspan="11" style="height: 10px;"></td></tr>

          <thead>
            <tr>
              <th style="text-align: center; width: 40px;">#</th>
              <th>Date</th>
              <th>Customer Name</th>
              <th>Customer ID</th>
              <th>Phone</th>
              <th style="text-align: center;">Scheme</th>
              <th>Group Name</th>
              <th style="text-align: center;">Type</th>
              <th>Payment Method</th>
              <th style="text-align: right;">Amount (INR)</th>
              <th>Description / Reference</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="9" style="padding: 12px; text-align: right; border: 1px solid #002244;">
                NET FILTERED CASH BALANCE:
              </td>
              <td style="padding: 12px; text-align: right; border: 1px solid #002244; font-size: 14px; color: #FFBF32; background-color: #0B1A30;">
                ₹ ${balance.toLocaleString('en-IN')}
              </td>
              <td style="background-color: #0B1A30;"></td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Jenista_Ledger_Export_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Export Standard CSV (.csv) with UTF-8 BOM
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert("No transactions available to export");
      return;
    }

    const headers = ['#', 'Date', 'Customer Name', 'Customer ID', 'Phone', 'Scheme', 'Group Name', 'Type', 'Payment Method', 'Amount (INR)', 'Description'];
    const rows = filtered.map((txn, idx) => {
      const cust = resolveCustomer(txn);
      const scheme = resolveScheme(txn);
      const groupName = (txn.groupId || txn.chitGroup || txn.reference?.split('/')?.[1] || 'General Chit Fund').trim();
      return [
        idx + 1,
        `"${formatDate(txn.date)}"`,
        `"${(cust.name || '').replace(/"/g, '""')}"`,
        `"${cust.id || ''}"`,
        `"${cust.phone || ''}"`,
        `"${scheme}"`,
        `"${(groupName || '').replace(/"/g, '""')}"`,
        `"${txn.type}"`,
        `"${txn.paymentMethod || 'CASH'}"`,
        txn.amount,
        `"${(txn.description || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ledger_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          {/* Export Colourful Excel (.xls) */}
          <button 
            onClick={handleExportColourfulExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-xs text-xs font-bold transition-all active:scale-95"
            title="Download formatted Excel spreadsheet with corporate styling, colored badges, and total summaries"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Colourful Excel (.xls)</span>
          </button>

          {/* Export CSV */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-xs hover:bg-slate-50 transition-colors text-xs font-bold"
            title="Download standard CSV format with UTF-8 support"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

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
                      {/* TXN ID & Date + Exact Time */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900">{txn.id}</div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {txn.date ? formatDate(new Date(txn.date)) : '—'}
                        </div>
                        {txn.date && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <Clock className="w-2.5 h-2.5 text-slate-400" />
                            <span>{new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                        )}
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

                      {/* Receipt & Edit Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {txn.type === 'CREDIT' ? (
                          <div className="flex items-center justify-end gap-1.5">
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
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 shadow-2xs transition-all cursor-pointer"
                              title="Print Official Slip"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              <span>Slip</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditLedger(txn)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 shadow-2xs transition-all cursor-pointer"
                              title="Edit Price Amount, Mode, Date & Remarks"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-700" />
                              <span>Edit</span>
                            </button>
                          </div>
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

      {/* Edit Transaction Modal */}
      {editingTxn && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-4 bg-[#1f1a14] text-white flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-amber-400" />
                  <span>Edit Payment Transaction</span>
                </h3>
                <p className="text-[11px] text-amber-200/80 font-mono mt-0.5">
                  {editingTxn.id} · {editingTxn.customerName || resolveCustomer(editingTxn).name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTxn(null)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Payment Mode *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'UPI', 'Bank Transfer'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditMode(mode)}
                      className={`py-2 px-2.5 text-xs font-bold rounded-xl border text-center transition-all ${
                        editMode.toLowerCase() === mode.toLowerCase()
                          ? 'bg-[#9a6d25] text-white border-[#9a6d25] shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Time Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#9a6d25]" />
                  <span>Payment Date & Time *</span>
                </label>
                <input
                  type="datetime-local"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Exact timestamp when payment was recorded or made. Backdating to past years/months supported.
                </p>
              </div>

              {/* Reference / UTR */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Reference / UTR / Counter Notes
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                  value={editRef}
                  onChange={(e) => setEditRef(e.target.value)}
                  placeholder="e.g. UTR or Cash counter ref..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Transaction description..."
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteLedgerTxn(editingTxn.id)}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Entry</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTxn(null)}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditLedger}
                    disabled={!editAmount || Number(editAmount) <= 0}
                    className="px-4 py-1.5 bg-[#9a6d25] hover:bg-[#855c1b] text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
