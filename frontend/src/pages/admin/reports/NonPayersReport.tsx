import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Search, 
  AlertCircle, 
  Phone, 
  Gavel, 
  Calendar, 
  Clock, 
  RotateCcw,
  FileSpreadsheet
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { isMockGroup, isMockCustomer } from '../../../utils/cleanMockData';

export const NonPayersReport: React.FC = () => {
  const [nonPayers, setNonPayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<'ALL' | 'AUCTION' | 'FIXED' | 'REGULAR'>('ALL');
  const [groupFilter, setGroupFilter] = useState('');
  const [amountRangeFilter, setAmountRangeFilter] = useState<'ALL' | 'UNDER_5K' | '5K_TO_20K' | 'OVER_20K'>('ALL');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    // 1. Load data
    const allGroups = (JSON.parse(localStorage.getItem('mockChitGroups') || '[]')).filter((g: any) => !isMockGroup(g));
    const customers = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((c: any) => !isMockCustomer(c));
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');

    setGroups(allGroups);

    const nonPayersList: any[] = [];

    // 2. Identify Non-Payers
    allGroups.forEach((group: any) => {
      const groupId = group.id || group.code;
      const chitValue = Number(group.chitValue || group.value || 0);
      const members = Number(group.members || 20);
      const groupMonthly = Number(group.customerChitAmount || 0);
      const defaultInstallment = groupMonthly > 0 ? groupMonthly : (members > 0 && chitValue > 0 ? Math.round(chitValue / members) : 5000);

      // Find all members in this group
      customers.forEach((cust: any) => {
        if (Array.isArray(cust.chits)) {
          cust.chits.forEach((chit: any) => {
            const matchesGroup = 
              chit.groupId === groupId || 
              chit.groupName === group.name ||
              (chit.groupId && chit.groupId.toLowerCase() === String(groupId).toLowerCase());

            if (matchesGroup) {
              const installmentAmt = Number(chit.monthlyInstallment || defaultInstallment);

              // Check if they paid
              const hasPaid = ledger.some((t: any) => 
                (t.type === 'CREDIT' || t.category === 'INSTALLMENT') && 
                ((t.reference?.includes(cust.id) || t.reference?.includes(cust.name) || t.description?.includes(cust.name) || t.description?.includes(cust.id) || t.customerName === cust.name || t.customerId === cust.id) &&
                (t.reference?.includes(groupId) || t.description?.includes(groupId) || t.reference?.includes(group.name) || t.groupId === groupId))
              );

              if (!hasPaid) {
                const rawScheme = (chit.scheme || group.scheme || group.type || cust.scheme || 'Regular').toUpperCase();
                let cleanScheme: 'Auction' | 'Fixed' | 'Regular' = 'Regular';
                if (rawScheme.includes('AUC')) cleanScheme = 'Auction';
                else if (rawScheme.includes('FIX')) cleanScheme = 'Fixed';

                nonPayersList.push({
                  customerId: cust.id,
                  customerName: cust.name || cust.fullName,
                  mobile: cust.mobile || cust.phone || '—',
                  groupId: groupId,
                  groupName: group.name || groupId,
                  scheme: cleanScheme,
                  ticketNumber: chit.ticketNumber || '1',
                  amountDue: installmentAmt,
                  chitValue: Number(chit.chitValue || chitValue || 100000)
                });
              }
            }
          });
        }
      });
    });

    setNonPayers(nonPayersList);
  }, []);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return nonPayers.filter(p => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchesName = String(p.customerName || '').toLowerCase().includes(q);
        const matchesId = String(p.customerId || '').toLowerCase().includes(q);
        const matchesPhone = String(p.mobile || '').includes(q);
        const matchesGroup = String(p.groupName || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesPhone && !matchesGroup) return false;
      }

      // Scheme Filter
      if (schemeFilter !== 'ALL') {
        const s = (p.scheme || '').toUpperCase();
        if (schemeFilter === 'AUCTION' && !s.includes('AUC')) return false;
        if (schemeFilter === 'FIXED' && !s.includes('FIX')) return false;
        if (schemeFilter === 'REGULAR' && (!s.includes('REG') || s.includes('FIX') || s.includes('AUC'))) return false;
      }

      // Group Filter
      if (groupFilter && p.groupId !== groupFilter && p.groupName !== groupFilter) {
        return false;
      }

      // Overdue Amount Tier Filter
      if (amountRangeFilter === 'UNDER_5K' && p.amountDue >= 5000) return false;
      if (amountRangeFilter === '5K_TO_20K' && (p.amountDue < 5000 || p.amountDue > 20000)) return false;
      if (amountRangeFilter === 'OVER_20K' && p.amountDue <= 20000) return false;

      return true;
    });
  }, [nonPayers, searchTerm, schemeFilter, groupFilter, amountRangeFilter]);

  // Scheme breakdown counts
  const schemeStats = useMemo(() => {
    let auctionCount = 0;
    let fixedCount = 0;
    let regularCount = 0;

    nonPayers.forEach(p => {
      const s = (p.scheme || '').toUpperCase();
      if (s.includes('AUC')) auctionCount++;
      else if (s.includes('FIX')) fixedCount++;
      else regularCount++;
    });

    return { total: nonPayers.length, auctionCount, fixedCount, regularCount };
  }, [nonPayers]);

  const totalAmountPending = useMemo(() => {
    return filteredData.reduce((sum, item) => sum + item.amountDue, 0);
  }, [filteredData]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSchemeFilter('ALL');
    setGroupFilter('');
    setAmountRangeFilter('ALL');
  };

  const hasActiveFilters = searchTerm !== '' || schemeFilter !== 'ALL' || groupFilter !== '' || amountRangeFilter !== 'ALL';

  // 1. Export Colourful Excel (.xls) with Corporate Navy & Gold Formatting
  const handleExportColourfulExcel = () => {
    if (filteredData.length === 0) {
      alert("No data available to export");
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

    const rowsHtml = filteredData.map((item, idx) => {
      const isZebra = idx % 2 === 1;
      const rowBg = isZebra ? '#F8FAFC' : '#FFFFFF';

      let schemeBadgeBg = '#FEF3C7';
      let schemeBadgeColor = '#92400E';
      if (item.scheme === 'Auction') {
        schemeBadgeBg = '#F3E8FF';
        schemeBadgeColor = '#6B21A8';
      } else if (item.scheme === 'Fixed') {
        schemeBadgeBg = '#DCFCE7';
        schemeBadgeColor = '#166534';
      }

      return `
        <tr style="background-color: ${rowBg};">
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #64748B;">${idx + 1}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 12px; font-weight: bold; color: #0B1A30;">${item.customerName}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #475569; font-family: monospace;">${item.customerId}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; color: #334155; mso-number-format:'\\@';">${item.mobile}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center;">
            <span style="background-color: ${schemeBadgeBg}; color: ${schemeBadgeColor}; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 10px; text-transform: uppercase;">
              ${item.scheme} Plan
            </span>
          </td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; font-size: 11px; font-weight: 600; color: #1E293B;">${item.groupName}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: center; font-size: 11px; font-weight: bold; color: #475569;">#${item.ticketNumber}</td>
          <td style="padding: 10px; border: 1px solid #E2E8F0; text-align: right; font-size: 12px; font-weight: bold; background-color: #FEE2E2; color: #991B1B;">
            ₹ ${item.amountDue.toLocaleString('en-IN')}
          </td>
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
                <x:Name>Defaulters_Report</x:Name>
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
          th { background-color: #0B1A30; color: #FFFFFF; font-weight: bold; font-size: 12px; padding: 12px 10px; text-align: left; border: 1px solid #002244; }
          .title-header { background-color: #0B1A30; color: #FFBF32; font-size: 18px; font-weight: bold; padding: 16px; text-align: center; }
          .summary-cell { background-color: #F1F5F9; color: #0F172A; font-size: 11px; padding: 8px 12px; border: 1px solid #CBD5E1; }
          .total-row { background-color: #0B1A30; color: #FFFFFF; font-size: 13px; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <!-- Company Branding Header -->
          <tr>
            <td colspan="8" class="title-header">
              JENISTA CHIT FUNDS (P) LTD - OVERDUE DEFAULTERS AUDIT REPORT
            </td>
          </tr>
          <tr>
            <td colspan="8" style="background-color: #1E293B; color: #E2E8F0; text-align: center; font-size: 11px; padding: 6px;">
              Generated on ${todayStr} at ${nowTimeStr} | Filter Scheme: ${schemeFilter} | Active Defaulters: ${filteredData.length}
            </td>
          </tr>
          <tr><td colspan="8" style="height: 10px;"></td></tr>

          <!-- Summary KPI Cards Row -->
          <tr>
            <td colspan="2" class="summary-cell" style="font-weight: bold;">TOTAL DEFECTIVE ACCOUNTS:</td>
            <td colspan="2" class="summary-cell" style="font-weight: bold; color: #DC2626;">${filteredData.length} Members</td>
            <td colspan="2" class="summary-cell" style="font-weight: bold;">TOTAL OUTSTANDING DUES:</td>
            <td colspan="2" class="summary-cell" style="font-weight: bold; color: #DC2626; font-size: 13px;">₹ ${totalAmountPending.toLocaleString('en-IN')}</td>
          </tr>
          <tr><td colspan="8" style="height: 10px;"></td></tr>

          <!-- Table Header -->
          <thead>
            <tr>
              <th style="text-align: center; width: 50px;">#</th>
              <th>Customer Name</th>
              <th>Customer ID</th>
              <th>Contact Phone</th>
              <th style="text-align: center;">Chit Scheme</th>
              <th>Enrolled Group</th>
              <th style="text-align: center;">Ticket No</th>
              <th style="text-align: right; background-color: #991B1B;">Amount Due (INR)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <!-- Grand Total Row -->
          <tfoot>
            <tr class="total-row">
              <td colspan="7" style="padding: 12px; text-align: right; border: 1px solid #002244; font-size: 12px;">
                GRAND TOTAL OUTSTANDING DUES:
              </td>
              <td style="padding: 12px; text-align: right; border: 1px solid #002244; font-size: 14px; color: #FFBF32; background-color: #0B1A30;">
                ₹ ${totalAmountPending.toLocaleString('en-IN')}
              </td>
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
    link.setAttribute('download', `Jenista_Defaulters_Report_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Export Standard CSV (.csv) with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("No data available to export");
      return;
    }
    
    const headers = ['#', 'Customer Name', 'Customer ID', 'Mobile', 'Scheme', 'Group Name', 'Group ID', 'Ticket Number', 'Amount Due (INR)'];
    const rows = filteredData.map((item, idx) => [
      idx + 1,
      `"${(item.customerName || '').replace(/"/g, '""')}"`,
      `"${item.customerId}"`,
      `"${item.mobile}"`,
      `"${item.scheme}"`,
      `"${(item.groupName || '').replace(/"/g, '""')}"`,
      `"${item.groupId}"`,
      `"${item.ticketNumber}"`,
      item.amountDue
    ]);
    
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Defaulters_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-900 text-xs font-bold uppercase tracking-wider mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
            Audit & Defaulters Desk
          </div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">Non-Payers & Defaulters Report</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
            Track unpaid chit installments, filter by plan scheme, and export branded, colorful spreadsheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}

          {/* Colourful Excel Export Button */}
          <button 
            onClick={handleExportColourfulExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl shadow-xs text-xs font-bold transition-all active:scale-95"
            title="Download formatted Excel spreadsheet with corporate styling, colored badges, and total summaries"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Export Colourful Excel (.xls)</span>
          </button>

          {/* Standard CSV Export Button */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-xl shadow-xs hover:bg-neutral-50 hover:text-primary-900 transition-colors text-xs font-bold"
            title="Download standard CSV format with UTF-8 support"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle className="w-16 h-16 text-rose-600" />
          </div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Defaulters</p>
          <p className="text-3xl font-black text-rose-600">{filteredData.length}</p>
          <span className="text-[11px] text-neutral-400 font-medium mt-1 block">
            {nonPayers.length} total uncollected accounts
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText className="w-16 h-16 text-rose-600" />
          </div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Outstanding</p>
          <p className="text-3xl font-black text-rose-600">{formatCurrency(totalAmountPending)}</p>
          <span className="text-[11px] text-neutral-400 font-medium mt-1 block">
            Accumulated unpaid installments
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-purple-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Gavel className="w-16 h-16 text-purple-600" />
          </div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Auction Plan Defaulters</p>
          <p className="text-3xl font-black text-purple-700">{schemeStats.auctionCount}</p>
          <span className="text-[11px] text-purple-600 font-medium mt-1 block">
            High priority recovery accounts
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar className="w-16 h-16 text-emerald-600" />
          </div>
          <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Fixed & Regular</p>
          <p className="text-3xl font-black text-emerald-700">{schemeStats.fixedCount + schemeStats.regularCount}</p>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Fixed: {schemeStats.fixedCount} · Regular: {schemeStats.regularCount}
          </span>
        </div>
      </div>

      {/* Main Container: Filters & Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Quick Scheme Pills & Multi-criteria Filter Bar */}
        <div className="p-5 border-b border-neutral-200 bg-neutral-50/70 space-y-4">
          {/* Quick Scheme Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-1">Scheme Filter:</span>
            
            <button
              onClick={() => setSchemeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                schemeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              All Defaulters ({schemeStats.total})
            </button>

            <button
              onClick={() => setSchemeFilter('AUCTION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                schemeFilter === 'AUCTION'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Auction Scheme ({schemeStats.auctionCount})</span>
            </button>

            <button
              onClick={() => setSchemeFilter('FIXED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                schemeFilter === 'FIXED'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Fixed Plan ({schemeStats.fixedCount})</span>
            </button>

            <button
              onClick={() => setSchemeFilter('REGULAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                schemeFilter === 'REGULAR'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Regular Scheme ({schemeStats.regularCount})</span>
            </button>
          </div>

          {/* Search & Dropdown Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Search Customer Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search name, ID, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              />
            </div>

            {/* Scheme Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-neutral-300 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select 
                value={schemeFilter}
                onChange={e => setSchemeFilter(e.target.value as any)}
                className="w-full text-xs bg-transparent outline-none font-semibold text-neutral-700 cursor-pointer"
              >
                <option value="ALL">All Scheme Types</option>
                <option value="AUCTION">Auction Chit Scheme</option>
                <option value="FIXED">Fixed Deposit Chit Plan</option>
                <option value="REGULAR">Regular Chit Scheme</option>
              </select>
            </div>

            {/* Group Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-neutral-300 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select 
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                className="w-full text-xs bg-transparent outline-none font-semibold text-neutral-700 cursor-pointer"
              >
                <option value="">All Chit Groups</option>
                {groups.map(g => (
                  <option key={g.id || g.code} value={g.id || g.code}>{g.name || g.id}</option>
                ))}
              </select>
            </div>

            {/* Overdue Amount Tier Filter */}
            <div className="flex items-center gap-1.5 bg-white border border-neutral-300 rounded-xl px-3 py-1.5">
              <Filter className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <select 
                value={amountRangeFilter}
                onChange={e => setAmountRangeFilter(e.target.value as any)}
                className="w-full text-xs bg-transparent outline-none font-semibold text-neutral-700 cursor-pointer"
              >
                <option value="ALL">All Overdue Amounts</option>
                <option value="UNDER_5K">Under ₹5,000</option>
                <option value="5K_TO_20K">₹5,000 to ₹20,000</option>
                <option value="OVER_20K">Above ₹20,000</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100/80 text-[11px] font-bold text-neutral-600 uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="p-3.5 text-center w-12">#</th>
                <th className="p-3.5">Customer Name & ID</th>
                <th className="p-3.5">Contact Phone</th>
                <th className="p-3.5 text-center">Plan Scheme</th>
                <th className="p-3.5">Chit Group</th>
                <th className="p-3.5 text-center">Ticket</th>
                <th className="p-3.5 text-right">Amount Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-neutral-400">
                    <AlertCircle className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                    <p className="font-semibold text-neutral-700 text-sm">No non-payers found</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      No members match the selected scheme, group, or amount criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => {
                  const isAuction = item.scheme === 'Auction';
                  const isFixed = item.scheme === 'Fixed';

                  return (
                    <tr key={`${item.customerId}_${item.groupId}_${idx}`} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="p-3.5 text-center text-neutral-400 font-bold">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-neutral-900 text-sm">{item.customerName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{item.customerId}</div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                          <Phone className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{item.mobile}</span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          isAuction 
                            ? 'bg-purple-100 text-purple-900 border border-purple-200' 
                            : isFixed
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          {isAuction ? <Gavel className="w-3 h-3 text-purple-700" /> : isFixed ? <Calendar className="w-3 h-3 text-emerald-700" /> : <Clock className="w-3 h-3 text-amber-700" />}
                          <span>{item.scheme} Plan</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-primary-900">{item.groupName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{item.groupId}</div>
                      </td>
                      <td className="p-3.5 text-center font-bold text-neutral-700">#{item.ticketNumber}</td>
                      <td className="p-3.5 text-right font-black text-danger text-sm whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                          {formatCurrency(item.amountDue)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-neutral-50/90 font-bold border-t border-neutral-200">
                <tr>
                  <td colSpan={6} className="p-4 text-right text-xs uppercase tracking-wider text-neutral-600">
                    Grand Total Outstanding Dues ({filteredData.length} Accounts):
                  </td>
                  <td className="p-4 text-right font-black text-rose-700 text-base">
                    {formatCurrency(totalAmountPending)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
