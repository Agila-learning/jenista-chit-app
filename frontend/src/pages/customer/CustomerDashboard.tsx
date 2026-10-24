import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, CreditCard, TrendingUp, Bell, History, Calendar, ArrowRight, Copy, Table, Gavel, Award, Building2, Wallet, CheckCircle2, Upload, Printer, X, Search, FileText, Landmark, QrCode, Check, Lock } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import { printCashReceipt } from '../../utils/receiptPrinter';
import { useAuth } from '../../store/AuthContext';
import { fetchClient } from '../../api/client';
import { FixedPlanSchedule } from '../../components/customer/FixedPlanSchedule';
import { AuctionPlanSchedule } from '../../components/customer/AuctionPlanSchedule';
import { RegularPlanSchedule } from '../../components/customer/RegularPlanSchedule';
import { resolveBankForPayment, generateUpiQrBadge, getStoredBankAccounts, type BankAccount } from '../../utils/bankAccountsData';
import { isMockGroup } from '../../utils/cleanMockData';
import { savePaymentRequest, onPaymentSync, syncPaymentRequestsWithBackend, type PaymentRequest } from '../../utils/paymentRequestsData';

export const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'myChits' | 'regularPlanChart' | 'fixedPlanChart' | 'auctionPlanChart'>('myChits');
  const [activeChits, setActiveChits] = useState(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [myChits, setMyChits] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Payment states
  const [paymentModalChit, setPaymentModalChit] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<'UPI' | 'Bank Transfer' | 'Cash'>('UPI');
  const [payRefNo, setPayRefNo] = useState<string>('');
  const [payScreenshot, setPayScreenshot] = useState<string>('');
  const [screenshotFileName, setScreenshotFileName] = useState<string>('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState('');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // Company Banks Modal / QR Preview
  const [enlargedQrBank, setEnlargedQrBank] = useState<BankAccount | null>(null);

  // Withdrawal States
  const [withdrawModalChit, setWithdrawModalChit] = useState<any | null>(null);
  const [withdrawPayoutMethod, setWithdrawPayoutMethod] = useState<'Bank Transfer' | 'UPI'>('Bank Transfer');
  const [bankName, setBankName] = useState('');
  const [accNo, setAccNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawSuccessMsg, setWithdrawSuccessMsg] = useState('');
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  // Statements Modal States
  const [showStatementsModal, setShowStatementsModal] = useState(false);
  const [statementFilter, setStatementFilter] = useState<'ALL' | 'CASH' | 'ONLINE'>('ALL');
  const [statementSearch, setStatementSearch] = useState('');

  const [isRestricted, setIsRestricted] = useState(false);

  useEffect(() => {
    const loadCustomerData = async () => {
      if (user?.id) {
        let chitsFromApi: any[] | null = null;
        let totalInvestedFromApi: number | null = null;
        let apiStatus: string | null = null;
        try {
          const res = await fetchClient(`/customers?search=${user.id}`);
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            const found = res.data.find((c: any) => 
              c.customerCode === user.id || 
              c._id === user.id || 
              (user.phone && (c.phone === user.phone || c.mobile === user.phone))
            ) || res.data[0];
            if (found) {
              apiStatus = found.status;
              if (Array.isArray(found.chits) && found.chits.length > 0) {
                chitsFromApi = found.chits;
                totalInvestedFromApi = found.totalPaid;
              }
            }
          }
        } catch (e) {
          console.warn('API error in CustomerDashboard:', e);
        }

        const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        const cleanUserPhone = (user.phone || user.id || '').replace(/\D/g, '');
        const customer = customers.find((c: any) => {
          const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
          return (
            c.id === user.id || 
            c.mongoId === user.id || 
            c.customerCode === user.id ||
            (cleanUserPhone && cPhone === cleanUserPhone)
          );
        });

        // Check if customer account is deactivated / restricted
        const currentStatus = apiStatus || customer?.status || (user as any)?.status;
        if (currentStatus === 'INACTIVE' || currentStatus === 'DEACTIVATED') {
          setIsRestricted(true);
        } else {
          setIsRestricted(false);
        }
        
        let finalChits = ((chitsFromApi && chitsFromApi.length > 0) ? chitsFromApi : (customer?.chits || []))
          .filter((ch: any) => !isMockGroup({ id: ch.groupId, name: ch.groupName }));

        // Also check chitGroupMemberships and mockChitGroups enrolledMembers
        const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
        const userMemberships = memberships.filter((m: any) => {
          if (isMockGroup({ id: m.groupId, name: m.groupName })) return false;
          const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
          return (
            m.customerId === user.id || 
            (cleanUserPhone && mPhone === cleanUserPhone)
          );
        });

        const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
        const groupEnrolledChits: any[] = [];
        groups.forEach((g: any) => {
          if (isMockGroup(g)) return;
          if (Array.isArray(g.enrolledMembers)) {
            g.enrolledMembers.forEach((m: any) => {
              const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
              if (m.customerId === user.id || (cleanUserPhone && mPhone === cleanUserPhone)) {
                groupEnrolledChits.push(m);
              }
            });
          }
        });

        const allMemberChits = [...userMemberships, ...groupEnrolledChits];
        allMemberChits.forEach((m: any) => {
          if (!finalChits.some((ch: any) => ch.groupId === m.groupId)) {
            finalChits = [...finalChits, {
              groupId: m.groupId,
              groupName: m.groupName || m.groupId,
              ticketNumber: m.ticketNumber,
              chitValue: m.chitValue,
              monthlyInstallment: m.monthlyInstallment,
              dueDate: m.dueDate,
              paymentStatus: m.paymentStatus,
              isWithdrawn: m.isWithdrawn || false,
              withdrawnAmount: m.withdrawnAmount || 0,
              status: m.status || 'Active'
            }];
          }
        });

        setMyChits(finalChits);
        setActiveChits(finalChits.length);

        // Reconcile total invested across MongoDB, localStorage, and ledger transactions
        const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
        const myTransactions = ledger.filter((t: any) => 
          (user?.id && (t.customerId === user.id || t.reference?.includes(user.id) || t.description?.includes(user.id)))
        );
        const ledgerCreditTotal = myTransactions
          .filter((t: any) => t.type === 'CREDIT' || t.category === 'INSTALLMENT')
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

        const calculatedInvested = Math.max(
          Number(totalInvestedFromApi || 0), 
          Number(customer?.totalPaid || 0), 
          ledgerCreditTotal
        );
        setTotalInvested(calculatedInvested);
        setTransactions(myTransactions);
      }
    };

    loadCustomerData();
    const interval = setInterval(loadCustomerData, 4000);
    window.addEventListener('storage', loadCustomerData);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', loadCustomerData);
    };
  }, [user]);

  // Sync Payment Requests & Withdrawal Requests for live status
  useEffect(() => {
    const checkRequests = async () => {
      const allReqs = await syncPaymentRequestsWithBackend();
      const userReqs = allReqs.filter((r: any) => r.customerId === user?.id || (user?.phone && r.mobile === user?.phone));
      setPendingRequests(userReqs);

      const allWReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
      const userWReqs = allWReqs.filter((r: any) => r.customerId === user?.id || (user?.phone && r.mobile === user?.phone));
      setPendingWithdrawals(userWReqs);
    };
    checkRequests();
    const unsub = onPaymentSync(checkRequests);
    const t = setInterval(checkRequests, 3000);
    return () => {
      unsub();
      clearInterval(t);
    };
  }, [user]);

  const handlePayNow = (chit: any) => {
    setPaymentModalChit(chit);
    setPayAmount(String(chit.monthlyInstallment || 15000));
    setPayMode('UPI');
    setPayRefNo('');
    setPayScreenshot('');
    setScreenshotFileName('');
    setPaySuccessMsg('');
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

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPayScreenshot(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payMode !== 'Cash' && !payRefNo.trim()) {
      alert('Please enter your Transaction / UTR / Reference ID for verification.');
      return;
    }
    const userPhone = user?.phone || user?.mobile || (user as any)?.phone || '';
    const activeCompanyBanks = getStoredBankAccounts().filter(b => b.status === 'ACTIVE');
    const resolvedBank = resolveBankForPayment(user?.id, paymentModalChit?.groupId, paymentModalChit?.groupName).bank || activeCompanyBanks[0];
    const generatedCashRef = `CASH-${Date.now().toString().slice(-6)}`;
    
    const newReq: PaymentRequest = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      customerId: user?.id || 'CUST',
      customerName: user?.name || 'Customer',
      mobile: userPhone,
      groupId: paymentModalChit?.groupId,
      groupName: paymentModalChit?.groupName || paymentModalChit?.groupId,
      ticketNumber: paymentModalChit?.ticketNumber || '',
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payMode === 'Cash' ? (payRefNo.trim() || generatedCashRef) : payRefNo.trim(),
      bankAccountId: resolvedBank?.id,
      bankName: resolvedBank?.bankName,
      paymentScreenshot: payScreenshot || undefined,
      screenshotUrl: payScreenshot || undefined,
      submittedAt: new Date().toISOString(),
      status: 'PENDING_VERIFICATION',
      remarks: payMode === 'Cash' 
        ? `Direct Cash payment submission for ₹${Number(payAmount).toLocaleString('en-IN')}`
        : `Paid via ${payMode} to ${resolvedBank?.bankName || 'Company Bank'}`
    };

    setPaySubmitting(true);
    await savePaymentRequest(newReq);
    setPendingRequests(prev => [newReq, ...prev.filter(r => r.id !== newReq.id)]);

    setTimeout(() => {
      setPaySubmitting(false);
      setPaySuccessMsg('Payment request submitted successfully! Admin will verify and update your receipt.');
      setTimeout(() => {
        setPaymentModalChit(null);
        setPayScreenshot('');
        setScreenshotFileName('');
        setPaySuccessMsg('');
      }, 2000);
    }, 400);
  };

  const handlePrintReceiptSlip = (trx: any) => {
    printCashReceipt({
      receiptNo: trx.id,
      date: trx.date,
      customerName: user?.name || 'Customer',
      customerId: user?.id || 'TC-73071',
      customerMobile: user?.phone || '',
      groupName: trx.groupId || trx.reference || (myChits.length > 0 ? (myChits[0]?.groupName || myChits[0]?.groupId) : 'Chit Fund Group'),
      paymentMode: trx.paymentMode || ((trx.description || '').toLowerCase().includes('cash') ? 'CASH' : 'Online Payment'),
      amount: trx.amount,
      description: trx.description,
      referenceNo: trx.referenceNo,
      collectedBy: 'Jenista Cash Counter'
    });
  };


  const handleOpenWithdraw = (chit: any) => {
    setWithdrawModalChit(chit);
    setWithdrawPayoutMethod('Bank Transfer');
    setBankName('');
    setAccNo('');
    setIfsc('');
    setHolderName(user?.name || '');
    setUpiId('');
    setWithdrawSuccessMsg('');
  };

  const handleSubmitWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawModalChit) return;

    if (withdrawPayoutMethod === 'Bank Transfer') {
      if (!accNo.trim() || !ifsc.trim()) {
        alert('Please enter your Bank Account Number and IFSC Code.');
        return;
      }
    } else {
      if (!upiId.trim()) {
        alert('Please enter your UPI ID.');
        return;
      }
    }

    setWithdrawSubmitting(true);
    const chitVal = withdrawModalChit.chitValue || withdrawModalChit.amount || 100000;
    const prizeAmount = chitVal * 0.95; // 95% prize after 5% foreman commission

    const newWReq = {
      id: `WDR-${Date.now().toString().slice(-6)}`,
      customerId: user?.id || 'CUST',
      customerName: user?.name || 'Customer',
      mobile: user?.phone || '',
      groupId: withdrawModalChit.groupId,
      groupName: withdrawModalChit.groupName || withdrawModalChit.groupId,
      ticketNumber: withdrawModalChit.ticketNumber || '',
      chitValue: chitVal,
      eligibleAmount: prizeAmount,
      payoutMethod: withdrawPayoutMethod,
      payoutDetails: {
        bankName: withdrawPayoutMethod === 'Bank Transfer' ? bankName.trim() : undefined,
        accountNumber: withdrawPayoutMethod === 'Bank Transfer' ? accNo.trim() : undefined,
        ifsc: withdrawPayoutMethod === 'Bank Transfer' ? ifsc.trim().toUpperCase() : undefined,
        accountHolderName: withdrawPayoutMethod === 'Bank Transfer' ? holderName.trim() : undefined,
        upiId: withdrawPayoutMethod === 'UPI' ? upiId.trim() : undefined
      },
      requestedAt: new Date().toISOString(),
      status: 'PENDING_ADMIN_DISBURSAL',
      remarks: `Prize payout claim requested by ${user?.name || 'Customer'}`
    };

    const existingWReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
    const updated = [newWReq, ...existingWReqs];
    localStorage.setItem('withdrawalRequests', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setWithdrawSubmitting(false);
      setWithdrawSuccessMsg('Withdrawal claim request submitted successfully! Admin will verify and disburse your prize money.');
      setTimeout(() => {
        setWithdrawModalChit(null);
        setWithdrawSuccessMsg('');
      }, 2500);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <header className="sticky top-0 z-50 bg-secondary-50 border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/assets/Chit logo.jpg.jpeg" alt="Jenista Chits Logo" className="h-10 w-10 object-contain" />
              <span className="font-bold text-xl text-primary-900 tracking-tight">Jenista Chits</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-neutral-600 hidden sm:inline-block">
                Welcome, {user?.name || 'Customer'} 
                {user?.id && <span className="font-bold text-primary-900 ml-1">({user.id})</span>}
              </span>
              <button 
                onClick={logout}
                className="text-sm font-medium text-danger hover:text-danger-dark transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Account Deactivated / Restricted Block Screen */}
      {isRestricted ? (
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="bg-white rounded-2xl border border-red-200 shadow-lg max-w-lg w-full p-8 text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20 uppercase tracking-wider">
                Account Suspended
              </span>
              <h2 className="text-2xl font-bold text-neutral-900">App Access Restricted</h2>
              <p className="text-sm text-neutral-600 leading-relaxed">
                Your customer account has been deactivated by the branch administrator. 
                You are restricted from viewing dashboards, submitting payments, or requesting withdrawals.
              </p>
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 text-xs text-neutral-600 text-left border border-neutral-200 space-y-1.5">
              <p className="font-semibold text-neutral-800">What should you do?</p>
              <p>• Please contact the Jenista Chits head office or your branch agent directly.</p>
              <p>• Customer ID: <span className="font-mono font-bold text-neutral-900">{user?.id}</span></p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={logout}
                className="w-full py-2.5 px-4 bg-danger text-white rounded-xl text-sm font-semibold hover:bg-danger-dark transition-colors shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      ) : (
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-900">Dashboard</h1>
              <p className="text-sm text-neutral-500">Here is a summary of your chit portfolio.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/register?ref=${user?.id}`;
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-primary-50 text-primary-900 hover:bg-primary-100 border border-primary-200 rounded-md text-sm font-medium transition-colors flex items-center"
              >
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copied!' : 'Copy Referral Link'}
              </button>
              <button className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-shadow relative text-neutral-600">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white"></span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-neutral-200 space-x-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('myChits')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center whitespace-nowrap transition-colors ${
                activeTab === 'myChits'
                  ? 'border-primary-900 text-primary-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Layers className="w-4 h-4 mr-2" />
              My Portfolio & Chits
            </button>
            <button
              onClick={() => setActiveTab('regularPlanChart')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center whitespace-nowrap transition-colors ${
                activeTab === 'regularPlanChart'
                  ? 'border-amber-600 text-amber-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Layers className="w-4 h-4 mr-2 text-amber-600" />
              Regular Plan Schedule (20M)
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-900 rounded-full uppercase tracking-wider font-extrabold">
                Brochure Scheme
              </span>
            </button>
            <button
              onClick={() => setActiveTab('fixedPlanChart')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center whitespace-nowrap transition-colors ${
                activeTab === 'fixedPlanChart'
                  ? 'border-emerald-700 text-emerald-800'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Table className="w-4 h-4 mr-2" />
              Fixed Plan Schedule (20M)
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded-full uppercase tracking-wider font-extrabold">
                Fixed Scheme
              </span>
            </button>
            <button
              onClick={() => setActiveTab('auctionPlanChart')}
              className={`pb-3 px-4 font-bold text-sm border-b-2 flex items-center whitespace-nowrap transition-colors ${
                activeTab === 'auctionPlanChart'
                  ? 'border-purple-700 text-purple-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <Gavel className="w-4 h-4 mr-2" />
              Auction Plan Schedule (20M)
              <span className="ml-2 px-2 py-0.5 text-[10px] bg-purple-100 text-purple-900 rounded-full uppercase tracking-wider font-extrabold">
                Auction Scheme
              </span>
            </button>
          </div>

          {activeTab === 'regularPlanChart' ? (
            <RegularPlanSchedule />
          ) : activeTab === 'fixedPlanChart' ? (
            <FixedPlanSchedule />
          ) : activeTab === 'auctionPlanChart' ? (
            <AuctionPlanSchedule />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card border-l-4 border-l-primary-900 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Active Chits</p>
                      <h3 className="text-2xl font-bold text-primary-900">{activeChits}</h3>
                    </div>
                    <div className="p-3 bg-primary-100 rounded-md">
                      <Layers className="h-6 w-6 text-primary-900" />
                    </div>
                  </div>
                </div>

                <div className="card border-l-4 border-l-success p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Invested</p>
                      <h3 className="text-2xl font-bold text-success">{formatCurrency(totalInvested)}</h3>
                    </div>
                    <div className="p-3 bg-success-light rounded-md">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                  </div>
                </div>

                <div className="card border-l-4 border-l-amber-600 p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Withdrawn</p>
                      <h3 className="text-2xl font-bold text-amber-600">
                        {(() => {
                          const wTotal = myChits.reduce((sum: number, c: any) => sum + (c.isWithdrawn ? Number(c.withdrawnAmount || 0) : 0), 0) +
                            pendingWithdrawals.filter((w: any) => w.status === 'DISBURSED').reduce((sum: number, w: any) => sum + Number(w.eligibleAmount || 0), 0);
                          return formatCurrency(wTotal);
                        })()}
                      </h3>
                    </div>
                    <div className="p-3 bg-amber-100 rounded-md">
                      <Award className="h-6 w-6 text-amber-700" />
                    </div>
                  </div>
                  <div className="mt-4 text-xs font-semibold text-neutral-500 flex items-center justify-between">
                    <span>Prize Claims: {pendingWithdrawals.length}</span>
                    {pendingWithdrawals.some((w: any) => w.status === 'PENDING_ADMIN_DISBURSAL') && (
                      <span className="text-amber-600 font-bold flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1"></span> Pending Review
                      </span>
                    )}
                  </div>
                </div>

                <div className="card border-l-4 border-l-warning p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Next Payment Due</p>
                      <h3 className="text-xl font-bold text-warning">
                        {myChits.length > 0 ? formatCurrency(myChits[0].monthlyInstallment || 15000) : '₹0'}
                      </h3>
                    </div>
                    <div className="p-3 bg-warning-light rounded-md">
                      <CreditCard className="h-6 w-6 text-warning" />
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-neutral-500 flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    Due on: {myChits.length > 0 && myChits[0].dueDate ? new Date(myChits[0].dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                  </div>
                </div>
              </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* My Chit Groups */}
            <div className="lg:col-span-2 space-y-4">
              {/* Live Pending Payment Verifications Alert Banner */}
              {pendingRequests.filter(r => r.status === 'PENDING_VERIFICATION').length > 0 && (
                <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 shadow-2xs space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                      Pending Payment Verifications ({pendingRequests.filter(r => r.status === 'PENDING_VERIFICATION').length})
                    </span>
                    <span className="text-[11px] font-semibold text-amber-800">Awaiting Admin Verification</span>
                  </div>
                  <div className="divide-y divide-amber-200/60 text-xs">
                    {pendingRequests.filter(r => r.status === 'PENDING_VERIFICATION').map((req, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-neutral-900">
                            {formatCurrency(req.amount)} via {req.paymentMode} to <span className="text-primary-900">{req.bankName || 'Company Bank'}</span>
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                            Ref / UTR: {req.referenceNo} · Group: {req.groupName || req.groupId}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 bg-amber-200/70 text-amber-950 text-[10px] font-black uppercase rounded-full shrink-0">
                          In Verification
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="text-lg font-semibold text-primary-900 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-primary-600" />
                My Active Chit Groups
              </h3>
              
              {myChits.length === 0 ? (
                <div className="card p-8 text-center text-neutral-500 border-dashed border-neutral-300 bg-neutral-50">
                  <p>You have not been assigned to any chit groups yet.</p>
                  <p className="text-sm mt-1">Please contact your administrator or wait for approval.</p>
                </div>
              ) : (
                myChits.map((chit, index) => {
                  const dueDay = chit.dueDate ? parseInt(chit.dueDate.split('-')[2], 10) : 15;
                  const nextDueStr = chit.dueDate 
                    ? new Date(chit.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) 
                    : '15 Oct, 2026';
                    
                  return (
                  <div key={index} className="card p-0 overflow-hidden hover:shadow-md transition-shadow">
                    <div className="p-5 border-b border-neutral-100 flex justify-between items-start bg-white">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-lg text-primary-900">{chit.groupName || chit.groupId}</h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                            (chit.scheme || '').toLowerCase().includes('fix')
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : (chit.scheme || '').toLowerCase().includes('auc')
                                ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}>
                            {chit.scheme || 'Regular'} Plan ({chit.months || chit.duration || 20}M)
                          </span>
                        </div>
                        <p className="text-sm text-neutral-500 mt-1">Ticket Number: <span className="font-bold text-neutral-700">#{chit.ticketNumber}</span></p>
                        {chit.dueDate && (
                          <p className="text-xs text-neutral-400 mt-1">
                            Installments due on the <strong>{dueDay}{dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'}</strong> of every month.
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex px-2 py-1 bg-success-light text-success font-bold text-[10px] uppercase tracking-wider rounded-full">
                          {chit.status || 'Active'}
                        </span>
                        <p className="text-sm font-bold text-primary-900 mt-2">Value: {formatCurrency(chit.chitValue || chit.amount || 500000)}</p>
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 p-5 grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Last Paid Date</p>
                        <p className="text-sm font-medium text-neutral-800">N/A</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Next Due Date</p>
                        <p className="text-sm font-medium text-warning font-bold">{nextDueStr}</p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">Amount Due</p>
                        <p className="text-sm font-medium text-neutral-800">{formatCurrency(chit.monthlyInstallment || 15000)}</p>
                      </div>
                      <div className="text-right">
                        {(() => {
                          const hasPending = pendingRequests.some(r => r.groupId === chit.groupId && r.status === 'PENDING_VERIFICATION');
                          if (hasPending) {
                            return (
                              <div className="flex flex-col items-end">
                                <span className="inline-flex items-center px-3 py-1.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-lg border border-amber-200">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                                  Awaiting Admin Verification
                                </span>
                                <span className="text-[11px] text-neutral-400 mt-1">Payment under review</span>
                              </div>
                            );
                          }
                          return (
                            <button 
                              onClick={() => handlePayNow(chit)}
                              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center w-full md:w-auto ml-auto"
                            >
                              Pay Now <ArrowRight className="w-4 h-4 ml-1" />
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Prize Money & Withdrawal Eligibility Card Section */}
                    <div className="border-t border-neutral-200/70 p-4 bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {(() => {
                        const chitVal = chit.chitValue || chit.amount || 100000;
                        const prizeVal = chitVal * 0.95;
                        const wReq = pendingWithdrawals.find((w: any) => w.groupId === chit.groupId);
                        const isDisbursed = chit.isWithdrawn || (wReq && wReq.status === 'DISBURSED');
                        const isPending = wReq && wReq.status === 'PENDING_ADMIN_DISBURSAL';

                        return (
                          <>
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl shrink-0 ${isDisbursed ? 'bg-emerald-100 text-emerald-700' : isPending ? 'bg-amber-100 text-amber-700' : 'bg-amber-100/70 text-amber-800'}`}>
                                <Award className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">Chit Prize Money (Withdrawal)</span>
                                  {isDisbursed ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                      Disbursed ✓
                                    </span>
                                  ) : isPending ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                      Claim Submitted
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                      Eligible to Withdraw
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-neutral-800 mt-0.5">
                                  Net Prize: <span className="text-primary-900 font-black">{formatCurrency(prizeVal)}</span>
                                  <span className="text-xs font-normal text-neutral-400 ml-1.5">(95% pool after 5% foreman fee)</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:self-center flex-wrap">
                              <button
                                onClick={() => navigate(`/customer/chits/${encodeURIComponent(chit.groupId)}/schedule?group=${encodeURIComponent(chit.groupId)}`)}
                                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-colors flex items-center gap-1.5"
                                title="View 20-month due amounts, due dates, paid on dates, and payment status"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                                <span>Due Chart & Schedule</span>
                              </button>

                              {isDisbursed ? (
                                <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Paid to A/C {wReq?.disbursedRef ? `(${wReq.disbursedRef})` : ''}
                                </span>
                              ) : isPending ? (
                                <span className="inline-flex items-center text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                                  Pending Admin Disbursal ({wReq.payoutMethod})
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleOpenWithdraw(chit)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
                                >
                                  <Award className="w-3.5 h-3.5" /> Claim Prize / Withdraw
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  );
                })
              )}
            </div>

            {/* Transaction History Sidebar */}
            <div className="space-y-4">
              {/* Official Payment Accounts (UPI & Net Banking) */}
              {(() => {
                const defaultAssigned = resolveBankForPayment(user?.id, myChits[0]?.groupId, myChits[0]?.groupName);
                const b = defaultAssigned.bank;

                return (
                  <div className="card p-5 bg-gradient-to-br from-amber-500/10 via-white to-primary-50/40 border border-amber-200/80 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <Landmark className="w-4 h-4 text-amber-800" /> Payment Bank & UPI
                      </span>
                      <span className="text-[10px] bg-amber-200/80 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                        {defaultAssigned.scope === 'CUSTOMER' ? 'Custom Assigned' : defaultAssigned.scope === 'GROUP' ? 'Group Assigned' : 'Default Master'}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-base text-neutral-900">{b.bankName}</h4>
                      <p className="text-xs text-neutral-500">{b.accountHolderName}</p>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-neutral-200/80 space-y-2 text-xs font-mono shadow-2xs">
                      <div className="flex justify-between items-center text-neutral-800">
                        <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">A/C:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold tracking-wider">{b.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(b.accountNumber);
                              setCopiedKey('sidebar-acc');
                              setTimeout(() => setCopiedKey(null), 2000);
                            }}
                            className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                            title="Copy Account Number"
                          >
                            {copiedKey === 'sidebar-acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-neutral-800">
                        <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">IFSC:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{b.ifscCode}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(b.ifscCode);
                              setCopiedKey('sidebar-ifsc');
                              setTimeout(() => setCopiedKey(null), 2000);
                            }}
                            className="text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                            title="Copy IFSC Code"
                          >
                            {copiedKey === 'sidebar-ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-amber-950 pt-1 border-t border-neutral-100">
                        <span className="text-[10px] text-amber-800 font-sans uppercase font-bold">UPI ID:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold truncate max-w-[130px]">{b.upiId}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(b.upiId);
                              setCopiedKey('sidebar-upi');
                              setTimeout(() => setCopiedKey(null), 2000);
                            }}
                            className="text-amber-800 hover:text-amber-950 p-0.5 cursor-pointer"
                            title="Copy UPI ID"
                          >
                            {copiedKey === 'sidebar-upi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setEnlargedQrBank(b)}
                        className="py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-700" /> View QR
                      </button>
                      <button
                        onClick={() => {
                          if (myChits.length > 0) {
                            handlePayNow(myChits[0]);
                          }
                        }}
                        className="py-2 bg-primary-900 hover:bg-primary-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        Pay Due <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              <h3 className="text-lg font-semibold text-primary-900 flex items-center">
                <History className="w-5 h-5 mr-2 text-primary-600" />
                Recent Transactions
              </h3>
              
              <div className="card p-0 overflow-hidden">
                <div className="divide-y divide-neutral-100">
                  {transactions.length === 0 ? (
                    <div className="p-6 text-center text-sm text-neutral-500">
                      No recent transactions found.
                    </div>
                  ) : (
                    transactions.map((trx, idx) => {
                      const isCash = (trx.description || '').toLowerCase().includes('cash');
                      return (
                        <div key={idx} className="p-4 hover:bg-neutral-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-sm text-primary-900">{trx.description}</p>
                                {isCash && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                    CASH
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="font-bold text-sm text-success whitespace-nowrap ml-2">+{formatCurrency(trx.amount)}</p>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-1 border-t border-neutral-100">
                            <div className="flex items-center gap-2.5">
                              <p className="text-xs text-neutral-500 font-mono font-semibold">{trx.id}</p>
                              <p className="text-xs text-neutral-400 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" /> {formatDate(trx.date)}
                              </p>
                            </div>
                            <button
                              onClick={() => handlePrintReceiptSlip(trx)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs hover:scale-105 ${
                                isCash 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                  : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                              }`}
                              title="Print Official Payment Receipt Slip"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Print Receipt</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="bg-neutral-50 p-3 text-center border-t border-neutral-100">
                  <button 
                    onClick={() => setShowStatementsModal(true)}
                    className="text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors flex items-center justify-center gap-1.5 w-full"
                  >
                    <FileText className="w-4 h-4" /> View All Statements & Receipts
                  </button>
                </div>
              </div>
            </div>

          </div>
          </>
          )}
        </div>
      </div>
      )}

      {/* Customer Payment Request Submission Modal */}
      {paymentModalChit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg">Submit Chit Payment</h3>
                <p className="text-xs text-primary-200 mt-0.5">
                  Group: {paymentModalChit.groupName || paymentModalChit.groupId} · Ticket #{paymentModalChit.ticketNumber}
                </p>
              </div>
              <button 
                onClick={() => setPaymentModalChit(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {paySuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-neutral-800">Payment Request Sent!</h4>
                <p className="text-sm text-neutral-600">{paySuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                <div className="p-4 bg-primary-50/60 rounded-xl border border-primary-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider">Installment Due Amount</p>
                    <p className="text-2xl font-black text-primary-900 mt-0.5">
                      ₹{Number(payAmount || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-primary-100 text-primary-800 rounded-md">
                      Monthly Due
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-900 focus:bg-white focus:border-primary-600 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['UPI', 'Bank Transfer', 'Cash'] as const).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPayMode(mode)}
                        className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                          payMode === mode
                            ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
                            : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamically resolved assigned bank account for this customer and chit group - LOCKED to prevent modification by customer */}
                {(() => {
                  const activeCompanyBanks = getStoredBankAccounts().filter(b => b.status === 'ACTIVE');
                  const assignedBankResult = resolveBankForPayment(user?.id, paymentModalChit?.groupId, paymentModalChit?.groupName);
                  const b = assignedBankResult.bank || activeCompanyBanks[0];

                  if (!b) return null;

                  return (
                    <div className="space-y-3">
                      {/* Fixed & Read-only Designated Bank Details (Cannot be changed by customer) */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-primary-800" />
                            <span>Receiving Company Bank Account</span>
                          </label>
                          <span className="text-[10px] text-amber-900 font-bold bg-amber-100/90 border border-amber-300/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-amber-800" /> Fixed · Group Designated
                          </span>
                        </div>
                        <div className="w-full px-3.5 py-2.5 bg-neutral-50/90 border border-neutral-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {b.bankName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 truncate">
                                {b.bankName} <span className="font-mono text-neutral-500 font-medium">(A/C •••• {b.accountNumber.slice(-4)})</span>
                              </p>
                              <p className="text-[10px] text-neutral-500 truncate">
                                {b.accountHolderName} · {b.accountType} A/C
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-medium text-neutral-400 bg-neutral-200/60 px-2 py-0.5 rounded-md shrink-0 ml-2">
                            Locked
                          </span>
                        </div>
                      </div>

                      {payMode === 'UPI' && (
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                            <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                              <QrCode className="w-4 h-4 text-amber-700" /> Scan UPI QR or Pay to VPA
                            </span>
                            <span className="text-[10px] bg-amber-200/70 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                              {b.bankName}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="w-20 h-20 bg-white p-1 rounded-lg border border-amber-200 shrink-0 shadow-2xs">
                              <img 
                                src={b.qrCodeUrl || generateUpiQrBadge(b.upiId, b.accountHolderName, Number(payAmount) || undefined)} 
                                alt="UPI QR" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <div className="overflow-hidden flex-1 space-y-1">
                              <p className="text-[11px] font-bold text-neutral-800">{b.accountHolderName}</p>
                              <div className="flex items-center justify-between bg-white px-2 py-1 rounded-md border border-amber-200">
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
                                Pay via GPay, PhonePe, Paytm, or BHIM.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {payMode === 'Bank Transfer' && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Landmark className="w-4 h-4 text-primary-700" /> Designated Bank Transfer Details
                            </span>
                            <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                              {b.bankName}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-neutral-400 font-sans block uppercase font-bold">A/C Number</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-bold text-neutral-900">{b.accountNumber}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.accountNumber);
                                    setCopiedKey('modal-acc');
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  className="text-neutral-500 hover:text-neutral-900"
                                >
                                  {copiedKey === 'modal-acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                              <span className="text-[10px] text-neutral-400 font-sans block uppercase font-bold">IFSC Code</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="font-bold text-neutral-900">{b.ifscCode}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(b.ifscCode);
                                    setCopiedKey('modal-ifsc');
                                    setTimeout(() => setCopiedKey(null), 2000);
                                  }}
                                  className="text-neutral-500 hover:text-neutral-900"
                                >
                                  {copiedKey === 'modal-ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-neutral-600 flex justify-between items-center px-1">
                            <span>Holder: <strong>{b.accountHolderName}</strong></span>
                            <span>{b.branch}</span>
                          </div>
                        </div>
                      )}

                      {payMode === 'Cash' && (
                        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl p-3 text-xs text-amber-900">
                          Visit any of our registered branches or pay directly to authorized collections executives. Always collect a signed cash receipt with a valid receipt number.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {payMode !== 'Cash' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                      Transaction / Reference ID (UTR / Receipt No.) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UTR1289471928 or Bank reference number"
                      value={payRefNo}
                      onChange={(e) => setPayRefNo(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-lg text-sm font-mono text-neutral-900 focus:border-primary-600 focus:outline-none transition-colors"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Enter the UPI transaction UTR or bank reference ID so admin can verify and update receipt.
                    </p>
                  </div>
                )}

                {/* Upload Payment Screenshot */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-primary-600" />
                      Upload Payment Screenshot / Receipt Slip
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal">Optional</span>
                  </label>

                  {payScreenshot ? (
                    <div className="border border-primary-200 bg-primary-50/40 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img 
                          src={payScreenshot} 
                          alt="Screenshot Preview" 
                          className="w-14 h-14 object-cover rounded-lg border border-primary-200 shrink-0 shadow-2xs" 
                        />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-neutral-800 truncate">
                            {screenshotFileName || 'payment-receipt.png'}
                          </p>
                          <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Screenshot attached
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPayScreenshot('');
                          setScreenshotFileName('');
                        }}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 font-bold transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-neutral-300 hover:border-primary-500 bg-neutral-50 hover:bg-primary-50/20 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleScreenshotUpload}
                      />
                      <div className="p-2.5 rounded-full bg-white shadow-2xs group-hover:scale-105 transition-transform text-primary-700">
                        <Upload className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-neutral-700 mt-2">
                        Click to upload payment screenshot
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        PNG, JPG, JPEG, WEBP up to 5MB
                      </p>
                    </label>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setPaymentModalChit(null)}
                    className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-sm font-semibold hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={paySubmitting}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {paySubmitting ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Customer Prize Withdrawal / Claim Modal */}
      {withdrawModalChit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-amber-700 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-200" />
                  Claim Chit Prize Money
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Group: {withdrawModalChit.groupName || withdrawModalChit.groupId} · Ticket #{withdrawModalChit.ticketNumber}
                </p>
              </div>
              <button 
                onClick={() => setWithdrawModalChit(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {withdrawSuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h4 className="text-lg font-bold text-neutral-800">Claim Submitted Successfully!</h4>
                <p className="text-sm text-neutral-600">{withdrawSuccessMsg}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitWithdrawal} className="p-5 sm:p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
                {/* Prize Breakdown Banner */}
                <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
                  <div className="flex justify-between items-center pb-2 border-b border-amber-200/60 text-xs">
                    <span className="text-neutral-600">Total Chit Value</span>
                    <span className="font-bold text-neutral-800">
                      {formatCurrency(withdrawModalChit.chitValue || withdrawModalChit.amount || 100000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-amber-200/60 text-xs">
                    <span className="text-neutral-500">Foreman Commission (5%)</span>
                    <span className="text-danger font-semibold">
                      - {formatCurrency((withdrawModalChit.chitValue || withdrawModalChit.amount || 100000) * 0.05)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900">Net Prize Payout</span>
                    <span className="text-xl font-black text-amber-800">
                      {formatCurrency((withdrawModalChit.chitValue || withdrawModalChit.amount || 100000) * 0.95)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Receiving Payout Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Bank Transfer', 'UPI'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setWithdrawPayoutMethod(method)}
                        className={`py-2.5 px-3 text-xs font-bold rounded-lg border text-center transition-all flex items-center justify-center gap-2 ${
                          withdrawPayoutMethod === method
                            ? 'bg-primary-900 text-white border-primary-900 shadow-sm'
                            : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                        }`}
                      >
                        {method === 'Bank Transfer' ? <Building2 className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {withdrawPayoutMethod === 'Bank Transfer' ? (
                  <div className="space-y-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India / HDFC Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900 focus:border-primary-600 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                          Account Number <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Bank A/C number"
                          value={accNo}
                          onChange={(e) => setAccNo(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono font-semibold text-neutral-900 focus:border-primary-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                          IFSC Code <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SBIN0001234"
                          value={ifsc}
                          onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono font-semibold uppercase text-neutral-900 focus:border-primary-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        placeholder="Full name as in passbook"
                        value={holderName}
                        onChange={(e) => setHolderName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-900 focus:border-primary-600 focus:outline-none"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-1">
                      UPI ID (VPA) <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-mono font-semibold text-neutral-900 focus:border-primary-600 focus:outline-none"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1.5">
                      Ensure your UPI ID is linked to your active bank account.
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setWithdrawModalChit(null)}
                    className="px-4 py-2 border border-neutral-200 text-neutral-600 rounded-lg text-sm font-semibold hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawSubmitting}
                    className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {withdrawSubmitting ? 'Submitting...' : 'Submit Withdrawal Claim'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* All Statements & Payment Receipts Modal */}
      {showStatementsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-base">Account Statements & Receipts</h3>
                  <p className="text-xs text-primary-200">
                    {user?.name} · Member ID: {user?.id || 'TC-73071'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowStatementsModal(false)}
                className="text-primary-200 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {(['ALL', 'CASH', 'ONLINE'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setStatementFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      statementFilter === f
                        ? 'bg-primary-900 text-white shadow-xs'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {f === 'ALL' && 'All Transactions'}
                    {f === 'CASH' && 'Cash Receipts 💵'}
                    {f === 'ONLINE' && 'Online Payments 💳'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search receipt ID or note..."
                  value={statementSearch}
                  onChange={e => setStatementSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                />
              </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const filtered = transactions.filter(t => {
                  const isCash = (t.description || '').toLowerCase().includes('cash') || (t.paymentMode || '').toLowerCase().includes('cash');
                  if (statementFilter === 'CASH' && !isCash) return false;
                  if (statementFilter === 'ONLINE' && isCash) return false;
                  if (statementSearch) {
                    const q = statementSearch.toLowerCase();
                    return (t.id || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-neutral-400">
                      <Wallet className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                      <p className="font-semibold text-neutral-600 text-sm">No payment records found</p>
                      <p className="text-xs text-neutral-400 mt-1">Try changing filters or search terms.</p>
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-neutral-100 text-[11px] font-bold text-neutral-600 uppercase tracking-wider sticky top-0 border-b border-neutral-200">
                        <tr>
                          <th className="p-3">Receipt ID</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Group / Particulars</th>
                          <th className="p-3">Mode</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-center">Receipt Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 text-xs">
                        {filtered.map((t, idx) => {
                          const isCash = (t.description || '').toLowerCase().includes('cash') || (t.paymentMode || '').toLowerCase().includes('cash');
                          return (
                            <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                              <td className="p-3 font-mono font-bold text-primary-900">{t.id}</td>
                              <td className="p-3 text-neutral-600">{formatDate(t.date)}</td>
                              <td className="p-3">
                                <p className="font-bold text-neutral-800">{t.description}</p>
                                {t.reference && <p className="text-[11px] text-neutral-400 font-mono">{t.reference}</p>}
                              </td>
                              <td className="p-3">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                  isCash 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {isCash ? '💵 CASH' : (t.paymentMode || 'ONLINE')}
                                </span>
                              </td>
                              <td className="p-3 font-bold text-right text-emerald-700 text-sm">
                                +{formatCurrency(t.amount)}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handlePrintReceiptSlip(t)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs hover:scale-105 ${
                                    isCash
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                                      : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-300'
                                  }`}
                                  title="Print Official Payment Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>Print Receipt</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-200 flex justify-between items-center text-xs text-neutral-500 shrink-0">
              <span>Showing {transactions.length} record(s)</span>
              <button
                onClick={() => setShowStatementsModal(false)}
                className="px-4 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-lg font-bold text-neutral-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ENLARGED QR MODAL */}
      {enlargedQrBank && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-sm max-h-[90vh] overflow-y-auto p-6 text-center space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-100">
              <h3 className="font-extrabold text-neutral-900 text-base flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-700" /> UPI Scan & Pay QR
              </h3>
              <button 
                onClick={() => setEnlargedQrBank(null)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 inline-block shadow-inner max-w-full">
              <img 
                src={enlargedQrBank.qrCodeUrl || generateUpiQrBadge(enlargedQrBank.upiId, enlargedQrBank.accountHolderName)} 
                alt="UPI QR Code" 
                className="w-48 h-48 mx-auto object-contain rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <p className="font-bold text-neutral-900 text-sm">{enlargedQrBank.accountHolderName}</p>
              <p className="font-mono text-xs text-amber-900 font-semibold bg-amber-50 py-1 px-3 rounded-full inline-block border border-amber-200">
                {enlargedQrBank.upiId}
              </p>
              <p className="text-[11px] text-neutral-500 pt-1">{enlargedQrBank.bankName} · {enlargedQrBank.branch}</p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(enlargedQrBank.upiId);
                  setCopiedKey('enlarged-upi');
                  setTimeout(() => setCopiedKey(null), 2000);
                }}
                className="w-full py-2 bg-primary-900 text-white rounded-xl text-xs font-bold hover:bg-primary-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'enlarged-upi' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                Copy UPI ID
              </button>
              {myChits.length > 0 && (
                <button
                  onClick={() => {
                    setEnlargedQrBank(null);
                    handlePayNow(myChits[0]);
                  }}
                  className="w-full py-2 bg-accent hover:bg-accent-light text-primary-950 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  Pay Installment Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
