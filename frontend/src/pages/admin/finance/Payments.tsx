import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Printer, 
  CreditCard,
  ShieldCheck,
  Check,
  Award,
  Eye,
  ExternalLink,
  X
} from 'lucide-react';
import { fetchClient } from '../../../api/client';
import { printCashReceipt } from '../../../utils/receiptPrinter';
import { isMockCustomer } from '../../../utils/cleanMockData';
import type { PaymentRequest } from '../../../utils/paymentRequestsData';
import {
  syncPaymentRequestsWithBackend,
  onPaymentSync,
  isPendingPayment,
  approvePaymentRequestAction,
  rejectPaymentRequestAction
} from '../../../utils/paymentRequestsData';

type TabType = 'VERIFICATION' | 'WITHDRAWALS';

interface WithdrawalRequest {
  id: string;
  customerId: string;
  customerName: string;
  mobile?: string;
  groupId: string;
  groupName?: string;
  ticketNumber?: string;
  chitValue?: number;
  eligibleAmount: number;
  payoutMethod: 'Bank Transfer' | 'UPI';
  payoutDetails: {
    bankName?: string;
    accountNumber?: string;
    ifsc?: string;
    accountHolderName?: string;
    upiId?: string;
  };
  requestedAt: string;
  status: 'PENDING_ADMIN_DISBURSAL' | 'DISBURSED' | 'REJECTED';
  disbursedAt?: string;
  disbursedRef?: string;
  remarks?: string;
}



export const Payments = () => {
  const [activeTab, setActiveTab] = useState<TabType>('VERIFICATION');
  
  // Verification states
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<any | null>(null);

  // Withdrawal States
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [disbursingReq, setDisbursingReq] = useState<WithdrawalRequest | null>(null);
  const [disburseRefInput, setDisburseRefInput] = useState('');
  const [disburseModeInput, setDisburseModeInput] = useState('Bank Transfer');



  // Load data
  const loadData = async () => {
    // Payment requests (synced with backend & local)
    const reqs = await syncPaymentRequestsWithBackend();
    setPaymentRequests(reqs);

    // Withdrawal requests
    const wReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
    setWithdrawalRequests(wReqs);
  };

  useEffect(() => {
    loadData();

    // Listen for storage changes and cross-tab/channel sync
    const unsubSync = onPaymentSync(loadData);
    const interval = setInterval(loadData, 3000);

    fetchClient('/customers')
      .then((res: any) => {
        if (res && res.data && Array.isArray(res.data)) {
          const localSaved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
          const mapped = res.data.map((item: any) => {
            const local = localSaved.find((lc: any) => 
              lc.id === (item.customerCode || item._id) || 
              lc.mongoId === item._id || 
              (lc.mobile && (lc.mobile === item.phone || lc.mobile === item.mobile))
            );
            const chits = (item.chits && item.chits.length > 0) ? item.chits : (local?.chits || []);
            return {
              id: item.customerCode || item._id,
              mongoId: item._id,
              name: item.fullName || item.name,
              mobile: item.phone || item.mobile,
              phone: item.phone || item.mobile,
              pending: item.pending ?? local?.pending ?? 0,
              totalPaid: Math.max(Number(item.totalPaid || 0), Number(local?.totalPaid || 0)),
              chits: chits,
            };
          });
          const cleanMapped = mapped.filter((item: any) => !isMockCustomer(item));
          localStorage.setItem('mockCustomers', JSON.stringify(cleanMapped));
        }
      })
      .catch((err: any) => console.warn('Could not sync payments customers:', err));

    return () => {
      unsubSync();
      clearInterval(interval);
    };
  }, []);

  const pendingCount = paymentRequests.filter(r => isPendingPayment(r.status)).length;
  const pendingWithdrawalCount = withdrawalRequests.filter(r => r.status === 'PENDING_ADMIN_DISBURSAL').length;

  // Filter requests
  const filteredRequests = paymentRequests.filter(req => {
    if (filterStatus === 'PENDING' && !isPendingPayment(req.status)) return false;
    if (filterStatus === 'APPROVED' && req.status !== 'APPROVED') return false;
    if (filterStatus === 'REJECTED' && req.status !== 'REJECTED') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchName = req.customerName?.toLowerCase().includes(q);
      const matchId = req.customerId?.toLowerCase().includes(q);
      const matchPhone = req.mobile?.includes(q);
      const matchGroup = req.groupId?.toLowerCase().includes(q);
      const matchRef = req.referenceNo?.toLowerCase().includes(q);
      return matchName || matchId || matchPhone || matchGroup || matchRef;
    }
    return true;
  });

  // Verify & Approve Request
  const handleApprove = (req: PaymentRequest) => {
    setActionInProgress(req.id);

    try {
      approvePaymentRequestAction(req);
      loadData();
      setActionSuccessMsg(`Payment of ₹${Number(req.amount).toLocaleString('en-IN')} for ${req.customerName} verified & approved!`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Error approving payment:', err);
      alert('Failed to approve payment. Please check console.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Reject Request
  const handleReject = (req: PaymentRequest) => {
    if (!window.confirm(`Are you sure you want to reject payment request ${req.id} for ${req.customerName}?`)) {
      return;
    }
    setActionInProgress(req.id);
    try {
      rejectPaymentRequestAction(req.id);
      loadData();
    } finally {
      setActionInProgress(null);
    }
  };

  // Open Disbursal Modal for Withdrawal Request
  const openDisburseModal = (req: WithdrawalRequest) => {
    setDisbursingReq(req);
    setDisburseModeInput(req.payoutMethod || 'Bank Transfer');
    setDisburseRefInput(`DISB-${Date.now().toString().slice(-6)}`);
  };

  // Confirm Prize Money Disbursal
  const handleConfirmDisbursal = () => {
    if (!disbursingReq) return;
    const req = disbursingReq;
    setActionInProgress(req.id);
    const payoutRefNo = disburseRefInput.trim() || `DISB-${Date.now().toString().slice(-6)}`;

    try {
      // 1. Update withdrawalRequests
      const allWReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
      const updatedWReqs = allWReqs.map((r: any) => 
        r.id === req.id ? { 
          ...r, 
          status: 'DISBURSED', 
          disbursedAt: new Date().toISOString(),
          disbursedRef: payoutRefNo,
          payoutMethod: disburseModeInput
        } : r
      );
      localStorage.setItem('withdrawalRequests', JSON.stringify(updatedWReqs));

      // 2. Add DEBIT record to ledgerTransactions
      const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
      const newLedgerEntry = {
        id: `DISB-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        type: 'DEBIT',
        category: 'DISBURSAL',
        amount: Number(req.eligibleAmount),
        reference: `${req.customerId} / ${req.groupId}`,
        description: `Prize Money Disbursal / Withdrawal (${disburseModeInput} Ref: ${payoutRefNo}) - Approved by Admin`,
        customerName: req.customerName,
        customerId: req.customerId,
        groupId: req.groupId,
        status: 'DISBURSED'
      };
      localStorage.setItem('ledgerTransactions', JSON.stringify([newLedgerEntry, ...ledger]));

      // 3. Update customer chits in mockCustomers
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const cleanPhone = (req.mobile || '').replace(/\D/g, '');
      let patchedCust: any = null;
      const updatedCustomers = customers.map((c: any) => {
        const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
        if (c.id === req.customerId || c.customerCode === req.customerId || (cleanPhone && cPhone === cleanPhone)) {
          const chits = Array.isArray(c.chits) ? c.chits.map((ch: any) => {
            if (ch.groupId === req.groupId) {
              return { 
                ...ch, 
                isWithdrawn: true, 
                withdrawnAmount: Number(req.eligibleAmount),
                withdrawnAt: new Date().toISOString(),
                status: 'Withdrawn'
              };
            }
            return ch;
          }) : [];
          patchedCust = {
            ...c,
            chits,
            withdrawnAmount: (Number(c.withdrawnAmount || 0)) + Number(req.eligibleAmount)
          };
          return patchedCust;
        }
        return c;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));

      // 4. Update chitGroupMemberships
      const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      const updatedMemberships = memberships.map((m: any) => {
        const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
        if ((m.customerId === req.customerId || (cleanPhone && mPhone === cleanPhone)) && m.groupId === req.groupId) {
          return { 
            ...m, 
            isWithdrawn: true, 
            withdrawnAmount: Number(req.eligibleAmount), 
            withdrawnAt: new Date().toISOString(), 
            status: 'Withdrawn' 
          };
        }
        return m;
      });
      localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

      // 5. Sync to MongoDB
      const targetId = patchedCust?.mongoId || patchedCust?.customerCode || req.customerId;
      if (targetId && patchedCust) {
        fetchClient(`/customers/${targetId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            chits: patchedCust.chits
          })
        }).catch(err => console.warn('Could not sync chit disbursal to MongoDB:', err));
      }

      window.dispatchEvent(new Event('storage'));
      loadData();
      setDisbursingReq(null);
      setActionSuccessMsg(`Prize money of ₹${Number(req.eligibleAmount).toLocaleString('en-IN')} for ${req.customerName} disbursed successfully! (Ref: ${payoutRefNo})`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Error disbursing prize:', err);
      alert('Failed to process disbursal. Please check console.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectWithdrawal = (req: WithdrawalRequest) => {
    if (!window.confirm(`Are you sure you want to reject withdrawal request ${req.id} for ${req.customerName}?`)) {
      return;
    }
    const allWReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
    const updated = allWReqs.map((r: any) => r.id === req.id ? { ...r, status: 'REJECTED' } : r);
    localStorage.setItem('withdrawalRequests', JSON.stringify(updated));
    window.dispatchEvent(new Event('storage'));
    loadData();
  };

  return (
    <div className="space-y-6">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-primary-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-primary-600" />
            Customer Payments & Verifications
          </h1>
          <p className="text-sm text-neutral-500">
            Review customer payment submissions, verify transaction references, and record receipts in the ledger.
          </p>
        </div>

        {/* Tab Switching */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-neutral-200 shadow-sm">
          <button
            onClick={() => setActiveTab('VERIFICATION')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'VERIFICATION'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Payment Requests
            {pendingCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === 'VERIFICATION' ? 'bg-amber-400 text-neutral-950' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'WITHDRAWALS'
                ? 'bg-primary-900 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Award className="w-4 h-4" />
            Prize Withdrawals
            {pendingWithdrawalCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === 'WITHDRAWALS' ? 'bg-amber-400 text-neutral-950' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingWithdrawalCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION BANNER */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold">{actionSuccessMsg}</p>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 text-xs font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* ===================== TAB 1: VERIFICATION REQUESTS ===================== */}
      {activeTab === 'VERIFICATION' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full md:w-auto">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    filterStatus === st
                      ? 'bg-primary-900 text-white border-primary-900'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {st === 'ALL' ? 'All Requests' : st === 'PENDING' ? `Pending (${pendingCount})` : st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, UTR, group, phone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-primary-600"
              />
            </div>
          </div>

          {/* Requests Table / Cards */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-neutral-100 text-neutral-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-800">No payment requests found</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {filterStatus === 'PENDING' 
                  ? 'There are currently no customer payment submissions waiting for admin verification.' 
                  : 'No payment submissions matching your search criteria.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Request ID & Date</th>
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Chit Group & Ticket</th>
                      <th className="py-3.5 px-4">Mode & UTR / Ref No.</th>
                      <th className="py-3.5 px-4 text-center">Receipt Proof</th>
                      <th className="py-3.5 px-4 text-right">Amount Paid</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Admin Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredRequests.map((req) => {
                      const isPending = isPendingPayment(req.status);
                      const isApproved = req.status === 'APPROVED';
                      const isRejected = req.status === 'REJECTED';

                      return (
                        <tr key={req.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-4 px-4 whitespace-nowrap">
                            <p className="font-mono font-bold text-xs text-primary-900">{req.id}</p>
                            <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(req.submittedAt).toLocaleDateString('en-IN', {
                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </td>

                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-900 font-bold text-xs flex items-center justify-center shrink-0">
                                {req.customerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-neutral-900 leading-snug">{req.customerName}</p>
                                <p className="text-[11px] text-neutral-400 font-mono">{req.customerId} · {req.mobile}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-block px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded font-bold text-xs">
                              {req.groupName || req.groupId}
                            </span>
                            {req.ticketNumber && (
                              <p className="text-[11px] text-neutral-500 mt-1">
                                Ticket: <span className="font-bold text-neutral-700">#{req.ticketNumber}</span>
                              </p>
                            )}
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-bold">
                              {req.paymentMode}
                            </span>
                            <p className="text-xs font-mono font-bold text-neutral-800 mt-1">
                              {req.referenceNo}
                            </p>
                          </td>

                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {(req.paymentScreenshot || req.screenshotUrl) ? (
                              <button
                                onClick={() => setViewingProof({
                                  url: req.paymentScreenshot || req.screenshotUrl,
                                  customerName: req.customerName,
                                  customerId: req.customerId,
                                  amount: req.amount,
                                  groupName: req.groupName || req.groupId,
                                  date: req.submittedAt,
                                  ref: req.referenceNo,
                                  mode: req.paymentMode
                                })}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-lg shadow-2xs transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" /> View Proof
                              </button>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">No Upload</span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <p className="text-base font-black text-primary-900">
                              ₹{Number(req.amount).toLocaleString('en-IN')}
                            </p>
                          </td>

                          <td className="py-4 px-4 text-center whitespace-nowrap">
                            {isPending && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                                Needs Verification
                              </span>
                            )}
                            {isApproved && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 mr-1" />
                                Verified & Paid
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleReject(req)}
                                  disabled={actionInProgress === req.id}
                                  className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => handleApprove(req)}
                                  disabled={actionInProgress === req.id}
                                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Verify & Approve
                                </button>
                              </div>
                            ) : isApproved ? (
                              <button
                                onClick={() => printCashReceipt({
                                  receiptNo: req.id,
                                  date: req.submittedAt,
                                  customerName: req.customerName,
                                  customerId: req.customerId,
                                  customerMobile: req.mobile,
                                  groupName: req.groupName || req.groupId,
                                  ticketNumber: req.ticketNumber,
                                  paymentMode: req.paymentMode,
                                  amount: req.amount,
                                  description: `Verified Payment (${req.paymentMode} Ref: ${req.referenceNo})`,
                                  referenceNo: req.referenceNo,
                                  collectedBy: 'Jenista Admin Accounts'
                                })}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border shadow-2xs transition-all hover:scale-105 ${
                                  (req.paymentMode || '').toLowerCase().includes('cash')
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                                }`}
                                title="Print Official Payment Receipt Voucher"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Print Receipt</span>
                              </button>
                            ) : (
                              <span className="text-xs text-neutral-400 italic">No actions</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: PRIZE WITHDRAWALS & DISBURSALS ===================== */}
      {activeTab === 'WITHDRAWALS' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                Withdrawal Claims:
              </span>
              <span className="text-xs font-black px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
                {pendingWithdrawalCount} Pending Action
              </span>
              <span className="text-xs font-black px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                {withdrawalRequests.filter(r => r.status === 'DISBURSED').length} Disbursed
              </span>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name, group, UTR..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none focus:border-primary-600"
              />
            </div>
          </div>

          {withdrawalRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-neutral-800">No withdrawal requests found</h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                When customers submit prize money withdrawal requests from their dashboard, they will appear here for verification and disbursal.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase font-black text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Claim ID & Date</th>
                      <th className="py-3.5 px-4">Customer Details</th>
                      <th className="py-3.5 px-4">Chit Group & Ticket</th>
                      <th className="py-3.5 px-4">Customer Payout Details</th>
                      <th className="py-3.5 px-4 text-right">Prize Disbursal Amount</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {withdrawalRequests
                      .filter(r => {
                        if (!searchTerm) return true;
                        const q = searchTerm.toLowerCase();
                        return (
                          r.customerName?.toLowerCase().includes(q) ||
                          r.customerId?.toLowerCase().includes(q) ||
                          r.groupId?.toLowerCase().includes(q) ||
                          r.payoutDetails?.accountNumber?.includes(q) ||
                          r.payoutDetails?.upiId?.toLowerCase().includes(q)
                        );
                      })
                      .map(req => {
                        const isPending = req.status === 'PENDING_ADMIN_DISBURSAL';
                        const isDisbursed = req.status === 'DISBURSED';
                        const isRejected = req.status === 'REJECTED';

                        return (
                          <tr key={req.id} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-4 px-4 whitespace-nowrap">
                              <p className="font-mono font-bold text-xs text-primary-900">{req.id}</p>
                              <p className="text-[11px] text-neutral-500 flex items-center mt-1">
                                <Clock className="w-3 h-3 mr-1 text-neutral-400" />
                                {new Date(req.requestedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </p>
                            </td>

                            <td className="py-4 px-4 whitespace-nowrap">
                              <p className="font-bold text-sm text-neutral-900">{req.customerName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">
                                  {req.customerId}
                                </span>
                                {req.mobile && <span className="text-xs text-neutral-500">{req.mobile}</span>}
                              </div>
                            </td>

                            <td className="py-4 px-4">
                              <span className="inline-block px-2.5 py-1 bg-neutral-100 text-neutral-800 rounded font-bold text-xs font-mono">
                                {req.groupId}
                              </span>
                              {req.ticketNumber && (
                                <p className="text-[11px] text-neutral-500 mt-1">
                                  Ticket: <span className="font-bold text-neutral-700">#{req.ticketNumber}</span>
                                </p>
                              )}
                            </td>

                            <td className="py-4 px-4 text-xs">
                              {req.payoutMethod === 'Bank Transfer' ? (
                                <div>
                                  <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                                    Bank Transfer
                                  </span>
                                  <p className="font-medium text-neutral-800 mt-1">
                                    {req.payoutDetails?.bankName || 'Bank'} • A/C: <span className="font-mono font-bold">{req.payoutDetails?.accountNumber || '—'}</span>
                                  </p>
                                  <p className="text-[11px] text-neutral-500 font-mono">IFSC: {req.payoutDetails?.ifsc || '—'}</p>
                                </div>
                              ) : (
                                <div>
                                  <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold">
                                    UPI
                                  </span>
                                  <p className="font-mono font-bold text-neutral-800 mt-1">{req.payoutDetails?.upiId || '—'}</p>
                                </div>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <p className="text-base font-black text-amber-700">
                                ₹{Number(req.eligibleAmount).toLocaleString('en-IN')}
                              </p>
                              <span className="text-[10px] text-neutral-400">Net Prize Payout</span>
                            </td>

                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              {isPending && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5"></span>
                                  Awaiting Disbursal
                                </span>
                              )}
                              {isDisbursed && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3 h-3 mr-1" />
                                  Disbursed
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Rejected
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleRejectWithdrawal(req)}
                                    disabled={actionInProgress === req.id}
                                    className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                                  >
                                    Reject
                                  </button>
                                  <button
                                    onClick={() => openDisburseModal(req)}
                                    disabled={actionInProgress === req.id}
                                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary-900 hover:bg-primary-950 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                                  >
                                    <Award className="w-3.5 h-3.5 text-amber-300" />
                                    Process Disbursal
                                  </button>
                                </div>
                              ) : isDisbursed && req.disbursedRef ? (
                                <span className="text-[11px] font-mono font-medium text-neutral-500">Ref: {req.disbursedRef}</span>
                              ) : (
                                <span className="text-xs text-neutral-400 italic">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}



      {/* DISBURSEMENT CONFIRMATION MODAL */}
      {disbursingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-amber-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-100" />
                <h3 className="font-bold text-base">Confirm Prize Money Disbursal</h3>
              </div>
              <button 
                onClick={() => setDisbursingReq(null)}
                className="text-amber-100 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Customer:</span>
                  <span className="font-bold text-neutral-900">{disbursingReq.customerName} ({disbursingReq.customerId})</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Chit Group / Ticket:</span>
                  <span className="font-mono font-bold text-neutral-900">{disbursingReq.groupId} #{disbursingReq.ticketNumber || '1'}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-amber-200 pt-2">
                  <span className="font-bold text-neutral-700">Net Prize Payout:</span>
                  <span className="text-lg font-black text-amber-900">₹{Number(disbursingReq.eligibleAmount).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Customer Provided Bank / UPI Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Customer Destination Details</p>
                {disbursingReq.payoutMethod === 'Bank Transfer' ? (
                  <>
                    <p className="text-slate-600">Bank: <span className="font-semibold text-slate-900">{disbursingReq.payoutDetails?.bankName || 'N/A'}</span></p>
                    <p className="text-slate-600">Account No: <span className="font-mono font-bold text-slate-900">{disbursingReq.payoutDetails?.accountNumber || 'N/A'}</span></p>
                    <p className="text-slate-600">IFSC Code: <span className="font-mono font-bold text-slate-900">{disbursingReq.payoutDetails?.ifsc || 'N/A'}</span></p>
                  </>
                ) : (
                  <p className="text-slate-600">UPI ID: <span className="font-mono font-bold text-slate-900">{disbursingReq.payoutDetails?.upiId || 'N/A'}</span></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    Disbursal Mode
                  </label>
                  <select 
                    value={disburseModeInput}
                    onChange={e => setDisburseModeInput(e.target.value)}
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 uppercase tracking-wider mb-1">
                    UTR / Cheque Ref No.
                  </label>
                  <input 
                    type="text"
                    value={disburseRefInput}
                    onChange={e => setDisburseRefInput(e.target.value)}
                    placeholder="e.g. UTR182904820"
                    className="w-full bg-white border border-neutral-300 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  onClick={() => setDisbursingReq(null)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDisbursal}
                  disabled={actionInProgress === disbursingReq.id}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-900 hover:bg-primary-950 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  Approve & Disburse Payout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Proof Screenshot Viewer Modal */}
      {viewingProof && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary-200" />
                  Payment Proof Screenshot
                </h3>
                <p className="text-xs text-primary-200 mt-0.5">
                  {viewingProof.customerName} ({viewingProof.customerId}) · {viewingProof.groupName}
                </p>
              </div>
              <button 
                onClick={() => setViewingProof(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">Amount Paid</span>
                  <span className="font-bold text-neutral-900 text-sm">₹{Number(viewingProof.amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">Payment Mode</span>
                  <span className="font-bold text-primary-800">{viewingProof.mode}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">UTR / Ref No.</span>
                  <span className="font-mono font-bold text-neutral-900">{viewingProof.ref}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">Date Submitted</span>
                  <span className="font-semibold text-neutral-700">
                    {new Date(viewingProof.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-xl p-2 flex items-center justify-center max-h-[55vh] overflow-auto border border-neutral-300">
                <img 
                  src={viewingProof.url} 
                  alt="Customer Payment Receipt" 
                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-md"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <a
                  href={viewingProof.url}
                  target="_blank"
                  rel="noreferrer"
                  download={`receipt-${viewingProof.customerId}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open / Download Full Resolution
                </a>
                <button
                  type="button"
                  onClick={() => setViewingProof(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};


