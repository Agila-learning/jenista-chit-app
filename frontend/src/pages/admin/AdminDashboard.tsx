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
  Trash2,
  Calculator,
  Receipt,
  Download,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  Filter
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
import { addSystemNotification } from '../../utils/notificationsData';
import {
  getStoredBankAccounts,
  resolveBankForPayment
} from '../../utils/bankAccountsData';

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

  // Payment requests & receipts
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [staffReceiptsList, setStaffReceiptsList] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('staffReceipts') || '[]');
    } catch {
      return [];
    }
  });
  const [handovers, setHandovers] = useState<any[]>([]);
  const [pendingCustomerApprovals, setPendingCustomerApprovals] = useState<any[]>([]);
  const [paymentActionInProgress, setPaymentActionInProgress] = useState<string | null>(null);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  // Partial Payments Calculations
  const partialReceipts = staffReceiptsList.filter((r: any) => r.isPartial || r.status === 'PARTIAL');
  const partialPaymentsCount = partialReceipts.length;
  const partialPaymentsTotalPaid = partialReceipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
  const partialPaymentsTotalDue = partialReceipts.reduce((sum: number, r: any) => sum + Number(r.remainingBalance || 0), 0);

  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<'GROUPS' | 'FIXED' | 'REGULAR' | 'AUCTION' | null>(null);
  const [schemeSearchQuery, setSchemeSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Group Drilldown View & Month Tracking States
  const [drilldownTab, setDrilldownTab] = useState<'MEMBERS' | 'MONTH_WISE' | 'ALL_MATRIX'>('MEMBERS');
  const [selectedMonthForTracking, setSelectedMonthForTracking] = useState<number>(1);
  const [monthStatusFilter, setMonthStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [groupMemberQuery, setGroupMemberQuery] = useState('');
  
  // Bank Allocation Metrics & Interactive Filter States
  const [isBankAllocationModalOpen, setIsBankAllocationModalOpen] = useState(false);
  const [selectedBankFilterId, setSelectedBankFilterId] = useState<string>('ALL');
  const [bankMemberSearchQuery, setBankMemberSearchQuery] = useState('');

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
      try {
        const freshRecs = JSON.parse(localStorage.getItem('staffReceipts') || '[]');
        setStaffReceiptsList(Array.isArray(freshRecs) ? freshRecs : []);
      } catch {
        setStaffReceiptsList([]);
      }
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
              scheme: local?.scheme || item.scheme || (local?.interestedPlan?.includes('Fix') ? 'Fixed' : local?.interestedPlan?.includes('Auc') ? 'Auction' : local?.interestedPlan?.includes('Reg') ? 'Regular' : undefined) || 'Regular',
              interestedPlan: local?.interestedPlan || item.interestedPlan,
              months: local?.months || item.months || 20,
              referredBy: item.referredBy || local?.referredBy
            };
          });

          // Sync with website leads to ensure converted leads (like Agila) retain their scheme and enrollment
          try {
            const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
            mapped.forEach((c: any) => {
              const matchedLead = storedLeads.find((l: any) =>
                (c.mobile && l.phone && c.mobile.replace(/\D/g, '') === l.phone.replace(/\D/g, '')) ||
                (c.name && l.fullName && c.name.trim().toLowerCase() === l.fullName.trim().toLowerCase())
              );
              if (matchedLead) {
                const rawP = matchedLead.interestedPlan || '';
                let dScheme: 'Auction' | 'Fixed' | 'Regular' = 'Auction';
                if (rawP.toLowerCase().includes('fix')) dScheme = 'Fixed';
                else if (rawP.toLowerCase().includes('reg')) dScheme = 'Regular';
                else if (rawP.toLowerCase().includes('auc')) dScheme = 'Auction';
                c.scheme = c.scheme || dScheme;
                c.interestedPlan = c.interestedPlan || matchedLead.interestedPlan || `${dScheme} Scheme`;
                if (!Array.isArray(c.chits) || c.chits.length === 0) {
                  c.chits = [
                    {
                      groupId: 'PENDING',
                      groupName: matchedLead.interestedPlan || `${dScheme} Scheme (Lead Enrolled)`,
                      scheme: dScheme,
                      chitValue: 100000,
                      monthlyInstallment: 5000,
                      duration: 20,
                      ticketNumber: '1',
                      paymentStatus: 'ACTIVE',
                      joiningDate: c.createdAt || new Date().toISOString()
                    }
                  ];
                }
              }
            });
          } catch {}

          // Merge local-only customers that are not yet in backend MongoDB
          const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]'));
          const backendPhoneSet = new Set(res.data.map((i: any) => (i.phone || i.mobile || '').replace(/\D/g, '')));
          const backendIdSet = new Set(res.data.map((i: any) => i._id || i.customerCode));

          const cleanMapped = mapped.filter((c: any) => !deletedIds.has(c.id) && (!c.mongoId || !deletedIds.has(c.mongoId)));

          const localOnly = localSaved.filter((lc: any) => {
            if (isMockCustomer(lc)) return false;
            if (deletedIds.has(lc.id) || (lc.mongoId && deletedIds.has(lc.mongoId)) || (lc.mobile && deletedIds.has(lc.mobile))) return false;
            // If customer was synced from MongoDB (has mongoId) but is missing from MongoDB, it was deleted in MongoDB!
            if (lc.mongoId && !backendIdSet.has(lc.mongoId)) return false;
            const normPhone = (lc.mobile || lc.phone || '').replace(/\D/g, '');
            if (normPhone && backendPhoneSet.has(normPhone)) return false;
            if (lc.id && backendIdSet.has(lc.id)) return false;
            return true;
          });

          const combined = [...cleanMapped, ...localOnly];

          // Auto-resurrect converted leads (skipping explicitly deleted leads)
          try {
            const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
            storedLeads.filter((l: any) => l.status !== 'REJECTED' && !deletedIds.has(l.convertedCustomerId) && (l.status === 'CONVERTED' || (l.fullName && l.fullName.toLowerCase().includes('agila')))).forEach((lead: any) => {
              const leadPhone = (lead.phone || '').replace(/\D/g, '');
              const leadName = (lead.fullName || '').trim().toLowerCase();
              const alreadyExists = combined.some((c: any) => {
                const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
                const cName = (c.name || c.fullName || '').trim().toLowerCase();
                return (cPhone && leadPhone && cPhone === leadPhone) || (cName && leadName && cName === leadName);
              });

              if (!alreadyExists) {
                const rawP = lead.interestedPlan || '';
                let dScheme: 'Auction' | 'Fixed' | 'Regular' = 'Auction';
                if (rawP.toLowerCase().includes('fix')) dScheme = 'Fixed';
                else if (rawP.toLowerCase().includes('reg')) dScheme = 'Regular';
                if (!lead.convertedCustomerId) {
                  lead.convertedCustomerId = `TC-${Math.floor(10000 + Math.random() * 90000)}`;
                  try {
                    localStorage.setItem('websiteLeads', JSON.stringify(storedLeads));
                  } catch (e) {}
                }
                const newCode = lead.convertedCustomerId;

                combined.unshift({
                  id: newCode,
                  customerCode: newCode,
                  name: lead.fullName,
                  fullName: lead.fullName,
                  mobile: lead.phone,
                  phone: lead.phone,
                  email: lead.email || '',
                  address: 'Website Lead Registration',
                  status: 'ACTIVE',
                  kycStatus: 'VERIFIED',
                  scheme: dScheme,
                  interestedPlan: lead.interestedPlan || `${dScheme} Scheme`,
                  totalPaid: 0,
                  pending: 0,
                  chits: [
                    {
                      groupId: 'PENDING',
                      groupName: lead.interestedPlan || `${dScheme} Scheme (Lead Enrolled)`,
                      scheme: dScheme,
                      chitValue: 100000,
                      monthlyInstallment: 5000,
                      duration: 20,
                      ticketNumber: '1',
                      paymentStatus: 'ACTIVE',
                      joiningDate: lead.submittedAt || new Date().toISOString()
                    }
                  ],
                  createdAt: lead.submittedAt || new Date().toISOString()
                });
              }
            });
          } catch {}

          const nonMock = combined.filter((mc: any) => !isMockCustomer(mc));
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

    // 4. Record new Chit in MongoDB backend so it reflects across all devices
    const targetLookupId = foundCustomer.mongoId || foundCustomer._id || foundCustomer.customerCode || foundCustomer.id || cleanMobile;
    if (targetLookupId) {
      fetchClient(`/customers/${encodeURIComponent(targetLookupId)}/chits`, {
        method: 'POST',
        body: JSON.stringify(newChit),
      }).catch(err => console.warn('Could not sync chit to MongoDB:', err));
    }

    // 4b. Dispatch real-time live notification to the customer
    try {
      addSystemNotification({
        type: 'SYSTEM',
        title: `Chit Group Allocation: ${selectedGroup.name}`,
        message: `Congratulations ${foundCustomer.name}! You have been allocated to chit group "${selectedGroup.name}" as Ticket #${newTicketNum} (${memberScheme} Scheme, Monthly Installment: ₹${installment.toLocaleString('en-IN')}).`,
        targetRole: 'CUSTOMER',
        targetUserId: foundCustomer.id || cleanMobile,
        metadata: {
          customerId: foundCustomer.id || cleanMobile,
          customerName: foundCustomer.name,
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          amount: installment,
          ticketNumber: newTicketNum.toString()
        }
      });
    } catch (notifErr) {
      console.warn('Could not dispatch group allocation notification:', notifErr);
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

    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const groupIdentifier = activeGroup.code || activeGroup.name || activeGroup.id;

    // Filter all credit transactions belonging to this group
    const groupCredits = ledger.filter((t: any) =>
      (t.type === 'CREDIT' || t.category === 'INSTALLMENT') &&
      ((t.reference || '').toLowerCase().includes(groupIdentifier.toLowerCase()) ||
       (t.description || '').toLowerCase().includes(groupIdentifier.toLowerCase()) ||
       (t.groupId && t.groupId.toLowerCase().includes(groupIdentifier.toLowerCase())))
    );

    const totalCollectedForGroup = groupCredits.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
    const standardMonthlyDue = Number(activeGroup.customerChitAmount) || (totalGroupMembers > 0 ? Math.round(Number(activeGroup.value || 0) / groupDuration) : 5000);
    const totalExpectedGroupValue = enrolledTotalChitValueSum || (groupCustomers.length * Number(activeGroup.value || 0)) || calculatedGroupChitValue;
    const totalPendingForGroup = Math.max(0, totalExpectedGroupValue - totalCollectedForGroup);

    // Compute month-wise breakdown for all months 1..groupDuration
    const computeMonthData = (targetMonth: number) => {
      let paidCount = 0;
      let unpaidCount = 0;
      let monthTotalDue = 0;
      let monthTotalCollected = 0;

      const membersData = groupCustomers.map((cust) => {
        const chit = cust.chits?.find((ch: any) => (
          ch.groupId === activeGroup.id ||
          ch.groupId === activeGroup.code ||
          ch.groupId === activeGroup.name ||
          (activeGroup.name && ch.groupName === activeGroup.name)
        )) || cust.chits?.[0];

        const custTargetId = cust.id || cust.customerCode || cust.mongoId;
        const dueAmt = chit?.monthlyInstallment || standardMonthlyDue;
        monthTotalDue += dueAmt;

        // Specific ledger match for targetMonth
        const monthTxn = groupCredits.find((t: any) =>
          (t.customerId === custTargetId || t.customerId === cust.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId)) &&
          (t.month === targetMonth || (t.description || '').toLowerCase().includes(`month ${targetMonth}`) || (t.reference || '').toLowerCase().includes(`month ${targetMonth}`))
        );

        // Cumulative fallback: has paid at least up to targetMonth dues
        const custTotalInGroup = groupCredits
          .filter((t: any) =>
            t.customerId === custTargetId || t.customerId === cust.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId)
          )
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

        const isPaid = !!monthTxn || custTotalInGroup >= (dueAmt * targetMonth) || (chit?.paymentStatus === 'PAID' && targetMonth === 1);
        const amountPaid = monthTxn ? Number(monthTxn.amount) : (isPaid ? dueAmt : Math.min(dueAmt, Math.max(0, custTotalInGroup - (dueAmt * (targetMonth - 1)))));

        if (isPaid) {
          paidCount++;
          monthTotalCollected += (amountPaid || dueAmt);
        } else {
          unpaidCount++;
        }

        return {
          customer: cust,
          customerId: custTargetId,
          name: cust.name || 'Member',
          mobile: cust.mobile || cust.phone || '—',
          ticketNumber: chit?.ticketNumber || '—',
          scheme: chit?.scheme || cust.scheme || 'Regular',
          dueAmount: dueAmt,
          amountPaid,
          isPaid,
          paidDate: monthTxn?.date ? new Date(monthTxn.date).toLocaleDateString('en-GB') : (isPaid ? 'Recorded' : undefined),
          receiptId: monthTxn?.id || (isPaid ? 'PAID' : undefined),
          paymentMode: monthTxn?.paymentMode || 'Cash',
          pendingAmount: isPaid ? 0 : Math.max(0, dueAmt - amountPaid)
        };
      });

      return {
        month: targetMonth,
        paidCount,
        unpaidCount,
        monthTotalDue,
        monthTotalCollected,
        monthPending: Math.max(0, monthTotalDue - monthTotalCollected),
        members: membersData
      };
    };

    const currentMonthStats = computeMonthData(selectedMonthForTracking);

    // Export Specific Group Details alone to Excel (.csv)
    const handleExportGroupExcel = () => {
      const headers = ['Ticket No', 'Customer Name', 'Member ID', 'Mobile Number', 'Scheme', 'Duration (Months)', 'Monthly Due (Rs)', 'Total Value (Rs)', 'Total Paid (Rs)', 'Pending Due (Rs)', 'Payment Status'];
      const rows = groupCustomers.map((c) => {
        const chit = c.chits?.find((ch: any) => (
          ch.groupId === activeGroup.id || ch.groupId === activeGroup.code || ch.groupName === activeGroup.name || ch.groupId === activeGroup.name
        )) || c.chits?.[0];
        const custTargetId = c.id || c.customerCode || c.mongoId;
        const custTotalPaid = groupCredits
          .filter((t: any) => t.customerId === custTargetId || t.customerId === c.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId))
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        const chitVal = Number(chit?.chitValue || activeGroup.value || 0);
        const dueAmt = Number(chit?.monthlyInstallment || standardMonthlyDue);
        const pendingAmt = Math.max(0, (dueAmt * groupDuration) - custTotalPaid);
        const isPaid = chit?.paymentStatus === 'PAID' || custTotalPaid >= dueAmt;

        return [
          chit?.ticketNumber || '—',
          `"${(c.name || 'Member').replace(/"/g, '""')}"`,
          custTargetId,
          c.mobile || c.phone || '—',
          chit?.scheme || c.scheme || 'Regular',
          chit?.duration || groupDuration,
          dueAmt,
          chitVal,
          custTotalPaid,
          pendingAmt,
          isPaid ? 'PAID' : 'DUE'
        ];
      });

      const csvContent = '\uFEFF' + [
        `"Jenista Chits Pvt. Ltd. - Official Group Member Directory & Financial Report"`,
        `"Group: ${activeGroup.name || activeGroup.id} (Code: ${activeGroup.code || activeGroup.id})"`,
        `"Total Value: ${formatCurrency(totalExpectedGroupValue)} | Duration: ${groupDuration} Months | Capacity: ${totalGroupMembers} | Enrolled: ${groupCustomers.length}"`,
        `"Total Collected: ${formatCurrency(totalCollectedForGroup)} | Total Outstanding: ${formatCurrency(totalPendingForGroup)}"`,
        `"Generated On: ${new Date().toLocaleString('en-IN')}"`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Jenista_Group_${(activeGroup.code || activeGroup.name || 'group').replace(/[^a-zA-Z0-9_-]/g, '_')}_Details.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Export Month-Wise Matrix to Excel (.csv)
    const handleExportMonthWiseMatrixExcel = () => {
      const monthHeaders = Array.from({ length: groupDuration }, (_, i) => `Month ${i + 1}`);
      const headers = ['Ticket No', 'Customer Name', 'Member ID', 'Mobile', 'Scheme', ...monthHeaders, 'Total Paid (Rs)', 'Total Pending (Rs)'];
      
      const rows = groupCustomers.map((cust) => {
        const chit = cust.chits?.find((ch: any) => (
          ch.groupId === activeGroup.id || ch.groupId === activeGroup.code || ch.groupName === activeGroup.name || ch.groupId === activeGroup.name
        )) || cust.chits?.[0];
        const custTargetId = cust.id || cust.customerCode || cust.mongoId;
        const dueAmt = Number(chit?.monthlyInstallment || standardMonthlyDue);

        const custTotalPaid = groupCredits
          .filter((t: any) => t.customerId === custTargetId || t.customerId === cust.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId))
          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

        const monthCells = Array.from({ length: groupDuration }, (_, i) => {
          const m = i + 1;
          const monthTxn = groupCredits.find((t: any) =>
            (t.customerId === custTargetId || t.customerId === cust.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId)) &&
            (t.month === m || (t.description || '').toLowerCase().includes(`month ${m}`) || (t.reference || '').toLowerCase().includes(`month ${m}`))
          );
          const isPaid = !!monthTxn || custTotalPaid >= (dueAmt * m) || (chit?.paymentStatus === 'PAID' && m === 1);
          return isPaid ? `PAID (${formatCurrency(monthTxn?.amount || dueAmt)})` : `DUE (${formatCurrency(dueAmt)})`;
        });

        const totalPending = Math.max(0, (dueAmt * groupDuration) - custTotalPaid);

        return [
          chit?.ticketNumber || '—',
          `"${(cust.name || 'Member').replace(/"/g, '""')}"`,
          custTargetId,
          cust.mobile || cust.phone || '—',
          chit?.scheme || cust.scheme || 'Regular',
          ...monthCells.map(c => `"${c}"`),
          custTotalPaid,
          totalPending
        ];
      });

      const csvContent = '\uFEFF' + [
        `"Jenista Chits Pvt. Ltd. - Group Month-Wise Payment Tracking Matrix"`,
        `"Group: ${activeGroup.name || activeGroup.id} | Duration: ${groupDuration} Months"`,
        `"Export Timestamp: ${new Date().toLocaleString('en-IN')}"`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
      ].join('\r\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Jenista_Group_${(activeGroup.code || activeGroup.name || 'group').replace(/[^a-zA-Z0-9_-]/g, '_')}_MonthWise_Tracking.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Print / PDF Official Group Month-Wise Report
    const handlePrintGroupMonthReport = () => {
      const stats = computeMonthData(selectedMonthForTracking);
      const adminSig = localStorage.getItem('adminSignature') || '';
      const adminName = localStorage.getItem('adminSignatoryName') || 'Authorized Signatory';
      const adminTitle = localStorage.getItem('adminSignatoryTitle') || 'For Jenista Chits Pvt Ltd';

      const printWindow = window.open('', '_blank', 'width=950,height=750');
      if (!printWindow) {
        alert('Please allow popups to view and print the group report.');
        return;
      }

      const rowsHtml = stats.members.map((m, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${!m.isPaid ? 'background-color: #fef2f2;' : (idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;')}">
          <td style="padding: 8px 10px; font-weight: bold; font-family: monospace;">#${m.ticketNumber}</td>
          <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${m.name}</td>
          <td style="padding: 8px 10px; font-size: 11px; color: #64748b; font-family: monospace;">${m.customerId}</td>
          <td style="padding: 8px 10px; font-size: 11px; color: #334155;">${m.mobile}</td>
          <td style="padding: 8px 10px; font-size: 11px;">${m.scheme}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: bold;">₹${m.dueAmount.toLocaleString('en-IN')}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: ${m.isPaid ? '#047857' : '#dc2626'};">
            ${m.isPaid ? `₹${(m.amountPaid || m.dueAmount).toLocaleString('en-IN')}` : '₹0'}
          </td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; ${
              m.isPaid ? 'background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;'
            }">
              ${m.isPaid ? 'PAID ✓' : 'UNPAID / DUE'}
            </span>
          </td>
          <td style="padding: 8px 10px; font-size: 10.5px; color: #64748b;">
            ${m.isPaid ? `${m.paidDate || ''} ${m.receiptId ? `(${m.receiptId})` : ''}` : 'Pending Followup'}
          </td>
        </tr>
      `).join('');

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Jenista_Group_${activeGroup.code || activeGroup.name}_Month_${selectedMonthForTracking}_Report.pdf</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 11px; }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #d97706; padding-bottom: 12px; margin-bottom: 15px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo { width: 50px; height: 50px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0; background: #fff; }
            .title { font-size: 18px; font-weight: 900; color: #b45309; text-transform: uppercase; }
            .sub { font-size: 9px; color: #64748b; margin-top: 2px; }
            .badge-box { text-align: right; }
            .badge-box h2 { font-size: 14px; font-weight: 900; margin: 0; color: #0f172a; text-transform: uppercase; }
            .badge-box p { font-size: 10px; font-weight: 700; color: #d97706; margin: 2px 0 0 0; }
            
            .meta-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; }
            .meta-item { font-size: 10.5px; }
            .meta-label { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .meta-val { font-weight: 800; color: #0f172a; margin-top: 1px; }

            .kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
            .kpi-card { padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: center; }
            .kpi-num { font-size: 16px; font-weight: 900; }
            .kpi-lbl { font-size: 9px; font-weight: bold; text-transform: uppercase; color: #64748b; }

            table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
            th { background: #f1f5f9; padding: 8px 10px; font-weight: 800; text-transform: uppercase; font-size: 9px; color: #475569; border-bottom: 2px solid #cbd5e1; }
            .summary-row td { background: #f8fafc; font-weight: 900; border-top: 2px solid #cbd5e1; padding: 10px; }

            .footer-sig { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
            .sig-box { text-align: center; width: 200px; }
            .sig-line { border-top: 1px solid #94a3b8; margin-bottom: 4px; }
            .sig-img { max-height: 40px; max-width: 140px; object-fit: contain; margin-bottom: -15px; display: block; margin-left: auto; margin-right: auto; }
            
            .no-print { text-align: center; padding-bottom: 15px; }
            .btn { background: #0f172a; color: white; border: none; padding: 8px 20px; font-weight: bold; border-radius: 6px; cursor: pointer; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="btn" onclick="window.print()">📥 Print or Save as PDF</button>
          </div>
          <div class="header">
            <div class="brand">
              <img src="/assets/Chit logo.jpg.jpeg" alt="Logo" class="logo" />
              <div>
                <div class="title">JENISTA CHITS PVT. LTD.</div>
                <div class="sub">CIN: U67190TZ2020PTC033361 • Central Chit Funds Act, 1982 Regulated</div>
                <div class="sub">Head Office: Thoothukudi • Branch: Hosur • Phone: 70942 95556, 70940 45556</div>
              </div>
            </div>
            <div class="badge-box">
              <h2>Group Payment Status</h2>
              <p>Month ${selectedMonthForTracking} of ${groupDuration} Reconciliation</p>
            </div>
          </div>

          <div class="meta-strip">
            <div class="meta-item">
              <div class="meta-label">Group Name / Code</div>
              <div class="meta-val">${activeGroup.name || activeGroup.id} (${activeGroup.code || activeGroup.id})</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Total Chit Value</div>
              <div class="meta-val">₹${Number(activeGroup.value || 0).toLocaleString('en-IN')}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Duration & Scheme</div>
              <div class="meta-val">${groupDuration} Months · ${activeGroup.scheme || 'Multi-Scheme'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Subscribers Capacity</div>
              <div class="meta-val">${totalGroupMembers} Members (${groupCustomers.length} Enrolled)</div>
            </div>
          </div>

          <div class="kpi-strip">
            <div class="kpi-card" style="background: #f8fafc;">
              <div class="kpi-num" style="color: #0f172a;">₹${stats.monthTotalDue.toLocaleString('en-IN')}</div>
              <div class="kpi-lbl">Month ${selectedMonthForTracking} Expected Dues</div>
            </div>
            <div class="kpi-card" style="background: #ecfdf5;">
              <div class="kpi-num" style="color: #047857;">₹${stats.monthTotalCollected.toLocaleString('en-IN')}</div>
              <div class="kpi-lbl">${stats.paidCount} Subscribers Paid</div>
            </div>
            <div class="kpi-card" style="background: #fef2f2;">
              <div class="kpi-num" style="color: #dc2626;">₹${stats.monthPending.toLocaleString('en-IN')}</div>
              <div class="kpi-lbl">${stats.unpaidCount} Subscribers Unpaid</div>
            </div>
            <div class="kpi-card" style="background: #eff6ff;">
              <div class="kpi-num" style="color: #1d4ed8;">${Math.round((stats.paidCount / Math.max(1, groupCustomers.length)) * 100)}%</div>
              <div class="kpi-lbl">Collection Recovery Rate</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">Ticket</th>
                <th>Member Name</th>
                <th>Member Code</th>
                <th>Mobile Number</th>
                <th>Scheme</th>
                <th style="text-align: right;">Monthly Due</th>
                <th style="text-align: right;">Paid Amount</th>
                <th style="text-align: center;">Status</th>
                <th>Payment Remarks / Ref</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="summary-row">
                <td colspan="5" style="text-align: right; text-transform: uppercase;">Month ${selectedMonthForTracking} Totals:</td>
                <td style="text-align: right; color: #0f172a;">₹${stats.monthTotalDue.toLocaleString('en-IN')}</td>
                <td style="text-align: right; color: #047857;">₹${stats.monthTotalCollected.toLocaleString('en-IN')}</td>
                <td style="text-align: center; color: ${stats.unpaidCount === 0 ? '#047857' : '#dc2626'};">${stats.paidCount} Paid / ${stats.unpaidCount} Due</td>
                <td style="color: #64748b; font-size: 9.5px;">Pending: ₹${stats.monthPending.toLocaleString('en-IN')}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-box">
              <div class="sig-line"></div>
              <div style="font-weight: 700; font-size: 9px; text-transform: uppercase;">Collection Agent / Cashier</div>
            </div>
            <div class="sig-box">
              ${adminSig ? `<img src="${adminSig}" alt="Sig" class="sig-img" /><div class="sig-line"></div>` : `<div class="sig-line"></div>`}
              <div style="font-weight: 800; font-size: 10px; color: #0f172a;">${adminName}</div>
              <div style="font-size: 8.5px; color: #64748b;">${adminTitle}</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
    };

    // Remove an enrolled member from this specific group and update group filled count
    const handleDeleteGroupMember = (cust: any, _chit?: any) => {
      const custName = cust.name || 'this member';
      const groupName = activeGroup?.name || selectedGroup?.name || 'this group';
      const confirmMsg = `Are you sure you want to remove member ${custName} from "${groupName}"?\n\nThis will remove their seat in this group and automatically update group enrolled counts.`;

      if (!window.confirm(confirmMsg)) return;

      const targetId = cust.id || cust.customerCode || cust.mongoId;
      const targetGroupId = activeGroup?.id;
      const targetGroupCode = activeGroup?.code;
      const targetGroupName = activeGroup?.name;

      // 1. Remove this group from customer's chits array in mockCustomers
      const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updatedCusts = diskCusts.map((c: any) => {
        const cId = c.id || c.customerCode || c.mongoId;
        if (cId === targetId || (c.mobile && cust.mobile && c.mobile.replace(/\D/g, '') === cust.mobile.replace(/\D/g, ''))) {
          const remainingChits = Array.isArray(c.chits)
            ? c.chits.filter((ch: any) => !(
                (targetGroupId && ch.groupId === targetGroupId) ||
                (targetGroupCode && ch.groupId === targetGroupCode) ||
                (targetGroupName && (ch.groupName === targetGroupName || ch.groupId === targetGroupName))
              ))
            : [];
          return {
            ...c,
            chits: remainingChits,
            activeChits: remainingChits.length
          };
        }
        return c;
      });

      localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
      setCustomers(updatedCusts.filter((c: any) => !isMockCustomer(c)));

      // 2. Remove member from mockChitGroups and recalculate filled count
      const diskGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
      const updatedGroups = diskGroups.map((g: any) => {
        const matchesGroup = (targetGroupId && g.id === targetGroupId) || (targetGroupCode && g.code === targetGroupCode) || (targetGroupName && g.name === targetGroupName);
        if (matchesGroup) {
          const remainingMembers = Array.isArray(g.enrolledMembers)
            ? g.enrolledMembers.filter((m: any) => {
                const mId = m.customerId || m.id;
                const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
                const targetPhone = (cust.mobile || cust.phone || '').replace(/\D/g, '');
                return mId !== targetId && !(mPhone && targetPhone && mPhone === targetPhone);
              })
            : [];
          const newFilled = Array.isArray(g.enrolledMembers)
            ? remainingMembers.length
            : Math.max(0, (g.filled || 1) - 1);
          return {
            ...g,
            enrolledMembers: remainingMembers,
            filled: newFilled
          };
        }
        return g;
      });

      localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
      setChitGroups(updatedGroups);

      // Keep activeGroup / selectedGroup updated in state
      const refreshedActive = updatedGroups.find((g: any) => 
        (targetGroupId && g.id === targetGroupId) || (targetGroupCode && g.code === targetGroupCode) || (targetGroupName && g.name === targetGroupName)
      );
      if (refreshedActive) {
        setSelectedGroup(refreshedActive);
      }

      // 3. Update chitGroupMemberships
      const diskMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      const updatedMemberships = diskMemberships.filter((m: any) => {
        const isTargetGroup = (targetGroupId && m.groupId === targetGroupId) || (targetGroupName && m.groupName === targetGroupName);
        const isTargetMember = m.customerId === targetId || (m.mobile && cust.mobile && m.mobile.replace(/\D/g, '') === cust.mobile.replace(/\D/g, ''));
        return !(isTargetGroup && isTargetMember);
      });
      localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

      // 4. Update backend if customer exists
      fetchClient(`/customers/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          chits: updatedCusts.find((c: any) => (c.id || c.customerCode) === targetId)?.chits || []
        })
      }).catch(() => {});

      window.dispatchEvent(new Event('storage'));
    };

    // Filtered members for Tab 2 (Month-wise tracking)
    const filteredMonthMembers = currentMonthStats.members.filter(m => {
      if (monthStatusFilter === 'PAID' && !m.isPaid) return false;
      if (monthStatusFilter === 'UNPAID' && m.isPaid) return false;
      if (groupMemberQuery.trim()) {
        const q = groupMemberQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.customerId.toLowerCase().includes(q) ||
          m.mobile.includes(q) ||
          m.ticketNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        
        {/* Top Header with Back, Title, and Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <button
              onClick={handleBackToGroups}
              className="p-2.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors shrink-0 shadow-2xs mt-0.5 sm:mt-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {activeGroup.name || activeGroup.id}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-900 border border-blue-200 uppercase tracking-wider">
                  {activeGroup.code || activeGroup.id}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Total Value: {formatCurrency(totalExpectedGroupValue)}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>{totalGroupMembers > 0 ? `${totalGroupMembers} Members Capacity (${groupCustomers.length} Enrolled)` : `${groupCustomers.length} Enrolled Subscribers`}</span>
                <span>•</span>
                <span>{groupDuration} Months Duration</span>
                <span>•</span>
                <span className="text-emerald-700 font-bold">
                  {groupCustomers.filter(c => ((c.chits?.[0]?.scheme || c.scheme || '').toUpperCase().includes('FIX'))).length} Fixed
                </span>
                <span>•</span>
                <span className="text-amber-800 font-bold">
                  {groupCustomers.filter(c => ((c.chits?.[0]?.scheme || c.scheme || '').toUpperCase().includes('REG'))).length} Regular
                </span>
                <span>•</span>
                <span className="text-purple-800 font-bold">
                  {groupCustomers.filter(c => ((c.chits?.[0]?.scheme || c.scheme || '').toUpperCase().includes('AUC'))).length} Auction
                </span>
              </p>
            </div>
          </div>

          {/* Action Export & Add Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportGroupExcel}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              title="Export specific group details and member directory to Excel (.csv)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Group Excel</span>
            </button>

            <button
              onClick={handleExportMonthWiseMatrixExcel}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              title="Export complete Month 1 to Month N payment matrix for this group"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Month Matrix Excel</span>
            </button>

            <button
              onClick={handlePrintGroupMonthReport}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 active:scale-95"
              title="Print or Save Month-wise payment reconciliation report as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-purple-600" />
              <span>Print / PDF Report</span>
            </button>

            <button
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
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>

        {/* Financial KPI Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Group Chit Value</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{formatCurrency(totalExpectedGroupValue)}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Monthly Due: <strong>{formatCurrency(standardMonthlyDue)}/mo</strong>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-2xs bg-gradient-to-br from-white to-emerald-50/30">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Total Collections</span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalCollectedForGroup)}</div>
            <div className="text-[11px] text-emerald-800/80 mt-1 flex items-center gap-1">
              <span>{Math.round((totalCollectedForGroup / Math.max(1, totalExpectedGroupValue)) * 100)}% of total chit realized</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-2xs bg-gradient-to-br from-white to-rose-50/30">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">Total Pending Dues</span>
            <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1">{formatCurrency(totalPendingForGroup)}</div>
            <div className="text-[11px] text-rose-800/80 mt-1">
              Across {groupDuration} months schedule
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Subscribers Enrolled</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {groupCustomers.length} <span className="text-sm font-semibold text-slate-400">/ {totalGroupMembers || 20}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalGroupMembers - groupCustomers.length > 0 ? `${totalGroupMembers - groupCustomers.length} seats available` : 'Full capacity enrolled ✓'}
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setDrilldownTab('MEMBERS')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              drilldownTab === 'MEMBERS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Member Directory ({groupCustomers.length})</span>
          </button>

          <button
            onClick={() => setDrilldownTab('MONTH_WISE')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              drilldownTab === 'MONTH_WISE'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Month-Wise Payment Tracker (Month 1 - {groupDuration})</span>
          </button>

          <button
            onClick={() => setDrilldownTab('ALL_MATRIX')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              drilldownTab === 'ALL_MATRIX'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Full Schedule Payment Matrix</span>
          </button>
        </div>

        {/* TAB 1: MEMBER DIRECTORY */}
        {drilldownTab === 'MEMBERS' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <span className="text-xs font-bold text-slate-700">
                Enrolled Subscribers Roster ({groupCustomers.length})
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subscriber name or phone..."
                  value={groupMemberQuery}
                  onChange={(e) => setGroupMemberQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full sm:w-64 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/80 whitespace-nowrap">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket / Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                    <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Scheme</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Due</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total Paid</th>
                    <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Due</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                  {groupCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center text-xs text-slate-400 font-medium">
                        No customers enrolled in this group yet. Click "+ Add Customer" above to begin enrollment.
                      </td>
                    </tr>
                  ) : (
                    groupCustomers
                      .filter(c => {
                        if (!groupMemberQuery.trim()) return true;
                        const q = groupMemberQuery.toLowerCase();
                        return (c.name || '').toLowerCase().includes(q) || (c.id || '').toLowerCase().includes(q) || (c.mobile || '').includes(q);
                      })
                      .map((c) => {
                        const chit = c.chits?.find((ch: any) => (
                          ch.groupId === activeGroup.id ||
                          ch.groupId === activeGroup.code ||
                          ch.groupId === activeGroup.name ||
                          (activeGroup.name && ch.groupName === activeGroup.name)
                        )) || c.chits?.[0];

                        const custTargetId = c.id || c.customerCode || c.mongoId;
                        const monthlyDue = chit?.monthlyInstallment || standardMonthlyDue;

                        const paidForThisGroup = groupCredits
                          .filter((t: any) => 
                            (t.customerId === custTargetId || t.customerId === c.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId))
                          )
                          .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

                        const isChitPaid = chit?.paymentStatus === 'PAID' || (monthlyDue > 0 && paidForThisGroup >= monthlyDue);
                        const custPending = Math.max(0, (monthlyDue * groupDuration) - paidForThisGroup);

                        return (
                          <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-3">
                              <button
                                onClick={() => navigate(`/admin/customers/${custTargetId}/schedule?group=${encodeURIComponent(groupIdentifier)}`)}
                                className="text-left group/cust hover:opacity-90 focus:outline-none"
                              >
                                <div className="font-bold text-slate-900 text-xs group-hover/cust:text-blue-600 transition-colors flex items-center gap-1.5">
                                  <span className="font-mono text-slate-400">#{chit?.ticketNumber || '—'}</span>
                                  <span>{c.name}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">ID: {c.id}</div>
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
                              {chit?.duration || chit?.months || c.months || groupDuration}m
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold text-slate-900">
                              {formatCurrency(monthlyDue)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold text-emerald-700">
                              {formatCurrency(paidForThisGroup)}
                            </td>
                            <td className="px-5 py-3 text-right text-xs font-bold text-rose-700">
                              {formatCurrency(custPending)}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isChitPaid
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                {isChitPaid ? 'PAID' : 'DUE'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => navigate(`/admin/customers/${custTargetId}/schedule?group=${encodeURIComponent(groupIdentifier)}`)}
                                  className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1 transition-all active:scale-95"
                                  title="View full installment chart & dates"
                                >
                                  <span>Due Chart</span>
                                  <span className="text-[10px]">&rarr;</span>
                                </button>
                                <button
                                  onClick={() => navigate(`/admin/customers/${custTargetId}?group=${encodeURIComponent(groupIdentifier)}`)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-lg shadow-2xs transition-colors"
                                  title="View full customer profile"
                                >
                                  <span>Profile</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteGroupMember(c, chit)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                                  title={`Remove ${c.name} from this group`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* TAB 2: DETAILED MONTH-WISE VIEW (WHO PAID VS WHO HAVEN'T PAID) */}
        {drilldownTab === 'MONTH_WISE' && (
          <div className="space-y-4">
            
            {/* Month Selection Bar (Month 1 to Duration) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Select Installment Month to Track</span>
                  <span className="text-[11px] text-slate-500">Live breakdown of payments received vs pending for the group</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintGroupMonthReport}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Month {selectedMonthForTracking} Statement</span>
                  </button>
                </div>
              </div>

              {/* Month Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {Array.from({ length: groupDuration }, (_, i) => {
                  const m = i + 1;
                  const mStats = computeMonthData(m);
                  const isFullyPaid = mStats.unpaidCount === 0 && mStats.members.length > 0;
                  const isCurrentSelected = selectedMonthForTracking === m;

                  return (
                    <button
                      key={m}
                      onClick={() => setSelectedMonthForTracking(m)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex flex-col items-center min-w-[76px] ${
                        isCurrentSelected
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : isFullyPaid
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span className="text-[11px]">Month {m}</span>
                      <span className={`text-[9px] font-black mt-0.5 ${
                        isCurrentSelected ? 'text-blue-100' : isFullyPaid ? 'text-emerald-700' : 'text-slate-400'
                      }`}>
                        {mStats.paidCount}/{mStats.members.length} Paid
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Month Summary Bar & Filter Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Month {selectedMonthForTracking} Target</span>
                  <span className="text-xl font-black text-slate-900">{formatCurrency(currentMonthStats.monthTotalDue)}</span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                  {currentMonthStats.members.length}
                </div>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Realized / Paid</span>
                  <span className="text-xl font-black text-emerald-800">{formatCurrency(currentMonthStats.monthTotalCollected)}</span>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-black rounded-lg">
                  {currentMonthStats.paidCount} Paid ✓
                </span>
              </div>

              <div className="p-4 bg-rose-50/60 rounded-2xl border border-rose-200 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Pending / Unpaid</span>
                  <span className="text-xl font-black text-rose-800">{formatCurrency(currentMonthStats.monthPending)}</span>
                </div>
                <span className="px-2.5 py-1 bg-rose-100 text-rose-900 text-xs font-black rounded-lg">
                  {currentMonthStats.unpaidCount} Defaulters ⚠️
                </span>
              </div>
            </div>

            {/* Month-Wise Table: Who Made Payment vs Who Haven't */}
            <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">Filter By Payment Status:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white">
                    <button
                      onClick={() => setMonthStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                        monthStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({currentMonthStats.members.length})
                    </button>
                    <button
                      onClick={() => setMonthStatusFilter('PAID')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                        monthStatusFilter === 'PAID' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      Paid ({currentMonthStats.paidCount})
                    </button>
                    <button
                      onClick={() => setMonthStatusFilter('UNPAID')}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                        monthStatusFilter === 'UNPAID' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      Unpaid ({currentMonthStats.unpaidCount})
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search subscriber name or phone..."
                    value={groupMemberQuery}
                    onChange={(e) => setGroupMemberQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/80 whitespace-nowrap">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subscriber Name</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Scheme</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Month {selectedMonthForTracking} Due</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Paid</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Status</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Info</th>
                      <th className="px-5 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                    {filteredMonthMembers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-12 text-center text-xs text-slate-400 font-medium">
                          No subscribers matching the filter for Month {selectedMonthForTracking}.
                        </td>
                      </tr>
                    ) : (
                      filteredMonthMembers.map((m) => (
                        <tr key={m.customerId} className={`hover:bg-slate-50/70 transition-colors ${!m.isPaid ? 'bg-rose-50/20' : ''}`}>
                          <td className="px-5 py-3 font-mono font-bold text-slate-700 text-xs">
                            #{m.ticketNumber}
                          </td>
                          <td className="px-5 py-3">
                            <div className="font-bold text-slate-900 text-xs">{m.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">ID: {m.customerId}</div>
                          </td>
                          <td className="px-5 py-3 text-xs font-medium text-slate-700">
                            {m.mobile}
                          </td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                              {m.scheme}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-bold text-slate-900">
                            {formatCurrency(m.dueAmount)}
                          </td>
                          <td className="px-5 py-3 text-right text-xs font-bold text-emerald-700">
                            {m.isPaid ? formatCurrency(m.amountPaid || m.dueAmount) : '—'}
                          </td>
                          <td className="px-5 py-3 text-center">
                            {m.isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PAID
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                                <AlertTriangle className="w-3 h-3 text-rose-600" /> UNPAID / DUE
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-600">
                            {m.isPaid ? (
                              <div className="text-[11px]">
                                <span className="font-semibold text-slate-800">{m.paidDate || 'Paid'}</span>
                                {m.receiptId && (
                                  <span className="ml-1 text-[10px] font-mono text-slate-400">({m.receiptId})</span>
                                )}
                                <span className="ml-1 text-[9px] uppercase px-1 rounded bg-slate-100 font-bold text-slate-600">{m.paymentMode}</span>
                              </div>
                            ) : (
                              <span className="text-rose-600 font-semibold text-[11px]">
                                Due: {formatCurrency(m.pendingAmount || m.dueAmount)}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {!m.isPaid ? (
                                <button
                                  onClick={() => navigate(`/admin/customers/${m.customerId}?group=${encodeURIComponent(groupIdentifier)}&payMonth=${selectedMonthForTracking}`)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs inline-flex items-center gap-1 transition-all active:scale-95"
                                  title="Record payment for this customer"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  <span>Collect</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => navigate(`/admin/customers/${m.customerId}?group=${encodeURIComponent(groupIdentifier)}`)}
                                  className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-2xs"
                                >
                                  Passbook
                                </button>
                              )}
                              <button
                                onClick={() => navigate(`/admin/customers/${m.customerId}/schedule?group=${encodeURIComponent(groupIdentifier)}`)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                              >
                                Chart &rarr;
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FULL SCHEDULE PAYMENT MATRIX (MONTH 1 TO 20) */}
        {drilldownTab === 'ALL_MATRIX' && (
          <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Complete Group Payment Tracking Matrix</span>
                <span className="text-[11px] text-slate-500">Overview of subscriber payments across all {groupDuration} months</span>
              </div>
              <button
                onClick={handleExportMonthWiseMatrixExcel}
                className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Matrix (.csv)</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-100 sticky top-0 z-10 whitespace-nowrap">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-bold text-slate-600 sticky left-0 bg-slate-100 z-20 border-r border-slate-200">
                      Subscriber Info
                    </th>
                    {Array.from({ length: groupDuration }, (_, i) => (
                      <th key={i} className="px-3 py-2.5 text-center font-bold text-slate-600 min-w-[75px] border-r border-slate-200">
                        M{i + 1}
                      </th>
                    ))}
                    <th className="px-4 py-2.5 text-right font-bold text-emerald-800">Total Paid</th>
                    <th className="px-4 py-2.5 text-right font-bold text-rose-800">Pending</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100 whitespace-nowrap">
                  {groupCustomers.map((cust) => {
                    const chit = cust.chits?.find((ch: any) => (
                      ch.groupId === activeGroup.id ||
                      ch.groupId === activeGroup.code ||
                      ch.groupId === activeGroup.name ||
                      (activeGroup.name && ch.groupName === activeGroup.name)
                    )) || cust.chits?.[0];

                    const custTargetId = cust.id || cust.customerCode || cust.mongoId;
                    const dueAmt = Number(chit?.monthlyInstallment || standardMonthlyDue);

                    const custTotalPaid = groupCredits
                      .filter((t: any) => t.customerId === custTargetId || t.customerId === cust.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId))
                      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

                    const totalPending = Math.max(0, (dueAmt * groupDuration) - custTotalPaid);

                    return (
                      <tr key={custTargetId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-slate-400 text-[10px]">#{chit?.ticketNumber || '—'}</span>
                            <span className="truncate max-w-[130px]">{cust.name}</span>
                          </div>
                        </td>

                        {Array.from({ length: groupDuration }, (_, i) => {
                          const m = i + 1;
                          const monthTxn = groupCredits.find((t: any) =>
                            (t.customerId === custTargetId || t.customerId === cust.id || t.reference?.includes(custTargetId) || t.description?.includes(custTargetId)) &&
                            (t.month === m || (t.description || '').toLowerCase().includes(`month ${m}`) || (t.reference || '').toLowerCase().includes(`month ${m}`))
                          );
                          const isPaid = !!monthTxn || custTotalPaid >= (dueAmt * m) || (chit?.paymentStatus === 'PAID' && m === 1);

                          return (
                            <td key={m} className={`px-2 py-2 text-center border-r border-slate-100 ${
                              isPaid ? 'bg-emerald-50/40 text-emerald-800' : 'bg-rose-50/30 text-rose-700'
                            }`}>
                              {isPaid ? (
                                <span className="font-black text-[10px] text-emerald-700">✓ Paid</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-600">Due</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                          {formatCurrency(custTotalPaid)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-rose-700">
                          {formatCurrency(totalPending)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium placeholder:text-slate-400"
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
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 disabled:opacity-50 active:scale-95"
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
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
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
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 active:scale-95"
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
  // Real Payment Request Status Filtering (Strictly Real Data, No Mock Fallbacks)
  const pendingPaymentRequests = paymentRequests.filter(r => isPendingPayment(r.status));
  const approvedPaymentRequests = paymentRequests.filter(r => r.status === 'APPROVED');
  const rejectedPaymentRequests = paymentRequests.filter(r => r.status === 'REJECTED');

  // Scheme Enrolled Customers Extractor (Deduplicated across Groups, Memberships, Disk Customers & Converted Leads)
  const getFilteredSchemeCustomers = (filterScheme: 'GROUPS' | 'FIXED' | 'REGULAR' | 'AUCTION' | null) => {
    if (!filterScheme || filterScheme === 'GROUPS') return [];

    const deletedList: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
    const deletedSet = new Set(deletedList.map(s => String(s).toLowerCase().trim()));
    const isDeleted = (id?: string, phone?: string, mongoId?: string) => {
      if (id && deletedSet.has(String(id).toLowerCase().trim())) return true;
      if (mongoId && deletedSet.has(String(mongoId).toLowerCase().trim())) return true;
      const cleanP = (phone || '').replace(/\D/g, '');
      if (cleanP && (deletedSet.has(cleanP) || deletedSet.has((phone || '').toLowerCase().trim()))) return true;
      return false;
    };

    const schemePrefix = filterScheme === 'FIXED' ? 'FIX' : filterScheme === 'AUCTION' ? 'AUC' : 'REG';
    const customerMap = new Map<string, any>();

    // 1. Group enrolledMembers
    chitGroups.forEach((g: any) => {
      if (Array.isArray(g.enrolledMembers)) {
        g.enrolledMembers.forEach((m: any) => {
          if (!isMockCustomer(m)) {
            const custId = m.customerId || m.id || m.mobile;
            if (isDeleted(custId, m.mobile || m.phone, m.mongoId)) return;

            const s = (m.scheme || '').toUpperCase();
            const matches = schemePrefix === 'REG'
              ? (!s.includes('FIX') && !s.includes('AUC'))
              : s.includes(schemePrefix);

            if (matches) {
              const uniqueKey = `${custId}_${g.id || g.name}`;
              customerMap.set(uniqueKey, {
                id: custId,
                mongoId: m.mongoId,
                name: m.customerName || m.name || 'Member',
                mobile: m.mobile || m.phone || '—',
                phone: m.mobile || m.phone || '—',
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
        const custId = m.customerId || m.id;
        if (isDeleted(custId, m.mobile || m.phone, m.mongoId)) return;

        const s = (m.scheme || '').toUpperCase();
        const matches = schemePrefix === 'REG'
          ? (!s.includes('FIX') && !s.includes('AUC'))
          : s.includes(schemePrefix);

        if (matches) {
          const uniqueKey = `${custId}_${m.groupId || m.groupName}`;
          if (!customerMap.has(uniqueKey)) {
            customerMap.set(uniqueKey, {
              id: custId,
              mongoId: m.mongoId,
              name: m.customerName || m.name || 'Member',
              mobile: m.mobile || m.phone || '—',
              phone: m.mobile || m.phone || '—',
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
      if (isDeleted(c.id, c.mobile || c.phone, c.mongoId)) return;

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
                mongoId: c.mongoId,
                name: c.name || c.fullName || 'Member',
                mobile: c.mobile || c.phone || '—',
                phone: c.mobile || c.phone || '—',
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
      } else if (c.scheme || c.interestedPlan) {
        const s = (c.scheme || c.interestedPlan || '').toUpperCase();
        const matches = schemePrefix === 'REG'
          ? (!s.includes('FIX') && !s.includes('AUC'))
          : s.includes(schemePrefix);

        if (matches) {
          const uniqueKey = `${c.id}_opted`;
          if (!customerMap.has(uniqueKey)) {
            customerMap.set(uniqueKey, {
              id: c.id,
              mongoId: c.mongoId,
              name: c.name || c.fullName || 'Member',
              mobile: c.mobile || c.phone || '—',
              phone: c.mobile || c.phone || '—',
              groupId: '—',
              groupName: c.interestedPlan || `${filterScheme === 'FIXED' ? 'Fixed' : filterScheme === 'AUCTION' ? 'Auction' : 'Regular'} Scheme (Awaiting Group Allocation)`,
              scheme: c.scheme || (filterScheme === 'FIXED' ? 'Fixed' : filterScheme === 'AUCTION' ? 'Auction' : 'Regular'),
              chitValue: Number(c.chitValue || 100000),
              monthlyInstallment: Number(c.monthlyInstallment || 5000),
              duration: Number(c.months || 20),
              ticketNumber: '—',
              status: c.status || 'ACTIVE'
            });
          }
        }
      }
    });

    // 4. Website Leads (e.g. Converted Leads like Agila)
    try {
      const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
      storedLeads.filter((l: any) => l.status === 'CONVERTED' || (l.fullName && l.fullName.toLowerCase().includes('agila'))).forEach((lead: any) => {
        const leadId = lead.convertedCustomerId || `LEAD-${lead.id}`;
        if (isDeleted(leadId, lead.phone)) return;

        const rawP = lead.interestedPlan || '';
        let dScheme: 'Auction' | 'Fixed' | 'Regular' = 'Auction';
        if (rawP.toLowerCase().includes('fix')) dScheme = 'Fixed';
        else if (rawP.toLowerCase().includes('reg')) dScheme = 'Regular';
        else if (rawP.toLowerCase().includes('auc')) dScheme = 'Auction';

        const s = dScheme.toUpperCase();
        const matches = schemePrefix === 'REG'
          ? (!s.includes('FIX') && !s.includes('AUC'))
          : s.includes(schemePrefix);

        if (matches) {
          const leadPhone = (lead.phone || '').replace(/\D/g, '');
          const leadName = (lead.fullName || '').trim().toLowerCase();
          const alreadyInMap = Array.from(customerMap.values()).some((cm: any) => {
            const cmPhone = (cm.mobile || '').replace(/\D/g, '');
            const cmName = (cm.name || '').trim().toLowerCase();
            return (leadPhone && cmPhone && leadPhone === cmPhone) || (leadName && cmName && leadName === cmName);
          });

          if (!alreadyInMap) {
            customerMap.set(`lead_${leadId}`, {
              id: leadId,
              name: lead.fullName,
              mobile: lead.phone || '—',
              phone: lead.phone || '—',
              groupId: 'PENDING',
              groupName: lead.interestedPlan || `${dScheme} Scheme (Lead Enrolled)`,
              scheme: dScheme,
              chitValue: 100000,
              monthlyInstallment: 5000,
              duration: 20,
              ticketNumber: '1',
              status: 'ACTIVE'
            });
          }
        }
      });
    } catch {}

    return Array.from(customerMap.values());
  };

  // Exact 1-to-1 matching between Dashboard KPI card counts and viewable list data
  const fixedCustomersList = getFilteredSchemeCustomers('FIXED');
  const regularCustomersList = getFilteredSchemeCustomers('REGULAR');
  const auctionCustomersList = getFilteredSchemeCustomers('AUCTION');

  const fixedEnrollments = fixedCustomersList.length;
  const regularEnrollments = regularCustomersList.length;
  const auctionEnrollments = auctionCustomersList.length;
  const totalEnrollments = fixedEnrollments + regularEnrollments + auctionEnrollments;

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

  // Active Company Banks for Allocation Metrics
  const companyBanks = getStoredBankAccounts().filter(b => b.status === 'ACTIVE');

  // Comprehensive Enrolled Members List across all Groups with Resolved Bank Allocation
  const allBankAllocatedMembers = (() => {
    const deletedList: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
    const deletedSet = new Set(deletedList.map(s => String(s).toLowerCase().trim()));
    const isDeleted = (id?: string, phone?: string, mongoId?: string) => {
      if (id && deletedSet.has(String(id).toLowerCase().trim())) return true;
      if (mongoId && deletedSet.has(String(mongoId).toLowerCase().trim())) return true;
      const cleanP = (phone || '').replace(/\D/g, '');
      if (cleanP && (deletedSet.has(cleanP) || deletedSet.has((phone || '').toLowerCase().trim()))) return true;
      return false;
    };

    const map = new Map<string, any>();

    chitGroups.forEach((g: any) => {
      if (Array.isArray(g.enrolledMembers)) {
        g.enrolledMembers.forEach((m: any) => {
          if (!isMockCustomer(m)) {
            const custId = m.customerId || m.id || m.mobile;
            if (isDeleted(custId, m.mobile || m.phone, m.mongoId)) return;
            const uniqueKey = `${custId}_${g.id || g.name}`;
            const resolved = resolveBankForPayment(custId, g.id, g.name);
            map.set(uniqueKey, {
              id: custId,
              mongoId: m.mongoId,
              name: m.customerName || m.name || 'Member',
              mobile: m.mobile || m.phone || '—',
              groupId: g.id,
              groupName: g.name || g.id,
              scheme: m.scheme || 'Regular',
              chitValue: Number(m.chitValue || g.value || 0),
              monthlyInstallment: Number(m.monthlyInstallment || g.customerChitAmount || 0),
              ticketNumber: m.ticketNumber || '#1',
              allocatedBank: resolved.bank,
              bankScope: resolved.scope,
              bankSourceName: resolved.sourceName
            });
          }
        });
      }
    });

    try {
      const storedMems = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      if (Array.isArray(storedMems)) {
        storedMems.forEach((m: any) => {
          if (!isMockCustomer(m)) {
            const custId = m.customerId || m.id || m.mobile;
            if (isDeleted(custId, m.mobile || m.phone, m.mongoId)) return;
            const gId = m.groupId || m.groupName;
            const uniqueKey = `${custId}_${gId}`;
            if (!map.has(uniqueKey)) {
              const resolved = resolveBankForPayment(custId, m.groupId, m.groupName);
              map.set(uniqueKey, {
                id: custId,
                mongoId: m.mongoId,
                name: m.customerName || m.name || 'Member',
                mobile: m.mobile || m.phone || '—',
                groupId: m.groupId,
                groupName: m.groupName || m.groupId,
                scheme: m.scheme || 'Regular',
                chitValue: Number(m.chitValue || 0),
                monthlyInstallment: Number(m.monthlyInstallment || 0),
                ticketNumber: m.ticketNumber || '#1',
                allocatedBank: resolved.bank,
                bankScope: resolved.scope,
                bankSourceName: resolved.sourceName
              });
            }
          }
        });
      }
    } catch {}

    try {
      const storedCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      if (Array.isArray(storedCusts)) {
        storedCusts.forEach((c: any) => {
          if (!isMockCustomer(c) && Array.isArray(c.chits)) {
            const custId = c.id || c.customerCode || c.mongoId || c.mobile;
            if (isDeleted(custId, c.mobile || c.phone, c.mongoId)) return;
            c.chits.forEach((ch: any) => {
              const gId = ch.groupId || ch.groupName;
              const uniqueKey = `${custId}_${gId}`;
              if (!map.has(uniqueKey)) {
                const resolved = resolveBankForPayment(custId, ch.groupId, ch.groupName);
                map.set(uniqueKey, {
                  id: custId,
                  mongoId: c.mongoId,
                  name: c.name || c.fullName || 'Member',
                  mobile: c.mobile || c.phone || '—',
                  groupId: ch.groupId,
                  groupName: ch.groupName || ch.groupId,
                  scheme: ch.scheme || c.scheme || 'Regular',
                  chitValue: Number(ch.chitValue || 0),
                  monthlyInstallment: Number(ch.monthlyInstallment || 0),
                  ticketNumber: ch.ticketNumber || '#1',
                  allocatedBank: resolved.bank,
                  bankScope: resolved.scope,
                  bankSourceName: resolved.sourceName
                });
              }
            });
          }
        });
      }
    } catch {}

    return Array.from(map.values());
  })();

  // Filtered members for the bank allocation modal
  const modalBankMembers = allBankAllocatedMembers.filter(m => {
    if (selectedBankFilterId !== 'ALL' && m.allocatedBank?.id !== selectedBankFilterId) {
      return false;
    }
    if (bankMemberSearchQuery.trim()) {
      const q = bankMemberSearchQuery.toLowerCase();
      return (
        (m.name || '').toLowerCase().includes(q) ||
        (m.id || '').toLowerCase().includes(q) ||
        (m.mobile || '').includes(q) ||
        (m.groupName || '').toLowerCase().includes(q) ||
        (m.ticketNumber || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate this month's collections per bank
  const getBankMonthCollections = (bankId: string) => {
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    let total = 0;
    paymentRequests.forEach(req => {
      if (req.status === 'APPROVED') {
        const reqDate = (req as any).date || req.submittedAt || req.verifiedAt || '';
        if (reqDate.startsWith(currentMonthStr)) {
          const resolved = resolveBankForPayment(req.customerId, req.groupId, req.groupName);
          if (req.bankAccountId === bankId || resolved.bank?.id === bankId) {
            total += Number(req.amount || 0);
          }
        }
      }
    });
    staffReceiptsList.forEach((r: any) => {
      const rDate = r.date || r.createdAt || '';
      if (rDate.startsWith(currentMonthStr)) {
        if (r.bankAccountId === bankId) {
          total += Number(r.amount || 0);
        }
      }
    });
    return total;
  };

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
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold placeholder:font-normal"
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
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
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
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
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
                className="pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56 shadow-2xs"
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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 shrink-0"
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
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">
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
                              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1.5"
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
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 active:scale-95"
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
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-xs shadow-xs transition-colors inline-flex items-center gap-1.5 active:scale-95"
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

  // Remove customer from Scheme Enrollments (Fixed, Regular, Auction) & sync counts across all views
  const handleDeleteSchemeEnrollment = (cust: any) => {
    const custName = cust.name || 'this member';
    const schemeName = cust.scheme || selectedSchemeFilter || 'this scheme';
    const confirmMsg = `Are you sure you want to remove ${custName} (${cust.id}) from ${schemeName} enrollments?\n\nThis will remove their enrollment, clean all group seat allocations, and update dashboard group counts immediately.`;
    if (!window.confirm(confirmMsg)) return;

    const targetId = cust.id || cust.customerCode || cust.mongoId;
    const targetPhone = (cust.mobile || cust.phone || '').replace(/\D/g, '');
    const targetGroupId = cust.groupId;
    const targetGroupName = cust.groupName;

    // 1. Record in deletedCustomerIds to prevent zombie resurrection
    const deletedIds: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
    if (targetId && !deletedIds.includes(targetId)) deletedIds.push(targetId);
    if (cust.mongoId && !deletedIds.includes(cust.mongoId)) deletedIds.push(cust.mongoId);
    if (targetPhone && !deletedIds.includes(targetPhone)) deletedIds.push(targetPhone);
    if (cust.mobile && !deletedIds.includes(cust.mobile)) deletedIds.push(cust.mobile);
    localStorage.setItem('deletedCustomerIds', JSON.stringify(deletedIds));

    // 2. Remove or unenroll from mockCustomers
    const diskCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const updatedCusts = diskCusts
      .map((c: any) => {
        const cId = c.id || c.customerCode || c.mongoId;
        const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
        const matches = cId === targetId || (cust.mongoId && c.mongoId === cust.mongoId) || (targetPhone && cPhone === targetPhone);
        if (matches) {
          // Filter out the chit belonging to this scheme or group
          const schemePrefix = (cust.scheme || selectedSchemeFilter || '').toUpperCase().slice(0, 3);
          const remainingChits = Array.isArray(c.chits)
            ? c.chits.filter((ch: any) => {
                const s = (ch.scheme || c.scheme || '').toUpperCase();
                const matchesScheme = schemePrefix ? s.includes(schemePrefix) : false;
                const matchesGrp = (targetGroupId && ch.groupId === targetGroupId) || (targetGroupName && (ch.groupName === targetGroupName || ch.groupId === targetGroupName));
                return !(matchesScheme || matchesGrp);
              })
            : [];

          return {
            ...c,
            chits: remainingChits,
            activeChits: remainingChits.length,
            scheme: remainingChits[0]?.scheme || undefined,
            _removeCompletely: remainingChits.length === 0
          };
        }
        return c;
      })
      .filter((c: any) => !c._removeCompletely);

    localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
    setCustomers(updatedCusts.filter((c: any) => !isMockCustomer(c)));

    // 3. Remove member from mockChitGroups and update filled count
    const diskGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
    const updatedGroups = diskGroups.map((g: any) => {
      if (Array.isArray(g.enrolledMembers)) {
        const remainingMembers = g.enrolledMembers.filter((m: any) => {
          const mId = m.customerId || m.id;
          const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
          const isMatch = mId === targetId || (targetPhone && mPhone === targetPhone);
          return !isMatch;
        });
        return {
          ...g,
          enrolledMembers: remainingMembers,
          filled: remainingMembers.length
        };
      }
      return g;
    });
    localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
    setChitGroups(updatedGroups);

    // 4. Clean from chitGroupMemberships
    const diskMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const updatedMemberships = diskMemberships.filter((m: any) => {
      const mId = m.customerId || m.id;
      const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
      return mId !== targetId && !(targetPhone && mPhone === targetPhone);
    });
    localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

    // 5. Clean websiteLeads so it won't resurrect
    try {
      const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
      const updatedLeads = storedLeads.map((l: any) => {
        const lPhone = (l.phone || '').replace(/\D/g, '');
        if (l.convertedCustomerId === targetId || l.id === targetId || (targetPhone && lPhone === targetPhone)) {
          return { ...l, status: 'REJECTED' };
        }
        return l;
      });
      localStorage.setItem('websiteLeads', JSON.stringify(updatedLeads));
    } catch {}

    // 6. Delete from MongoDB backend
    const backendId = cust.mongoId || (targetId && targetId.length === 24 ? targetId : null);
    if (backendId) {
      fetchClient(`/customers/${backendId}`, { method: 'DELETE' }).catch(() => {});
    } else {
      fetchClient(`/customers/${targetId}`, { method: 'DELETE' }).catch(() => {});
    }

    // 7. Dispatch storage event to keep all open components reactive
    window.dispatchEvent(new Event('storage'));
  };

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
                className="pl-8 pr-7 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56 shadow-2xs"
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/admin/customers/${c.id}`)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs inline-flex items-center gap-1 transition-colors"
                          >
                            <span>Profile</span>
                            <span className="text-[10px]">&rarr;</span>
                          </button>
                          <button
                            onClick={() => handleDeleteSchemeEnrollment(c)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                            title={`Delete ${c.name} from ${selectedSchemeFilter} enrollments`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

          {/* Quick Action: Chit Calculator */}
          <button
            onClick={() => navigate('/admin/calculator')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            title="Open comprehensive Chit Calculator & financial modeler"
          >
            <Calculator className="w-4 h-4" />
            <span>Chit Calculator</span>
          </button>

          {/* Primary Action: + Add Group */}
          <button
            onClick={() => {
              setNewGroupName('');
              setIsAddGroupModalOpen(true);
            }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1.5 active:scale-95"
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
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium rounded-xl text-xs sm:text-sm border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5"
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
          className="rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all active:scale-[0.99] select-none bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md"
          title="Click to view and manage chit groups in full screen"
        >
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-500 block">
                Total Groups
              </span>
              <div className="text-2xl sm:text-3xl font-bold text-slate-800 mt-0.5">
                {chitGroups.length}
              </div>
              <div className="text-xs font-medium text-blue-700 mt-2">
                <span>{chitGroups.length} Active Group{chitGroups.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          {/* Subtle Watermark Decoration */}
          <Users className="w-16 h-16 text-blue-100/50 absolute -right-1 -bottom-1 pointer-events-none group-hover:scale-110 transition-transform" />
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

      {/* 2.5. Bank Allocation & Member Routing Overview */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-700 rounded-xl border border-indigo-100 shrink-0">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">
                  Bank Allocation & Member Distribution (This Month)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {allBankAllocatedMembers.length} Members Total
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Real-time breakdown of members routed to each company bank account with interactive filter & directory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedBankFilterId('ALL');
                setBankMemberSearchQuery('');
                setIsBankAllocationModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter & View Members</span>
            </button>
            <button
              onClick={() => navigate('/admin/banks')}
              className="px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <span>Manage Bank A/Cs</span>
              <span className="text-xs">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Bank Allocation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {companyBanks.map((bank) => {
            const memberCount = allBankAllocatedMembers.filter(m => m.allocatedBank?.id === bank.id).length;
            const monthTotal = getBankMonthCollections(bank.id);
            const isPrimary = bank.isDefault;

            return (
              <div
                key={bank.id}
                onClick={() => {
                  setSelectedBankFilterId(bank.id);
                  setBankMemberSearchQuery('');
                  setIsBankAllocationModalOpen(true);
                }}
                className={`rounded-xl p-4 border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                  isPrimary
                    ? 'bg-gradient-to-br from-blue-50/50 via-white to-slate-50 border-blue-200 hover:border-blue-300'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
                title={`Click to filter and view ${memberCount} members routed to ${bank.bankName}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                      bank.bankName.includes('HDFC')
                        ? 'bg-blue-600 text-white'
                        : bank.bankName.includes('ICICI')
                          ? 'bg-orange-600 text-white'
                          : 'bg-emerald-600 text-white'
                    }`}>
                      {bank.bankName.includes('HDFC') ? 'H' : bank.bankName.includes('ICICI') ? 'I' : 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-slate-900 text-sm">{bank.bankName}</h3>
                        {isPrimary && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-800 rounded">Default</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono">A/C: ...{bank.accountNumber.slice(-4)} · {bank.branch.split(' ')[0]}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                    IFSC: {bank.ifscCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Allocated Members</span>
                    <span className="text-lg font-black text-slate-900">
                      {memberCount} <span className="text-xs font-semibold text-slate-500">Members</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">This Month Received</span>
                    <span className="text-lg font-black text-emerald-600">
                      {formatCurrency(monthTotal)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-mono text-[10px] truncate max-w-[170px]">
                    UPI: {bank.upiId}
                  </span>
                  <span className="font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5">
                    Filter Members &rarr;
                  </span>
                </div>
              </div>
            );
          })}
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
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0">
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

            {/* Partial Payments Tracking Insight Banner */}
            {partialPaymentsCount > 0 && (
              <div className="mb-5 p-4 bg-gradient-to-r from-amber-50/90 via-amber-50 to-orange-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                    <Receipt className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-amber-900 text-sm">
                        {partialPaymentsCount} Partial Payment{partialPaymentsCount !== 1 ? 's' : ''} Collected
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                        Live Ledger Dues
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 font-medium mt-0.5">
                      Collected: <strong>₹{partialPaymentsTotalPaid.toLocaleString('en-IN')}</strong> · Unpaid Balance Remaining: <strong className="text-amber-900 font-bold">₹{partialPaymentsTotalDue.toLocaleString('en-IN')}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate('/admin/receipts')}
                    className="px-3.5 py-1.5 bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl shadow-2xs transition-colors"
                  >
                    Manage Receipts Desk &rarr;
                  </button>
                </div>
              </div>
            )}

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
                <div className="w-9 h-9 rounded-full bg-[#fef3d6] text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
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
                <PieChartIcon className="w-4 h-4 text-blue-600" />
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
                    {totalEnrollments}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                    {totalEnrollments === 1 ? 'Member' : 'Members'}
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
                    <span className="font-bold text-slate-800 text-xs">{fixedEnrollments}</span>
                    <span className="text-slate-400 text-[11px] font-normal">{fixedPct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shrink-0"></span>
                    <span className="text-slate-600 font-medium text-xs">Regular Enrollments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{regularEnrollments}</span>
                    <span className="text-slate-400 text-[11px] font-normal">{regularPct}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shrink-0"></span>
                    <span className="text-slate-600 font-medium text-xs">Auction Enrollments</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">{auctionEnrollments}</span>
                    <span className="text-slate-400 text-[11px] font-normal">{auctionPct}%</span>
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
                  <h4 className="font-bold text-slate-700 text-xs">Important Notice</h4>
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
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1"
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

      {/* 7. Bank Allocation & Member Routing Modal with Live Filter */}
      {isBankAllocationModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0d1527] text-white flex justify-between items-center border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl text-amber-400">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2 text-white">
                    Bank Allocation & Member Directory (This Month)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Filter and view which chit members are allocated to specific company bank accounts for collections
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBankAllocationModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar & Bank Selector Tabs */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              {/* Tabs */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSelectedBankFilterId('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    selectedBankFilterId === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Banks ({allBankAllocatedMembers.length})
                </button>
                {companyBanks.map(b => {
                  const bCount = allBankAllocatedMembers.filter(m => m.allocatedBank?.id === b.id).length;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBankFilterId(b.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                        selectedBankFilterId === b.id
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{b.bankName}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        selectedBankFilterId === b.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {bCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64 shrink-0">
                <input
                  type="text"
                  placeholder="Search member, group, phone..."
                  value={bankMemberSearchQuery}
                  onChange={(e) => setBankMemberSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                {bankMemberSearchQuery && (
                  <button
                    onClick={() => setBankMemberSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Bank Details Banner (if a single bank is selected) */}
            {selectedBankFilterId !== 'ALL' && (() => {
              const b = companyBanks.find(bk => bk.id === selectedBankFilterId);
              if (!b) return null;
              return (
                <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{b.bankName} ({b.accountHolderName})</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-700">A/C: {b.accountNumber}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-slate-700">IFSC: {b.ifscCode}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{b.branch}</span>
                  </div>
                  <div className="font-mono text-blue-700 font-semibold">
                    UPI ID: {b.upiId}
                  </div>
                </div>
              );
            })()}

            {/* Members Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 sticky top-0 z-10 whitespace-nowrap shadow-2xs">
                  <tr>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Member Details</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Group & Ticket</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Scheme</th>
                    <th className="px-3.5 py-2.5 text-right font-bold text-slate-500 uppercase tracking-wider">Monthly Due</th>
                    <th className="px-3.5 py-2.5 text-left font-bold text-slate-500 uppercase tracking-wider">Allocated Bank</th>
                    <th className="px-3.5 py-2.5 text-center font-bold text-slate-500 uppercase tracking-wider">Routing Scope</th>
                    <th className="px-3.5 py-2.5 text-center font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white whitespace-nowrap">
                  {modalBankMembers.length > 0 ? (
                    modalBankMembers.map((m, idx) => {
                      const bank = m.allocatedBank;
                      return (
                        <tr key={`${m.id}_${m.groupId}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3.5 py-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-900">{m.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {m.id} · 📞 {m.mobile}</div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-800">{m.groupName}</div>
                            <div className="text-[11px] text-slate-500">Ticket {m.ticketNumber}</div>
                          </td>
                          <td className="px-3.5 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {m.scheme}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-right font-black text-slate-900">
                            {formatCurrency(m.monthlyInstallment)}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <Landmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{bank?.bankName || 'Default Bank'}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">A/C: {bank?.accountNumber}</div>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.bankScope === 'CUSTOMER'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : m.bankScope === 'GROUP'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {m.bankScope === 'CUSTOMER' ? 'Member Custom' : m.bankScope === 'GROUP' ? 'Group Assigned' : 'Company Primary'}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setIsBankAllocationModalOpen(false);
                                  navigate(`/admin/customers/${m.id}`);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
                              >
                                Profile
                              </button>
                              <button
                                onClick={() => {
                                  setIsBankAllocationModalOpen(false);
                                  navigate('/admin/banks');
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors"
                              >
                                Reallocate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                        <Landmark className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-bold text-slate-800 text-sm">
                          {bankMemberSearchQuery ? 'No members match your search' : 'No members allocated to this bank'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {bankMemberSearchQuery ? 'Try clearing your search query' : 'Go to Manage Banks to assign members or groups to this bank.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500 font-medium">
                Showing {modalBankMembers.length} of {allBankAllocatedMembers.length} enrolled members
              </span>
              <button
                type="button"
                onClick={() => setIsBankAllocationModalOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
