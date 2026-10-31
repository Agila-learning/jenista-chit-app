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
  Wallet,
  Users,
  QrCode,
  Landmark,
  Copy,
  Check,
  Lock,
  Upload,
  Info,
  Pencil,
  Trash2
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
import { resolveBankForPayment, generateUpiQrBadge, getStoredBankAccounts } from '../../../utils/bankAccountsData';
import { savePaymentRequest } from '../../../utils/paymentRequestsData';

export const CustomerChitScheduleScreen = () => {
  const { id: customerIdParam } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const groupParam = searchParams.get('group') || searchParams.get('groupId') || searchParams.get('chitGroup') || '';
  const [scheduleData, setScheduleData] = useState<CustomerChitScheduleSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Payment Modal state
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedMonthForPay, setSelectedMonthForPay] = useState<DueInstallmentRow | null>(null);
  const [selectedMonthNumber, setSelectedMonthNumber] = useState(1);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
  const [paymentDateTime, setPaymentDateTime] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [payScreenshot, setPayScreenshot] = useState('');
  const [screenshotName, setScreenshotName] = useState('');
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [chitGroups, setChitGroups] = useState<any[]>([]);

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
        setChitGroups(groups);
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

  const getGroupDetails = (groupId?: string, groupName?: string) => {
    const cleanId = String(groupId || '').toLowerCase();
    const cleanName = String(groupName || '').toLowerCase();
    const g = chitGroups.find((grp: any) => {
      const gId = String(grp.id || '').toLowerCase();
      const gCode = String(grp.code || '').toLowerCase();
      const gName = String(grp.name || '').toLowerCase();
      return (
        (cleanId && (gId === cleanId || gCode === cleanId || gName === cleanId)) ||
        (cleanName && (gName === cleanName || gId === cleanName || gCode === cleanName))
      );
    });
    const totalMembers = Number(g?.totalMembers || g?.members || g?.duration || g?.months || 20);
    const directEnrolled = Array.isArray(g?.enrolledMembers) ? g.enrolledMembers.length : 0;
    const filledCount = Number(g?.filled || directEnrolled || 0);
    const enrolledCount = Math.max(directEnrolled, filledCount);
    return {
      group: g,
      totalMembers,
      enrolledCount: enrolledCount > 0 ? enrolledCount : totalMembers
    };
  };

  const handleOpenPayForMonth = (row: DueInstallmentRow) => {
    setIsEditMode(false);
    setEditingTxnId(null);
    setSelectedMonthForPay(row);
    setSelectedMonthNumber(row.monthNumber);
    const remainingDue = row.revisedDue - (row.amountPaid || 0);
    setPayAmount(String(remainingDue > 0 ? remainingDue : row.revisedDue));
    setPayMode('UPI');
    setPayRef('');
    setPaymentDateTime(new Date().toISOString().slice(0, 16));
    setPayScreenshot('');
    setScreenshotName('');
    setPaySuccessMsg('');
    setIsPayModalOpen(true);
  };

  const handleOpenEditForMonth = (row: DueInstallmentRow) => {
    setIsEditMode(true);
    setEditingTxnId(row.transactionId || null);
    setSelectedMonthForPay(row);
    setSelectedMonthNumber(row.monthNumber);
    setPayAmount(String(row.amountPaid || row.revisedDue));
    setPayMode(row.paymentMode || 'Cash');
    setPayRef(row.referenceNo || '');
    setPaymentDateTime(row.paidOnIso ? row.paidOnIso.slice(0, 16) : new Date().toISOString().slice(0, 16));
    setPayScreenshot('');
    setScreenshotName('');
    setPaySuccessMsg('');
    setIsPayModalOpen(true);
  };

  const handleOpenCustomEntry = () => {
    setIsEditMode(false);
    setEditingTxnId(null);
    const firstUnpaid = scheduleData?.schedule.find(r => r.status !== 'PAID') || scheduleData?.schedule[0];
    const targetRow = firstUnpaid || null;
    setSelectedMonthForPay(targetRow);
    setSelectedMonthNumber(targetRow?.monthNumber || 1);
    setPayAmount(String(targetRow?.revisedDue || 5000));
    setPayMode('Cash');
    setPayRef('');
    setPaymentDateTime(new Date().toISOString().slice(0, 16));
    setPayScreenshot('');
    setScreenshotName('');
    setPaySuccessMsg('');
    setIsPayModalOpen(true);
  };

  const handleMonthChange = (monthNum: number) => {
    setSelectedMonthNumber(monthNum);
    if (!scheduleData) return;
    const targetRow = scheduleData.schedule.find(r => r.monthNumber === monthNum);
    if (targetRow) {
      setSelectedMonthForPay(targetRow);
      if (!isEditMode) {
        const remaining = targetRow.revisedDue - (targetRow.amountPaid || 0);
        setPayAmount(String(remaining > 0 ? remaining : targetRow.revisedDue));
      }
    }
  };

  const handleDeletePayment = () => {
    if (!editingTxnId && !selectedMonthForPay) return;
    const confirmMsg = `Are you sure you want to void / delete this payment record of ${formatCurrency(Number(payAmount) || 0)} for Month ${selectedMonthNumber}? This will revert the cleared status and restore dues.`;
    if (!window.confirm(confirmMsg)) return;

    const ledger: any[] = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    let removedAmount = Number(payAmount) || 0;
    
    const updatedLedger = ledger.filter((t: any) => {
      if (editingTxnId && t.id === editingTxnId) {
        removedAmount = Number(t.amount) || removedAmount;
        return false;
      }
      const matchesCust = t.customerId === scheduleData?.customerId;
      const matchesGroup = t.groupId === scheduleData?.groupId;
      const matchesMonth = t.monthNumber === selectedMonthNumber || (t.description && t.description.toLowerCase().includes(`month ${selectedMonthNumber}`));
      if (matchesCust && matchesGroup && matchesMonth) {
        removedAmount = Number(t.amount) || removedAmount;
        return false;
      }
      return true;
    });

    localStorage.setItem('ledgerTransactions', JSON.stringify(updatedLedger));

    if (scheduleData) {
      const customers: any[] = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updatedCustomers = customers.map((c: any) => {
        if (c.id === scheduleData.customerId || c.customerCode === scheduleData.customerId || c.mongoId === scheduleData.customerId) {
          return {
            ...c,
            totalPaid: Math.max(0, (Number(c.totalPaid) || 0) - removedAmount),
            pending: (Number(c.pending) || 0) + removedAmount
          };
        }
        return c;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));
    }

    window.dispatchEvent(new Event('storage'));
    setIsPayModalOpen(false);
    setSelectedMonthForPay(null);
    setIsEditMode(false);
    setEditingTxnId(null);
    loadData();
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPayScreenshot(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Cash or Direct Installment Payment Recording / Submission
  const handleRecordPayment = async () => {
    if (!payAmount || Number(payAmount) <= 0 || !scheduleData) return;

    const amount = Number(payAmount);
    const isCustomerUser = user?.role === 'CUSTOMER';
    const assignedBankResult = resolveBankForPayment(scheduleData.customerId, scheduleData.groupId, scheduleData.groupName);
    const b = assignedBankResult.bank;

    if (isCustomerUser) {
      const newReq = {
        id: `PAY-${Date.now().toString().slice(-6)}`,
        customerId: scheduleData.customerId,
        customerName: scheduleData.customerName,
        mobile: scheduleData.mobile || user?.phone || '',
        groupId: scheduleData.groupId,
        groupName: scheduleData.groupName || scheduleData.groupId,
        ticketNumber: scheduleData.ticketNumber || '',
        amount: amount,
        paymentMode: payMode,
        referenceNo: payMode === 'Cash' ? (payRef.trim() || `CASH-${Date.now().toString().slice(-6)}`) : payRef.trim(),
        bankAccountId: b?.id,
        bankName: b?.bankName,
        paymentScreenshot: payScreenshot || undefined,
        screenshotUrl: payScreenshot || undefined,
        submittedAt: paymentDateTime ? new Date(paymentDateTime).toISOString() : new Date().toISOString(),
        status: 'PENDING_VERIFICATION' as const,
        remarks: `[Month ${selectedMonthNumber} Installment] Paid via ${payMode} to ${b?.bankName || 'Company Bank'}`
      };

      await savePaymentRequest(newReq);
      setPaySuccessMsg('Payment submitted successfully! Admin will verify and update your receipt.');
      setTimeout(() => {
        setIsPayModalOpen(false);
        setSelectedMonthForPay(null);
        setPayRef('');
        setPayScreenshot('');
        setScreenshotName('');
        setPaySuccessMsg('');
        loadData();
      }, 2000);
      return;
    }

    // Admin or Staff direct recording / editing:
    const ledger: any[] = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const customers: any[] = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const txnIsoDate = paymentDateTime ? new Date(paymentDateTime).toISOString() : new Date().toISOString();

    if (isEditMode) {
      let oldAmount = 0;
      let txnFound = false;

      const updatedLedger = ledger.map((t: any) => {
        const isTarget = (editingTxnId && t.id === editingTxnId) ||
          (!editingTxnId && t.customerId === scheduleData.customerId && (t.monthNumber === selectedMonthNumber || t.description?.includes(`Month ${selectedMonthNumber}`)));
        
        if (isTarget && !txnFound) {
          txnFound = true;
          oldAmount = Number(t.amount) || 0;
          return {
            ...t,
            amount: amount,
            paymentMode: payMode,
            referenceNo: payRef,
            date: txnIsoDate,
            monthNumber: selectedMonthNumber,
            description: `Month ${selectedMonthNumber} Installment Payment (${payMode}${payRef ? ` Ref: ${payRef}` : ''})`,
            lastEditedAt: new Date().toISOString(),
            lastEditedBy: user?.name || 'Admin'
          };
        }
        return t;
      });

      if (!txnFound) {
        const newTxn = {
          id: `REC-${Date.now().toString().slice(-6)}`,
          date: txnIsoDate,
          type: 'CREDIT',
          category: 'INSTALLMENT',
          amount: amount,
          monthNumber: selectedMonthNumber,
          reference: `${scheduleData.customerId} / ${scheduleData.groupId}`,
          description: `Month ${selectedMonthNumber} Installment Payment (${payMode}${payRef ? ` Ref: ${payRef}` : ''})`,
          customerName: scheduleData.customerName,
          customerId: scheduleData.customerId,
          groupId: scheduleData.groupId,
          paymentMode: payMode,
          referenceNo: payRef,
          status: 'VERIFIED',
          collectedBy: user?.name || 'Staff User'
        };
        updatedLedger.unshift(newTxn);
      }

      localStorage.setItem('ledgerTransactions', JSON.stringify(updatedLedger));

      const amountDiff = amount - oldAmount;
      const updatedCustomers = customers.map((c: any) => {
        if (c.id === scheduleData.customerId || c.customerCode === scheduleData.customerId || c.mongoId === scheduleData.customerId) {
          return {
            ...c,
            totalPaid: Math.max(0, (Number(c.totalPaid) || 0) + amountDiff),
            pending: Math.max(0, (Number(c.pending) || 0) - amountDiff)
          };
        }
        return c;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));
    } else {
      const nextReceiptNo = `REC-${Date.now().toString().slice(-6)}`;
      const newTxn = {
        id: nextReceiptNo,
        date: txnIsoDate,
        type: 'CREDIT',
        category: 'INSTALLMENT',
        amount: amount,
        monthNumber: selectedMonthNumber,
        reference: `${scheduleData.customerId} / ${scheduleData.groupId}`,
        description: `Month ${selectedMonthNumber} Installment Payment (${payMode}${payRef ? ` Ref: ${payRef}` : ''})`,
        customerName: scheduleData.customerName,
        customerId: scheduleData.customerId,
        groupId: scheduleData.groupId,
        paymentMode: payMode,
        referenceNo: payRef,
        status: 'VERIFIED',
        collectedBy: user?.name || 'Staff User'
      };

      localStorage.setItem('ledgerTransactions', JSON.stringify([newTxn, ...ledger]));

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
    }

    window.dispatchEvent(new Event('storage'));
    setIsPayModalOpen(false);
    setSelectedMonthForPay(null);
    setIsEditMode(false);
    setEditingTxnId(null);
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
  const isCustomerView = user?.role === 'CUSTOMER' || !isStaffOrAdmin || window.location.pathname.startsWith('/customer/');

  return (
    <div className={`space-y-6 pb-12 max-w-7xl mx-auto animate-in fade-in duration-200 ${isCustomerView ? 'pt-0 px-4 sm:px-6' : ''}`}>
      
      {/* Customer Dedicated Portal Header (When accessed from Customer Dashboard / Customer Login) */}
      {isCustomerView && (
        <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-xs mb-6 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3.5 rounded-2xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="p-2 text-primary-900 hover:bg-neutral-100 rounded-xl transition-colors flex items-center gap-1.5 font-bold text-xs border border-neutral-200 shadow-2xs cursor-pointer"
                title="Return to Customer Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>My Dashboard</span>
              </button>
              <img src="/assets/Chit logo.jpg.jpeg" alt="Jenista Chits Logo" className="h-9 w-9 object-contain rounded-lg" />
              <div>
                <span className="font-extrabold text-base sm:text-lg text-primary-900 tracking-tight block leading-tight">Jenista Chits</span>
                <span className="text-[10px] text-amber-800 font-bold tracking-wider uppercase block">Customer Passbook & Full Pre-Chart</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-neutral-600 hidden sm:inline-block">
                Welcome, <strong className="text-neutral-900">{user?.name || scheduleData.customerName}</strong>
                <span className="font-mono text-primary-900 ml-1 font-bold">({user?.id || scheduleData.customerId})</span>
              </span>
              <button 
                onClick={logout}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              if (isCustomerView) {
                navigate('/customer/dashboard');
              } else {
                navigate(-1);
              }
            }}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            {(() => {
              const gDetails = getGroupDetails(scheduleData.groupId, scheduleData.groupName);
              return (
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {scheduleData.customerName}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fef5e6] text-[#8c601c] border border-[#edd7b6]">
                    Group: {scheduleData.groupName || scheduleData.groupId} (Ticket #{scheduleData.ticketNumber})
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    <span>Total Members: <strong>{gDetails.totalMembers}</strong></span>
                    <span className="text-amber-700/80 font-medium">({gDetails.enrolledCount} Enrolled)</span>
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
              );
            })()}
            <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2 flex-wrap">
              <span>Customer ID: <strong className="font-mono text-slate-700">{scheduleData.customerId}</strong></span>
              <span>•</span>
              <span>Mobile: <strong className="font-mono text-slate-700">{scheduleData.mobile}</strong></span>
              <span>•</span>
              <span>Due Date: <strong>Every {scheduleData.dueDayOfMonth}th</strong> of the month</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Receive Payment / Pay Online Entry */}
          <button
            onClick={() => {
              setSelectedMonthForPay(null);
              setIsPayModalOpen(true);
            }}
            className="px-4 py-2 bg-[#9a6d25] hover:bg-[#855c1b] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Record received installment payment or submit online payment proof"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isCustomerView ? 'Pay Online / Submit Proof' : 'Receive Payment'}</span>
          </button>

          {/* Full Customer Profile Navigation (Staff/Admin only) */}
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

      {/* Comprehensive Payment & Disbursal Interest Calculation Card */}
      {(() => {
        const chitVal = Number(scheduleData.chitValue || 100000);
        const duration = Number(scheduleData.totalDurationMonths || 20);
        const baseMonthlyDue = Math.round(chitVal / duration);
        const monthlyInterest = Math.round(chitVal * 0.01); // 1% per month post-disbursal fee/interest
        const postDrawMonthlyDue = baseMonthlyDue + monthlyInterest;

        const isDisbursed = Boolean(scheduleData.isWithdrawn);
        const disbursedAmount = Number(scheduleData.withdrawnAmount || Math.round(chitVal * 0.95));

        const totalPaid = Number(scheduleData.totalPaidAmount || 0);
        const totalPayableWithInterest = Number(scheduleData.totalDueAmount || 0);
        const remainingToPay = Number(scheduleData.remainingBalanceDue || 0);
        const completedMonths = Number(scheduleData.completedMonthsCount || 0);
        const remainingMonths = Math.max(0, duration - completedMonths);

        return (
          <div className="bg-gradient-to-br from-amber-50/60 via-white to-slate-50/70 p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-amber-200/60">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl shrink-0 ${isDisbursed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                    <span>{isDisbursed ? 'Prize Disbursed & Repayment Calculation (With Interest)' : 'Prize Disbursal & Installment Repayment Structure'}</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {isDisbursed 
                      ? 'Prize money has been disbursed. Post-draw monthly repayments reflect 1% monthly interest/charge.'
                      : 'Transparent chit fund breakdown of price disbursed, interest rates, and dues.'}
                  </p>
                </div>
              </div>

              <div>
                {isDisbursed ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Disbursed ✓
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    Eligible for Disbursal
                  </span>
                )}
              </div>
            </div>

            {/* 5 Key Metric Financial Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Tile 1: Disbursed Amount */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {isDisbursed ? 'Price Disbursed' : 'Net Prize on Disbursal'}
                </span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(disbursedAmount)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  {isDisbursed ? 'Disbursed to Member' : '95% Pool (5% foreman fee)'}
                </span>
              </div>

              {/* Tile 2: Monthly Due with Interest */}
              <div className={`p-3.5 rounded-xl border shadow-2xs ${isDisbursed ? 'bg-amber-50/70 border-amber-300' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                  {isDisbursed ? 'Monthly Due (With Interest)' : 'Post-Draw Monthly Due'}
                </span>
                <p className={`text-lg font-black mt-0.5 ${isDisbursed ? 'text-amber-900' : 'text-slate-900'}`}>
                  {formatCurrency(postDrawMonthlyDue)} <span className="text-[10px] font-normal text-slate-500">/mo</span>
                </p>
                <span className="text-[10px] text-amber-800 font-semibold block truncate" title={`${formatCurrency(baseMonthlyDue)} base + ${formatCurrency(monthlyInterest)} (1% interest)`}>
                  {formatCurrency(baseMonthlyDue)} base + {formatCurrency(monthlyInterest)} (1% fee)
                </span>
              </div>

              {/* Tile 3: Total Payable With Interest */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Total Payable (With Interest)
                </span>
                <p className="text-lg font-black text-slate-900 mt-0.5">
                  {formatCurrency(totalPayableWithInterest)}
                </p>
                <span className="text-[10px] text-slate-400 font-medium">
                  Across {duration} Months
                </span>
              </div>

              {/* Tile 4: Total Amount Paid */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Total Amount Paid
                </span>
                <p className="text-lg font-black text-emerald-700 mt-0.5">
                  {formatCurrency(totalPaid)}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  {completedMonths} of {duration} Months Cleared
                </span>
              </div>

              {/* Tile 5: Remaining Balance to Pay */}
              <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Remaining Balance
                </span>
                <p className="text-lg font-black text-rose-700 mt-0.5">
                  {formatCurrency(remainingToPay)}
                </p>
                <span className="text-[10px] text-rose-600 font-medium">
                  {remainingMonths} Installments Left
                </span>
              </div>
            </div>

            {/* Explanatory Note */}
            <div className="bg-white/95 p-3 rounded-xl border border-amber-200/80 text-xs text-slate-700 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Financial Calculation Details: </strong>
                {isDisbursed ? (
                  <span>
                    Prize money of <strong className="text-slate-900 font-bold">{formatCurrency(disbursedAmount)}</strong> has been disbursed. 
                    Under chit terms, post-disbursal monthly installment is <strong className="text-slate-900 font-bold">{formatCurrency(postDrawMonthlyDue)}</strong>, 
                    comprising the base monthly installment of <strong className="text-slate-800">{formatCurrency(baseMonthlyDue)}</strong> plus 1% post-draw interest/fee of <strong className="text-slate-800">{formatCurrency(monthlyInterest)}</strong>. 
                    You have paid <strong className="text-emerald-700 font-bold">{formatCurrency(totalPaid)}</strong> ({completedMonths} months cleared), 
                    with a remaining balance of <strong className="text-rose-700 font-bold">{formatCurrency(remainingToPay)}</strong> over {remainingMonths} remaining months.
                  </span>
                ) : (
                  <span>
                    Net prize pool available on withdrawal is <strong className="text-slate-900 font-bold">{formatCurrency(disbursedAmount)}</strong> (95% of {formatCurrency(chitVal)} chit value after 5% foreman commission). 
                    Your pre-draw installment is <strong className="text-slate-900 font-bold">{formatCurrency(baseMonthlyDue)}/month</strong>. 
                    When you claim and disburse your prize, a standard 1% monthly interest/charge (<strong className="text-slate-800">{formatCurrency(monthlyInterest)}/mo</strong>) will be added to future monthly dues (<strong className="text-slate-900">{formatCurrency(postDrawMonthlyDue)}/mo</strong>).
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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

          <div className="flex items-center gap-2.5 flex-wrap">
            {isStaffOrAdmin && (
              <button
                type="button"
                onClick={handleOpenCustomEntry}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                title="Record or customize cash/UPI payments for past months and years"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>+ Custom / Past Month Payment</span>
              </button>
            )}
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
                <th className="py-3 px-4">Paid On & Time</th>
                <th className="py-3 px-4">Mode / Ref</th>
                <th className="py-3 px-4 text-center">Action / Receipt</th>
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-[11px] flex items-center justify-center">
                          {row.monthNumber}
                        </span>
                        <span>{row.monthName}</span>
                        {row.isDisbursalMonth && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            Disbursed Month
                          </span>
                        )}
                        {row.isPostDisbursalMonth && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Extra 1% monthly fee added after prize disbursal">
                            +1% Fee Active
                          </span>
                        )}
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
                      {row.isPostDisbursalMonth && (
                        <span className="block text-[10px] text-amber-800 font-semibold">(+1% post-draw fee)</span>
                      )}
                    </td>

                    {/* Eligible Prize Value */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-bold text-purple-900">
                      {scheduleData.isWithdrawn ? (
                        <span className="text-[11px] text-slate-400 italic">Disbursed</span>
                      ) : row.isCompanyMonth ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300" title="First month is allocated to company (members cannot withdraw)">
                          COMPANY
                        </span>
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

                    {/* Paid On & Exact Time */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {row.paidOn ? (
                        <div>
                          <div className="text-xs font-bold text-slate-800">{row.paidDateOnly || row.paidOn}</div>
                          {row.paidTimeOnly && (
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              <span>{row.paidTimeOnly}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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

                    {/* Action / Receipt */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {isPaid && (
                          <>
                            <button
                              onClick={() => handlePrintSlip(row)}
                              className="p-1.5 rounded-lg border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 transition-all shadow-2xs active:scale-95 inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              title="Print Payment Receipt Voucher"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                            {isStaffOrAdmin && (
                              <button
                                onClick={() => handleOpenEditForMonth(row)}
                                className="p-1.5 rounded-lg border bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 transition-all shadow-2xs active:scale-95 inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title="Edit Cash / UPI Amount & Payment Details"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>
                            )}
                          </>
                        )}

                        {isPartial && (
                          <>
                            <button
                              onClick={() => handlePrintSlip(row)}
                              className="p-1.5 rounded-lg border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 transition-all shadow-2xs active:scale-95 inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                              title="Print Partial Payment Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt</span>
                            </button>
                            {isStaffOrAdmin && (
                              <button
                                onClick={() => handleOpenEditForMonth(row)}
                                className="p-1.5 rounded-lg border bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 transition-all shadow-2xs active:scale-95 inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title="Edit Partial Payment Amount / Details"
                              >
                                <Pencil className="w-3.5 h-3.5 text-amber-700" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenPayForMonth(row)}
                              className="px-2.5 py-1.5 rounded-lg bg-linear-to-r from-amber-600 to-[#9a6d25] hover:from-amber-700 hover:to-[#855c1b] text-white text-[11px] font-bold shadow-xs inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                              title={`Pay Remaining Due (${formatCurrency(row.revisedDue - (row.amountPaid || 0))})`}
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>Pay Due</span>
                            </button>
                          </>
                        )}

                        {!isPaid && !isPartial && (
                          <button
                            onClick={() => handleOpenPayForMonth(row)}
                            className="px-3 py-1.5 rounded-lg bg-linear-to-r from-amber-600 to-[#9a6d25] hover:from-amber-700 hover:to-[#855c1b] text-white text-[11px] font-bold shadow-xs inline-flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                            title={`Pay Month ${row.monthNumber} Installment (${formatCurrency(row.revisedDue)})`}
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pay Now</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Installment Payment with Admin Bank Details & QR Code */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#1f1a14] text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {isEditMode ? <Pencil className="w-4 h-4 text-amber-400" /> : <CreditCard className="w-4 h-4 text-amber-400" />}
                  <span>
                    {isEditMode
                      ? `Edit Month ${selectedMonthNumber} Payment Record`
                      : selectedMonthForPay
                      ? `Pay Month ${selectedMonthForPay.monthNumber} (${selectedMonthForPay.monthName}) Installment`
                      : `Record Installment Payment - Month ${selectedMonthNumber}`}
                  </span>
                </h3>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Customer: <strong>{scheduleData.customerName}</strong> · Group: <strong>{scheduleData.groupName || scheduleData.groupId}</strong>
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsPayModalOpen(false);
                  setSelectedMonthForPay(null);
                  setIsEditMode(false);
                  setEditingTxnId(null);
                }} 
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {paySuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-slate-800">Payment Submitted!</h4>
                <p className="text-sm text-slate-600">{paySuccessMsg}</p>
              </div>
            ) : (
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
                {/* Due Amount Highlight Banner */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                      {isEditMode 
                        ? `Editing Payment for Month ${selectedMonthNumber}`
                        : selectedMonthForPay
                        ? `Month ${selectedMonthForPay.monthNumber} Due Amount (with interest)`
                        : 'Installment Payable Amount'}
                    </p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">
                      {formatCurrency(Number(payAmount) || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                      {selectedMonthForPay ? `Due: ${selectedMonthForPay.dueDate}` : 'Immediate Due'}
                    </span>
                  </div>
                </div>

                {/* Chit Installment Month Selection for Historical / Past Year Payments */}
                {isStaffOrAdmin && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#9a6d25]" />
                      <span>Chit Installment Month Period *</span>
                    </label>
                    <select
                      value={selectedMonthNumber}
                      onChange={(e) => handleMonthChange(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                    >
                      {scheduleData.schedule.map((m) => (
                        <option key={m.monthNumber} value={m.monthNumber}>
                          Month {m.monthNumber} ({m.monthName}) — Due: {formatCurrency(m.revisedDue)} {m.status === 'PAID' ? '(PAID ✓)' : m.status === 'PARTIALLY_PAID' ? '(PARTIALLY PAID)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Choose which historical or current installment period this transaction applies to.
                    </p>
                  </div>
                )}

                {/* Payment Date & Time Input (Custom past years/months & exact record creation time) */}
                {isStaffOrAdmin && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#9a6d25]" />
                      <span>Payment Date & Time (Record Creation Timestamp) *</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={paymentDateTime}
                      onChange={(e) => setPaymentDateTime(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Exact date and time stamp. You can select past years (e.g. 2024, 2025) or previous months to add backdated records.
                    </p>
                  </div>
                )}

                {/* Amount to Pay */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      Amount Payable (₹) *
                    </label>
                    {!isStaffOrAdmin && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-amber-800" /> Fixed Due Amount
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    readOnly={!isStaffOrAdmin}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none transition-colors ${
                      !isStaffOrAdmin 
                        ? 'bg-slate-100 text-slate-800 border-slate-300 cursor-not-allowed select-none' 
                        : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-[#9a6d25]'
                    }`}
                    value={payAmount}
                    onChange={(e) => {
                      if (isStaffOrAdmin) {
                        setPayAmount(e.target.value);
                      }
                    }}
                    placeholder="Enter amount..."
                  />
                  {!isStaffOrAdmin && (
                    <div className="mt-1.5 p-2 bg-amber-50/70 border border-amber-200/80 rounded-lg text-[11px] text-amber-950 space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-amber-800">Base Installment Due:</span>
                        <span className="font-bold">
                          {formatCurrency(selectedMonthForPay?.grossDue || Math.round((scheduleData?.chitValue || 100000) / (scheduleData?.totalDurationMonths || 20)))}
                        </span>
                      </div>
                      {selectedMonthForPay?.isPostDisbursalMonth && (
                        <div className="flex justify-between text-purple-900">
                          <span>Post-Draw Prize Fee (+1%):</span>
                          <span className="font-bold">+{formatCurrency(Math.round((scheduleData?.chitValue || 100000) * 0.01))}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-slate-500 pt-1 border-t border-amber-200/50">
                        🔒 Note: Amount is strictly fixed by the system to match your official due schedule. Partial payments cannot be submitted.
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Payment Mode *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['UPI', 'Bank Transfer', 'Cash'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPayMode(mode)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                          payMode === mode
                            ? 'bg-[#9a6d25] text-white border-[#9a6d25] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {mode === 'UPI' && 'UPI / QR'}
                        {mode === 'Bank Transfer' && 'Bank Transfer'}
                        {mode === 'Cash' && 'Cash'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Admin Designated Company Bank Details & QR Code */}
                {(() => {
                  const activeCompanyBanks = getStoredBankAccounts().filter(b => b.status === 'ACTIVE');
                  const assignedBankResult = resolveBankForPayment(scheduleData.customerId, scheduleData.groupId, scheduleData.groupName);
                  const b = assignedBankResult.bank || activeCompanyBanks[0];

                  if (!b) return null;

                  return (
                    <div className="space-y-3">
                      {/* Fixed & Read-only Designated Bank Account */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-[#9a6d25]" />
                            <span>Receiving Bank Account</span>
                          </label>
                          <span className="text-[10px] text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-800" /> Admin Assigned
                          </span>
                        </div>
                        <div className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-[#9a6d25] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {b.bankName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {b.bankName} <span className="font-mono text-slate-500 font-medium">(A/C •••• {b.accountNumber.slice(-4)})</span>
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {b.accountHolderName} · {b.accountType} A/C
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-md shrink-0 ml-2">
                            Locked
                          </span>
                        </div>
                      </div>

                      {/* UPI QR Code Block */}
                      {payMode === 'UPI' && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <QrCode className="w-4 h-4 text-amber-700" /> Scan UPI QR or Pay to UPI ID
                            </span>
                            <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                              {b.bankName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-24 h-24 bg-white p-1 rounded-lg border border-amber-200 shrink-0 shadow-2xs">
                              <img 
                                src={b.qrCodeUrl || generateUpiQrBadge(b.upiId, b.accountHolderName, Number(payAmount) || undefined)} 
                                alt="UPI QR" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="overflow-hidden flex-1 space-y-1.5">
                              <p className="text-[11px] font-bold text-slate-800">{b.accountHolderName}</p>
                              <div className="flex items-center justify-between bg-white px-2.5 py-1 rounded-md border border-amber-200">
                                <span className="font-mono text-xs font-bold text-amber-950 truncate">{b.upiId}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.upiId);
                                    setCopiedKey('modal-upi');
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  className="text-amber-800 hover:text-amber-950 p-1 rounded transition-colors shrink-0"
                                  title="Copy UPI ID"
                                >
                                  {copiedKey === 'modal-upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <p className="text-[10px] text-amber-800">
                                Scan using GPay, PhonePe, Paytm, or BHIM UPI app.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bank Transfer Details Block */}
                      {payMode === 'Bank Transfer' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Landmark className="w-4 h-4 text-[#9a6d25]" /> Designated Bank Transfer Details
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                              {b.bankName}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">Account Number</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-mono font-bold text-slate-900 text-[11px] truncate">{b.accountNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.accountNumber);
                                    setCopiedKey('modal-acc');
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors shrink-0"
                                  title="Copy Account Number"
                                >
                                  {copiedKey === 'modal-acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div className="bg-white p-2 rounded-lg border border-slate-200">
                              <span className="text-[10px] text-slate-500 uppercase font-bold block">IFSC Code</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-mono font-bold text-slate-900 text-[11px]">{b.ifscCode}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.ifscCode);
                                    setCopiedKey('modal-ifsc');
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors shrink-0"
                                  title="Copy IFSC"
                                >
                                  {copiedKey === 'modal-ifsc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-[10px] text-slate-500 pt-1 space-y-0.5">
                            <p><strong>Beneficiary:</strong> {b.accountHolderName}</p>
                            <p><strong>Branch:</strong> {b.branch || 'Main Branch'} · {b.accountType} Account</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Reference Number / UTR */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    {payMode === 'Cash' ? 'Cash Receipt / Officer Notes' : 'Transaction Reference / UTR Number *'}
                  </label>
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9a6d25]"
                    placeholder={payMode === 'Cash' ? 'e.g. Received at counter by branch manager' : 'e.g. 12-digit UTR: 429182749102'}
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                  />
                </div>

                {/* Screenshot Upload for Online / UPI / Bank Transfer */}
                {payMode !== 'Cash' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Upload Payment Proof Screenshot (Optional)
                    </label>
                    <div className="border border-dashed border-slate-300 hover:border-[#9a6d25] rounded-xl p-3 bg-slate-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        id="modal-proof-upload"
                        onChange={handleScreenshotUpload}
                        className="hidden"
                      />
                      <label 
                        htmlFor="modal-proof-upload"
                        className="flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-[#9a6d25] hover:text-[#7d561a]"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{screenshotName ? `Selected: ${screenshotName}` : 'Click to select screenshot (Max 5MB)'}</span>
                      </label>
                      {payScreenshot && (
                        <div className="mt-2 text-center">
                          <img 
                            src={payScreenshot} 
                            alt="Payment Proof" 
                            className="max-h-24 mx-auto rounded-lg border border-slate-200 object-contain shadow-2xs" 
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                  {isEditMode && isStaffOrAdmin ? (
                    <button
                      type="button"
                      onClick={handleDeletePayment}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Void and delete this payment record"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Void / Delete</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPayModalOpen(false);
                        setSelectedMonthForPay(null);
                        setIsEditMode(false);
                        setEditingTxnId(null);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRecordPayment}
                      disabled={!payAmount || Number(payAmount) <= 0}
                      className="px-5 py-2 bg-[#9a6d25] hover:bg-[#855c1b] text-white font-bold rounded-xl text-xs shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isEditMode 
                          ? 'Update Payment Record' 
                          : user?.role === 'CUSTOMER' 
                          ? 'Submit Payment Proof' 
                          : 'Save & Update Chart'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
