import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Award, 
  Printer, 
  TrendingUp, 
  Wallet
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { printCashReceipt } from '../../../utils/receiptPrinter';
import { useAuth } from '../../../store/AuthContext';
import { 
  buildCustomerChitSchedule, 
  type CustomerChitScheduleSummary,
  type DueInstallmentRow
} from '../../../utils/customerChitSchedule';
import { fetchClient } from '../../../api/client';

export const CustomerChitScheduleScreen = () => {
  const { id: customerIdParam } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const groupParam = searchParams.get('group') || searchParams.get('groupId') || searchParams.get('chitGroup') || '';
  const [scheduleData, setScheduleData] = useState<CustomerChitScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Payment Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');

  const loadData = async () => {
    try {
      const targetId = customerIdParam || user?.id || '';
      if (!targetId) return;

      // 1. Locate Customer
      let foundCustomer: any = null;
      const rawCustomers = localStorage.getItem('mockCustomers');
      if (rawCustomers) {
        try {
          const parsed = JSON.parse(rawCustomers);
          foundCustomer = parsed.find((c: any) => 
            c.id === targetId || 
            c.customerCode === targetId || 
            c.mongoId === targetId ||
            (c.mobile && user?.phone && c.mobile === user.phone)
          );
        } catch { }
      }

      // If not in local, check backend
      if (!foundCustomer) {
        try {
          const res = await fetchClient(`/customers?search=${targetId}`);
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            foundCustomer = res.data.find((c: any) => c.customerCode === targetId || c._id === targetId) || res.data[0];
          }
        } catch { }
      }

      // If still not found and current user is customer, use current session
      if (!foundCustomer && user) {
        foundCustomer = {
          id: user.id || targetId,
          name: user.name || 'Customer',
          mobile: user.phone || '—',
          chits: []
        };
      }

      // 2. Locate Target Chit from group
      // Normalize groupParam for resilient matching (handles URL encoded characters like %20, symbols like ₹ and commas)
      const cleanGroupParam = decodeURIComponent(groupParam || '').trim().toLowerCase();

      // Check group from mockChitGroups first so targetGroup metadata (scheme, duration, value) is known
      let targetGroup: any = null;
      try {
        const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
        targetGroup = groups.find((g: any) => {
          const gId = String(g.id || '').toLowerCase();
          const gCode = String(g.code || '').toLowerCase();
          const gName = String(g.name || '').toLowerCase();
          return (
            (cleanGroupParam && (gId === cleanGroupParam || gCode === cleanGroupParam || gName === cleanGroupParam)) ||
            (cleanGroupParam && (gId.includes(cleanGroupParam) || cleanGroupParam.includes(gId) || gName.includes(cleanGroupParam) || cleanGroupParam.includes(gName)))
          );
        });
      } catch { }

      let matchedChit: any = null;
      if (foundCustomer?.chits && Array.isArray(foundCustomer.chits)) {
        matchedChit = foundCustomer.chits.find((ch: any) => {
          if (!cleanGroupParam) return true;
          const chId = String(ch.groupId || '').toLowerCase();
          const chName = String(ch.groupName || '').toLowerCase();
          return (
            chId === cleanGroupParam ||
            chName === cleanGroupParam ||
            chId.includes(cleanGroupParam) ||
            cleanGroupParam.includes(chId) ||
            chName.includes(cleanGroupParam) ||
            cleanGroupParam.includes(chName)
          );
        });
      }

      // Fallback: check chitGroupMemberships
      if (!matchedChit) {
        try {
          const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
          const memberFound = memberships.find((m: any) => {
            const matchesCust = m.customerId === targetId || m.customerId === foundCustomer?.id || m.customerId === foundCustomer?.customerCode;
            if (!matchesCust) return false;
            if (!cleanGroupParam) return true;
            const mId = String(m.groupId || '').toLowerCase();
            const mName = String(m.groupName || '').toLowerCase();
            return (
              mId === cleanGroupParam ||
              mName === cleanGroupParam ||
              mId.includes(cleanGroupParam) ||
              cleanGroupParam.includes(mId) ||
              mName.includes(cleanGroupParam) ||
              cleanGroupParam.includes(mName)
            );
          });
          if (memberFound) {
            matchedChit = {
              groupId: memberFound.groupId,
              groupName: memberFound.groupName,
              ticketNumber: memberFound.ticketNumber || '1',
              scheme: memberFound.scheme || (cleanGroupParam.includes('fix') ? 'Fixed' : cleanGroupParam.includes('auc') ? 'Auction' : 'Regular'),
              chitValue: memberFound.chitValue || 100000,
              monthlyInstallment: memberFound.monthlyInstallment || 5000,
              duration: memberFound.months || memberFound.duration || 20,
              joiningDate: memberFound.joiningDate || new Date().toISOString(),
              isWithdrawn: memberFound.isWithdrawn || false,
              withdrawnAmount: memberFound.withdrawnAmount || 0,
              withdrawnAt: memberFound.withdrawnAt || null,
              payoutRef: memberFound.payoutRef || memberFound.disbursedRef || null,
              paymentStatus: memberFound.paymentStatus || 'DUE'
            };
          }
        } catch { }
      }

      // Inferred scheme from groupParam or customer scheme if not already explicit
      const inferredScheme =
        cleanGroupParam.includes('fix')
          ? 'Fixed'
          : cleanGroupParam.includes('auc')
            ? 'Auction'
            : targetGroup?.scheme || targetGroup?.type || foundCustomer?.scheme || 'Regular';

      // Default fallback chit if none found
      if (!matchedChit) {
        matchedChit = {
          groupId: groupParam || targetGroup?.name || targetGroup?.code || 'FIXED-GROUP',
          groupName: targetGroup?.name || groupParam || 'Fixed Chit Plan',
          ticketNumber: '1',
          scheme: inferredScheme,
          chitValue: targetGroup?.value || 100000,
          monthlyInstallment: targetGroup?.customerChitAmount || 5000,
          duration: targetGroup?.duration || targetGroup?.months || 20,
          joiningDate: new Date().toISOString(),
          isWithdrawn: false,
          paymentStatus: 'DUE'
        };
      } else {
        // If matchedChit exists but its scheme is generic or contradicts a clearly named Fixed/Auction group
        if (cleanGroupParam.includes('fix') && !String(matchedChit.scheme).toUpperCase().includes('FIX')) {
          matchedChit.scheme = 'Fixed';
        } else if (cleanGroupParam.includes('auc') && !String(matchedChit.scheme).toUpperCase().includes('AUC')) {
          matchedChit.scheme = 'Auction';
        }
      }

      // 3. Build Schedule Summary
      const summary = buildCustomerChitSchedule({
        customer: foundCustomer,
        chit: matchedChit,
        group: targetGroup
      });

      setScheduleData(summary);
      if (summary.schedule.length > 0) {
        const nextDueRow = summary.schedule.find((r: DueInstallmentRow) => r.status !== 'PAID') || summary.schedule[0];
        setPayAmount(String(nextDueRow.revisedDue));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    const interval = setInterval(loadData, 4000);
    return () => {
      window.removeEventListener('storage', loadData);
      clearInterval(interval);
    };
  }, [customerIdParam, groupParam]);

  // Handle Cash or Direct Installment Payment Recording
  const handleRecordPayment = () => {
    if (!payAmount || Number(payAmount) <= 0 || !scheduleData) return;

    const amount = Number(payAmount);
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const nextReceiptNo = `REC-${Date.now().toString().slice(-6)}`;

    const newTxn = {
      id: nextReceiptNo,
      date: new Date().toISOString(),
      type: 'CREDIT',
      category: 'INSTALLMENT',
      amount: amount,
      reference: `${scheduleData.customerId} / ${scheduleData.groupId}`,
      description: `Installment Payment (${payMode}${payRef ? ` Ref: ${payRef}` : ''})`,
      customerName: scheduleData.customerName,
      customerId: scheduleData.customerId,
      groupId: scheduleData.groupId,
      paymentMode: payMode,
      referenceNo: payRef,
      status: 'VERIFIED',
      collectedBy: user?.name || 'Staff User'
    };

    localStorage.setItem('ledgerTransactions', JSON.stringify([newTxn, ...ledger]));

    // Also update customer and membership status
    const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const updatedCustomers = customers.map((c: any) => {
      if (c.id === scheduleData.customerId || c.customerCode === scheduleData.customerId || c.mongoId === scheduleData.customerId) {
        return {
          ...c,
          totalPaid: (Number(c.totalPaid) || 0) + amount,
          pending: Math.max(0, (Number(c.pending) || 0) - amount)
        };
      }
      return c;
    });
    localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));

    window.dispatchEvent(new Event('storage'));
    setIsPayModalOpen(false);
    setPayRef('');
    loadData();
  };

  const handlePrintSlip = (row: any) => {
    if (!scheduleData) return;
    if (row.status !== 'PAID' && !(row.amountPaid && row.amountPaid > 0)) {
      alert('Receipt cannot be generated because payment has not been completed for this month.');
      return;
    }
    printCashReceipt({
      receiptNo: row.receiptNo || `REC-M${row.monthNumber}-${scheduleData.ticketNumber}`,
      date: row.paidOn || new Date().toISOString().split('T')[0],
      customerName: scheduleData.customerName,
      customerId: scheduleData.customerId,
      customerMobile: scheduleData.mobile,
      groupName: scheduleData.groupName || scheduleData.groupId,
      ticketNumber: scheduleData.ticketNumber,
      paymentMode: row.paymentMode || 'CASH',
      amount: row.amountPaid || row.revisedDue,
      description: `Month ${row.monthNumber} (${row.monthName}) Chit Installment Payment Receipt`,
      referenceNo: row.referenceNo || row.receiptNo || 'Official Record',
      collectedBy: user?.name || 'Jenista Chit Funds'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500">Generating Installment Pre-Chart...</span>
        </div>
      </div>
    );
  }

  if (!scheduleData) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-base">Schedule Not Available</h3>
        <p className="text-xs text-slate-500 mt-1">Could not load the dues schedule for this customer and group.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 bg-[#9a6d25] text-white text-xs font-bold rounded-xl"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto animate-in fade-in duration-200">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {scheduleData.customerName}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fef5e6] text-[#8c601c] border border-[#edd7b6]">
                {scheduleData.groupId} (Ticket #{scheduleData.ticketNumber})
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                scheduleData.scheme === 'Fixed'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : scheduleData.scheme === 'Auction'
                    ? 'bg-purple-50 text-purple-800 border border-purple-200'
                    : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {scheduleData.scheme} Scheme ({scheduleData.totalDurationMonths}M)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Customer ID: <strong className="font-mono text-slate-700">{scheduleData.customerId}</strong></span>
              <span>•</span>
              <span>Mobile: <strong className="font-mono text-slate-700">{scheduleData.mobile}</strong></span>
              <span>•</span>
              <span>Due Date: <strong>Every {scheduleData.dueDayOfMonth}th</strong> of the month</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Receive Payment / Bill Paid Entry */}
          <button
            onClick={() => setIsPayModalOpen(true)}
            className="px-4 py-2 bg-[#9a6d25] hover:bg-[#855c1b] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            title="Record received installment payment and entry bill paid"
          >
            <CreditCard className="w-4 h-4" />
            <span>Receive Payment</span>
          </button>

          {/* Full Customer Profile Navigation (for Admin/Staff if needed) */}
          {isStaffOrAdmin && (
            <Link
              to={`/admin/customers/${scheduleData.customerId}?chitGroup=${encodeURIComponent(scheduleData.groupId)}`}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs inline-flex items-center gap-1 transition-colors"
              title="View full customer KYC & documents"
            >
              <span>Full Profile</span>
              <span className="text-[10px]">&rarr;</span>
            </Link>
          )}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monthly Due & Next Date */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Due Amount</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatCurrency(
              scheduleData.schedule.find((r: DueInstallmentRow) => r.status !== 'PAID')?.revisedDue || 
              (scheduleData.chitValue / scheduleData.totalDurationMonths)
            )}
          </div>
          <div className="text-xs font-semibold text-amber-700 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Next Due: {scheduleData.schedule.find((r: DueInstallmentRow) => r.status !== 'PAID')?.dueDate || `Every ${scheduleData.dueDayOfMonth}th`}</span>
          </div>
        </div>

        {/* Card 2: Total Paid Amount */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Amount Paid</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatCurrency(scheduleData.totalPaidAmount)}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            <span>{scheduleData.completedMonthsCount} of {scheduleData.totalDurationMonths} Months Cleared</span>
          </div>
        </div>

        {/* Card 3: Remaining Balance Due */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Remaining Balance</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            {formatCurrency(scheduleData.remainingBalanceDue)}
          </div>
          <div className="text-xs font-medium text-slate-500 mt-1">
            <span>Total Expected: {formatCurrency(scheduleData.totalDueAmount)}</span>
          </div>
        </div>

        {/* Card 4: Eligible Prize Amount & Withdrawal Status */}
        <div className={`p-5 rounded-2xl border shadow-2xs relative overflow-hidden ${
          scheduleData.isWithdrawn 
            ? 'bg-emerald-50/70 border-emerald-200' 
            : 'bg-purple-50/70 border-purple-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              {scheduleData.isWithdrawn ? 'Prize Withdrawn' : 'Eligible Prize Amount'}
            </span>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              scheduleData.isWithdrawn ? 'bg-emerald-200 text-emerald-800' : 'bg-purple-200 text-purple-800'
            }`}>
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${
            scheduleData.isWithdrawn ? 'text-emerald-800' : 'text-purple-900'
          }`}>
            {formatCurrency(
              scheduleData.isWithdrawn 
                ? (scheduleData.withdrawnAmount || Math.round(scheduleData.chitValue * 0.95)) 
                : scheduleData.currentEligiblePrizeAmount
            )}
          </div>
          <div className="text-xs font-semibold mt-1">
            {scheduleData.isWithdrawn ? (
              <span className="text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed (Post-draw dues active)
              </span>
            ) : (
              <span className="text-purple-800">
                Month {scheduleData.currentDueMonthIndex} Draw Value Available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Scheme Calculation Notice Banner */}
      <div className="bg-[#fdf9ee] border border-[#f5e6c4] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
        <div className="flex items-start gap-2.5">
          <TrendingUp className="w-4 h-4 text-[#8c601c] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-900">
              Scheme Pre-Chart Dynamics ({scheduleData.scheme} Chit Plan):
            </p>
            <p className="text-slate-600 mt-0.5 leading-relaxed">
              {scheduleData.scheme === 'Fixed' ? (
                scheduleData.isWithdrawn
                  ? 'Customer has withdrawn prize money. Post-draw monthly fee (+1% of chit value) is automatically added to all future dues.'
                  : 'Installments are due on the 15th. Payout increases by 1% for every month not claimed (Month 1: 95% → Month 20: 114%).'
              ) : scheduleData.scheme === 'Auction' ? (
                scheduleData.isWithdrawn
                  ? 'Customer has won the auction and claimed prize money. Standard gross installment is due without dividend relief.'
                  : 'Monthly installment reflects the dividend deduction computed from the monthly reverse auction discount.'
              ) : (
                scheduleData.isWithdrawn
                  ? 'Prize money disbursed. Post-disbursal fee (+1% of chit value) is added to the monthly installment dues.'
                  : 'Standard 20-month regular chit brochure terms apply. Installments due on the 15th of each month.'
              )}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="inline-block px-3 py-1 bg-white border border-[#edd7b6] text-[#8c601c] font-black rounded-lg text-xs">
            Chit Pool: {formatCurrency(scheduleData.chitValue)}
          </span>
        </div>
      </div>

      {/* Complete Month-by-Month Pre-Chart Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#9a6d25]" />
              <span>Full 20-Month Installment & Due Pre-Chart</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Autocalculated schedule showing monthly dues, due dates, paid on dates, payment status, and prize values
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {scheduleData.completedMonthsCount} of {scheduleData.totalDurationMonths} Paid
            </span>
            <div className="w-28 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, (scheduleData.completedMonthsCount / scheduleData.totalDurationMonths) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 uppercase font-black text-[10px] tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Month #</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-right">Due Amount</th>
                <th className="py-3 px-4 text-right">Eligible Prize Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Amount Paid</th>
                <th className="py-3 px-4">Paid On</th>
                <th className="py-3 px-4">Mode / Ref</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduleData.schedule.map((row: DueInstallmentRow) => {
                const isPaid = row.status === 'PAID';
                const isPartial = row.status === 'PARTIALLY_PAID';
                const isOverdue = row.status === 'OVERDUE';
                const isNextDue = !isPaid && row.monthNumber === scheduleData.currentDueMonthIndex;

                return (
                  <tr 
                    key={row.monthNumber} 
                    className={`transition-colors ${
                      isNextDue 
                        ? 'bg-amber-50/50 hover:bg-amber-50' 
                        : isPaid 
                          ? 'hover:bg-slate-50/60' 
                          : 'hover:bg-slate-50/40'
                    }`}
                  >
                    {/* Month # */}
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center">
                          {row.monthNumber}
                        </span>
                        <span>{row.monthName}</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{row.dueDate}</span>
                      </div>
                    </td>

                    {/* Due Amount */}
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      <span className="text-sm">{formatCurrency(row.revisedDue)}</span>
                    </td>

                    {/* Eligible Prize Value */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-purple-900">
                      {scheduleData.isWithdrawn ? (
                        <span className="text-[11px] text-slate-400 italic">Disbursed</span>
                      ) : (
                        formatCurrency(row.eligiblePayout)
                      )}
                    </td>

                    {/* Payment Status Badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isPaid && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> PAID
                        </span>
                      )}
                      {isPartial && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 mr-1" /> PARTIAL
                        </span>
                      )}
                      {isOverdue && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <AlertCircle className="w-3 h-3 mr-1" /> OVERDUE
                        </span>
                      )}
                      {!isPaid && !isPartial && !isOverdue && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          DUE
                        </span>
                      )}
                    </td>

                    {/* Amount Paid */}
                    <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                      <span className={row.amountPaid > 0 ? 'text-emerald-700' : 'text-slate-400'}>
                        {row.amountPaid > 0 ? formatCurrency(row.amountPaid) : '—'}
                      </span>
                    </td>

                    {/* Paid On */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {row.paidOn || '—'}
                    </td>

                    {/* Mode / Ref */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {row.paymentMode ? (
                        <div>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            {row.paymentMode}
                          </span>
                          {row.receiptNo && (
                            <span className="block font-mono text-[10px] text-slate-400 mt-0.5">
                              {row.receiptNo}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Receipt Print */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isPaid || (row.amountPaid && row.amountPaid > 0) ? (
                        <button
                          onClick={() => handlePrintSlip(row)}
                          className="p-1.5 rounded-lg border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 transition-all shadow-2xs active:scale-95"
                          title="Print Payment Receipt Voucher"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-slate-300 text-xs font-semibold" title="No payment completed">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Quick Receive Payment (Admin & Staff) */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Installment Payment</h3>
                <p className="text-xs text-slate-500">
                  Customer: <strong>{scheduleData.customerName}</strong> ({scheduleData.groupId})
                </p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount..."
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Payment will automatically be credited to the earliest pending month dues.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Mode *
                </label>
                <select
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9a6d25] bg-white"
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reference No / UTR / Remarks
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                  placeholder="e.g. UTR102938491 or Cash received at counter"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRecordPayment}
                  disabled={!payAmount || Number(payAmount) <= 0}
                  className="px-4 py-2 bg-[#9a6d25] hover:bg-[#855c1b] text-white font-bold rounded-xl shadow-xs disabled:opacity-50"
                >
                  Save & Update Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
