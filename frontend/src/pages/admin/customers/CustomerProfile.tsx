import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { formatCurrency, formatDate } from '../../../utils/format';
import { 
  User, Phone, MapPin, Building, 
  Wallet, FileText, AlertCircle, CheckCircle2,
  Calendar, Mail, CreditCard, Activity, ArrowUpRight, ArrowDownRight, Clock, Layers, X, Users, BookOpen, Download, Award,
  Eye, ExternalLink, Printer, Landmark, Filter, UserX, UserCheck, Pencil, Check, Receipt
} from 'lucide-react';
import { cn } from '../../../utils/cn';
import { fetchClient } from '../../../api/client';
import { printCashReceipt } from '../../../utils/receiptPrinter';
import { downloadPassbookPDF } from '../../../utils/passbookPrinter';
import { calculateFixedPlanSchedule } from '../../../utils/chitCalculations';
import { 
  getStoredBankAccounts, 
  getStoredBankAssignments, 
  assignBankToCustomer, 
  resolveBankForPayment 
} from '../../../utils/bankAccountsData';
import { isMockGroup } from '../../../utils/cleanMockData';
import { addSystemNotification } from '../../../utils/notificationsData';

export const CustomerProfile = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [customer, setCustomer] = useState<any>(null);
  const [referralCount, setReferralCount] = useState(0);

  // Group Filter Scope: When arrived from a specific chit group (e.g. JJ-2), focus only on that group by default
  const initialGroup = searchParams.get('chitGroup') || searchParams.get('group') || searchParams.get('groupId') || '';
  const [selectedGroupScope, setSelectedGroupScope] = useState<string>(initialGroup);

  // Receive Payment Modal & Past Record States
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedChitForPayment, setSelectedChitForPayment] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMonth, setPaymentMonth] = useState('1');
  const [paymentReceiptNo, setPaymentReceiptNo] = useState('');
  const [paymentRemarks, setPaymentRemarks] = useState('');
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);

  // Disburse / Withdraw Modal States
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [selectedChitForWithdraw, setSelectedChitForWithdraw] = useState<any>(null);
  const [withdrawMonth, setWithdrawMonth] = useState<number>(2);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMode, setWithdrawMode] = useState('Bank Transfer');
  const [withdrawRef, setWithdrawRef] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [disbursalSuccessMsg, setDisbursalSuccessMsg] = useState<string | null>(null);
  const [selectedProofModal, setSelectedProofModal] = useState<any | null>(null);

  // Edit Transaction / Payment Modal States
  const [isEditTxnModalOpen, setIsEditTxnModalOpen] = useState(false);
  const [editingTxn, setEditingTxn] = useState<any | null>(null);
  const [editTxnAmount, setEditTxnAmount] = useState('');
  const [editTxnMode, setEditTxnMode] = useState('Cash');
  const [editTxnDate, setEditTxnDate] = useState('');
  const [editTxnDesc, setEditTxnDesc] = useState('');
  const [editTxnSuccessMsg, setEditTxnSuccessMsg] = useState<string | null>(null);

  // Date-wise Sorting States for Payment History & Digital Passbook
  const [paymentSortOrder, setPaymentSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [passbookSortOrder, setPassbookSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // Bank Customization States
  const [isChangeBankModalOpen, setIsChangeBankModalOpen] = useState(false);
  const [selectedBankToAssign, setSelectedBankToAssign] = useState('INHERIT');
  const [bankUpdateMsg, setBankUpdateMsg] = useState<string | null>(null);

  // Customer Status Deactivation States
  const [isStatusConfirmModalOpen, setIsStatusConfirmModalOpen] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [statusActionSuccess, setStatusActionSuccess] = useState<string | null>(null);

  const handleApproveAccount = async () => {
    if (!customer) return;
    setStatusActionLoading(true);
    const targetId = customer.id || customer.customerCode || id;
    const phone = (customer.mobile || customer.phone || '').replace(/\D/g, '');

    // 1. Update local storage
    const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const updatedCustomers = customers.map((c: any) => {
      const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
      if (c.id === targetId || c.mongoId === targetId || c.customerCode === targetId || (phone && cPhone === phone)) {
        return { ...c, status: 'ACTIVE' };
      }
      return c;
    });
    localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));

    setCustomer((prev: any) => ({ ...prev, status: 'ACTIVE' }));

    // 2. Sync to MongoDB backend
    try {
      await fetchClient(`/customers/${encodeURIComponent(customer.mongoId || targetId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACTIVE' })
      });
    } catch (err) {
      console.warn('Backend approval sync fallback in profile:', err);
    }

    // 3. Send real-time notification
    addSystemNotification({
      type: 'SYSTEM',
      title: 'Account Approved! 🎉',
      message: `Congratulations ${customer.name}! Your Jenista Chits account has been approved by the Administrator. You can now log into your customer portal using your registered mobile number.`,
      targetRole: 'CUSTOMER',
      targetUserId: customer.id || customer.phone || customer.mobile,
      metadata: {
        customerId: customer.id,
        customerName: customer.name
      }
    });

    window.dispatchEvent(new Event('storage'));
    setStatusActionLoading(false);
    setStatusActionSuccess('Customer approved successfully! Credentials are now active for portal login.');
    setTimeout(() => setStatusActionSuccess(null), 4000);
  };

  const handleToggleCustomerStatus = async () => {
    if (!customer) return;
    setStatusActionLoading(true);
    setStatusActionSuccess(null);

    const isCurrentlyDeactivated = customer.status === 'INACTIVE' || customer.status === 'DEACTIVATED';
    const newStatus = isCurrentlyDeactivated ? 'ACTIVE' : 'INACTIVE';
    const targetId = customer.id || customer.customerCode || id;
    const phone = (customer.mobile || customer.phone || '').replace(/\D/g, '');

    // 1. Update localStorage mockCustomers
    try {
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updatedCustomers = customers.map((c: any) => {
        const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
        if (
          c.id === targetId || 
          c.mongoId === targetId || 
          c.customerCode === targetId || 
          (phone && cPhone === phone)
        ) {
          return { ...c, status: newStatus };
        }
        return c;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));
    } catch (e) {
      console.warn('Error updating mockCustomers status:', e);
    }

    // 2. Update local state immediately
    setCustomer((prev: any) => ({ ...prev, status: newStatus }));

    // 3. Sync to backend API
    try {
      const mongoId = customer.mongoId || customer._id || targetId;
      await fetchClient(`/customers/${mongoId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.warn('Backend status update fallback:', err);
      // Try generic patch
      try {
        const mongoId = customer.mongoId || customer._id || targetId;
        await fetchClient(`/customers/${mongoId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus })
        });
      } catch (e) {
        console.warn('Generic customer patch also failed:', e);
      }
    }

    window.dispatchEvent(new Event('storage'));
    setStatusActionLoading(false);
    setIsStatusConfirmModalOpen(false);
    setStatusActionSuccess(
      newStatus === 'INACTIVE' 
        ? 'Customer deactivated successfully. App access has been restricted.' 
        : 'Customer reactivated successfully. App access has been restored.'
    );
    setTimeout(() => setStatusActionSuccess(null), 4000);
  };

  // Helper to resolve chits from all local and group sources
  const resolveChitsForCustomer = (custTarget: any, targetId: string) => {
    let chits: any[] = Array.isArray(custTarget?.chits) ? [...custTarget.chits] : [];
    const phone = (custTarget?.phone || custTarget?.mobile || '').replace(/\D/g, '');

    // 1. Check local mockCustomers
    const saved = localStorage.getItem('mockCustomers');
    if (saved) {
      const parsed = JSON.parse(saved);
      const local = parsed.find((c: any) => {
        const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
        return c.id === targetId || c.mongoId === targetId || c.customerCode === targetId || (phone && cPhone === phone);
      });
      if (local?.chits && Array.isArray(local.chits)) {
        local.chits.forEach((ch: any) => {
          if (!chits.some(existing => existing.groupId === ch.groupId) && !isMockGroup({ id: ch.groupId, name: ch.groupName })) {
            chits.push(ch);
          }
        });
      }
    }

    // 2. Check chitGroupMemberships
    const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    memberships.forEach((m: any) => {
      if (isMockGroup({ id: m.groupId, name: m.groupName })) return;
      const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
      if (
        m.customerId === targetId ||
        m.customerId === custTarget?.customerCode ||
        m.customerId === custTarget?.id ||
        (phone && mPhone === phone)
      ) {
        if (!chits.some(existing => existing.groupId === m.groupId)) {
          chits.push({
            groupId: m.groupId,
            groupName: m.groupName || m.groupId,
            scheme: m.scheme || 'Fixed Chit Plan',
            ticketNumber: m.ticketNumber || '1',
            chitValue: m.chitValue || 100000,
            monthlyInstallment: m.monthlyInstallment || 5000,
            dueDate: m.dueDate,
            joiningDate: m.joiningDate || new Date().toISOString(),
            paymentStatus: m.paymentStatus || 'PAID',
            status: m.status || 'Active',
            isWithdrawn: m.isWithdrawn || false,
            withdrawnAmount: m.withdrawnAmount || 0,
            withdrawnAt: m.withdrawnAt || null
          });
        }
      }
    });

    // 3. Check mockChitGroups enrolledMembers
    const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
    groups.forEach((g: any) => {
      if (isMockGroup(g)) return;
      if (Array.isArray(g.enrolledMembers)) {
        g.enrolledMembers.forEach((m: any) => {
          const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
          if (
            m.customerId === targetId ||
            m.customerId === custTarget?.customerCode ||
            m.customerId === custTarget?.id ||
            (phone && mPhone === phone)
          ) {
            const grpCode = g.code || g.id;
            if (!chits.some(existing => existing.groupId === grpCode)) {
              chits.push({
                groupId: grpCode,
                groupName: g.name || grpCode,
                scheme: g.scheme || 'Chit Plan',
                ticketNumber: m.ticketNumber || '1',
                chitValue: g.chitValue || m.chitValue || 100000,
                monthlyInstallment: g.monthlyInstallment || m.monthlyInstallment || 5000,
                dueDate: m.dueDate,
                joiningDate: m.joiningDate || new Date().toISOString(),
                paymentStatus: m.paymentStatus || 'PAID',
                status: m.status || 'Active',
                isWithdrawn: m.isWithdrawn || false,
                withdrawnAmount: m.withdrawnAmount || 0,
                withdrawnAt: m.withdrawnAt || null
              });
            }
          }
        });
      }
    });

    // 4. Check ledger transactions referencing groups (e.g. TC-73071 / FIXED-...)
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    ledger.forEach((tx: any) => {
      const ref = tx.reference || '';
      if ((ref.includes(targetId) || (custTarget?.customerCode && ref.includes(custTarget.customerCode))) && ref.includes(' / ')) {
        const parts = ref.split(' / ');
        const grpCode = parts[1]?.trim();
        if (grpCode && !chits.some(existing => existing.groupId === grpCode)) {
          chits.push({
            groupId: grpCode,
            groupName: grpCode,
            scheme: grpCode.includes('FIXED') ? 'Fixed Chit Plan' : 'Auction Chit Plan',
            ticketNumber: '1',
            chitValue: 100000,
            monthlyInstallment: 5000,
            joiningDate: tx.date || new Date().toISOString(),
            paymentStatus: 'PAID',
            status: 'Active',
            isWithdrawn: false,
            withdrawnAmount: 0
          });
        }
      }
    });

    return chits;
  };

  useEffect(() => {
    const loadCustomer = async () => {
      if (!id) return;

      // Calculate total verified payments directly from ledger transactions
      const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
      const customerLedgerCredits = ledger.filter((t: any) => 
        (t.type === 'CREDIT' || t.category === 'INSTALLMENT') && 
        (t.customerId === id || t.reference?.includes(id) || t.description?.includes(id))
      );
      const ledgerTotalPaid = customerLedgerCredits.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      const customerLedgerDebits = ledger.filter((t: any) => 
        t.type === 'DEBIT' && 
        (t.customerId === id || t.reference?.includes(id) || t.description?.includes(id))
      );
      const ledgerTotalWithdrawn = customerLedgerDebits.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      // Local storage fallback data
      const saved = localStorage.getItem('mockCustomers');
      let localFound: any = null;
      if (saved) {
        const parsed = JSON.parse(saved);
        localFound = parsed.find((c: any) => c.id === id || c.mongoId === id || c.customerCode === id);
        if (localFound) {
          const referrals = parsed.filter((c: any) => c.referredBy === localFound.id);
          setReferralCount(referrals.length);
        }
      }

      // 1. Fetch from MongoDB
      let mongoFound: any = null;
      try {
        const res = await fetchClient(`/customers?search=${id}`);
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          mongoFound = res.data.find((c: any) => c.customerCode === id || c._id === id) || res.data[0];
        }
      } catch (err) {
        console.warn('Could not fetch customer profile from API:', err);
      }

      // 2. Query all local data sources for customer data
      // A. websiteLeads (e.g. Lead converted to customer)
      const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
      let matchedLead = storedLeads.find((l: any) => 
        l.convertedCustomerId === id || 
        l.id === id || 
        (l.phone && (id.replace(/\D/g, '').length >= 10 && id.replace(/\D/g, '') === l.phone.replace(/\D/g, '')))
      );

      // If no lead matched directly by ID, check if any converted lead has this customer ID or phone in transactions
      if (!matchedLead) {
        matchedLead = storedLeads.find((l: any) => l.status === 'CONVERTED' && !l.convertedCustomerId);
        if (matchedLead) {
          matchedLead.convertedCustomerId = id;
          try {
            localStorage.setItem('websiteLeads', JSON.stringify(storedLeads));
          } catch (e) {}
        }
      }

      // B. ledgerTransactions (check if real name or phone was recorded during transactions)
      const ledgerTxnWithRealName = ledger.find((t: any) => 
        (t.customerId === id || t.reference?.includes(id) || t.description?.includes(id)) && 
        t.customerName && 
        t.customerName.trim().toLowerCase() !== 'customer' && 
        t.customerName.trim().toLowerCase() !== 'n/a'
      );

      // C. withdrawalRequests
      const withdrawals = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
      const withdrawalWithRealName = withdrawals.find((w: any) => 
        (w.customerId === id || w.customerCode === id) && 
        w.customerName && 
        w.customerName.trim().toLowerCase() !== 'customer'
      );

      // D. paymentRequests
      const paymentReqs = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      const payReqWithRealName = paymentReqs.find((p: any) => 
        (p.customerId === id || p.customerCode === id) && 
        p.customerName && 
        p.customerName.trim().toLowerCase() !== 'customer'
      );

      // E. chitGroupMemberships or mockChitGroups
      const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      const mem = memberships.find((m: any) => m.customerId === id || (id.replace(/\D/g, '') && (m.mobile || m.phone || '').replace(/\D/g, '') === id.replace(/\D/g, '')));
      const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
      let groupMem: any = null;
      groups.forEach((g: any) => {
        if (Array.isArray(g.enrolledMembers)) {
          const foundM = g.enrolledMembers.find((m: any) => m.customerId === id || (id.replace(/\D/g, '') && (m.mobile || m.phone || '').replace(/\D/g, '') === id.replace(/\D/g, '')));
          if (foundM) groupMem = { ...foundM, groupId: g.code || g.id, groupName: g.name };
        }
      });

      // 3. Resolve real Customer Name (reject 'Customer' and 'N/A' placeholders)
      const candidateNames = [
        mongoFound?.fullName,
        mongoFound?.name,
        localFound?.name,
        localFound?.fullName,
        matchedLead?.fullName,
        matchedLead?.name,
        ledgerTxnWithRealName?.customerName,
        withdrawalWithRealName?.customerName,
        payReqWithRealName?.customerName,
        mem?.customerName,
        groupMem?.customerName,
      ].filter(n => n && typeof n === 'string' && n.trim() !== '' && n.trim().toLowerCase() !== 'customer' && n.trim().toLowerCase() !== 'n/a');

      const resolvedName = candidateNames[0] || (localFound?.name && localFound.name !== 'Customer' ? localFound.name : 'Customer');

      // 4. Resolve real Phone Number
      const candidatePhones = [
        mongoFound?.phone,
        mongoFound?.mobile,
        localFound?.mobile,
        localFound?.phone,
        matchedLead?.phone,
        matchedLead?.mobile,
        withdrawalWithRealName?.mobile,
        withdrawalWithRealName?.phone,
        payReqWithRealName?.customerMobile,
        mem?.mobile,
        mem?.phone,
        groupMem?.mobile,
        groupMem?.phone,
      ].filter(p => p && typeof p === 'string' && p.trim() !== '' && p.trim().toLowerCase() !== 'n/a');

      const resolvedPhone = candidatePhones[0] || (id.startsWith('9') || id.startsWith('8') || id.startsWith('7') || id.startsWith('6') ? id : '');
      const resolvedEmail = mongoFound?.email || localFound?.email || matchedLead?.email || '';
      const resolvedAddress = mongoFound?.address || localFound?.address || matchedLead?.address || '—';
      const resolvedAadhar = mongoFound?.aadhar || localFound?.aadhar || matchedLead?.aadhar || '—';
      const resolvedPan = mongoFound?.pan || localFound?.pan || matchedLead?.pan || '—';

      const baseRecord = mongoFound || localFound || mem || groupMem || {};
      const resolvedChits = resolveChitsForCustomer(baseRecord, id);
      const trueTotalPaid = Math.max(Number(baseRecord.totalPaid || 0), Number(localFound?.totalPaid || 0), ledgerTotalPaid);
      const trueWithdrawn = Math.max(
        Number(baseRecord.withdrawnAmount || 0),
        resolvedChits.filter((ch: any) => ch.isWithdrawn).reduce((sum: number, ch: any) => sum + Number(ch.withdrawnAmount || 0), 0),
        ledgerTotalWithdrawn
      );

      const customerObj = {
        id: id,
        mongoId: mongoFound?._id || localFound?.mongoId,
        customerCode: id,
        name: resolvedName,
        fullName: resolvedName,
        mobile: resolvedPhone,
        phone: resolvedPhone,
        email: resolvedEmail,
        address: resolvedAddress,
        aadhar: resolvedAadhar,
        pan: resolvedPan,
        branch: mongoFound?.branchId?.branchName || localFound?.branch || 'Head Office',
        agent: mongoFound?.assignedAgentId?.name || localFound?.agent || 'System Admin',
        totalPaid: trueTotalPaid,
        pending: baseRecord.pending !== undefined ? baseRecord.pending : (localFound?.pending || 0),
        activeChits: resolvedChits.length,
        chits: resolvedChits,
        withdrawnAmount: trueWithdrawn,
        status: baseRecord.status || localFound?.status || 'ACTIVE'
      };

      setCustomer(customerObj);

      // Permanently update mockCustomers so this record is never lost
      const currentCustomers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const existsIndex = currentCustomers.findIndex((c: any) => c.id === id || c.customerCode === id || (c.mongoId && c.mongoId === id));
      if (existsIndex >= 0) {
        currentCustomers[existsIndex] = { ...currentCustomers[existsIndex], ...customerObj };
      } else {
        currentCustomers.unshift(customerObj);
      }
      localStorage.setItem('mockCustomers', JSON.stringify(currentCustomers));

      // Self-heal ledgerTransactions if customerName was recorded as 'Customer'
      if (resolvedName && resolvedName !== 'Customer') {
        let hasLedgerChanges = false;
        const updatedLedger = ledger.map((t: any) => {
          if ((t.customerId === id || t.reference?.includes(id)) && (!t.customerName || t.customerName === 'Customer')) {
            hasLedgerChanges = true;
            return { ...t, customerName: resolvedName };
          }
          return t;
        });
        if (hasLedgerChanges) {
          localStorage.setItem('ledgerTransactions', JSON.stringify(updatedLedger));
        }
      }

      // Auto-heal MongoDB backend record if connected
      const targetMongoId = mongoFound?._id || localFound?.mongoId;
      if (targetMongoId) {
        fetchClient(`/customers/${targetMongoId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fullName: resolvedName,
            phone: resolvedPhone,
            totalPaid: trueTotalPaid,
            chits: resolvedChits
          })
        }).catch(err => console.warn('Could not auto-sync customer to MongoDB:', err));
      }
    };

    loadCustomer();
    window.addEventListener('storage', loadCustomer);
    const interval = setInterval(loadCustomer, 4000);
    return () => {
      window.removeEventListener('storage', loadCustomer);
      clearInterval(interval);
    };
  }, [id]);

  // Handle URL query action to automatically open Receive Payment modal
  useEffect(() => {
    const action = searchParams.get('action');
    const pay = searchParams.get('pay');
    const groupParam = searchParams.get('chitGroup') || searchParams.get('groupId');
    const amountParam = searchParams.get('amount');

    if (action === 'receive-payment' || pay === 'true' || searchParams.has('receivePayment')) {
      setIsPaymentModalOpen(true);
      if (groupParam) {
        setSelectedChitForPayment(groupParam);
      }
      if (amountParam) {
        setPaymentAmount(amountParam);
      }
    }
  }, [searchParams, customer]);

  // Open Disbursal / Withdrawal Modal
  const openWithdrawModal = (chit: any) => {
    const chitVal = Number(chit.chitValue || chit.amount || 100000);
    const isFixedScheme = String(chit.scheme || chit.groupId || chit.groupName || '').toLowerCase().includes('fix');
    const defaultMonth = 2; // Default to Month 2 as Month 1 is Company chit
    setWithdrawMonth(defaultMonth);
    setSelectedChitForWithdraw(chit);

    if (isFixedScheme) {
      const fixedDetails = calculateFixedPlanSchedule(chitVal, 20);
      const row = fixedDetails.schedule.find(r => r.month === defaultMonth);
      const payout = row?.payout || Math.round(chitVal * 0.70);
      setWithdrawAmount(String(payout));
    } else {
      const eligibleAmount = Math.round(chitVal * 0.95);
      setWithdrawAmount(String(eligibleAmount));
    }

    setWithdrawMode('Bank Transfer');
    setWithdrawRef('');
    setWithdrawNotes(`Prize money disbursal for ${chit.groupId} - Month ${defaultMonth}`);
    setIsWithdrawModalOpen(true);
  };

  const handleWithdrawMonthChange = (m: number) => {
    setWithdrawMonth(m);
    if (!selectedChitForWithdraw) return;
    const chitVal = Number(selectedChitForWithdraw.chitValue || selectedChitForWithdraw.amount || 100000);
    const isFixedScheme = String(selectedChitForWithdraw.scheme || selectedChitForWithdraw.groupId || selectedChitForWithdraw.groupName || '').toLowerCase().includes('fix');

    if (m === 1) {
      setWithdrawAmount('0');
      setWithdrawNotes('Month 1 is Company / Foreman Chit');
    } else if (isFixedScheme) {
      const fixedDetails = calculateFixedPlanSchedule(chitVal, 20);
      const row = fixedDetails.schedule.find(r => r.month === m);
      if (row) {
        setWithdrawAmount(String(row.payout));
        setWithdrawNotes(`Prize payout for Month ${m} (${(row.payoutPct * 100).toFixed(0)}%)`);
      }
    } else {
      const ratio = m === 20 ? 0.95 : (0.70 + ((m - 1) / 20) * 0.25);
      setWithdrawAmount(String(Math.round(chitVal * ratio)));
      setWithdrawNotes(`Prize payout for Month ${m}`);
    }
  };

  // Confirm Withdrawal & Disburse Prize Money
  const handleConfirmWithdrawal = () => {
    if (!customer || !selectedChitForWithdraw || !withdrawAmount || isNaN(Number(withdrawAmount))) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }

    if (withdrawMonth === 1) {
      alert('Month 1 is reserved for Company / Foreman Chit and cannot be disbursed to members.');
      return;
    }

    const amount = Number(withdrawAmount);
    const payoutRefNo = withdrawRef.trim() || `DISB-${Date.now().toString().slice(-6)}`;
    const chitVal = Number(selectedChitForWithdraw.chitValue || selectedChitForWithdraw.amount || 100000);
    const fixedDetails = calculateFixedPlanSchedule(chitVal, 20);
    const nextMonthRow = fixedDetails.schedule.find(r => r.month === withdrawMonth + 1);
    const baseInstallment = nextMonthRow?.due || Math.round(chitVal / 20);
    const postInstallment = baseInstallment + Math.round((chitVal * 0.01) / 20);

    // 1. Update customer chits
    const updatedChits = customer.chits.map((c: any) => {
      if (c.groupId === selectedChitForWithdraw.groupId) {
        return {
          ...c,
          isWithdrawn: true,
          withdrawnAmount: amount,
          withdrawnAt: new Date().toISOString(),
          payoutMode: withdrawMode,
          payoutRef: payoutRefNo,
          disbursedMonth: withdrawMonth,
          postInstallmentDue: postInstallment,
          status: 'Withdrawn'
        };
      }
      return c;
    });

    const updatedCustomer = {
      ...customer,
      chits: updatedChits,
      withdrawnAmount: (Number(customer.withdrawnAmount || 0)) + amount
    };
    setCustomer(updatedCustomer);

    // 2. Add DEBIT record to ledgerTransactions
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const newTxn = {
      id: `DISB-${Date.now().toString().slice(-6)}`,
      date: new Date().toISOString(),
      reference: `${displayId} / ${selectedChitForWithdraw.groupId}`,
      description: `Prize Money Disbursal - Month ${withdrawMonth} (${withdrawMode} Ref: ${payoutRefNo})`,
      amount: amount,
      type: 'DEBIT',
      category: 'DISBURSAL',
      customerName: displayName,
      customerId: displayId,
      groupId: selectedChitForWithdraw.groupId,
      status: 'DISBURSED'
    };
    localStorage.setItem('ledgerTransactions', JSON.stringify([newTxn, ...ledger]));

    // 3. Update mockCustomers
    const saved = localStorage.getItem('mockCustomers');
    if (saved) {
      const parsed = JSON.parse(saved);
      const newCustomers = parsed.map((c: any) => (c.id === displayId || c.mongoId === displayId) ? updatedCustomer : c);
      localStorage.setItem('mockCustomers', JSON.stringify(newCustomers));
    }

    // 4. Update chitGroupMemberships
    const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const updatedMemberships = memberships.map((m: any) => {
      if ((m.customerId === displayId || m.customerId === customer?.customerCode) && m.groupId === selectedChitForWithdraw.groupId) {
        return {
          ...m,
          isWithdrawn: true,
          withdrawnAmount: amount,
          withdrawnAt: new Date().toISOString(),
          disbursedMonth: withdrawMonth,
          postInstallmentDue: postInstallment,
          status: 'Withdrawn'
        };
      }
      return m;
    });
    localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

    // 5. Update any pending customer withdrawal request
    const wReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
    const updatedWReqs = wReqs.map((r: any) => {
      if (r.customerId === displayId && r.groupId === selectedChitForWithdraw.groupId && r.status === 'PENDING_ADMIN_DISBURSAL') {
        return {
          ...r,
          status: 'DISBURSED',
          disbursedAt: new Date().toISOString(),
          disbursedMonth: withdrawMonth,
          disbursedRef: payoutRefNo
        };
      }
      return r;
    });
    localStorage.setItem('withdrawalRequests', JSON.stringify(updatedWReqs));

    // 5b. Dispatch System Notification to Admin, Staff & Customer with Full Group, Month & Post-Disbursal info
    try {
      addSystemNotification({
        type: 'PRIZE_DISBURSED',
        title: 'Prize Money Disbursed 🏆',
        message: `🏆 Disbursal Complete | Group: ${selectedChitForWithdraw.groupId} | Month ${withdrawMonth} | Ticket #${selectedChitForWithdraw.ticketNumber || '1'} | Winner: ${displayName} | Amount: ₹${amount.toLocaleString('en-IN')} via ${withdrawMode} (Ref: ${payoutRefNo}). Post-disbursal installment from Month ${withdrawMonth + 1}: ₹${postInstallment.toLocaleString('en-IN')}/mo.`,
        targetRole: 'ALL',
        metadata: {
          customerId: displayId,
          customerName: displayName,
          groupId: selectedChitForWithdraw.groupId,
          groupName: selectedChitForWithdraw.groupName || selectedChitForWithdraw.groupId,
          month: withdrawMonth,
          ticketNumber: selectedChitForWithdraw.ticketNumber || '1',
          amount: amount,
          postInstallment: postInstallment,
          referenceNo: payoutRefNo
        }
      });

      addSystemNotification({
        type: 'PRIZE_DISBURSED',
        title: 'Prize Money Disbursed! 🏆',
        message: `Your prize payout of ₹${amount.toLocaleString('en-IN')} for Group ${selectedChitForWithdraw.groupId} (Month ${withdrawMonth}) has been disbursed via ${withdrawMode} (Ref: ${payoutRefNo}). Your post-disbursal monthly installment from Month ${withdrawMonth + 1} will be ₹${postInstallment.toLocaleString('en-IN')}/mo (includes 1% prized member fee).`,
        targetRole: 'CUSTOMER',
        targetUserId: displayId,
        metadata: {
          customerId: displayId,
          customerName: displayName,
          groupId: selectedChitForWithdraw.groupId,
          month: withdrawMonth,
          ticketNumber: selectedChitForWithdraw.ticketNumber || '1',
          amount: amount,
          postInstallment: postInstallment,
          referenceNo: payoutRefNo
        }
      });
    } catch (notifErr) {
      console.warn('Could not dispatch prize disbursal notification:', notifErr);
    }

    // 6. Sync to backend MongoDB
    const targetMongoId = customer.mongoId || customer.id || id;
    if (targetMongoId) {
      fetchClient(`/customers/${targetMongoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          chits: updatedChits
        })
      }).catch(err => console.warn('Could not sync chit withdrawal to MongoDB:', err));
    }

    window.dispatchEvent(new Event('storage'));
    setIsWithdrawModalOpen(false);
    setDisbursalSuccessMsg(`Prize money of ₹${amount.toLocaleString('en-IN')} disbursed successfully to ${displayName}! (Ref: ${payoutRefNo})`);
    setTimeout(() => setDisbursalSuccessMsg(null), 5000);
  };

  const handleReceivePayment = () => {
    if (!paymentAmount || isNaN(Number(paymentAmount)) || !customer) return;

    const amount = Number(paymentAmount);
    const txnDate = paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString();
    const txnId = paymentReceiptNo.trim() || ('REC-' + Math.floor(100000 + Math.random() * 900000));
    const targetGroupId = selectedChitForPayment || selectedGroupScope;
    const targetMonthStr = paymentMonth && paymentMonth !== 'GENERAL' ? `Month ${paymentMonth}` : 'General Installment';
    const groupRef = targetGroupId && targetGroupId !== 'ALL' ? `${targetGroupId} (${targetMonthStr})` : targetMonthStr;
    
    // Add to ledger
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const newTxn = {
      id: txnId,
      date: txnDate,
      reference: `${customer.id || displayId} / ${groupRef}`,
      description: `Installment Payment - ${targetMonthStr} (${paymentMode})${paymentRemarks ? ' - ' + paymentRemarks : ''}`,
      amount: amount,
      type: 'CREDIT',
      category: 'INSTALLMENT',
      customerName: displayName,
      customerId: displayId,
      month: Number(paymentMonth) || 1,
      paymentMode: paymentMode,
      status: 'VERIFIED',
      notes: paymentRemarks || undefined
    };
    localStorage.setItem('ledgerTransactions', JSON.stringify([newTxn, ...ledger]));

    // Update customer totalPaid and mark chit as PAID if paying for group
    const newTotalPaid = (customer.totalPaid || 0) + amount;
    const newPending = Math.max(0, (customer.pending || 0) - amount);

    const updatedChits = (customer.chits || []).map((ch: any) => {
      if (
        !targetGroupId ||
        targetGroupId === 'ALL' ||
        ch.groupId === targetGroupId ||
        ch.groupName === targetGroupId
      ) {
        return {
          ...ch,
          paymentStatus: 'PAID'
        };
      }
      return ch;
    });

    const updatedCustomer = {
      ...customer,
      totalPaid: newTotalPaid,
      pending: newPending,
      chits: updatedChits
    };
    
    setCustomer(updatedCustomer);
    
    // Update mockCustomers
    const saved = localStorage.getItem('mockCustomers');
    if (saved) {
      const parsed = JSON.parse(saved);
      const newCustomers = parsed.map((c: any) => 
        (c.id === customer.id || c.customerCode === customer.customerCode || c.mongoId === customer.mongoId) 
          ? updatedCustomer 
          : c
      );
      localStorage.setItem('mockCustomers', JSON.stringify(newCustomers));
    }

    // Update chitGroupMemberships
    if (targetGroupId && targetGroupId !== 'ALL') {
      const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      const updatedMemberships = memberships.map((m: any) => {
        if (
          (m.customerId === displayId || m.customerId === customer?.customerCode || m.customerId === customer?.id) &&
          (m.groupId === targetGroupId || m.groupName === targetGroupId)
        ) {
          return { ...m, paymentStatus: 'PAID' };
        }
        return m;
      });
      localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

      // Update mockChitGroups enrolledMembers
      const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
      const updatedGroups = groups.map((g: any) => {
        if (g.code === targetGroupId || g.id === targetGroupId || g.name === targetGroupId) {
          if (Array.isArray(g.enrolledMembers)) {
            const updatedEnrolled = g.enrolledMembers.map((em: any) => {
              if (em.customerId === displayId || em.customerId === customer?.customerCode || em.customerId === customer?.id) {
                return { ...em, paymentStatus: 'PAID' };
              }
              return em;
            });
            return { ...g, enrolledMembers: updatedEnrolled };
          }
        }
        return g;
      });
      localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
    }

    // Sync to backend MongoDB
    const targetMongoId = customer.mongoId || customer.id || id;
    if (targetMongoId) {
      fetchClient(`/customers/${targetMongoId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          totalPaid: newTotalPaid,
          pending: newPending,
          chits: updatedChits
        })
      }).catch(err => console.warn('Could not sync payment to MongoDB:', err));
    }

    window.dispatchEvent(new Event('storage'));
    setIsPaymentModalOpen(false);
    setPaymentSuccessToast(`Payment record of ₹${amount.toLocaleString('en-IN')} for ${targetMonthStr} on ${paymentDate} added successfully! (Receipt: ${txnId})`);
    setTimeout(() => setPaymentSuccessToast(null), 6000);
    setPaymentAmount('');
    setSelectedChitForPayment('');
    setPaymentRemarks('');
    setPaymentReceiptNo('');
  };

  // Dynamic values or clean fallbacks
  const displayName = customer?.name || customer?.fullName || 'Customer';
  const displayId = customer?.id || customer?.customerCode || id || 'N/A';
  const displayPhone = customer?.mobile || customer?.phone || 'N/A';
  const displayEmail = customer?.email || 'N/A';
  const displayAddress = customer?.address || 'N/A';
  const displayAadhar = customer?.aadhar || '—';
  const displayPan = customer?.pan || '—';

  const displayActiveChits = customer?.chits?.length || customer?.activeChits || 0;
  const displayAgent = customer?.agent || 'System Admin';
  
  const handlePrintReceiptSlip = (tx: any) => {
    printCashReceipt({
      receiptNo: tx.id,
      date: tx.date,
      customerName: displayName,
      customerId: displayId,
      customerMobile: displayPhone !== 'N/A' ? displayPhone : '',
      groupName: tx.desc || tx.reference || (customer?.chits?.[0]?.groupName || customer?.chits?.[0]?.groupId || 'Chit Fund Group'),
      paymentMode: tx.paymentMode || ((tx.title || tx.description || '').toLowerCase().includes('cash') ? 'CASH' : 'Online / Bank'),
      amount: tx.amount,
      description: tx.title || tx.description || tx.desc || 'Installment Payment',
      referenceNo: tx.referenceNo || tx.reference,
      collectedBy: displayAgent || 'Jenista Cash Counter'
    });
  };

  // Helper to safely format dates
  const formatChitDate = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (e) {}
    return String(dateVal);
  };

  // Helper to compile passbook transactions with running balance
  const getPassbookData = () => {
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    let customerTxns = ledger.filter((t: any) => 
      displayId !== 'N/A' && (t.reference?.includes(displayId) || t.description?.includes(displayId) || t.customerId === displayId)
    ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (selectedGroupScope && selectedGroupScope !== 'ALL') {
      customerTxns = customerTxns.filter((t: any) => matchesGroupScope(t, selectedGroupScope));
    }

    let runningBalance = 0;
    const processedTxns = customerTxns.map((t: any) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'CREDIT') {
        runningBalance += amt;
      } else {
        runningBalance -= amt;
      }
      return {
        id: t.id,
        date: t.date,
        description: t.description || 'Transaction',
        reference: t.reference,
        type: t.type as 'CREDIT' | 'DEBIT',
        amount: amt,
        paymentMode: t.paymentMode,
        runningBalance: runningBalance
      };
    });

    return { customerTxns: processedTxns, runningBalance };
  };

  // Download official Digital Passbook statement as PDF
  const handleDownloadPassbook = () => {
    const { customerTxns, runningBalance } = getPassbookData();
    const totalDebits = customerTxns
      .filter((t: any) => t.type === 'DEBIT')
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    downloadPassbookPDF({
      customerName: displayName,
      customerId: displayId,
      customerMobile: displayPhone !== 'N/A' ? displayPhone : '',
      customerEmail: displayEmail !== 'N/A' ? displayEmail : '',
      customerAddress: displayAddress !== 'N/A' ? displayAddress : '',
      groupScope: selectedGroupScope,
      totalPaid: displayTotalPaid,
      totalWithdrawn: totalDebits,
      currentBalance: runningBalance,
      pendingDue: scopedPending,
      transactions: customerTxns,
    });
  };

  // Open Edit Transaction modal
  const handleOpenEditTxn = (txn: any) => {
    setEditingTxn(txn);
    setEditTxnAmount(String(txn.amount || ''));
    setEditTxnMode(txn.paymentMode || ((txn.description || '').toLowerCase().includes('cash') ? 'Cash' : 'Bank Transfer'));
    setEditTxnDate(txn.date ? new Date(txn.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setEditTxnDesc(txn.description || '');
    setEditTxnSuccessMsg(null);
    setIsEditTxnModalOpen(true);
  };

  // Save edited transaction
  const handleSaveEditTxn = () => {
    if (!editingTxn) return;
    const newAmount = Number(editTxnAmount);
    if (isNaN(newAmount) || newAmount <= 0) {
      alert('Please enter a valid amount greater than 0.');
      return;
    }

    const oldAmount = Number(editingTxn.amount) || 0;
    const delta = newAmount - oldAmount;
    const isCredit = editingTxn.type === 'CREDIT';

    // 1. Update ledgerTransactions in localStorage
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const updatedLedger = ledger.map((t: any) => {
      if (t.id === editingTxn.id) {
        let updatedDesc = editTxnDesc.trim();
        if (editTxnMode.toLowerCase() === 'cash' && !updatedDesc.toLowerCase().includes('cash')) {
          updatedDesc = updatedDesc.replace(/\((.*?)\)/, `(Cash Ref: ${t.id})`);
          if (!updatedDesc.includes('Cash')) updatedDesc += ' (Cash)';
        }
        return {
          ...t,
          amount: newAmount,
          description: updatedDesc,
          date: new Date(editTxnDate).toISOString(),
          paymentMode: editTxnMode,
        };
      }
      return t;
    });
    localStorage.setItem('ledgerTransactions', JSON.stringify(updatedLedger));

    // 2. Adjust customer totalPaid or withdrawnAmount
    if (customer) {
      const updatedCustomer = { ...customer };
      if (isCredit) {
        updatedCustomer.totalPaid = Math.max(0, (Number(customer.totalPaid) || 0) + delta);
      } else {
        updatedCustomer.withdrawnAmount = Math.max(0, (Number(customer.withdrawnAmount) || 0) + delta);
      }
      setCustomer(updatedCustomer);

      const saved = localStorage.getItem('mockCustomers');
      if (saved) {
        const parsed = JSON.parse(saved);
        const newCustomers = parsed.map((c: any) => 
          (c.id === displayId || c.mongoId === displayId || c.customerCode === displayId) ? updatedCustomer : c
        );
        localStorage.setItem('mockCustomers', JSON.stringify(newCustomers));
      }

      // Sync to MongoDB if applicable
      const targetMongoId = customer.mongoId || customer.id || id;
      if (targetMongoId) {
        fetchClient(`/customers/${targetMongoId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            totalPaid: updatedCustomer.totalPaid,
            withdrawnAmount: updatedCustomer.withdrawnAmount
          })
        }).catch(err => console.warn('Could not sync customer payment edit to MongoDB:', err));
      }
    }

    // 3. Dispatch system notification for audit trail
    try {
      addSystemNotification({
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Record Updated',
        message: `Transaction ${editingTxn.id} for ${displayName} was updated: Amount changed from ₹${oldAmount.toLocaleString('en-IN')} to ₹${newAmount.toLocaleString('en-IN')} (${editTxnMode}).`,
        targetRole: 'ADMIN',
        metadata: {
          customerId: displayId,
          customerName: displayName,
          txnId: editingTxn.id,
          oldAmount,
          newAmount,
          mode: editTxnMode
        }
      });
    } catch (err) {
      console.warn('Could not add edit notification:', err);
    }

    // 4. Trigger storage event to refresh all dependent UI
    window.dispatchEvent(new Event('storage'));

    setEditTxnSuccessMsg(`Transaction updated successfully! Amount changed to ₹${newAmount.toLocaleString('en-IN')}.`);
    setTimeout(() => {
      setIsEditTxnModalOpen(false);
      setEditTxnSuccessMsg(null);
    }, 1200);
  };

  // Helper to test if a transaction belongs to the scoped group
  const matchesGroupScope = (t: any, groupKey: string) => {
    if (!groupKey || groupKey === 'ALL') return true;
    const ref = (t.reference || t.desc || '').toLowerCase();
    const grp = groupKey.toLowerCase();
    const desc = (t.description || t.title || '').toLowerCase();
    return ref.includes(grp) || desc.includes(grp) || (t.groupId && t.groupId.toLowerCase().includes(grp));
  };

  // Real transactions from ledger for recent activity (overall)
  const allRecentActivity = (() => {
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const paymentReqs = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
    return ledger.filter((t: any) => 
      (displayId !== 'N/A' && (t.reference?.includes(displayId) || t.description?.includes(displayId) || t.customerId === displayId))
    ).map((t: any) => {
      const matchedReq = paymentReqs.find((r: any) => 
        (r.customerId === t.customerId || (t.reference && t.reference.includes(r.customerId))) &&
        (r.paymentScreenshot || r.screenshotUrl)
      );
      const proofImg = t.paymentScreenshot || t.screenshotUrl || matchedReq?.paymentScreenshot || matchedReq?.screenshotUrl;
      return {
        id: t.id,
        title: t.description || 'Payment Transaction',
        amount: t.amount,
        desc: t.reference || 'Ledger Entry',
        date: new Date(t.date),
        type: t.type === 'CREDIT' ? 'credit' : 'debit',
        proofImg: proofImg,
        rawTxn: t
      };
    });
  })();

  // Filtered transactions when a particular group is scoped
  const recentActivity = selectedGroupScope && selectedGroupScope !== 'ALL'
    ? allRecentActivity.filter((a: any) => matchesGroupScope(a.rawTxn, selectedGroupScope))
    : allRecentActivity;

  // Group-scoped and overall calculations
  const scopedChits = (selectedGroupScope && selectedGroupScope !== 'ALL')
    ? (customer?.chits || []).filter((ch: any) => 
        ch.groupId === selectedGroupScope || 
        ch.groupName === selectedGroupScope || 
        (ch.groupId && ch.groupId.toLowerCase().includes(selectedGroupScope.toLowerCase())) ||
        (ch.groupName && ch.groupName.toLowerCase().includes(selectedGroupScope.toLowerCase()))
      )
    : (customer?.chits || []);

  // Total Paid: scoped vs overall
  const scopedLedgerTotalPaid = recentActivity.filter((a: any) => a.type === 'credit').reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  const overallLedgerTotalPaid = allRecentActivity.filter((a: any) => a.type === 'credit').reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  const displayTotalPaid = (selectedGroupScope && selectedGroupScope !== 'ALL')
    ? scopedLedgerTotalPaid
    : Math.max(Number(customer?.totalPaid || 0), overallLedgerTotalPaid);

  // Total Withdrawn: scoped vs overall
  const scopedLedgerTotalWithdrawn = recentActivity.filter((a: any) => a.type === 'debit').reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0);
  const scopedChitsWithdrawnSum = scopedChits.filter((c: any) => c.isWithdrawn).reduce((s: number, c: any) => s + (Number(c.withdrawnAmount) || 0), 0);
  const displayTotalWithdrawn = (selectedGroupScope && selectedGroupScope !== 'ALL')
    ? Math.max(scopedChitsWithdrawnSum, scopedLedgerTotalWithdrawn)
    : Math.max(
        Number(customer?.withdrawnAmount || 0),
        (customer?.chits || []).filter((c: any) => c.isWithdrawn).reduce((s: number, c: any) => s + (Number(c.withdrawnAmount) || 0), 0),
        allRecentActivity.filter((a: any) => a.type === 'debit').reduce((s: number, a: any) => s + (Number(a.amount) || 0), 0)
      );

  // Pending Dues: scoped vs overall
  // Calculate dynamic pending by comparing due installment against verified payments received
  const scopedPending = (() => {
    if (selectedGroupScope && selectedGroupScope !== 'ALL') {
      const totalExpectedDue = scopedChits.reduce((sum: number, ch: any) => sum + Number(ch.monthlyInstallment || 5000), 0);
      const remainingDue = Math.max(0, totalExpectedDue - scopedLedgerTotalPaid);
      return remainingDue;
    }
    const totalExpectedDueAll = (customer?.chits || []).reduce((sum: number, ch: any) => sum + Number(ch.monthlyInstallment || 5000), 0);
    const overallRemaining = Math.max(0, totalExpectedDueAll - overallLedgerTotalPaid);
    return customer?.pending !== undefined ? Math.min(customer.pending, overallRemaining) : overallRemaining;
  })();


  const displayActiveChitsCount = (selectedGroupScope && selectedGroupScope !== 'ALL')
    ? scopedChits.length
    : displayActiveChits;

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'chits', name: 'Chit Groups' },
    { id: 'passbook', name: 'Digital Passbook' },
    { id: 'payments', name: 'Payments' },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-10 w-full min-w-0">
      {/* Left Sidebar - Profile Summary */}
      <div className="w-full lg:w-72 xl:w-80 shrink-0 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Cover Photo / Top Accent */}
          <div className="h-24 bg-gradient-to-r from-primary-900 to-primary-700"></div>
          
          <div className="px-6 pb-6 relative">
            {/* Avatar */}
            <div className="w-24 h-24 bg-white rounded-xl shadow-md border-4 border-white flex items-center justify-center -mt-12 mb-4">
              <User className="w-12 h-12 text-primary-200" />
            </div>
            
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-bold text-neutral-900">{displayName}</h2>
                {customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/20">
                    <UserX className="w-3.5 h-3.5 text-danger" />
                    Deactivated
                  </span>
                ) : (customer?.status === 'PENDING_APPROVAL' || customer?.status === 'PENDING') ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    Pending Approval
                  </span>
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-success" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-primary-900 bg-primary-50 inline-flex px-2 py-0.5 rounded">
                  {displayId}
                </p>
                {customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? (
                  <span className="text-[11px] font-semibold text-danger bg-danger/5 border border-danger/20 px-2 py-0.5 rounded">
                    App Access Restricted
                  </span>
                ) : (customer?.status === 'PENDING_APPROVAL' || customer?.status === 'PENDING') ? (
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded">
                    Awaiting Admin Approval
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                    App Active
                  </span>
                )}
              </div>
            </div>

            {/* Pending Approval Action Banner */}
            {(customer?.status === 'PENDING_APPROVAL' || customer?.status === 'PENDING') && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <p className="font-bold">Approval Required</p>
                    <p className="text-[11px] text-amber-800 leading-tight">Credentials are locked until approved. Click below to activate this member account.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApproveAccount}
                  disabled={statusActionLoading}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{statusActionLoading ? 'Approving...' : '✓ Approve & Activate Account'}</span>
                </button>
              </div>
            )}

            {/* Warning banner if deactivated */}
            {(customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED') && (
              <div className="mt-3 p-2.5 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Account Deactivated</p>
                  <p className="text-[11px] text-danger/80">Customer cannot login or raise payment requests from the customer app.</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t border-neutral-100 px-6 py-5 bg-neutral-50/50 space-y-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Contact Info</h3>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-neutral-400 mt-0.5" />
              <div className="text-sm text-neutral-700">{displayPhone}</div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-neutral-400 mt-0.5" />
              <div className="text-sm text-neutral-700">{displayEmail}</div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-neutral-400 mt-0.5" />
              <div className="text-sm text-neutral-700 leading-relaxed">{displayAddress}</div>
            </div>
          </div>
          
          <div className="border-t border-neutral-100 px-6 py-5 bg-neutral-50/50 space-y-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Account Info</h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 flex items-center gap-2"><Building className="w-4 h-4" /> Branch</span>
              <span className="font-medium text-neutral-900 text-right">{customer?.branch || 'Head Office'}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 flex items-center gap-2"><User className="w-4 h-4" /> Agent</span>
              <span className="font-medium text-neutral-900 text-right">{displayAgent}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Joined</span>
              <span className="font-medium text-neutral-900 text-right">{formatDate(new Date())}</span>
            </div>
          </div>
        </div>
        
        {/* Designated Receiving Bank Account for UPI/Bank Transfer */}
        {(() => {
          const firstGroupKey = customer?.chits?.[0]?.groupId || customer?.chits?.[0]?.groupName;
          const resolvedBankResult = resolveBankForPayment(displayId, firstGroupKey);
          const currentAssignments = getStoredBankAssignments();
          const customAssignment = currentAssignments.customerAssignments[displayId];

          return (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-primary-700" />
                  Payment Bank Account
                </h3>
                <button
                  onClick={() => {
                    setSelectedBankToAssign(customAssignment || 'INHERIT');
                    setIsChangeBankModalOpen(true);
                  }}
                  className="text-xs text-primary-700 hover:text-primary-900 font-bold hover:underline"
                >
                  Change
                </button>
              </div>

              {bankUpdateMsg && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {bankUpdateMsg}
                </div>
              )}

              <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-extrabold text-sm text-neutral-900 block">{resolvedBankResult.bank.bankName}</span>
                    <span className="text-[11px] text-neutral-500 font-medium">{resolvedBankResult.bank.accountHolderName}</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    resolvedBankResult.scope === 'CUSTOMER' ? 'bg-primary-100 text-primary-900 border border-primary-200' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {resolvedBankResult.scope === 'CUSTOMER' ? 'Custom Customer' : 'Group / Default'}
                  </span>
                </div>

                <div className="text-xs font-mono space-y-1.5 pt-2 border-t border-amber-200/60">
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">A/C:</span>
                    <span className="font-bold text-neutral-900">{resolvedBankResult.bank.accountNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-700">
                    <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold">IFSC:</span>
                    <span className="font-bold text-neutral-900">{resolvedBankResult.bank.ifscCode}</span>
                  </div>
                  <div className="flex justify-between items-center text-amber-950">
                    <span className="text-[10px] text-amber-800 font-sans uppercase font-bold">UPI ID:</span>
                    <span className="font-bold text-amber-950 truncate max-w-[170px]" title={resolvedBankResult.bank.upiId}>
                      {resolvedBankResult.bank.upiId}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500">
                Customer uses these bank & UPI details to make payments via UPI or Bank Transfer.
              </p>
            </div>
          );
        })()}

        {/* KYC Mini Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-5">
          <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center justify-between">
            KYC Status
            <span className="text-xs bg-success-light text-success px-2 py-1 rounded-md font-semibold">Verified</span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <CreditCard className="w-4 h-4" /> Aadhar
              </div>
              <span className="text-sm font-medium text-neutral-900">{displayAadhar}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <FileText className="w-4 h-4" /> PAN
              </div>
              <span className="text-sm font-medium text-neutral-900">{displayPan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Breadcrumb & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-neutral-500 bg-white px-5 py-4 rounded-xl shadow-sm border border-neutral-200">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/admin/customers" className="hover:text-primary-900 transition-colors">Customers</Link>
            <span className="mx-1">/</span>
            <span className="text-neutral-900 font-medium">{displayName}</span>
            {selectedGroupScope && selectedGroupScope !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Group: {selectedGroupScope}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Status Deactivate / Reactivate button */}
            {customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? (
              <button
                type="button"
                className="bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs"
                onClick={() => setIsStatusConfirmModalOpen(true)}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Reactivate Customer
              </button>
            ) : (
              <button
                type="button"
                className="bg-danger/10 text-danger border border-danger/30 px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-danger hover:text-white transition-colors flex items-center gap-1.5 shadow-xs"
                onClick={() => setIsStatusConfirmModalOpen(true)}
              >
                <UserX className="w-3.5 h-3.5" />
                Deactivate & Restrict App
              </button>
            )}

            <button 
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              onClick={() => {
                if (selectedGroupScope && selectedGroupScope !== 'ALL') {
                  setSelectedChitForPayment(selectedGroupScope);
                  const matchedChit = customer?.chits?.find((c: any) => c.groupId === selectedGroupScope || c.groupName === selectedGroupScope);
                  if (matchedChit?.monthlyInstallment) {
                    setPaymentAmount(String(matchedChit.monthlyInstallment));
                  }
                }
                setPaymentReceiptNo('REC-' + Math.floor(100000 + Math.random() * 900000));
                setIsPaymentModalOpen(true);
              }}
              title="Add past or existing offline payment record with custom date and month"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Add Past / Existing Record</span>
            </button>

            <button 
              className="bg-primary-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-primary-700 transition-colors text-xs sm:text-sm"
              onClick={() => {
                if (selectedGroupScope && selectedGroupScope !== 'ALL') {
                  setSelectedChitForPayment(selectedGroupScope);
                  const matchedChit = customer?.chits?.find((c: any) => c.groupId === selectedGroupScope || c.groupName === selectedGroupScope);
                  if (matchedChit?.monthlyInstallment) {
                    setPaymentAmount(String(matchedChit.monthlyInstallment));
                  }
                }
                setPaymentReceiptNo('REC-' + Math.floor(100000 + Math.random() * 900000));
                setIsPaymentModalOpen(true);
              }}
            >
              Receive Payment
            </button>
          </div>
        </div>

        {/* Payment Success Toast / Banner */}
        {paymentSuccessToast && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{paymentSuccessToast}</span>
          </div>
        )}

        {/* Status Action Success Banner */}
        {statusActionSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusActionSuccess}</span>
          </div>
        )}

        {/* Group Context Switcher / Notice Banner */}
        {customer?.chits && customer.chits.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-800 rounded-lg shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? (
                    <span>Viewing Data For Group: <span className="text-amber-800 font-extrabold">{selectedGroupScope}</span></span>
                  ) : (
                    <span>Viewing <span className="text-primary-900 font-extrabold">Overall Customer Profile</span> (All Groups)</span>
                  )}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' 
                    ? `Showing passbook, payments, dues & transactions for ${selectedGroupScope} only to prevent payment confusions.`
                    : 'Showing aggregated summary of all enrollments, passbooks, and total payments across all groups.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-stretch md:self-auto">
              <button
                onClick={() => {
                  setSelectedGroupScope('ALL');
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete('group');
                    next.delete('chitGroup');
                    next.delete('groupId');
                    return next;
                  });
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  (!selectedGroupScope || selectedGroupScope === 'ALL')
                    ? "bg-primary-900 text-white border-primary-900 shadow-2xs"
                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                )}
              >
                Overall Profile (All)
              </button>

              {customer.chits.map((ch: any) => {
                const grpId = ch.groupId || ch.groupName;
                const isSelected = selectedGroupScope === grpId;
                return (
                  <button
                    key={grpId}
                    onClick={() => {
                      setSelectedGroupScope(grpId);
                      setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.set('group', grpId);
                        return next;
                      });
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1",
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                        : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                    )}
                  >
                    <span>{grpId}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom Tabs */}
        <div className="bg-white p-1.5 rounded-xl shadow-sm border border-neutral-200 inline-flex w-full overflow-x-auto scrollbar-none">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 px-6 py-2.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-primary-50 text-primary-900 shadow-sm" 
                  : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* SUCCESS BANNER FOR DISBURSAL */}
            {disbursalSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-sm font-bold">{disbursalSuccessMsg}</p>
                </div>
                <button onClick={() => setDisbursalSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-950 text-xs font-bold">
                  Dismiss
                </button>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-primary-50 to-transparent opacity-50 rounded-bl-full transform group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-primary-50 text-primary-900 rounded-lg">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? 'Group Scheme' : 'Active Chits'}
                </p>
                <h4 className="text-2xl font-bold text-neutral-900">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' 
                    ? (scopedChits[0]?.scheme || 'Chit Plan') 
                    : displayActiveChitsCount}
                </h4>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-success-light/50 to-transparent opacity-50 rounded-bl-full transform group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-success-light text-success rounded-lg">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? `${selectedGroupScope} Paid` : 'Total Paid'}
                </p>
                <h4 className="text-2xl font-bold text-neutral-900">{formatCurrency(displayTotalPaid)}</h4>
              </div>

              <div className={cn("bg-white p-5 rounded-xl shadow-sm border relative overflow-hidden group transition-all", scopedPending > 0 ? "border-danger-200" : "border-emerald-200")}>
                <div className={cn("absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl to-transparent opacity-50 rounded-bl-full transform group-hover:scale-110 transition-transform duration-500", scopedPending > 0 ? "from-danger-100" : "from-emerald-50")}></div>
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("p-2 rounded-lg", scopedPending > 0 ? "bg-danger-light text-danger" : "bg-emerald-50 text-emerald-600")}>
                    {scopedPending > 0 ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                  </div>
                  {scopedPending > 0 ? (
                    <span className="text-[10px] font-bold bg-danger-light text-danger px-2 py-0.5 rounded-full border border-danger-200">Due</span>
                  ) : (
                    <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">All Paid</span>
                  )}
                </div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? `${selectedGroupScope} Pending` : 'Total Pending'}
                </p>
                <h4 className={cn("text-2xl font-bold", scopedPending > 0 ? "text-danger" : "text-emerald-700")}>
                  {formatCurrency(scopedPending)}
                </h4>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-amber-50 to-transparent opacity-50 rounded-bl-full transform group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-lg">
                    <Award className="w-5 h-5" />
                  </div>
                  {displayTotalWithdrawn > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">Prize Claimed</span>
                  )}
                </div>
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? `${selectedGroupScope} Withdrawn` : 'Total Withdrawn'}
                </p>
                <h4 className="text-2xl font-bold text-amber-900">{formatCurrency(displayTotalWithdrawn)}</h4>
              </div>

              <div className="bg-white p-5 rounded-xl shadow-sm border border-neutral-200 relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-20 h-20 bg-gradient-to-bl from-primary-100 to-transparent opacity-50 rounded-bl-full transform group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">Total Referrals</p>
                <h4 className="text-2xl font-bold text-neutral-900">{referralCount}</h4>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900">Recent Activity</h3>
                <Button variant="secondary" className="!py-1.5 !px-3 !text-xs !rounded-md">View All</Button>
              </div>
              
              {recentActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead className="bg-neutral-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Transaction</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Group</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-neutral-500 uppercase tracking-wider">Receipt & Proof</th>
                        <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-100">
                      {recentActivity.map((act: any, i: number) => (
                        <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center mr-3 shrink-0", act.type === 'credit' ? 'bg-success-light text-success' : 'bg-danger-light text-danger')}>
                                {act.type === 'credit' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-neutral-900 block">{act.title}</span>
                                {act.id && <span className="text-[10px] text-neutral-400 font-mono">{act.id}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {formatDate(act.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                            {act.desc}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {act.proofImg && (
                                <button
                                  onClick={() => setSelectedProofModal({
                                    url: act.proofImg,
                                    title: act.title,
                                    amount: act.amount,
                                    desc: act.desc,
                                    date: act.date
                                  })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 shadow-2xs transition-all hover:scale-105"
                                  title="View Customer Proof Screenshot"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Proof
                                </button>
                              )}
                              <button
                                onClick={() => handlePrintReceiptSlip(act)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs transition-all hover:scale-105 ${
                                  (act.title || '').toLowerCase().includes('cash')
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                    : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                                }`}
                                title="Print Official Payment Receipt"
                              >
                                <Printer className="w-3.5 h-3.5" /> Print
                              </button>
                            </div>
                          </td>
                          <td className={cn("px-6 py-4 whitespace-nowrap text-sm font-bold text-right", act.type === 'credit' ? 'text-success' : 'text-danger')}>
                            {act.type === 'credit' ? '+' : '-'}{formatCurrency(act.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-neutral-300" />
                  </div>
                  <h4 className="text-neutral-900 font-bold mb-1">No Activity Yet</h4>
                  <p className="text-sm text-neutral-500 max-w-sm mx-auto">When this customer makes payments or joins groups, their transactions will appear here.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chit Groups Tab */}
        {activeTab === 'chits' && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-neutral-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? `Chit Group: ${selectedGroupScope}` : 'Active Chit Groups'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedGroupScope && selectedGroupScope !== 'ALL'
                    ? `Displaying enrollment details for ${selectedGroupScope}`
                    : 'Displaying all enrolled chit groups for this customer'}
                </p>
              </div>
              {selectedGroupScope && selectedGroupScope !== 'ALL' && (
                <button
                  onClick={() => {
                    setSelectedGroupScope('ALL');
                    setSearchParams(prev => {
                      const next = new URLSearchParams(prev);
                      next.delete('group');
                      next.delete('chitGroup');
                      next.delete('groupId');
                      return next;
                    });
                  }}
                  className="text-xs font-bold text-primary-700 hover:text-primary-900 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
                >
                  Show All Groups
                </button>
              )}
            </div>
            
            {scopedChits.length > 0 ? (
              <div className="p-6 grid grid-cols-1 gap-4">
                {scopedChits.map((chit: any, i: number) => (
                  <div key={i} className="flex flex-col md:flex-row justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center mb-4 md:mb-0">
                      <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center mr-4 shrink-0">
                        <Layers className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-800">{chit.groupId}</h4>
                        <p className="text-sm font-medium text-slate-500">{chit.scheme}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="text-center md:text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ticket / Joined</p>
                        <p className="text-sm font-semibold text-slate-700">#{chit.ticketNumber} • {formatChitDate(chit.joinedAt || chit.joiningDate)}</p>
                      </div>
                      
                      <div className="text-center md:text-right">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chit Value</p>
                        <p className="text-lg font-black text-amber-600">{formatCurrency(chit.chitValue || chit.amount || 0)}</p>
                      </div>

                      {(() => {
                        const wReqs = JSON.parse(localStorage.getItem('withdrawalRequests') || '[]');
                        const hasWReq = wReqs.some((r: any) => 
                          (r.customerId === displayId || r.customerId === customer?.customerCode) && 
                          r.groupId === chit.groupId && 
                          r.status === 'PENDING_ADMIN_DISBURSAL'
                        );

                        if (chit.isWithdrawn) {
                          return (
                            <div className="flex items-center gap-4">
                              <div className="text-center md:text-right">
                                <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Prize Disbursed</p>
                                <p className="text-lg font-black text-success">{formatCurrency(chit.withdrawnAmount || 0)}</p>
                                {chit.withdrawnAt && (
                                  <p className="text-[11px] text-neutral-400 font-medium">{formatChitDate(chit.withdrawnAt)}</p>
                                )}
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-emerald-100 text-emerald-800 border-emerald-300">
                                Disbursed
                              </span>
                            </div>
                          );
                        }

                        const chitVal = Number(chit.chitValue || chit.amount || 100000);
                        const isFixedScheme = String(chit.scheme || chit.groupId || '').toLowerCase().includes('fix');
                        const fixedDetails = isFixedScheme ? calculateFixedPlanSchedule(chitVal, 20) : null;
                        const eligible = isFixedScheme ? (fixedDetails?.minPayout || Math.round(chitVal * 0.70)) : Math.round(chitVal * 0.95);

                        return (
                          <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="text-center md:text-right">
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Eligible Withdraw</p>
                              <p className="text-lg font-black text-primary-600">
                                {formatCurrency(eligible)}
                              </p>
                              <p className="text-[10px] text-slate-400">{isFixedScheme ? 'M2-M8 Base Payout (70%)' : '95% Standard Prize'}</p>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                              {hasWReq ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border bg-amber-100 text-amber-800 border-amber-300 animate-pulse">
                                  Customer Requested
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border bg-green-100 text-green-700 border-green-200">
                                  Eligible
                                </span>
                              )}
                              
                              <button 
                                onClick={() => openWithdrawModal(chit)}
                                className={cn(
                                  "text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap",
                                  hasWReq 
                                    ? "bg-amber-600 hover:bg-amber-700 text-white" 
                                    : "bg-primary-600 hover:bg-primary-700 text-white"
                                )}
                              >
                                <Award className="w-3.5 h-3.5" />
                                {hasWReq ? 'Process Requested Disbursal' : 'Withdraw / Disburse Prize'}
                              </button>

                              <Link
                                to={`/admin/customers/${displayId}/schedule?group=${encodeURIComponent(chit.groupId)}`}
                                className="text-xs px-3 py-1.5 rounded-lg font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all flex items-center gap-1.5 whitespace-nowrap"
                                title="View autocalculated 20-month due schedule, due date, paid on, and payment status"
                              >
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>Due Chart & Schedule</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                  <Layers className="w-8 h-8 text-neutral-300" />
                </div>
                <h4 className="text-neutral-900 font-bold mb-1">No Chit Groups Found</h4>
                <p className="text-sm text-neutral-500 max-w-sm mx-auto">
                  {selectedGroupScope && selectedGroupScope !== 'ALL'
                    ? `No enrollment found matching group "${selectedGroupScope}".`
                    : 'This customer is not currently mapped to any chit groups.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? `Payment History (${selectedGroupScope})` : 'Payment History'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedGroupScope && selectedGroupScope !== 'ALL'
                    ? `Showing verified receipts and payments for group ${selectedGroupScope} only.`
                    : 'Showing verified payments across all groups.'}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedGroupScope && selectedGroupScope !== 'ALL') {
                      setSelectedChitForPayment(selectedGroupScope);
                      const matchedChit = customer?.chits?.find((c: any) => c.groupId === selectedGroupScope || c.groupName === selectedGroupScope);
                      if (matchedChit?.monthlyInstallment) {
                        setPaymentAmount(String(matchedChit.monthlyInstallment));
                      }
                    }
                    setPaymentReceiptNo('REC-' + Math.floor(100000 + Math.random() * 900000));
                    setIsPaymentModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                  title="Choose payment date and month to record past offline payments"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  + Add Past / Existing Record
                </button>
                {selectedGroupScope && selectedGroupScope !== 'ALL' && (
                  <button
                    onClick={() => {
                      setSelectedGroupScope('ALL');
                      setSearchParams(prev => {
                        const next = new URLSearchParams(prev);
                        next.delete('group');
                        next.delete('chitGroup');
                        next.delete('groupId');
                        return next;
                      });
                    }}
                    className="text-xs font-bold text-primary-700 hover:text-primary-900 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
                  >
                    View All Groups History
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-full">
                <thead className="bg-neutral-50 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="p-4">Receipt ID</th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-neutral-100 transition-colors select-none"
                    onClick={() => setPaymentSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                    title="Click to toggle Date sorting (Newest / Oldest)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <span className="text-[10px] text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded font-black tracking-wider">
                        {paymentSortOrder === 'DESC' ? '↓ Newest' : '↑ Oldest'}
                      </span>
                    </div>
                  </th>
                  <th className="p-4">Group / Reference</th>
                  <th className="p-4">Description</th>
                  <th className="p-4 text-center">Receipt</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {(() => {
                  const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
                  let customerTxns = ledger.filter((t: any) => 
                    t.reference?.includes(displayId) || t.description?.includes(displayId) || t.customerId === displayId
                  ).sort((a: any, b: any) => {
                    const timeA = new Date(a.date).getTime() || 0;
                    const timeB = new Date(b.date).getTime() || 0;
                    return paymentSortOrder === 'DESC' ? timeB - timeA : timeA - timeB;
                  });

                  if (selectedGroupScope && selectedGroupScope !== 'ALL') {
                    customerTxns = customerTxns.filter((t: any) => matchesGroupScope(t, selectedGroupScope));
                  }

                  if (customerTxns.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-neutral-400">
                          <Wallet className="w-8 h-8 mx-auto mb-3 text-neutral-300" />
                          <p>
                            {selectedGroupScope && selectedGroupScope !== 'ALL'
                              ? `No payments recorded for group "${selectedGroupScope}".`
                              : 'No payments recorded for this customer.'}
                          </p>
                        </td>
                      </tr>
                    );
                  }

                  return customerTxns.map((t: any, idx: number) => {
                    const isCash = (t.description || '').toLowerCase().includes('cash');
                    return (
                      <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                        <td className="p-4 font-bold text-primary-900 font-mono">{t.id}</td>
                        <td className="p-4 text-sm text-neutral-600">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                        <td className="p-4 text-sm font-bold text-neutral-800">{t.reference}</td>
                        <td className="p-4 text-sm text-neutral-600">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{t.description}</span>
                            {isCash && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                CASH
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {t.paymentScreenshot && (
                              <button
                                onClick={() => setSelectedProofModal({
                                  url: t.paymentScreenshot,
                                  title: t.description,
                                  amount: t.amount,
                                  desc: t.reference,
                                  date: t.date
                                })}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 shadow-2xs transition-all hover:scale-105"
                                title="View Customer Proof Screenshot"
                              >
                                <Eye className="w-3.5 h-3.5" /> Proof
                              </button>
                            )}
                            <button
                              onClick={() => handlePrintReceiptSlip(t)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs transition-all hover:scale-105 ${
                                isCash
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                              }`}
                              title="Print Official Payment Receipt Voucher"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print
                            </button>
                            <button
                              onClick={() => handleOpenEditTxn(t)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-all hover:scale-105"
                              title="Edit payment amount / details"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-600" /> Edit
                            </button>
                          </div>
                        </td>
                        <td className={`p-4 text-sm font-bold text-right whitespace-nowrap tabular-nums ${t.type === 'CREDIT' ? 'text-success' : 'text-danger'}`}>
                          {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Passbook Tab */}
        {activeTab === 'passbook' && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
            <div className="p-6 border-b border-neutral-200 bg-primary-900 text-white rounded-t-xl flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">
                  {selectedGroupScope && selectedGroupScope !== 'ALL' ? `Digital Passbook (${selectedGroupScope})` : 'Digital Passbook'}
                </h3>
                <p className="text-primary-200 text-sm opacity-90 mt-1">
                  {selectedGroupScope && selectedGroupScope !== 'ALL'
                    ? `Official statement of account for group ${selectedGroupScope}`
                    : 'Official statement of account (Overall)'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-primary-200 mb-1">Current Balance</p>
                <p className="text-2xl font-bold text-white whitespace-nowrap tabular-nums">{formatCurrency(displayTotalPaid - scopedPending)}</p>
              </div>
            </div>
            
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead className="bg-neutral-100/80 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                  <tr>
                    <th 
                      className="p-4 border-r border-neutral-200 whitespace-nowrap cursor-pointer hover:bg-neutral-200/60 select-none transition-colors"
                      onClick={() => setPassbookSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC')}
                      title="Click to toggle Date sort order"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-black tracking-wider">
                          {passbookSortOrder === 'ASC' ? '↑ Oldest (Chrono)' : '↓ Newest'}
                        </span>
                      </div>
                    </th>
                    <th className="p-4 border-r border-neutral-200 min-w-[200px]">Particulars</th>
                    <th className="p-4 border-r border-neutral-200 whitespace-nowrap">Ref / Txn ID</th>
                    <th className="p-4 border-r border-neutral-200 text-right whitespace-nowrap">Debit (-)</th>
                    <th className="p-4 border-r border-neutral-200 text-right whitespace-nowrap">Credit (+)</th>
                    <th className="p-4 border-r border-neutral-200 text-right whitespace-nowrap">Balance</th>
                    <th className="p-4 text-center whitespace-nowrap">Receipt / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {(() => {
                    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
                    let customerTxns = ledger.filter((t: any) => 
                      t.reference?.includes(displayId) || t.description?.includes(displayId) || t.customerId === displayId
                    );

                    if (selectedGroupScope && selectedGroupScope !== 'ALL') {
                      customerTxns = customerTxns.filter((t: any) => matchesGroupScope(t, selectedGroupScope));
                    }

                    if (customerTxns.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-neutral-400">
                            <BookOpen className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                            <p className="font-medium text-neutral-500">
                              {selectedGroupScope && selectedGroupScope !== 'ALL'
                                ? `No passbook entries recorded for group "${selectedGroupScope}".`
                                : 'No transactions recorded yet.'}
                            </p>
                          </td>
                        </tr>
                      );
                    }

                    // Sort chronologically from oldest to newest to compute running balance accurately
                    const chronoSorted = [...customerTxns].sort(
                      (a: any, b: any) => (new Date(a.date).getTime() || 0) - (new Date(b.date).getTime() || 0)
                    );

                    let runningBalance = 0;
                    const withBalances = chronoSorted.map((t: any) => {
                      if (t.type === 'CREDIT') {
                        runningBalance += Number(t.amount) || 0;
                      } else {
                        runningBalance -= Number(t.amount) || 0;
                      }
                      return {
                        ...t,
                        calculatedBalance: runningBalance
                      };
                    });

                    // Order by user selection: either chronological (oldest first) or reverse chronological (newest first)
                    const displayTxns = passbookSortOrder === 'DESC' ? [...withBalances].reverse() : withBalances;

                    return displayTxns.map((t: any, idx: number) => {
                      const isCash = (t.description || '').toLowerCase().includes('cash');

                      return (
                        <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="p-4 text-sm font-medium text-neutral-600 border-r border-neutral-100 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('en-GB')}
                          </td>
                          <td className="p-4 text-sm text-neutral-800 font-medium border-r border-neutral-100">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{t.description}</span>
                              {isCash && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                                  CASH
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-xs font-mono text-neutral-600 border-r border-neutral-100 whitespace-nowrap">
                            {t.id}
                          </td>
                          <td className="p-4 text-sm font-medium text-danger text-right border-r border-neutral-100 whitespace-nowrap tabular-nums">
                            {t.type === 'DEBIT' ? formatCurrency(t.amount) : '-'}
                          </td>
                          <td className="p-4 text-sm font-medium text-success text-right border-r border-neutral-100 whitespace-nowrap tabular-nums">
                            {t.type === 'CREDIT' ? formatCurrency(t.amount) : '-'}
                          </td>
                          <td className="p-4 text-sm font-bold text-right bg-neutral-50/30 border-r border-neutral-100 whitespace-nowrap tabular-nums">
                            <span className={t.calculatedBalance < 0 ? 'text-danger inline-block whitespace-nowrap' : 'text-primary-900 inline-block whitespace-nowrap'}>
                              {formatCurrency(t.calculatedBalance)}
                            </span>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {t.type === 'CREDIT' ? (
                                <button
                                  onClick={() => handlePrintReceiptSlip(t)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs transition-all hover:scale-105 ${
                                    isCash
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                                      : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                                  }`}
                                  title="Print Payment Receipt"
                                >
                                  <Printer className="w-3 h-3" /> Print
                                </button>
                              ) : (
                                <span className="text-neutral-300 text-xs px-2">—</span>
                              )}
                              <button
                                onClick={() => handleOpenEditTxn(t)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg shadow-2xs transition-all hover:scale-105"
                                title="Edit payment amount / details"
                              >
                                <Pencil className="w-3 h-3 text-slate-600" /> Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex justify-between items-center text-sm text-neutral-500">
              <p>Generated on {new Date().toLocaleString('en-IN')}</p>
              <button 
                onClick={handleDownloadPassbook}
                className="flex items-center text-primary-600 font-bold hover:text-primary-800 transition-colors cursor-pointer hover:underline"
              >
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </button>
            </div>
          </div>
        )}

        {/* Tab Placeholder for others */}
        {activeTab !== 'overview' && activeTab !== 'chits' && activeTab !== 'payments' && activeTab !== 'passbook' && (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 flex flex-col items-center justify-center p-16 text-center text-neutral-500 min-h-[400px]">
            <Wallet className="w-16 h-16 mb-4 text-neutral-200" />
            <h3 className="text-xl font-bold text-neutral-900 mb-2">{tabs.find(t => t.id === activeTab)?.name}</h3>
            <p className="text-sm max-w-md mx-auto leading-relaxed">This module is currently under development. Detailed {tabs.find(t => t.id === activeTab)?.name.toLowerCase()} views will be available in the next release.</p>
          </div>
        )}
      </div>

      {/* Receive Payment / Past Record Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-primary-950 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-accent" />
                  Record Customer Payment
                </h2>
                <p className="text-xs text-primary-200 mt-0.5">
                  Record new collections or backfill existing records with custom payment date & month.
                </p>
              </div>
              <button 
                onClick={() => setIsPaymentModalOpen(false)} 
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Payment Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary-700" />
                    Payment Date *
                  </label>
                  <input 
                    type="date"
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Choose past date for historical entries.
                  </span>
                </div>

                {/* 2. Month / Period Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Chit Month / Period *
                  </label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                    value={paymentMonth}
                    onChange={(e) => setPaymentMonth(e.target.value)}
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m)}>
                        Month {m} {m === 1 ? '(1st Month / Company)' : ''}
                      </option>
                    ))}
                    <option value="GENERAL">General Advance / Custom</option>
                  </select>
                  <span className="text-[10px] text-neutral-500 mt-0.5 block">
                    Target installment month (1 - 20).
                  </span>
                </div>
              </div>

              {/* 3. Chit Group Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Chit Group
                </label>
                <select 
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                  value={selectedChitForPayment}
                  onChange={(e) => {
                    setSelectedChitForPayment(e.target.value);
                    const chit = customer?.chits?.find((c: any) => c.groupId === e.target.value || c.groupName === e.target.value);
                    if (chit && chit.monthlyInstallment) {
                      setPaymentAmount(chit.monthlyInstallment.toString());
                    }
                  }}
                >
                  <option value="">-- General Payment (Auto-allocate) --</option>
                  {(customer?.chits || []).map((c: any) => (
                    <option key={c.groupId} value={c.groupId}>
                      {c.groupId} - {c.scheme || c.groupName} (Due: {formatCurrency(c.monthlyInstallment || 5000)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 4. Amount */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-bold text-sm">₹</span>
                    <input 
                      type="number"
                      className="w-full border border-neutral-300 rounded-lg pl-8 pr-3 py-2 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      min="1"
                    />
                  </div>
                </div>

                {/* 5. Payment Mode */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                    Payment Mode *
                  </label>
                  <select 
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 bg-white"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Demand Draft">Demand Draft</option>
                  </select>
                </div>
              </div>

              {/* 6. Receipt / Ref Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Receipt / Ref Number (Optional)
                </label>
                <input 
                  type="text"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 font-mono text-neutral-800 bg-white"
                  value={paymentReceiptNo}
                  onChange={(e) => setPaymentReceiptNo(e.target.value)}
                  placeholder="e.g. REC-123456 or Physical Receipt Book No."
                />
                <span className="text-[10px] text-neutral-500 mt-0.5 block">
                  Leave blank to auto-generate a unique system receipt ID.
                </span>
              </div>

              {/* 7. Notes / Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1">
                  Remarks / Notes (Optional)
                </label>
                <input 
                  type="text"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600 text-neutral-800 bg-white"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  placeholder="e.g. Existing record added from manual passbook"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Admin Ledger Entry:</strong> This record will be credited directly to the customer's passbook, ledger history, and verified collection totals for {displayName}.
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-neutral-100">
                <button 
                  type="button"
                  className="px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                  onClick={() => setIsPaymentModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleReceivePayment}
                  disabled={!paymentAmount || Number(paymentAmount) <= 0}
                >
                  <Check className="w-4 h-4" />
                  Save Payment Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disburse Chit Prize / Withdrawal Modal */}
      {isWithdrawModalOpen && selectedChitForWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-200">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Disburse Prize / Withdrawal</h2>
                  <p className="text-xs text-neutral-500">Process outgoing prize payout for this chit group</p>
                </div>
              </div>
              <button 
                onClick={() => setIsWithdrawModalOpen(false)} 
                className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Chit Summary Card */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Chit Group</span>
                  <span className="font-bold text-sm text-neutral-900 font-mono">{selectedChitForWithdraw.groupId}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-600 mb-1">
                  <span>Customer Name:</span>
                  <span className="font-semibold text-neutral-900">{displayName} ({displayId})</span>
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-600 mb-1">
                  <span>Ticket Number:</span>
                  <span className="font-semibold text-neutral-900">#{selectedChitForWithdraw.ticketNumber || '1'}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-neutral-600 border-t border-amber-200/60 pt-2 mt-2">
                  <span className="font-bold">Total Chit Value:</span>
                  <span className="font-extrabold text-amber-900 text-sm">{formatCurrency(selectedChitForWithdraw.chitValue || selectedChitForWithdraw.amount || 100000)}</span>
                </div>
              </div>

              {/* Disbursal Month Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Disbursal Month <span className="text-danger">*</span>
                  </label>
                  <select
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-xs"
                    value={withdrawMonth}
                    onChange={(e) => handleWithdrawMonthChange(Number(e.target.value))}
                  >
                    {Array.from({ length: 20 }, (_, idx) => idx + 1).map((m) => (
                      <option key={m} value={m}>
                        Month {m} {m === 1 ? '(Company Chit)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Payout Mode
                  </label>
                  <select 
                    className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-xs"
                    value={withdrawMode}
                    onChange={(e) => setWithdrawMode(e.target.value)}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Month Payout & Post-Disbursal Calculation Box */}
              {(() => {
                const chitVal = Number(selectedChitForWithdraw.chitValue || selectedChitForWithdraw.amount || 100000);
                const fixedSchedule = calculateFixedPlanSchedule(chitVal, 20);
                const monthRow = fixedSchedule.schedule.find(r => r.month === withdrawMonth);
                const nextMonthRow = fixedSchedule.schedule.find(r => r.month === Math.min(20, withdrawMonth + 1));
                const standardInstallment = nextMonthRow?.due || Math.round(chitVal / 20);
                const postInstallment = standardInstallment + Math.round((chitVal * 0.01) / 20);

                if (withdrawMonth === 1) {
                  return (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        Month 1 is Reserved for Company / Foreman Chit
                      </p>
                      <p className="text-neutral-600 text-[11px] leading-relaxed">
                        Company collects the full chit pool in Month 1 per standard chit norms. Member prize disbursal is eligible starting Month 2.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-blue-900">Available Prize for Month {withdrawMonth}:</span>
                      <span className="font-black text-sm text-blue-950">
                        {formatCurrency(monthRow?.payout || Number(withdrawAmount) || 0)}
                        <span className="text-[11px] font-semibold text-blue-700 ml-1">
                          ({((monthRow?.payoutPct || 0.70) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-blue-200/60 pt-2 text-neutral-700">
                      <span>Post-Disbursal Monthly Installment:</span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(postInstallment)} / mo
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-800 italic leading-snug">
                      *From Month {withdrawMonth + 1} to Month 20, member pays {formatCurrency(postInstallment)}/month (includes base installment + 1% prized member fee).
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Disbursal Amount (₹) <span className="text-danger">*</span>
                </label>
                <input 
                  type="number"
                  className="w-full border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 70000"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  {withdrawMonth === 1 ? 'Month 1 is Company Chit' : `Auto-calculated according to Month ${withdrawMonth} payout schedule.`}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  UTR / Cheque / Txn Ref No.
                </label>
                <input 
                  type="text"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  value={withdrawRef}
                  onChange={(e) => setWithdrawRef(e.target.value)}
                  placeholder="e.g. UTR129849204"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Remarks / Purpose
                </label>
                <input 
                  type="text"
                  className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="e.g. Month 2 prize money disbursed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button 
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                  onClick={() => setIsWithdrawModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="bg-primary-900 hover:bg-primary-950 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleConfirmWithdrawal}
                  disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || withdrawMonth === 1}
                >
                  <Award className="w-4 h-4 text-amber-300" />
                  Confirm & Disburse Prize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment / Transaction Modal */}
      {isEditTxnModalOpen && editingTxn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-neutral-200 overflow-hidden">
            <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-100 text-primary-800 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-neutral-900">Edit Payment / Transaction</h2>
                  <p className="text-xs text-neutral-500">Modify amount, mode, or reference for {displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditTxnModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editTxnSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{editTxnSuccessMsg}</span>
                </div>
              )}

              {/* Transaction Meta Card */}
              <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Transaction ID / Ref:</span>
                  <span className="font-mono font-bold text-primary-900">{editingTxn.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Type:</span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${editingTxn.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {editingTxn.type === 'CREDIT' ? 'Credit (Customer Payment)' : 'Debit (Prize Disbursal)'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-500">Original Entered Amount:</span>
                  <span className="font-bold text-neutral-800">{formatCurrency(editingTxn.amount)}</span>
                </div>
              </div>

              {/* Editable Amount */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Updated Amount (₹) <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-neutral-400">₹</span>
                  <input
                    type="number"
                    className="w-full pl-8 pr-3.5 py-2.5 border border-neutral-300 rounded-xl text-base font-black text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
                    value={editTxnAmount}
                    onChange={(e) => setEditTxnAmount(e.target.value)}
                    placeholder="e.g. 5500"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Example: If 5000 was entered by mistake but customer actually paid 5500, enter 5500 here.
                </p>
              </div>

              {/* Mode and Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Payment Mode
                  </label>
                  <select
                    className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white shadow-xs"
                    value={editTxnMode}
                    onChange={(e) => setEditTxnMode(e.target.value)}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
                    value={editTxnDate}
                    onChange={(e) => setEditTxnDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Description / Particulars */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Particulars / Description
                </label>
                <input
                  type="text"
                  className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
                  value={editTxnDesc}
                  onChange={(e) => setEditTxnDesc(e.target.value)}
                  placeholder="e.g. Installment Payment (Cash)"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                  onClick={() => setIsEditTxnModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-900 hover:bg-primary-950 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  onClick={handleSaveEditTxn}
                  disabled={!editTxnAmount || Number(editTxnAmount) <= 0}
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Payment Proof Screenshot Viewer Modal */}
      {selectedProofModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-neutral-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-primary-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary-200" />
                  Customer Payment Proof Screenshot
                </h3>
                <p className="text-xs text-primary-200 mt-0.5">
                  {displayName} ({displayId}) · {selectedProofModal.desc}
                </p>
              </div>
              <button 
                onClick={() => setSelectedProofModal(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 text-xs">
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">Amount Paid</span>
                  <span className="font-bold text-neutral-900 text-sm">₹{Number(selectedProofModal.amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">Transaction Info</span>
                  <span className="font-bold text-primary-800 truncate block">{selectedProofModal.title}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-semibold block text-[10px] uppercase tracking-wider">Date</span>
                  <span className="font-semibold text-neutral-700">
                    {new Date(selectedProofModal.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="bg-neutral-900 rounded-xl p-2 flex items-center justify-center max-h-[55vh] overflow-auto border border-neutral-300">
                <img 
                  src={selectedProofModal.url} 
                  alt="Customer Payment Receipt Proof" 
                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-md"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                <a
                  href={selectedProofModal.url}
                  target="_blank"
                  rel="noreferrer"
                  download={`receipt-${displayId}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open / Download Full Resolution
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedProofModal(null)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: CUSTOMIZE CUSTOMER ASSIGNED BANK */}
      {isChangeBankModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-primary-950 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-accent" /> Customize Customer Bank Account
                </h3>
                <p className="text-xs text-primary-200 mt-0.5">Assign which company bank account this customer pays to.</p>
              </div>
              <button onClick={() => setIsChangeBankModalOpen(false)} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-600 mb-2">
                  Select Receiving Bank Account
                </label>
                <div className="space-y-2">
                  <label className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedBankToAssign === 'INHERIT' ? 'border-primary-600 bg-primary-50/50' : 'border-neutral-200 hover:bg-neutral-50'
                  }`}>
                    <input
                      type="radio"
                      name="bankChoice"
                      value="INHERIT"
                      checked={selectedBankToAssign === 'INHERIT'}
                      onChange={() => setSelectedBankToAssign('INHERIT')}
                      className="mt-0.5 text-primary-600 mr-3"
                    />
                    <div>
                      <span className="font-bold text-xs text-neutral-900 block">Use Chit Group / Default Account</span>
                      <span className="text-[11px] text-neutral-500">Inherits the bank account assigned to customer's chit group</span>
                    </div>
                  </label>

                  {getStoredBankAccounts().filter(b => b.status === 'ACTIVE').map(b => (
                    <label key={b.id} className={`flex items-start p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedBankToAssign === b.id ? 'border-primary-600 bg-primary-50/50' : 'border-neutral-200 hover:bg-neutral-50'
                    }`}>
                      <input
                        type="radio"
                        name="bankChoice"
                        value={b.id}
                        checked={selectedBankToAssign === b.id}
                        onChange={() => setSelectedBankToAssign(b.id)}
                        className="mt-0.5 text-primary-600 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-neutral-900">{b.bankName}</span>
                          {b.isDefault && <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded">Default</span>}
                        </div>
                        <p className="text-[11px] font-mono text-neutral-500 mt-0.5">
                          A/C •••• {b.accountNumber.slice(-4)} · UPI: {b.upiId}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

              <div className="px-6 py-3.5 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsChangeBankModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    assignBankToCustomer(displayId, selectedBankToAssign);
                    setIsChangeBankModalOpen(false);
                    setBankUpdateMsg('Payment bank account updated successfully!');
                    setTimeout(() => setBankUpdateMsg(null), 3500);
                  }}
                  className="px-4 py-2 bg-primary-900 hover:bg-primary-800 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Custom Bank
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deactivate / Reactivate Customer */}
      {isStatusConfirmModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 border border-neutral-200">
            <div className={`p-5 flex items-start gap-4 ${customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? 'bg-emerald-50/60 border-b border-emerald-100' : 'bg-red-50/60 border-b border-red-100'}`}>
              <div className={`p-3 rounded-xl shrink-0 ${customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                {customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? (
                  <UserCheck className="w-6 h-6" />
                ) : (
                  <UserX className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-neutral-900">
                  {customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' 
                    ? `Reactivate Customer Account?` 
                    : `Deactivate & Restrict Customer?`}
                </h3>
                <p className="text-xs text-neutral-600 mt-1">
                  Customer: <span className="font-bold text-neutral-900">{displayName}</span> ({displayId})
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsStatusConfirmModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-neutral-600">
              {customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? (
                <>
                  <p>
                    Reactivating this customer will immediately:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                    <li>Restore their ability to log into the Customer mobile / web application.</li>
                    <li>Allow them to view their chit schedules, statement history, and raise payment requests.</li>
                    <li>Update their status to <strong>ACTIVE</strong> in the system.</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="text-danger font-medium">
                    Are you sure you want to deactivate this customer?
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-neutral-700">
                    <li><strong>App Access Restriction:</strong> The customer will be immediately blocked from logging into the mobile/web application.</li>
                    <li>If already logged in, their session will show an Account Suspended notice restricting dashboard access.</li>
                    <li>Existing enrolled chit records and payment transactions will remain intact for audit and bookkeeping.</li>
                  </ul>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsStatusConfirmModalOpen(false)}
                disabled={statusActionLoading}
                className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleCustomerStatus}
                disabled={statusActionLoading}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5 ${
                  customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-danger hover:bg-danger/90'
                }`}
              >
                {statusActionLoading ? (
                  <span>Processing...</span>
                ) : customer?.status === 'INACTIVE' || customer?.status === 'DEACTIVATED' ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Confirm Reactivation
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4" />
                    Confirm Deactivation & Restrict
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
