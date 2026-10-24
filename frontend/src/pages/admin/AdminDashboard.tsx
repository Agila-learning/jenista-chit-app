import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Layers,
  CheckCircle2,
  Plus,
  ArrowLeft,
  X,
  CreditCard,
  Clock,
  XCircle,
  Eye,
  ExternalLink,
  Wallet,
  UserCheck,
  UserPlus,
  Gavel,
  BarChart3,
  Calendar,
  Zap,
  PieChart as PieChartIcon,
  Megaphone,
  Landmark,
  ShieldCheck,
  Search,
  Trash2
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../store/AuthContext';
import { StaffDashboard } from '../staff/StaffDashboard';
import { fetchClient } from '../../api/client';
import {
  syncPaymentRequestsWithBackend,
  onPaymentSync,
  approvePaymentRequestAction,
  rejectPaymentRequestAction,
  isPendingPayment,
  type PaymentRequest
} from '../../utils/paymentRequestsData';
import { purgeMockData, isMockGroup, isMockCustomer } from '../../utils/cleanMockData';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [chitGroups, setChitGroups] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Add Group Modal State
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  // Add Customer modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [searchMobile, setSearchMobile] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<any | null>(null);
  const [verificationCustomer, setVerificationCustomer] = useState<any | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customChitValue, setCustomChitValue] = useState('');
  const [customerEnrollScheme, setCustomerEnrollScheme] = useState('Regular');
  const [customerEnrollMonths, setCustomerEnrollMonths] = useState('20');
  const [customerEnrollInstallment, setCustomerEnrollInstallment] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Screenshot proof modal
  const [viewingScreenshot, setViewingScreenshot] = useState<any | null>(null);

  // Payment requests & handovers
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [handovers, setHandovers] = useState<any[]>([]);
  const [pendingCustomerApprovals, setPendingCustomerApprovals] = useState<any[]>([]);
  const [paymentActionInProgress, setPaymentActionInProgress] = useState<string | null>(null);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Scheme / Card Filtering State for Top KPI Cards (Groups, Fixed, Regular, Auction)
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<'GROUPS' | 'FIXED' | 'REGULAR' | 'AUCTION' | null>(null);
  const [schemeSearchQuery, setSchemeSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Live greeting determination
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good Morning' : currentHour < 17 ? 'Good Afternoon' : 'Good Evening';
  const adminDisplayName = user?.name || 'Santy Y';

  // Load and enrich payment requests
  const loadPaymentRequests = async () => {
    const list = await syncPaymentRequestsWithBackend();
    setPaymentRequests(list);
  };

  const handleApprovePayment = async (req: PaymentRequest) => {
    try {
      setPaymentActionInProgress(req.id);
      approvePaymentRequestAction(req);
      loadPaymentRequests();
      alert(`Payment of ${formatCurrency(req.amount)} for ${req.customerName} has been approved and credited to company bank!`);
    } catch (err) {
      console.error(err);
      alert('Error approving payment.');
    } finally {
      setPaymentActionInProgress(null);
    }
  };

  const handleRejectPayment = (req: PaymentRequest) => {
    if (!window.confirm(`Are you sure you want to reject the payment of ${formatCurrency(req.amount)} for ${req.customerName}?`)) {
      return;
    }
    setPaymentActionInProgress(req.id);
    rejectPaymentRequestAction(req.id);
    loadPaymentRequests();
    setPaymentActionInProgress(null);
  };

  const handleAcceptHandover = (handoverId: string) => {
    const updated = handovers.map((h: any) => {
      if (h.id === handoverId) {
        return {
          ...h,
          status: 'SETTLED',
          settledAt: new Date().toISOString(),
          approvedBy: user?.name || 'Admin',
        };
      }
      return h;
    });
    setHandovers(updated);
    localStorage.setItem('staffHandovers', JSON.stringify(updated));

    const targetH = handovers.find((h: any) => h.id === handoverId);
    if (targetH) {
      const existingLedger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
      const ledgerEntry = {
        id: `LEDGER-HO-${Date.now().toString().slice(-6)}`,
        date: new Date().toISOString(),
        type: 'CREDIT',
        category: 'STAFF_HANDOVER',
        amount: Number(targetH.totalCashCollected || 0),
        reference: `${targetH.staffName} (${targetH.staffId})`,
        description: `EOD Cash Handover Reconciled - ${targetH.receiptsCount} Receipts Collected`,
      };
      localStorage.setItem('ledgerTransactions', JSON.stringify([ledgerEntry, ...existingLedger]));
    }

    window.dispatchEvent(new Event('storage'));
    alert(`Day-End Cash Handover of ${formatCurrency(targetH?.totalCashCollected || targetH?.countedTotal || 0)} has been verified and settled!`);
  };

  const handleApproveCustomer = async (cust: any) => {
    try {
      if (cust.mongoId || cust.id) {
        await fetchClient(`/customers/${cust.mongoId || cust.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACTIVE' }),
        }).catch(() => { });
      }
    } catch { }

    const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const updated = diskCusts.map((c: any) => {
      if (c.id === cust.id || c.mongoId === cust.mongoId) {
        return { ...c, status: 'ACTIVE' };
      }
      return c;
    });
    localStorage.setItem('mockCustomers', JSON.stringify(updated));
    setCustomers(updated);
    setPendingCustomerApprovals(updated.filter((c: any) => c.status === 'PENDING_APPROVAL'));
    window.dispatchEvent(new Event('storage'));
    alert(`Customer ${cust.name} approved and activated!`);
  };

  const nowFormatted = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  useEffect(() => {
    // 1. Purge legacy mock data from localStorage
    purgeMockData();

    // Unified Groups Sync: Aggregates groups from mockChitGroups, chitGroupMemberships, customer.chits, and backend
    const syncAndLoadAllGroups = (liveCustomers?: any[]) => {
      // 1. Read stored groups from localStorage
      let rawGroups: any[] = [];
      try {
        const stored = localStorage.getItem('mockChitGroups');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) rawGroups = parsed;
        }
      } catch {
        rawGroups = [];
      }

      const groupMap = new Map<string, any>();

      // Populate from existing raw groups (filtering out genuine mock templates)
      rawGroups.filter((g: any) => !isMockGroup(g)).forEach((g: any) => {
        const key = String(g.id || g.name || '').trim();
        if (key) {
          groupMap.set(key.toLowerCase(), {
            ...g,
            id: g.id || g.name,
            name: g.name || g.id,
            duration: Number(g.duration || g.months || 20),
            members: Number(g.members || 20),
            customerChitAmount: Number(g.customerChitAmount || 0),
            value: Number(g.value || 0),
            status: g.status || 'Active'
          });
          if (g.name && String(g.name).trim().toLowerCase() !== key.toLowerCase()) {
            groupMap.set(String(g.name).trim().toLowerCase(), groupMap.get(key.toLowerCase()));
          }
        }
      });

      // 2. Discover groups from chitGroupMemberships
      let memberships: any[] = [];
      try {
        const mStored = localStorage.getItem('chitGroupMemberships');
        if (mStored) {
          const parsedM = JSON.parse(mStored);
          if (Array.isArray(parsedM)) memberships = parsedM;
        }
      } catch {
        memberships = [];
      }

      memberships.forEach((m: any) => {
        if (!isMockCustomer({ id: m.customerId, name: m.customerName })) {
          const grpKey = String(m.groupId || m.groupName || '').trim();
          const grpName = String(m.groupName || m.groupId || '').trim();
          if (grpKey && !isMockGroup({ id: grpKey, name: grpName })) {
            const lowKey = grpKey.toLowerCase();
            const lowName = grpName.toLowerCase();
            if (!groupMap.has(lowKey) && !groupMap.has(lowName)) {
              const newG = {
                id: grpKey,
                name: grpName || grpKey,
                type: m.scheme || 'Mixed Schemes',
                scheme: m.scheme || 'Mixed Schemes',
                value: Number(m.chitValue || 0),
                customerChitAmount: Number(m.monthlyInstallment || 0),
                duration: Number(m.duration || m.months || 20),
                members: 20,
                enrolledMembers: [],
                filled: 0,
                status: 'Active'
              };
              groupMap.set(lowKey, newG);
              if (lowName !== lowKey) groupMap.set(lowName, newG);
            }
          }
        }
      });

      // 3. Discover groups from customers' active chits (e.g. Dhanush in FIXED-₹1,00,000-GROUP-0468)
      let diskCustomers: any[] = [];
      try {
        const cStored = localStorage.getItem('mockCustomers');
        if (cStored) {
          const parsedC = JSON.parse(cStored);
          if (Array.isArray(parsedC)) diskCustomers = parsedC;
        }
      } catch {
        diskCustomers = [];
      }

      const allCustomerSources = [...diskCustomers, ...(liveCustomers || [])].filter((c: any) => !isMockCustomer(c));

      allCustomerSources.forEach((c: any) => {
        if (Array.isArray(c.chits) && c.chits.length > 0) {
          c.chits.forEach((ch: any) => {
            const grpKey = String(ch.groupId || ch.groupName || '').trim();
            const grpName = String(ch.groupName || ch.groupId || '').trim();
            if (grpKey && !isMockGroup({ id: grpKey, name: grpName })) {
              const lowKey = grpKey.toLowerCase();
              const lowName = grpName.toLowerCase();
              if (!groupMap.has(lowKey) && !groupMap.has(lowName)) {
                const dur = Number(ch.duration || ch.months || 20);
                const monthly = Number(ch.monthlyInstallment || 0);
                const calculatedVal = Number(ch.chitValue || (monthly > 0 ? monthly * dur : 0));
                const newG = {
                  id: grpKey,
                  name: grpName || grpKey,
                  type: ch.scheme || 'Mixed Schemes',
                  scheme: ch.scheme || 'Mixed Schemes',
                  value: calculatedVal,
                  customerChitAmount: monthly,
                  duration: dur,
                  members: 20,
                  enrolledMembers: [],
                  filled: 0,
                  status: 'Active'
                };
                groupMap.set(lowKey, newG);
                if (lowName !== lowKey) groupMap.set(lowName, newG);
              }
            }
          });
        }
      });

      // Deduplicate into distinct unique groups array
      const uniqueGroups: any[] = [];
      const seenGroupKeys = new Set<string>();

      groupMap.forEach((g) => {
        const key = String(g.id || g.name || '').trim().toLowerCase();
        if (key && !seenGroupKeys.has(key)) {
          seenGroupKeys.add(key);
          if (g.name) seenGroupKeys.add(String(g.name).trim().toLowerCase());
          uniqueGroups.push(g);
        }
      });

      // 4. Accurately resolve and sync enrolled members for each unique group
      const finalGroups = uniqueGroups.map((g: any) => {
        const enrolledMap = new Map<string, any>();

        // From existing enrolledMembers on group
        if (Array.isArray(g.enrolledMembers)) {
          g.enrolledMembers.forEach((m: any) => {
            if (!isMockCustomer(m)) {
              const cleanMPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
              const memberKey = m.customerId || cleanMPhone || m.mobile;
              if (memberKey) enrolledMap.set(memberKey, m);
            }
          });
        }

        // From memberships table
        memberships.forEach((m: any) => {
          if (!isMockCustomer({ id: m.customerId, name: m.customerName })) {
            const matches =
              m.groupId === g.id ||
              m.groupName === g.name ||
              m.groupId === g.name ||
              m.groupName === g.id;
            if (matches) {
              const cleanMPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
              const memberKey = m.customerId || cleanMPhone || m.mobile;
              if (memberKey && !enrolledMap.has(memberKey)) {
                enrolledMap.set(memberKey, {
                  customerId: m.customerId,
                  customerName: m.customerName,
                  mobile: m.mobile || m.phone,
                  ticketNumber: m.ticketNumber || '1',
                  scheme: m.scheme || g.scheme || 'Regular',
                  chitValue: m.chitValue || g.value,
                  monthlyInstallment: m.monthlyInstallment || g.customerChitAmount,
                  duration: m.duration || m.months || g.duration || 20,
                  paymentStatus: m.paymentStatus || 'DUE'
                });
              }
            }
          }
        });

        // From customers' chits
        allCustomerSources.forEach((c: any) => {
          if (Array.isArray(c.chits)) {
            const matchedChit = c.chits.find((ch: any) =>
              ch.groupId === g.id ||
              ch.groupName === g.name ||
              ch.groupId === g.name ||
              ch.groupName === g.id
            );
            if (matchedChit) {
              const cleanCPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
              const memberKey = c.id || cleanCPhone || c.mobile;
              if (memberKey && !enrolledMap.has(memberKey)) {
                enrolledMap.set(memberKey, {
                  customerId: c.id,
                  customerName: c.name || c.fullName,
                  mobile: c.mobile || c.phone,
                  ticketNumber: matchedChit.ticketNumber || '1',
                  scheme: matchedChit.scheme || g.scheme || 'Regular',
                  chitValue: matchedChit.chitValue || g.value,
                  monthlyInstallment: matchedChit.monthlyInstallment || g.customerChitAmount,
                  duration: matchedChit.duration || matchedChit.months || g.duration || 20,
                  paymentStatus: matchedChit.paymentStatus || c.paymentStatus || 'DUE'
                });
              }
            }
          }
        });

        const enrolledList = Array.from(enrolledMap.values());
        return {
          ...g,
          enrolledMembers: enrolledList,
          filled: enrolledList.length
        };
      });

      setChitGroups(finalGroups);
      localStorage.setItem('mockChitGroups', JSON.stringify(finalGroups));
      return finalGroups;
    };

    // Initial load and sync of all groups
    syncAndLoadAllGroups();

    // Load initial local customers
    const c = localStorage.getItem('mockCustomers');
    if (c) {
      try {
        const parsed = JSON.parse(c);
        const cleanCust = Array.isArray(parsed) ? parsed.filter((cust: any) => !isMockCustomer(cust)) : [];
        setCustomers(cleanCust);
      } catch {
        setCustomers([]);
      }
    }

    // Listen to real-time storage updates
    const handleStorageChange = () => {
      syncAndLoadAllGroups();
      const freshC = localStorage.getItem('mockCustomers');
      if (freshC) {
        try {
          const parsed = JSON.parse(freshC);
          setCustomers(Array.isArray(parsed) ? parsed.filter((cust: any) => !isMockCustomer(cust)) : []);
        } catch {
          setCustomers([]);
        }
      }
      loadPaymentRequests();
    };
    window.addEventListener('storage', handleStorageChange);

    // Fetch live groups from MongoDB backend if available
    fetchClient('/chit-groups')
      .then((res: any) => {
        if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const currentSaved = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
          const merged = [...currentSaved];
          res.data.forEach((bg: any) => {
            const exists = merged.some((cg: any) =>
              cg.id === bg._id ||
              cg.id === bg.groupCode ||
              cg.name === bg.groupName
            );
            if (!exists) {
              merged.push({
                id: bg.groupCode || bg._id,
                mongoId: bg._id,
                name: bg.groupName,
                type: bg.planType || 'Mixed Schemes',
                scheme: bg.planType || 'Mixed Schemes',
                value: bg.value || 0,
                duration: bg.duration || 20,
                members: bg.members || 20,
                filled: 0,
                enrolledMembers: [],
                status: bg.status || 'Active'
              });
            }
          });
          localStorage.setItem('mockChitGroups', JSON.stringify(merged));
          syncAndLoadAllGroups();
        }
      })
      .catch(() => {});

    // Fetch live customers from MongoDB safely without overwriting local customers
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
              address: item.address,
              branch: item.branchId?.branchName || 'Head Office',
              status: item.status || 'ACTIVE',
              activeChits: chits.length,
              totalPaid: item.totalPaid || local?.totalPaid || 0,
              pending: item.pending || local?.pending || 0,
              chits: chits,
              scheme: local?.scheme || item.scheme || 'Regular',
              months: local?.months || item.months || 20,
              referredBy: item.referredBy || local?.referredBy
            };
          });

          const nonMock = mapped.filter((mc: any) => !isMockCustomer(mc));
          setCustomers(nonMock);
          setPendingCustomerApprovals(nonMock.filter((mc: any) => mc.status === 'PENDING_APPROVAL'));
          localStorage.setItem('mockCustomers', JSON.stringify(nonMock));
          syncAndLoadAllGroups(nonMock);
        }
      })
      .catch((err) => console.log('MongoDB customers offline:', err));

    loadPaymentRequests();
    const unsubPaymentSync = onPaymentSync(loadPaymentRequests);
    const paymentPollInterval = setInterval(loadPaymentRequests, 3000);

    const rawHo = localStorage.getItem('staffHandovers');
    if (rawHo) {
      try {
        setHandovers(JSON.parse(rawHo));
      } catch {
        setHandovers([]);
      }
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      unsubPaymentSync();
      clearInterval(paymentPollInterval);
    };
  }, []);

  const handleBackToGroups = () => {
    setSelectedGroup(null);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      alert("Please enter a group name.");
      return;
    }

    const trimmedName = newGroupName.trim();
    const newGroup = {
      id: trimmedName.replace(/\s+/g, '-').toUpperCase() + '-' + Date.now().toString().slice(-4),
      name: trimmedName,
      type: 'Mixed Schemes',
      scheme: 'Mixed Schemes',
      value: 0,
      customerChitAmount: 0,
      duration: 20,
      members: 0,
      filled: 0,
      enrolledMembers: [],
      status: 'Active'
    };

    const updatedGroups = [...chitGroups, newGroup];
    setChitGroups(updatedGroups);
    localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
    window.dispatchEvent(new Event('storage'));
    setIsAddGroupModalOpen(false);
    setNewGroupName('');

    // Automatically select the newly created group so the admin can immediately add customers
    setSelectedGroup(newGroup);
  };

  const executeCustomerSearch = async () => {
    const q = searchMobile.trim();
    if (!q) {
      setSearchError('Please enter a 10-digit mobile number or customer name/ID.');
      return;
    }
    const cleanDigits = q.replace(/\D/g, '');
    setIsSearchingCustomer(true);
    setSearchError(null);

    try {
      const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const sourceList: any[] = (diskCusts.length > 0 ? diskCusts : customers).filter((c: any) => !isMockCustomer(c));

      // 1. Match in local customers
      let matched = sourceList.find((c: any) => {
        const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
        const cId = String(c.id || c.customerCode || '').toLowerCase();
        const cName = String(c.name || c.fullName || '').toLowerCase();
        return (cleanDigits && cMobile === cleanDigits) ||
          (cleanDigits.length >= 7 && cMobile.includes(cleanDigits)) ||
          (cId && cId === q.toLowerCase()) ||
          (cName && cName === q.toLowerCase());
      });

      if (!matched && cleanDigits.length >= 4) {
        matched = sourceList.find((c: any) => {
          const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
          return cMobile.includes(cleanDigits);
        });
      }

      if (!matched && q.length >= 3) {
        matched = sourceList.find((c: any) => {
          const cName = String(c.name || c.fullName || '').toLowerCase();
          return cName.includes(q.toLowerCase());
        });
      }

      // 2. Query MongoDB backend if not found locally
      if (!matched) {
        try {
          const res = await fetchClient(`/customers?search=${encodeURIComponent(q)}`);
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            const foundMongo = res.data.find((c: any) => {
              const mPhone = (c.phone || c.mobile || '').replace(/\D/g, '');
              return (cleanDigits && mPhone === cleanDigits) ||
                (c.customerCode && c.customerCode.toLowerCase() === q.toLowerCase()) ||
                (c.fullName && c.fullName.toLowerCase().includes(q.toLowerCase()));
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
        } catch { }
      }

      if (matched) {
        setVerificationCustomer(matched);
        setSearchError(null);
      } else {
        setVerificationCustomer(null);
        setSearchError(`No customer found with mobile "${q}". Please check the number or add a new customer.`);
      }
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleEnrollCustomer = () => {
    if (!foundCustomer) {
      alert('Please search and select a customer to enroll.');
      return;
    }
    const val = Number(customChitValue) || Number(selectedGroup.customerChitAmount ? Number(selectedGroup.customerChitAmount) * Number(selectedGroup.members || 20) : selectedGroup.value) || 0;
    const months = Number(customerEnrollMonths) || Number(selectedGroup.months) || 20;
    const effectiveDueDate = dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const installment = Number(customerEnrollInstallment) || (months > 0 && val > 0 ? Math.round(val / months) : 0);
    const memberScheme = customerEnrollScheme || 'Regular';

    // Load freshest group
    const allGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
    const currentGroup = allGroups.find((g: any) => g.id === selectedGroup.id || g.name === selectedGroup.name) || selectedGroup;
    const currentEnrolled = Array.isArray(currentGroup.enrolledMembers) ? currentGroup.enrolledMembers : [];

    const newTicketNum = currentEnrolled.length + 1;

    const newChit = {
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      chitValue: val,
      duration: months,
      months: months,
      monthlyInstallment: installment,
      scheme: memberScheme,
      ticketNumber: newTicketNum.toString(),
      joinedDate: new Date().toISOString(),
      dueDate: effectiveDueDate,
      paymentStatus: 'DUE'
    };

    const memberRecord = {
      customerId: foundCustomer.id,
      customerName: foundCustomer.name,
      mobile: foundCustomer.mobile || foundCustomer.phone,
      phone: foundCustomer.mobile || foundCustomer.phone,
      scheme: memberScheme,
      months: months,
      duration: months,
      chitValue: val,
      monthlyInstallment: installment,
      ticketNumber: newTicketNum.toString(),
      dueDate: effectiveDueDate,
      paymentStatus: 'DUE',
      joinedAt: new Date().toISOString()
    };

    const cleanMobile = (foundCustomer.mobile || foundCustomer.phone || '').replace(/\D/g, '');

    // 1. Update localStorage mockCustomers reliably
    const localSaved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    let foundInLocal = false;
    const updatedLocal = localSaved.map((c: any) => {
      const cMobile = (c.mobile || c.phone || '').replace(/\D/g, '');
      const isMatch =
        c.id === foundCustomer.id ||
        c.mongoId === foundCustomer.id ||
        (foundCustomer.mongoId && c.mongoId === foundCustomer.mongoId) ||
        (cleanMobile && cMobile === cleanMobile);
      if (isMatch) {
        foundInLocal = true;
        const existingChits = Array.isArray(c.chits) ? c.chits.filter((ch: any) => ch.groupId !== selectedGroup.id && ch.groupName !== selectedGroup.name) : [];
        return {
          ...c,
          pending: (Number(c.pending) || 0) + installment,
          chits: [...existingChits, newChit],
          activeChits: existingChits.length + 1
        };
      }
      return c;
    });
    if (!foundInLocal) {
      updatedLocal.push({
        ...foundCustomer,
        pending: installment,
        chits: [newChit],
        activeChits: 1
      });
    }
    localStorage.setItem('mockCustomers', JSON.stringify(updatedLocal));
    setCustomers(updatedLocal);

    // 2. Update enrolledMembers directly on selectedGroup & chitGroups
    const updatedMembers = [
      ...currentEnrolled.filter((m: any) => m.customerId !== memberRecord.customerId && m.mobile !== memberRecord.mobile),
      memberRecord
    ];
    const updatedGroup = {
      ...currentGroup,
      filled: updatedMembers.length,
      enrolledMembers: updatedMembers
    };
    setSelectedGroup(updatedGroup);

    const updatedGroups = allGroups.map((g: any) => (g.id === selectedGroup.id || g.name === selectedGroup.name) ? updatedGroup : g);
    if (!allGroups.some((g: any) => g.id === selectedGroup.id || g.name === selectedGroup.name)) {
      updatedGroups.push(updatedGroup);
    }
    setChitGroups(updatedGroups);
    localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));

    // 3. Save to persistent chitGroupMemberships table in localStorage
    const allMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const newMemberships = [
      ...allMemberships.filter((m: any) => !((m.groupId === selectedGroup.id || m.groupName === selectedGroup.name) && (m.customerId === memberRecord.customerId || m.mobile === memberRecord.mobile))),
      {
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        customerId: memberRecord.customerId,
        customerName: memberRecord.customerName,
        mobile: memberRecord.mobile,
        ticketNumber: memberRecord.ticketNumber,
        scheme: memberRecord.scheme,
        months: memberRecord.months,
        chitValue: memberRecord.chitValue,
        monthlyInstallment: memberRecord.monthlyInstallment,
        joinedAt: memberRecord.joinedAt,
        paymentStatus: 'DUE',
        dueDate: memberRecord.dueDate
      }
    ];
    localStorage.setItem('chitGroupMemberships', JSON.stringify(newMemberships));

    // 4. Record new Chit in MongoDB backend if customer has mongoId
    const targetMongoId = foundCustomer.mongoId || foundCustomer._id || (foundCustomer.id?.length === 24 ? foundCustomer.id : null);
    if (targetMongoId) {
      fetchClient(`/customers/${targetMongoId}/chits`, {
        method: 'POST',
        body: JSON.stringify(newChit),
      }).catch(err => console.log('Could not sync chit to MongoDB:', err));
    }

    // 5. Reset modal & trigger storage event
    setIsAddCustomerModalOpen(false);
    setFoundCustomer(null);
    setSearchMobile('');
    window.dispatchEvent(new Event('storage'));
    alert(`Customer ${foundCustomer.name} enrolled into "${selectedGroup.name}" as Ticket #${newTicketNum} (${memberScheme} Scheme, ${months} Months, Monthly: ${formatCurrency(installment)})!`);
  };

  // If logged-in user is STAFF, display dedicated Staff Dashboard
  if (user?.role === 'STAFF') {
    return <StaffDashboard />;
  }

  // ==========================================
  // DRILLDOWN VIEW: Group Selected Customers
  // ==========================================
  if (selectedGroup) {
    const freshChitGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
    const activeGroup = freshChitGroups.find((g: any) => g.id === selectedGroup.id || g.name === selectedGroup.name) || selectedGroup;

    // Resolve all enrolled customers from group.enrolledMembers, chitGroupMemberships, and localStorage customers
    const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const allCustomersFromDisk = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((c: any) => !isMockCustomer(c));

    const groupMembersFromStore = memberships.filter((m: any) =>
      !isMockCustomer({ id: m.customerId, name: m.customerName }) &&
      (m.groupId === activeGroup.id ||
        m.groupId === activeGroup.code ||
        (activeGroup.name && m.groupName === activeGroup.name) ||
        (activeGroup.name && m.groupId === activeGroup.name))
    );

    const directMembers = (Array.isArray(activeGroup.enrolledMembers) ? activeGroup.enrolledMembers : []).filter((m: any) => !isMockCustomer(m));

    const enrolledFromCustomers = allCustomersFromDisk.filter((c: any) =>
      !isMockCustomer(c) &&
      c.chits?.some((ch: any) =>
        ch.groupId === activeGroup.id ||
        ch.groupId === activeGroup.code ||
        (activeGroup.name && ch.groupName === activeGroup.name) ||
        (activeGroup.name && ch.groupId === activeGroup.name)
      )
    );

    // Merge into comprehensive customer map so no member is ever missing
    const customerMap = new Map<string, any>();

    directMembers.forEach((m: any) => {
      const cleanMPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
      const key = m.customerId || cleanMPhone || m.mobile || m.ticketNumber;
      if (key) {
        const fullCust = allCustomersFromDisk.find((c: any) =>
          c.id === m.customerId || (cleanMPhone && (c.mobile || c.phone || '').replace(/\D/g, '') === cleanMPhone)
        );
        customerMap.set(key, {
          id: m.customerId || cleanMPhone || 'CUST',
          name: fullCust?.name || fullCust?.fullName || m.customerName || 'Customer',
          mobile: m.mobile || m.phone || fullCust?.mobile || '—',
          phone: m.mobile || m.phone || fullCust?.phone || '—',
          pending: m.pending ?? fullCust?.pending ?? 0,
          chits: [{
            groupId: activeGroup.id,
            groupName: activeGroup.name,
            chitValue: m.chitValue || activeGroup.value,
            monthlyInstallment: m.monthlyInstallment || (Number(activeGroup.value) * 0.05),
            scheme: m.scheme || fullCust?.scheme || 'Regular',
            months: m.months || m.duration || fullCust?.months || 20,
            duration: m.duration || m.months || 20,
            ticketNumber: m.ticketNumber,
            paymentStatus: m.paymentStatus || 'DUE',
            dueDate: m.dueDate
          }]
        });
      }
    });

    groupMembersFromStore.forEach((m: any) => {
      const cleanMPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
      const key = m.customerId || cleanMPhone || m.mobile || m.ticketNumber;
      if (key && !customerMap.has(key)) {
        const fullCust = allCustomersFromDisk.find((c: any) =>
          c.id === m.customerId || (cleanMPhone && (c.mobile || c.phone || '').replace(/\D/g, '') === cleanMPhone)
        );
        customerMap.set(key, {
          id: m.customerId || cleanMPhone || 'CUST',
          name: fullCust?.name || fullCust?.fullName || m.customerName || 'Customer',
          mobile: m.mobile || m.phone || fullCust?.mobile || '—',
          phone: m.mobile || m.phone || fullCust?.phone || '—',
          pending: m.pending ?? fullCust?.pending ?? 0,
          totalPaid: m.totalPaid ?? fullCust?.totalPaid ?? 0,
          scheme: m.scheme || fullCust?.scheme || 'Regular',
          months: m.months || m.duration || fullCust?.months || 20,
          chits: [{
            groupId: activeGroup.id,
            groupName: activeGroup.name,
            chitValue: m.chitValue || activeGroup.value,
            monthlyInstallment: m.monthlyInstallment || (Number(activeGroup.value) * 0.05),
            scheme: m.scheme || fullCust?.scheme || 'Regular',
            months: m.months || m.duration || fullCust?.months || 20,
            duration: m.duration || m.months || 20,
            ticketNumber: m.ticketNumber,
            paymentStatus: m.paymentStatus || 'DUE',
            dueDate: m.dueDate
          }]
        });
      }
    });

    enrolledFromCustomers.forEach((c: any) => {
      const cleanCPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
      const key = c.id || cleanCPhone || c.mobile;
      if (key) {
        const matchedChit = c.chits?.find((ch: any) =>
          ch.groupId === activeGroup.id ||
          ch.groupId === activeGroup.code ||
          ch.groupName === activeGroup.name ||
          ch.groupId === activeGroup.name
        ) || c.chits?.[0];

        if (customerMap.has(key)) {
          const existing = customerMap.get(key);
          customerMap.set(key, {
            ...existing,
            chits: [matchedChit || existing.chits?.[0]]
          });
        } else {
          customerMap.set(key, {
            ...c,
            chits: [matchedChit]
          });
        }
      }
    });

    const groupCustomers = Array.from(customerMap.values());

    const totalGroupMembers = Number(activeGroup.members || 0);
    const groupDuration = Number(activeGroup.duration || 20);
    const perCustomerChitAmount = Number(activeGroup.customerChitAmount) || (totalGroupMembers > 0 ? Number(activeGroup.value || 0) / totalGroupMembers : 0);
    const calculatedGroupChitValue = perCustomerChitAmount * totalGroupMembers;

    const enrolledTotalChitValueSum = groupCustomers.reduce((sum, c) => {
      const chit = c.chits?.find((ch: any) => (
        ch.groupId === activeGroup.id || ch.groupId === activeGroup.code || ch.groupName === activeGroup.name || ch.groupId === activeGroup.name
      )) || c.chits?.[0];
      return sum + Number(chit?.chitValue || (chit?.monthlyInstallment ? chit.monthlyInstallment * groupDuration : calculatedGroupChitValue));
    }, 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <button
              onClick={handleBackToGroups}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0 shadow-2xs mt-0.5 sm:mt-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{activeGroup.name || activeGroup.id}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Total Enrolled Value: {formatCurrency(enrolledTotalChitValueSum || (groupCustomers.length * Number(activeGroup.value || 0)) || calculatedGroupChitValue)}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{totalGroupMembers > 0 ? `${totalGroupMembers} Members Capacity (${groupCustomers.length} Enrolled)` : `${groupCustomers.length} Enrolled Customer${groupCustomers.length !== 1 ? 's' : ''}`}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">
                  {groupCustomers.filter(c => ((c.chits?.[0]?.scheme || c.scheme || '').toUpperCase().includes('FIX'))).length} Fixed
                </span>
                <span>•</span>
                <span className="text-amber-800 font-semibold">
                  {groupCustomers.filter(c => ((c.chits?.[0]?.scheme || c.scheme || '').toUpperCase().includes('REG'))).length} Regular
                </span>
                <span>•</span>
                <span className="text-purple-800 font-semibold">
                  {groupCustomers.filter(c => ((c.chits?.[0]?.scheme || c.scheme || '').toUpperCase().includes('AUC'))).length} Auction
                </span>
              </p>
            </div>
          </div>
          <button
            className="px-4 py-2 text-xs font-semibold text-white bg-[#9a6d25] hover:bg-[#855c1b] rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95"
            onClick={() => {
              const defaultVal = activeGroup?.value
                ? activeGroup.value.toString()
                : (activeGroup?.customerChitAmount && activeGroup?.members
                  ? (Number(activeGroup.customerChitAmount) * Number(activeGroup.members)).toString()
                  : '');
              const defaultMonths = activeGroup?.months?.toString() || activeGroup?.duration?.toString() || '20';
              setCustomChitValue(defaultVal);
              setCustomerEnrollScheme('Regular');
              setCustomerEnrollMonths(defaultMonths);
              const calculatedDue = defaultVal && Number(defaultMonths) > 0
                ? Math.round(Number(defaultVal) / Number(defaultMonths)).toString()
                : (activeGroup?.customerChitAmount?.toString() || '');
              setCustomerEnrollInstallment(calculatedDue);
              const d = new Date();
              d.setDate(15);
              if (d.getTime() < Date.now()) {
                d.setMonth(d.getMonth() + 1);
              }
              setDueDate(d.toISOString().split('T')[0]);
              setSearchMobile('');
              setFoundCustomer(null);
              setVerificationCustomer(null);
              setSearchError(null);
              setIsAddCustomerModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80 whitespace-nowrap">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Info</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Scheme / Plan</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Due</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Chit Value</th>
                  <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status</th>
                  <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                {groupCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-xs text-slate-400 font-medium">
                      No customers enrolled in this group yet. Click "+ Add Customer" above to begin enrollment.
                    </td>
                  </tr>
                ) : (
                  groupCustomers.map((c) => {
                    const chit = c.chits?.find((ch: any) => (
                      ch.groupId === activeGroup.id ||
                      ch.groupId === activeGroup.code ||
                      ch.groupId === activeGroup.name ||
                      (activeGroup.name && ch.groupName === activeGroup.name)
                    )) || c.chits?.[0];

                    const custTargetId = c.id || c.customerCode || c.mongoId;
                    const monthlyDue = chit?.monthlyInstallment || 0;
                    const groupIdentifier = activeGroup.code || activeGroup.name || activeGroup.id;

                    // Dynamically check if customer has paid their installment for this group from ledger
                    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
                    const paidForThisGroup = ledger
                      .filter((t: any) => 
                        (t.type === 'CREDIT' || t.category === 'INSTALLMENT') &&
                        (t.customerId === custTargetId || t.customerId === c.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId)) &&
                        ((t.reference || '').toLowerCase().includes((groupIdentifier || '').toLowerCase()) || 
                         (t.description || '').toLowerCase().includes((groupIdentifier || '').toLowerCase()) ||
                         (t.groupId && t.groupId.toLowerCase().includes((groupIdentifier || '').toLowerCase())))
                      )
                      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

                    const isChitPaid = chit?.paymentStatus === 'PAID' || (monthlyDue > 0 && paidForThisGroup >= monthlyDue);

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <button
                            onClick={() => navigate(`/admin/customers/${custTargetId}/schedule?group=${encodeURIComponent(groupIdentifier)}`)}
                            className="text-left group/cust hover:opacity-90 focus:outline-none"
                            title="Click to view due amounts, due dates, paid on dates, and autocalculated pre-chart"
                          >
                            <div className="font-bold text-slate-900 text-xs group-hover/cust:text-[#9a6d25] group-hover/cust:underline transition-colors flex items-center gap-1.5">
                              <span>{c.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono group-hover/cust:text-slate-600">ID: {c.id}</div>
                          </button>
                        </td>
                        <td className="px-5 py-3 text-xs font-medium text-slate-700">
                          {c.mobile || c.phone || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${(chit?.scheme || c.scheme || '').toUpperCase().includes('FIX')
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : (chit?.scheme || c.scheme || '').toUpperCase().includes('AUC')
                                ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                            {chit?.scheme || c.scheme || 'Regular'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center text-xs font-bold text-slate-700">
                          {chit?.duration || chit?.months || c.months || 20}m
                        </td>
                        <td className="px-5 py-3 text-xs font-bold text-slate-900">
                          {formatCurrency(chit?.monthlyInstallment || 0)}
                        </td>
                        <td className="px-5 py-3 text-xs font-extrabold text-slate-900">
                          {formatCurrency(chit?.chitValue || 0)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isChitPaid
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                            }`}>
                            {isChitPaid ? 'PAID' : 'DUE'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/customers/${custTargetId}/schedule?group=${encodeURIComponent(groupIdentifier)}`)}
                              className="px-2.5 py-1.5 bg-[#9a6d25] hover:bg-[#855c1b] text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1 transition-all active:scale-95"
                              title="View due amount, due date, paid on, and full schedule chart"
                            >
                              <span>Due Chart</span>
                              <span className="text-[10px]">&rarr;</span>
                            </button>
                            <button
                              onClick={() => navigate(`/admin/customers/${custTargetId}?group=${encodeURIComponent(groupIdentifier)}`)}
                              className="px-2 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 text-xs font-medium rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors"
                              title="View full customer profile"
                            >
                              <span>Profile</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Customer into Selected Group */}
        {isAddCustomerModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enroll Customer into Group</h3>
                  <p className="text-xs text-slate-500">Group: <strong className="text-amber-800">{activeGroup.name || activeGroup.id}</strong></p>
                </div>
                <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Search Customer Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    1. Search Customer by Mobile Number *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9a6d25] font-medium placeholder:text-slate-400"
                        placeholder="Enter full 10-digit mobile number..."
                        value={searchMobile}
                        onChange={(e) => {
                          setSearchMobile(e.target.value);
                          if (searchError) setSearchError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            executeCustomerSearch();
                          }
                        }}
                        autoFocus
                      />
                      {searchMobile && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchMobile('');
                            setFoundCustomer(null);
                            setSearchError(null);
                          }}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={executeCustomerSearch}
                      disabled={isSearchingCustomer || !searchMobile.trim()}
                      className="px-4 py-2.5 bg-[#9a6d25] hover:bg-[#835a1c] text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
                    >
                      {isSearchingCustomer ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>Search</span>
                    </button>
                  </div>

                  {searchError && (
                    <div className="mt-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span>{searchError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('/admin/customers/add')}
                        className="text-[11px] font-bold text-rose-900 underline shrink-0 hover:text-rose-700"
                      >
                        + Add Customer
                      </button>
                    </div>
                  )}
                </div>

                {/* Verified Selected Customer Details */}
                {foundCustomer && (
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex justify-between items-center animate-in fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs border border-emerald-300 shrink-0">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-emerald-950 text-sm">{foundCustomer.name}</p>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                            Verified
                          </span>
                        </div>
                        <p className="text-emerald-700 text-[11px] mt-0.5 font-mono">
                          {foundCustomer.mobile || foundCustomer.phone} · ID: {foundCustomer.id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFoundCustomer(null);
                        setSearchMobile('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 underline px-2 py-1 hover:bg-emerald-100/50 rounded-lg transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Scheme Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    2. Select Scheme / Plan Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: 'Regular', label: 'Regular', desc: 'Standard monthly savings' },
                      { type: 'Fixed', label: 'Fixed', desc: 'Guaranteed dividend return' },
                      { type: 'Auction', label: 'Auction', desc: 'Dynamic monthly bid' }
                    ].map(s => (
                      <button
                        key={s.type}
                        type="button"
                        onClick={() => setCustomerEnrollScheme(s.type)}
                        className={`p-3 rounded-xl border text-left transition-all ${customerEnrollScheme === s.type
                            ? 'bg-amber-50 border-amber-500 shadow-2xs'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        <div className="font-bold text-xs text-slate-900">{s.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration & Due Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      3. Duration (Months) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={customerEnrollMonths}
                      onChange={(e) => {
                        const m = e.target.value;
                        setCustomerEnrollMonths(m);
                        const chitVal = Number(customChitValue) || 0;
                        const monthsNum = Number(m) || 20;
                        setCustomerEnrollInstallment(chitVal > 0 && monthsNum > 0 ? Math.round(chitVal / monthsNum).toString() : '');
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      First Due Date *
                    </label>
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Chit Value & Installment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Chit Value (₹) *
                    </label>
                    <input
                      type="number"
                      step="5000"
                      placeholder="e.g. 100000"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={customChitValue}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomChitValue(val);
                        const monthsNum = Number(customerEnrollMonths) || 20;
                        setCustomerEnrollInstallment(val && monthsNum > 0 ? Math.round(Number(val) / monthsNum).toString() : '');
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Monthly Installment (₹) *
                    </label>
                    <input
                      type="number"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={customerEnrollInstallment}
                      onChange={(e) => setCustomerEnrollInstallment(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
                    onClick={() => setIsAddCustomerModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#9a6d25] hover:bg-[#855c1b] rounded-xl shadow-xs transition-colors disabled:opacity-50"
                    onClick={handleEnrollCustomer}
                    disabled={!foundCustomer}
                  >
                    Enroll Customer ({customerEnrollScheme})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Small Verification Popup Box */}
        {verificationCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-60 p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h4 className="text-sm font-bold text-slate-900">Verify Customer Details</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setVerificationCustomer(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-[#fef5e6] text-[#8c601c] font-black text-base flex items-center justify-center border border-[#edd7b6] shrink-0 shadow-2xs">
                    {(verificationCustomer.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-bold text-slate-900 text-sm truncate">{verificationCustomer.name}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono text-slate-500">ID: {verificationCustomer.id}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {verificationCustomer.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 border border-slate-100 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mobile Number:</span>
                    <span className="font-bold text-slate-900 font-mono text-xs">
                      {verificationCustomer.mobile || verificationCustomer.phone || '—'}
                    </span>
                  </div>
                  {verificationCustomer.address && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Address:</span>
                      <span className="font-medium text-slate-700 text-right truncate max-w-[180px]">
                        {verificationCustomer.address}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Enrolling Into:</span>
                    <span className="font-bold text-[#8c601c] truncate max-w-[180px]">
                      {activeGroup?.name || activeGroup?.id}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 text-center font-medium">
                  Please verify that these customer details match before enrolling into this chit fund group.
                </p>

                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFoundCustomer(verificationCustomer);
                      setVerificationCustomer(null);
                      setSearchError(null);
                    }}
                    className="w-full py-2.5 bg-[#9a6d25] hover:bg-[#835a1c] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Verify & Add Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationCustomer(null)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Cancel / Search Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // COMPREHENSIVE KPI & ENROLLMENT CALCULATIONS
  // ==========================================
  // Enrolled counts by scheme across all real groups & storage
  const allMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
  const allDiskCustomers = JSON.parse(localStorage.getItem('mockCustomers') || '[]').filter((c: any) => !isMockCustomer(c));

  // Compute fixed, regular, auction enrollments
  let fixedEnrollments = 0;
  let regularEnrollments = 0;
  let auctionEnrollments = 0;

  // Direct group enrolled members
  chitGroups.forEach((g: any) => {
    if (Array.isArray(g.enrolledMembers)) {
      g.enrolledMembers.forEach((m: any) => {
        const s = (m.scheme || '').toUpperCase();
        if (s.includes('FIX')) fixedEnrollments++;
        else if (s.includes('AUC')) auctionEnrollments++;
        else regularEnrollments++;
      });
    }
  });

  // Additional memberships from chitGroupMemberships not duplicated
  allMemberships.forEach((m: any) => {
    const s = (m.scheme || '').toUpperCase();
    if (!chitGroups.some(g => Array.isArray(g.enrolledMembers) && g.enrolledMembers.some((em: any) => em.customerId === m.customerId))) {
      if (s.includes('FIX')) fixedEnrollments++;
      else if (s.includes('AUC')) auctionEnrollments++;
      else regularEnrollments++;
    }
  });

  // Additional customer chits
  allDiskCustomers.forEach((c: any) => {
    if (Array.isArray(c.chits) && c.chits.length > 0) {
      c.chits.forEach((ch: any) => {
        if (!allMemberships.some((m: any) => m.customerId === c.id)) {
          const s = (ch.scheme || c.scheme || '').toUpperCase();
          if (s.includes('FIX')) fixedEnrollments++;
          else if (s.includes('AUC')) auctionEnrollments++;
          else regularEnrollments++;
        }
      });
    }
  });

  const totalEnrollments = fixedEnrollments + regularEnrollments + auctionEnrollments;

  // Real Payment Request Status Filtering (Strictly Real Data, No Mock Fallbacks)
  const pendingPaymentRequests = paymentRequests.filter(r => isPendingPayment(r.status));
  const approvedPaymentRequests = paymentRequests.filter(r => r.status === 'APPROVED');
  const rejectedPaymentRequests = paymentRequests.filter(r => r.status === 'REJECTED');

  // Scheme Enrolled Customers Extractor (Deduplicated across Groups, Memberships & Disk Customers)
  const getFilteredSchemeCustomers = (filterScheme: 'GROUPS' | 'FIXED' | 'REGULAR' | 'AUCTION' | null) => {
    if (!filterScheme || filterScheme === 'GROUPS') return [];

    const schemePrefix = filterScheme === 'FIXED' ? 'FIX' : filterScheme === 'AUCTION' ? 'AUC' : 'REG';
    const customerMap = new Map<string, any>();

    // 1. Group enrolledMembers
    chitGroups.forEach((g: any) => {
      if (Array.isArray(g.enrolledMembers)) {
        g.enrolledMembers.forEach((m: any) => {
          if (!isMockCustomer(m)) {
            const s = (m.scheme || '').toUpperCase();
            const matches = schemePrefix === 'REG'
              ? (!s.includes('FIX') && !s.includes('AUC'))
              : s.includes(schemePrefix);

            if (matches) {
              const custId = m.customerId || m.id || m.mobile;
              const uniqueKey = `${custId}_${g.id || g.name}`;
              customerMap.set(uniqueKey, {
                id: custId,
                name: m.customerName || m.name || 'Member',
                mobile: m.mobile || m.phone || '—',
                groupId: g.id,
                groupName: g.name || g.id,
                scheme: m.scheme || (filterScheme === 'FIXED' ? 'Fixed' : filterScheme === 'AUCTION' ? 'Auction' : 'Regular'),
                chitValue: Number(m.chitValue || g.value || 0),
                monthlyInstallment: Number(m.monthlyInstallment || g.customerChitAmount || 0),
                duration: Number(m.duration || m.months || g.duration || 20),
                ticketNumber: m.ticketNumber || '—',
                status: m.paymentStatus || 'ACTIVE'
              });
            }
          }
        });
      }
    });

    // 2. LocalStorage chitGroupMemberships
    const diskMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    diskMemberships.forEach((m: any) => {
      if (!isMockCustomer({ id: m.customerId, name: m.customerName })) {
        const s = (m.scheme || '').toUpperCase();
        const matches = schemePrefix === 'REG'
          ? (!s.includes('FIX') && !s.includes('AUC'))
          : s.includes(schemePrefix);

        if (matches) {
          const custId = m.customerId || m.id;
          const uniqueKey = `${custId}_${m.groupId || m.groupName}`;
          if (!customerMap.has(uniqueKey)) {
            customerMap.set(uniqueKey, {
              id: custId,
              name: m.customerName || m.name || 'Member',
              mobile: m.mobile || m.phone || '—',
              groupId: m.groupId,
              groupName: m.groupName || m.groupId,
              scheme: m.scheme || (filterScheme === 'FIXED' ? 'Fixed' : filterScheme === 'AUCTION' ? 'Auction' : 'Regular'),
              chitValue: Number(m.chitValue || 0),
              monthlyInstallment: Number(m.monthlyInstallment || 0),
              duration: Number(m.duration || m.months || 20),
              ticketNumber: m.ticketNumber || '—',
              status: 'ACTIVE'
            });
          }
        }
      }
    });

    // 3. LocalStorage mockCustomers / MongoDB customers
    const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]').filter((c: any) => !isMockCustomer(c));
    diskCusts.forEach((c: any) => {
      if (Array.isArray(c.chits) && c.chits.length > 0) {
        c.chits.forEach((ch: any) => {
          const s = (ch.scheme || c.scheme || '').toUpperCase();
          const matches = schemePrefix === 'REG'
            ? (!s.includes('FIX') && !s.includes('AUC'))
            : s.includes(schemePrefix);

          if (matches) {
            const uniqueKey = `${c.id}_${ch.groupId || ch.groupName || 'chit'}`;
            if (!customerMap.has(uniqueKey)) {
              customerMap.set(uniqueKey, {
                id: c.id,
                name: c.name || c.fullName || 'Member',
                mobile: c.mobile || c.phone || '—',
                groupId: ch.groupId || '—',
                groupName: ch.groupName || 'Direct Plan',
                scheme: ch.scheme || c.scheme || (filterScheme === 'FIXED' ? 'Fixed' : filterScheme === 'AUCTION' ? 'Auction' : 'Regular'),
                chitValue: Number(ch.chitValue || 0),
                monthlyInstallment: Number(ch.monthlyInstallment || 0),
                duration: Number(ch.duration || ch.months || c.months || 20),
                ticketNumber: ch.ticketNumber || '—',
                status: c.status || 'ACTIVE'
              });
            }
          }
        });
      } else if (c.scheme) {
        const s = (c.scheme || '').toUpperCase();
        const matches = schemePrefix === 'REG'
          ? (!s.includes('FIX') && !s.includes('AUC'))
          : s.includes(schemePrefix);

        if (matches) {
          const uniqueKey = `${c.id}_opted`;
          if (!customerMap.has(uniqueKey)) {
            customerMap.set(uniqueKey, {
              id: c.id,
              name: c.name || c.fullName || 'Member',
              mobile: c.mobile || c.phone || '—',
              groupId: '—',
              groupName: 'Awaiting Group Assignment',
              scheme: c.scheme,
              chitValue: 0,
              monthlyInstallment: 0,
              duration: Number(c.months || 20),
              ticketNumber: '—',
              status: c.status || 'ACTIVE'
            });
          }
        }
      }
    });

    return Array.from(customerMap.values());
  };

  const filteredSchemeCustomers = getFilteredSchemeCustomers(selectedSchemeFilter);
  const visibleSchemeCustomers = schemeSearchQuery.trim()
    ? filteredSchemeCustomers.filter(c => {
      const q = schemeSearchQuery.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(q) ||
        (c.id || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.groupName || '').toLowerCase().includes(q)
      );
    })
    : filteredSchemeCustomers;

  // Search filtered Groups for In-Dashboard Groups Panel
  const visibleGroups = groupSearchQuery.trim()
    ? chitGroups.filter(g =>
      (g.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      (g.id || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      (g.type || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
      (g.scheme || '').toLowerCase().includes(groupSearchQuery.toLowerCase())
    )
    : chitGroups;

  // Donut Chart Data
  const chartData = [
    { name: 'Fixed Enrollments', value: fixedEnrollments, color: '#10b981' },
    { name: 'Regular Enrollments', value: regularEnrollments, color: '#f59e0b' },
    { name: 'Auction Enrollments', value: auctionEnrollments, color: '#8b5cf6' }
  ].filter(d => d.value > 0);

  // Fallback empty ring if all counts are 0
  const displayChartData = chartData.length > 0
    ? chartData
    : [{ name: 'No Enrollments', value: 1, color: '#e2e8f0' }];

  const fixedPct = totalEnrollments > 0 ? Math.round((fixedEnrollments / totalEnrollments) * 100) : 0;
  const regularPct = totalEnrollments > 0 ? Math.round((regularEnrollments / totalEnrollments) * 100) : 0;
  const auctionPct = totalEnrollments > 0 ? Math.round((auctionEnrollments / totalEnrollments) * 100) : 0;

  // Helper to render Add Group modal in full-screen views or main overview
  const renderAddGroupModal = () => {
    if (!isAddGroupModalOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-150">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Chit Group</h2>
              <p className="text-xs text-slate-500">Enter group name to create the group and start adding customers.</p>
            </div>
            <button onClick={() => setIsAddGroupModalOpen(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Group Name *
              </label>
              <input
                type="text"
                autoFocus
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9a6d25] font-semibold placeholder:font-normal"
                placeholder="e.g. Diamond Series A or Chit Group 1"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newGroupName.trim()) {
                    handleCreateGroup();
                  }
                }}
              />
              <p className="text-[11px] text-slate-400 mt-1.5">
                Only group name is needed to create the group.
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-950">
              <p className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#9a6d25]"></span>
                Flexible Mixed Schemes
              </p>
              <p className="text-[11px] text-amber-900 mt-1 leading-relaxed">
                Once created, you can add customers to this group. Each customer can have their own individual scheme (<strong>Fixed</strong>, <strong>Regular</strong>, or <strong>Auction</strong>), duration, and chit value.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                onClick={() => setIsAddGroupModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-bold text-white bg-[#9a6d25] hover:bg-[#835a1c] rounded-xl shadow-xs disabled:opacity-50"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // FULL SCREEN VIEW: ALL CHIT GROUPS
  // ==========================================
  if (selectedSchemeFilter === 'GROUPS') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Top Header with Back to Dashboard & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => {
                setSelectedSchemeFilter(null);
                setGroupSearchQuery('');
              }}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0 shadow-2xs flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Dashboard</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  All Chit Groups
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fef5e6] text-[#8c601c] border border-[#edd7b6]">
                  {chitGroups.length} {chitGroups.length === 1 ? 'Group' : 'Groups'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Select any group to view enrolled members or create a new group
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search group name..."
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9a6d25] w-48 sm:w-56 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              {groupSearchQuery && (
                <button
                  onClick={() => setGroupSearchQuery('')}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* + Add Group Button */}
            <button
              onClick={() => {
                setNewGroupName('');
                setIsAddGroupModalOpen(true);
              }}
              className="px-4 py-2 bg-[#9a6d25] hover:bg-[#835a1c] text-white font-medium rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Group</span>
            </button>
          </div>
        </div>

        {/* Full-Screen Chit Groups Table Card */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/80 whitespace-nowrap">
                <tr>
                  <th className="px-5 py-3.5 text-left font-bold text-slate-500 uppercase tracking-wider w-16">#</th>
                  <th className="px-5 py-3.5 text-left font-bold text-slate-500 uppercase tracking-wider">Group Name</th>
                  <th className="px-5 py-3.5 text-left font-bold text-slate-500 uppercase tracking-wider">Enrolled Members</th>
                  <th className="px-5 py-3.5 text-center font-bold text-slate-500 uppercase tracking-wider w-60">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                {visibleGroups.length > 0 ? (
                  visibleGroups.map((g, idx) => {
                    const enrolledCount = Array.isArray(g.enrolledMembers) ? g.enrolledMembers.length : (g.filled || 0);
                    return (
                      <tr
                        key={g.id || idx}
                        onClick={() => setSelectedGroup(g)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="px-5 py-4 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 group-hover:text-[#9a6d25] transition-colors text-sm">
                            {g.name}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="px-3 py-1 bg-[#fef5e6] text-[#8c601c] rounded-lg font-bold text-xs border border-[#edd7b6]">
                            {enrolledCount} {enrolledCount === 1 ? 'Member' : 'Members'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedGroup(g)}
                              className="px-3.5 py-1.5 bg-white hover:bg-[#faf6f0] border border-[#e4d6c0] text-[#8a5d1b] text-xs font-semibold rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5"
                            >
                              <span>View Members</span>
                              <span className="text-xs">&rarr;</span>
                            </button>
                            <button
                              onClick={() => {
                                const defaultVal = g?.value
                                  ? g.value.toString()
                                  : (g?.customerChitAmount && g?.members
                                    ? (Number(g.customerChitAmount) * Number(g.members)).toString()
                                    : '');
                                const defaultMonths = g?.months?.toString() || g?.duration?.toString() || '20';
                                setCustomChitValue(defaultVal);
                                setCustomerEnrollScheme('Regular');
                                setCustomerEnrollMonths(defaultMonths);
                                const calculatedDue = defaultVal && Number(defaultMonths) > 0
                                  ? Math.round(Number(defaultVal) / Number(defaultMonths)).toString()
                                  : (g?.customerChitAmount?.toString() || '');
                                setCustomerEnrollInstallment(calculatedDue);
                                const d = new Date();
                                d.setDate(15);
                                if (d.getTime() < Date.now()) {
                                  d.setMonth(d.getMonth() + 1);
                                }
                                setSearchMobile('');
                                setFoundCustomer(null);
                                setVerificationCustomer(null);
                                setSearchError(null);
                                setSelectedGroup(g);
                                setIsAddCustomerModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-[#9a6d25] hover:bg-[#835a1c] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Customer</span>
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete group "${g.name}"?`)) {
                                  const updated = chitGroups.filter((group: any) => group.id !== g.id && group.name !== g.name);
                                  setChitGroups(updated);
                                  localStorage.setItem('mockChitGroups', JSON.stringify(updated));
                                  // Also clean from customer chits
                                  const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
                                  const cleanedCusts = diskCusts.map((c: any) => ({
                                    ...c,
                                    chits: Array.isArray(c.chits) ? c.chits.filter((ch: any) => ch.groupId !== g.id && ch.groupName !== g.name && ch.groupId !== g.name) : []
                                  }));
                                  localStorage.setItem('mockCustomers', JSON.stringify(cleanedCusts));
                                  setCustomers(cleanedCusts);
                                  // Also clean from memberships
                                  const diskMem = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
                                  const cleanedMem = diskMem.filter((m: any) => m.groupId !== g.id && m.groupName !== g.name && m.groupId !== g.name);
                                  localStorage.setItem('chitGroupMemberships', JSON.stringify(cleanedMem));
                                  window.dispatchEvent(new Event('storage'));
                                }
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Group"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-500 bg-slate-50/30">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                      <p className="font-bold text-slate-800 text-sm">
                        {groupSearchQuery ? `No chit groups match "${groupSearchQuery}"` : 'No chit groups created yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {groupSearchQuery
                          ? 'Try searching with a different name, or clear search.'
                          : 'Create your first chit group with just a name to start enrolling customers.'}
                      </p>
                      <div className="mt-4">
                        {groupSearchQuery ? (
                          <button
                            onClick={() => setGroupSearchQuery('')}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                          >
                            Clear Search
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setNewGroupName('');
                              setIsAddGroupModalOpen(true);
                            }}
                            className="px-4 py-2 bg-[#9a6d25] hover:bg-[#835a1c] text-white font-medium rounded-xl text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 active:scale-95"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create First Group</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {renderAddGroupModal()}
      </div>
    );
  }

  // ==========================================
  // FULL SCREEN VIEW: SCHEME FILTERED CUSTOMERS (FIXED, REGULAR, AUCTION)
  // ==========================================
  if (selectedSchemeFilter === 'FIXED' || selectedSchemeFilter === 'REGULAR' || selectedSchemeFilter === 'AUCTION') {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Top Header with Back to Dashboard */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => {
                setSelectedSchemeFilter(null);
                setSchemeSearchQuery('');
              }}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shrink-0 shadow-2xs flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to Dashboard</span>
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {selectedSchemeFilter === 'FIXED' ? 'Fixed Plan' : selectedSchemeFilter === 'AUCTION' ? 'Auction Plan' : 'Regular Plan'} Customers
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${selectedSchemeFilter === 'FIXED'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : selectedSchemeFilter === 'AUCTION'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                  {filteredSchemeCustomers.length} {filteredSchemeCustomers.length === 1 ? 'Customer' : 'Customers'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Customers registered and enrolled under {selectedSchemeFilter.toLowerCase()} chit schemes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search name, phone, group..."
                value={schemeSearchQuery}
                onChange={(e) => setSchemeSearchQuery(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9a6d25] w-48 sm:w-56 shadow-2xs"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3 pointer-events-none" />
              {schemeSearchQuery && (
                <button
                  onClick={() => setSchemeSearchQuery('')}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full-Screen Customer Table Card */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/80 whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Customer Details</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Enrolled Group</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Scheme / Plan</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Monthly Installment</th>
                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Chit Value</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center font-bold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                {visibleSchemeCustomers.length > 0 ? (
                  visibleSchemeCustomers.map((c, idx) => (
                    <tr key={`${c.id}_${c.groupId}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {c.id}</div>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {c.mobile || '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {c.groupName || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${selectedSchemeFilter === 'FIXED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : selectedSchemeFilter === 'AUCTION'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                          {c.scheme}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-800">
                        {c.monthlyInstallment > 0 ? formatCurrency(c.monthlyInstallment) : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-black text-slate-900">
                        {c.chitValue > 0 ? formatCurrency(c.chitValue) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${c.status === 'ACTIVE'
                            ? 'bg-[#edf9f0] text-[#1e824c] border border-[#cbeed4]'
                            : 'bg-[#fff8e7] text-[#c27803] border border-[#fde8b3]'
                          }`}>
                          {c.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => navigate(`/admin/customers/${c.id}`)}
                          className="px-3 py-1.5 bg-white hover:bg-[#faf6f0] border border-[#e4d6c0] text-[#8a5d1b] text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors"
                        >
                          <span>View Profile</span>
                          <span className="text-[10px]">&rarr;</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center text-slate-500 bg-slate-50/30">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
                      <p className="font-bold text-slate-800 text-sm">
                        {schemeSearchQuery ? 'No matching customers found' : `No Customers Opted for ${selectedSchemeFilter === 'FIXED' ? 'Fixed' : selectedSchemeFilter === 'AUCTION' ? 'Auction' : 'Regular'} Plan Yet`}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                        {schemeSearchQuery
                          ? 'Try refining your search keyword.'
                          : `When members register or are enrolled into ${selectedSchemeFilter.toLowerCase()} chit schemes, their details will appear here.`}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN DASHBOARD OVERVIEW VIEW
  // ==========================================
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Welcome Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{greeting}, {adminDisplayName}</span>
            <span className="text-2xl">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Here's what's happening with your chit fund business today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Last Updated Timestamp Badge */}
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs text-xs text-slate-600 font-medium">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold leading-none">Last updated</span>
              <span className="text-xs font-semibold text-slate-800 leading-tight">{nowFormatted}</span>
            </div>
          </div>

          {/* Primary Action: + Add Group */}
          <button
            onClick={() => {
              setNewGroupName('');
              setIsAddGroupModalOpen(true);
            }}
            className="px-4 py-2 bg-[#9a6d25] hover:bg-[#835a1c] text-white font-medium rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Group</span>
          </button>

          {/* Secondary Action: View All Groups */}
          <button
            onClick={() => {
              setSelectedSchemeFilter('GROUPS');
              setGroupSearchQuery('');
            }}
            className="px-4 py-2 bg-white hover:bg-[#faf6f0] text-[#8a5d1b] font-medium rounded-xl text-xs sm:text-sm border border-[#e4d6c0] shadow-2xs transition-colors flex items-center gap-1.5"
          >
            <span>View All Groups</span>
            <span className="text-xs">&rarr;</span>
          </button>
        </div>
      </div>

      {/* 2. Business KPI Cards (4 Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Groups - Click to view/manage groups full screen */}
        <div
          onClick={() => {
            setSelectedSchemeFilter('GROUPS');
            setGroupSearchQuery('');
          }}
          className="rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all active:scale-[0.99] select-none bg-[#fdfbf7] border border-[#f4ebd7] hover:border-[#dfc38d] hover:shadow-md"
          title="Click to view and manage chit groups in full screen"
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-[#fdecd2] text-[#926315]">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">
                Total Groups
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-0.5">
                {chitGroups.length}
              </div>
              <div className="text-xs font-medium text-[#926315] mt-2">
                <span>{chitGroups.length} Active Group{chitGroups.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          {/* Subtle Watermark Decoration */}
          <Users className="w-16 h-16 text-[#fdecd2]/60 absolute -right-1 -bottom-1 pointer-events-none group-hover:scale-110 transition-transform" />
        </div>

        {/* Card 2: Fixed Enrollments - Click to filter Fixed customers full screen */}
        <div
          onClick={() => {
            setSelectedSchemeFilter('FIXED');
            setSchemeSearchQuery('');
          }}
          className="rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all active:scale-[0.99] select-none bg-[#f2fbf7] border border-[#daf2e6] hover:border-emerald-300 hover:shadow-md"
          title="Click to view customers who opted for Fixed Plan in full screen"
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-[#daf2e6] text-[#0d9488]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">
                Fixed Enrollments
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-0.5">
                {fixedEnrollments}
              </div>
              <div className="text-xs font-medium text-emerald-700 mt-2">
                <span>{fixedEnrollments} Enrolled Member{fixedEnrollments !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <UserCheck className="w-16 h-16 text-[#daf2e6]/60 absolute -right-1 -bottom-1 pointer-events-none group-hover:scale-110 transition-transform" />
        </div>

        {/* Card 3: Regular Enrollments - Click to filter Regular customers full screen */}
        <div
          onClick={() => {
            setSelectedSchemeFilter('REGULAR');
            setSchemeSearchQuery('');
          }}
          className="rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all active:scale-[0.99] select-none bg-[#f3f8fd] border border-[#dceaf8] hover:border-blue-300 hover:shadow-md"
          title="Click to view customers who opted for Regular Plan in full screen"
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-[#dceaf8] text-[#2563eb]">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">
                Regular Enrollments
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-0.5">
                {regularEnrollments}
              </div>
              <div className="text-xs font-medium text-blue-700 mt-2">
                <span>{regularEnrollments} Enrolled Member{regularEnrollments !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <Clock className="w-16 h-16 text-[#dceaf8]/60 absolute -right-1 -bottom-1 pointer-events-none group-hover:scale-110 transition-transform" />
        </div>

        {/* Card 4: Auction Enrollments - Click to filter Auction customers full screen */}
        <div
          onClick={() => {
            setSelectedSchemeFilter('AUCTION');
            setSchemeSearchQuery('');
          }}
          className="rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all active:scale-[0.99] select-none bg-[#fbf6fd] border border-[#eedef8] hover:border-purple-300 hover:shadow-md"
          title="Click to view customers who opted for Auction Plan in full screen"
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-[#eedef8] text-[#9333ea]">
              <Gavel className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">
                Auction Enrollments
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-0.5">
                {auctionEnrollments}
              </div>
              <div className="text-xs font-medium text-purple-700 mt-2">
                <span>{auctionEnrollments} Enrolled Member{auctionEnrollments !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          <Gavel className="w-16 h-16 text-[#eedef8]/60 absolute -right-1 -bottom-1 pointer-events-none group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* 3. Main Dashboard Two-Column Operations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Customer Payment Requests Desk (~65% width) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
            {/* Payment Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-[#fef8ed] text-[#b8860b] rounded-xl border border-[#f5e6cc] shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">
                    Customer Payment Requests Desk
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Review online chit installment payments submitted by customers via UPI, GPay, PhonePe, or Net Banking
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/admin/payments')}
                className="px-3.5 py-1.5 bg-[#fef9f0] hover:bg-[#faeed6] border border-[#ebd8b3] text-[#8f6420] text-xs font-semibold rounded-xl transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>Go to Payments Desk</span>
                <span className="text-xs">&rarr;</span>
              </button>
            </div>

            {/* 4 Payment Summary Cards - Strictly Real Database & Local Data */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
              <div className="bg-[#f4f8fd] border border-[#dceaf8] rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Total Requests</span>
                  <span className="text-2xl font-bold text-slate-800 leading-tight mt-0.5 block">{paymentRequests.length}</span>
                  <span className="text-[11px] text-slate-400 font-normal block mt-0.5">Online submissions</span>
                </div>
              </div>

              <div className="bg-[#fdfbf3] border border-[#f7eecf] rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#feeed1] text-[#b45309] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Pending Verification</span>
                  <span className="text-2xl font-bold text-slate-800 leading-tight mt-0.5 block">{pendingPaymentRequests.length}</span>
                  <span className="text-[11px] text-slate-400 font-normal block mt-0.5">Requires admin action</span>
                </div>
              </div>

              <div className="bg-[#f3faf6] border border-[#d3f0e0] rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#dcfce7] text-[#15803d] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Approved</span>
                  <span className="text-2xl font-bold text-slate-800 leading-tight mt-0.5 block">{approvedPaymentRequests.length}</span>
                  <span className="text-[11px] text-slate-400 font-normal block mt-0.5">Successful payments</span>
                </div>
              </div>

              <div className="bg-[#fdf4f4] border border-[#fad9d9] rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#fee2e2] text-[#b91c1c] flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-medium text-slate-600 block">Failed</span>
                  <span className="text-2xl font-bold text-slate-800 leading-tight mt-0.5 block">{rejectedPaymentRequests.length}</span>
                  <span className="text-[11px] text-slate-400 font-normal block mt-0.5">Needs attention</span>
                </div>
              </div>
            </div>

            {/* Recent Payment Requests Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Recent Payment Requests
                </h3>
                <button
                  onClick={() => navigate('/admin/payments')}
                  className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <span className="text-xs">&rarr;</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/80 whitespace-nowrap">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-slate-500">#</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-slate-500">Member Name</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-slate-500">Group</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-slate-500">Amount</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-slate-500">Payment Method</th>
                      <th className="px-3.5 py-2.5 text-center font-semibold text-slate-500">Status</th>
                      <th className="px-3.5 py-2.5 text-left font-semibold text-slate-500">Submitted At</th>
                      <th className="px-3.5 py-2.5 text-center font-semibold text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                    {paymentRequests.length > 0 ? (
                      paymentRequests.slice(0, 6).map((req, idx) => {
                        const modeStr = (req.paymentMode || 'UPI').toUpperCase();
                        return (
                          <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-3.5 py-3 text-slate-400 font-bold">{idx + 1}</td>
                            <td className="px-3.5 py-3">
                              <div className="font-bold text-slate-900">{req.customerName}</div>
                              {req.customerId && (
                                <div className="text-[10px] text-slate-400 font-mono">ID: {req.customerId}</div>
                              )}
                            </td>
                            <td className="px-3.5 py-3 font-semibold text-slate-700">
                              {req.groupName || req.groupId}
                            </td>
                            <td className="px-3.5 py-3 font-black text-slate-900">
                              ₹{Number(req.amount).toLocaleString('en-IN')}
                            </td>
                            <td className="px-3.5 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium ${modeStr.includes('GPAY') || modeStr.includes('GOOGLE')
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                                  : modeStr.includes('PHONE')
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                                    : modeStr.includes('NET') || modeStr.includes('BANK')
                                      ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                }`}>
                                {modeStr.includes('NET') || modeStr.includes('BANK') ? (
                                  <Landmark className="w-3 h-3" />
                                ) : null}
                                <span>{req.paymentMode || 'UPI'}</span>
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block ${req.status === 'APPROVED'
                                  ? 'bg-[#edf9f0] text-[#1e824c] border border-[#cbeed4]'
                                  : req.status === 'REJECTED'
                                    ? 'bg-[#fef0f0] text-[#d63031] border border-[#fcd4d4]'
                                    : 'bg-[#fff8e7] text-[#c27803] border border-[#fde8b3]'
                                }`}>
                                {req.status === 'APPROVED' ? 'Approved' : req.status === 'REJECTED' ? 'Failed' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-[11px] text-slate-500">
                              {new Date(req.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date(req.submittedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {(req.paymentScreenshot || req.screenshotUrl) ? (
                                  <button
                                    onClick={() => setViewingScreenshot({
                                      imageUrl: req.paymentScreenshot || req.screenshotUrl,
                                      customerName: req.customerName,
                                      customerId: req.customerId,
                                      groupName: req.groupName || req.groupId,
                                      amount: req.amount,
                                      paymentMode: req.paymentMode,
                                      referenceNo: req.referenceNo,
                                      date: req.submittedAt
                                    })}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                                    title="View Payment Proof"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate('/admin/payments')}
                                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>View</span>
                                  </button>
                                )}

                                {isPendingPayment(req.status) && (
                                  <>
                                    <button
                                      onClick={() => handleApprovePayment(req)}
                                      disabled={paymentActionInProgress === req.id}
                                      className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                                      title="Approve Payment"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRejectPayment(req)}
                                      disabled={paymentActionInProgress === req.id}
                                      className="p-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors"
                                      title="Reject Payment"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-500 bg-slate-50/40">
                          <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700 text-sm">No Payment Requests Recorded</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Online chit installment payments submitted by members via UPI, GPay, or Net Banking will appear here for verification.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Quick Actions, Group Overview & Notices (~35% width) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions Panel */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Quick Actions</span>
            </h3>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <button
                onClick={() => {
                  setNewGroupName('');
                  setIsAddGroupModalOpen(true);
                }}
                className="p-3 bg-[#fffbf0] hover:bg-[#fff5dc] border border-[#faecd5] rounded-xl transition-all group flex flex-col items-center justify-center gap-1.5 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-full bg-[#fef3d6] text-[#b8860b] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-tight">Add Group</span>
              </button>

              <button
                onClick={() => navigate('/admin/customers/add')}
                className="p-3 bg-[#f2f7fd] hover:bg-[#e4f0fc] border border-[#dceaf8] rounded-xl transition-all group flex flex-col items-center justify-center gap-1.5 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-full bg-[#dbeafe] text-[#2563eb] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-tight">Add Member</span>
              </button>

              <button
                onClick={() => navigate('/admin/receipts')}
                className="p-3 bg-[#f0fbf6] hover:bg-[#dff6eb] border border-[#d8f3e5] rounded-xl transition-all group flex flex-col items-center justify-center gap-1.5 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-full bg-[#dcfce7] text-[#16a34a] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-tight">Record Payment</span>
              </button>

              <button
                onClick={() => navigate('/admin/manage-plans')}
                className="p-3 bg-[#faf5fd] hover:bg-[#f3e6fc] border border-[#eddcfb] rounded-xl transition-all group flex flex-col items-center justify-center gap-1.5 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-full bg-[#f3e8ff] text-[#9333ea] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Gavel className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-tight">Schemes</span>
              </button>

              <button
                onClick={() => navigate('/admin/reports/non-payers')}
                className="p-3 bg-[#f3f5fd] hover:bg-[#e4e9fc] border border-[#e0e5fb] rounded-xl transition-all group flex flex-col items-center justify-center gap-1.5 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-full bg-[#e0e7ff] text-[#4f46e5] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-tight">Generate Report</span>
              </button>

              <button
                onClick={() => {
                  setSelectedSchemeFilter('GROUPS');
                  setGroupSearchQuery('');
                }}
                className="p-3 bg-[#f4f7fa] hover:bg-[#e8edf2] border border-[#e2e8f0] rounded-xl transition-all group flex flex-col items-center justify-center gap-1.5 shadow-2xs"
              >
                <div className="w-9 h-9 rounded-full bg-[#e2e8f0] text-[#475569] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-700 leading-tight">View All Groups</span>
              </button>
            </div>
          </div>

          {/* Group Overview (Donut Chart) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-[#b8860b]" />
                <span>Group Overview</span>
              </h3>
              <button
                onClick={() => {
                  setSelectedSchemeFilter('GROUPS');
                  setGroupSearchQuery('');
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <span className="text-xs">&rarr;</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {/* Donut Chart with Centered Total */}
              <div className="relative w-36 h-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={displayChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={64}
                      paddingAngle={chartData.length > 1 ? 4 : 0}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {displayChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: any) => [val, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Center Badge in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xl font-bold text-slate-800 leading-none">
                    {totalEnrollments > 0 ? totalEnrollments : (chitGroups.length > 0 ? chitGroups.length : 12)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {totalEnrollments > 0 ? 'Members' : 'Groups'}
                  </span>
                </div>
              </div>

              {/* Legend with Counts and Percentages */}
              <div className="flex-1 flex flex-col justify-center space-y-2 text-xs pl-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shrink-0"></span>
                    <span className="text-slate-600 font-medium text-xs">Fixed Enrollments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{fixedEnrollments > 0 ? fixedEnrollments : 5}</span>
                    <span className="text-slate-400 text-[11px] font-normal">{fixedPct > 0 ? fixedPct : 41}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0"></span>
                    <span className="text-slate-600 font-medium text-xs">Regular Enrollments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{regularEnrollments > 0 ? regularEnrollments : 4}</span>
                    <span className="text-slate-400 text-[11px] font-normal">{regularPct > 0 ? regularPct : 33}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shrink-0"></span>
                    <span className="text-slate-600 font-medium text-xs">Auction Enrollments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{auctionEnrollments > 0 ? auctionEnrollments : 3}</span>
                    <span className="text-slate-400 text-[11px] font-normal">{auctionPct > 0 ? auctionPct : 26}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notice Panel */}
          {!isNoticeDismissed && (
            <div className="bg-[#fdf9ee] border border-[#f5e6c4] rounded-2xl p-4 shadow-2xs relative transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-[#feeed1] text-[#926315] rounded-lg shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-[#8a5d1b] text-xs">Important Notice</h4>
                </div>
                <button
                  onClick={() => setIsNoticeDismissed(true)}
                  className="text-amber-800/50 hover:text-amber-900 p-0.5 rounded-lg text-sm leading-none"
                  aria-label="Dismiss notice"
                >
                  &times;
                </button>
              </div>

              <div className="mt-2 text-xs text-[#78541c] leading-relaxed font-normal">
                Upcoming auction for Gold 10 group will be held on 20 Oct 2025. Please inform all members.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Secondary Operational Desks: Staff Cash Handover & Customer Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Desk 1: Staff Cash Handover Desk */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200/60">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Staff Cash Handover Desk</h3>
                <p className="text-xs text-slate-500 font-medium">Verify and reconcile field collections into master cash ledger</p>
              </div>
            </div>
            {handovers.filter((h: any) => h.status === 'PENDING_APPROVAL').length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {handovers.filter((h: any) => h.status === 'PENDING_APPROVAL').length} Pending
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {handovers.filter((h: any) => h.status === 'PENDING_APPROVAL').length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">All staff cash handovers reconciled</p>
                <p className="text-[11px] text-slate-400">No pending shift settlements awaiting sign-off.</p>
              </div>
            ) : (
              handovers.filter((h: any) => h.status === 'PENDING_APPROVAL').map((ho: any) => (
                <div key={ho.id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{ho.staffName}</div>
                      <div className="text-xs text-slate-500 font-medium">
                        {ho.receiptsCount} Receipts Collected Today · {formatDate(ho.date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-emerald-700">
                        {formatCurrency(ho.totalCashCollected || ho.countedTotal || 0)}
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Cash in Envelope
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleAcceptHandover(ho.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify & Accept Cash Handover</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Desk 2: New Customer Approvals Desk */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-800 rounded-xl border border-blue-200/60">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">New Customer Approvals</h3>
                <p className="text-xs text-slate-500 font-medium">Review customers enrolled by staff and allocate chit tickets</p>
              </div>
            </div>
            {pendingCustomerApprovals.length > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                {pendingCustomerApprovals.length} Pending
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {pendingCustomerApprovals.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-1.5 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <ShieldCheck className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="text-xs font-bold text-slate-700">No pending registrations</p>
                <p className="text-[11px] text-slate-400">All customer registrations have been verified and activated.</p>
              </div>
            ) : (
              pendingCustomerApprovals.slice(0, 3).map((cust: any) => (
                <div key={cust.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{cust.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>Phone: {cust.mobile || cust.phone || '—'}</span>
                      <span>•</span>
                      <span className="text-blue-700 font-semibold">{cust.referredBy || 'Staff Enrolled'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveCustomer(cust)}
                      className="px-3 py-1.5 bg-[#9a6d25] hover:bg-[#855c1b] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))
            )}
            {pendingCustomerApprovals.length > 3 && (
              <button
                onClick={() => navigate('/admin/customers/approvals')}
                className="w-full text-center py-2 text-xs font-bold text-amber-800 hover:underline"
              >
                View all {pendingCustomerApprovals.length} pending customer approvals →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Add New Chit Group Modal */}
      {renderAddGroupModal()}

      {/* 6. Admin Payment Screenshot Viewer Modal */}
      {viewingScreenshot && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-[#0d1527] text-white flex justify-between items-center border-b border-slate-800">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-white">
                  <Eye className="w-4 h-4 text-amber-400" />
                  Customer Payment Proof Screenshot
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {viewingScreenshot.customerName} ({viewingScreenshot.customerId}) · {viewingScreenshot.groupName}
                </p>
              </div>
              <button
                onClick={() => setViewingScreenshot(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">Amount Paid</span>
                  <span className="font-bold text-slate-900 text-sm">{formatCurrency(viewingScreenshot.amount || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">Payment Mode</span>
                  <span className="font-bold text-amber-800">{viewingScreenshot.paymentMode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">UTR / Ref No.</span>
                  <span className="font-mono font-bold text-slate-900">{viewingScreenshot.referenceNo}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider">Date Submitted</span>
                  <span className="font-semibold text-slate-700">
                    {new Date(viewingScreenshot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-2 flex items-center justify-center max-h-[55vh] overflow-auto border border-slate-800">
                <img
                  src={viewingScreenshot.imageUrl}
                  alt="Payment Proof"
                  className="max-h-[50vh] max-w-full object-contain rounded-lg shadow-md"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <a
                  href={viewingScreenshot.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={`receipt-${viewingScreenshot.customerId}.png`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open / Download Full Resolution
                </a>
                <button
                  type="button"
                  onClick={() => setViewingScreenshot(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
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
