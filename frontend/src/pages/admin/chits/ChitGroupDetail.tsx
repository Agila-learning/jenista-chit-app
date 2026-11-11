import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../../utils/format';
import { 
  Layers, 
  Gavel, 
  Calendar, 
  Users, 
  Target, 
  AlertCircle, 
  Landmark, 
  Trash2, 
  CheckCircle2, 
  X, 
  CreditCard, 
  Search, 
  UserPlus, 
  Check,
  Receipt
} from 'lucide-react';
import { resolveBankForPayment } from '../../../utils/bankAccountsData';
import { isMockGroup, isDeletedGroup, isMockCustomer } from '../../../utils/cleanMockData';
import { notifyPaymentSync } from '../../../utils/paymentRequestsData';
import { useAuth } from '../../../store/AuthContext';
import { fetchClient } from '../../../api/client';

export const ChitGroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [group, setGroup] = useState<any>(null);
  const [groupRefreshTrigger, setGroupRefreshTrigger] = useState(0);

  // Modals state
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [manageMembersModalTab, setManageMembersModalTab] = useState<'enrolled' | 'enroll'>('enrolled');
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // MongoDB customers state
  const [mongoCustomers, setMongoCustomers] = useState<any[]>([]);

  // Add Member Form state
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [ticketNumberInput, setTicketNumberInput] = useState('');
  const [schemeInput, setSchemeInput] = useState('Regular');
  const [joiningDateInput, setJoiningDateInput] = useState(() => new Date().toISOString().split('T')[0]);

  // Quick Collect Form state
  const [collectMember, setCollectMember] = useState<any | null>(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMonth, setCollectMonth] = useState(1);
  const [collectMode, setCollectMode] = useState('Cash');
  const [collectReference, setCollectReference] = useState('');

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Load and sync group data
  useEffect(() => {
    const loadGroup = () => {
      const decodedId = id ? decodeURIComponent(id).trim().toLowerCase() : '';
      let found: any = null;

      // 1. Check in mockChitGroups
      const saved = localStorage.getItem('mockChitGroups');
      if (saved) {
        try {
          const groups = JSON.parse(saved);
          if (Array.isArray(groups)) {
            found = groups.find((g: any) => {
              if (isMockGroup(g) || isDeletedGroup(g)) return false;
              const gId = String(g.id || g.code || '').trim().toLowerCase();
              const gName = String(g.name || '').trim().toLowerCase();
              return gId === decodedId || gName === decodedId;
            });
          }
        } catch { }
      }

      // 2. Discover from chitGroupMemberships if not directly found in mockChitGroups
      if (!found) {
        try {
          const mems = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
          const matchMem = mems.find((m: any) => {
            const mGroupId = String(m.groupId || '').trim().toLowerCase();
            const mGroupName = String(m.groupName || '').trim().toLowerCase();
            return mGroupId === decodedId || mGroupName === decodedId;
          });
          if (matchMem) {
            found = {
              id: matchMem.groupId || id,
              name: matchMem.groupName || matchMem.groupId || id,
              type: matchMem.scheme || 'Regular',
              value: Number(matchMem.chitValue || 100000),
              duration: Number(matchMem.duration || matchMem.months || 20),
              currentMonth: 1,
              members: 20,
              filled: 1,
              status: 'ACTIVE'
            };
          }
        } catch { }
      }

      // 3. Discover from mockCustomers chits
      if (!found) {
        try {
          const custs = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
          for (const c of custs) {
            if (Array.isArray(c.chits)) {
              const matchedChit = c.chits.find((ch: any) => {
                const cGroupId = String(ch.groupId || '').trim().toLowerCase();
                const cGroupName = String(ch.groupName || '').trim().toLowerCase();
                return cGroupId === decodedId || cGroupName === decodedId;
              });
              if (matchedChit) {
                const dur = Number(matchedChit.duration || matchedChit.months || 20);
                const monthly = Number(matchedChit.monthlyInstallment || 0);
                const val = Number(matchedChit.chitValue || (monthly > 0 ? monthly * dur : 100000));
                found = {
                  id: matchedChit.groupId || id,
                  name: matchedChit.groupName || matchedChit.groupId || id,
                  type: matchedChit.scheme || 'Regular',
                  value: val,
                  duration: dur,
                  currentMonth: 1,
                  members: 20,
                  filled: 1,
                  status: 'ACTIVE'
                };
                break;
              }
            }
          }
        } catch { }
      }

      setGroup(found || null);
    };

    loadGroup();

    const handleStorage = () => {
      loadGroup();
      setGroupRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [id, groupRefreshTrigger]);

  const isAuction = group?.type === 'AUCTION' || (group?.name && group.name.toLowerCase().includes('auction'));

  // Dynamically compute tabs based on group type
  const tabs = [
    { id: 'overview', name: 'Overview & Health' },
    { id: 'members', name: 'Members & Allocations' },
    ...(isAuction ? [{ id: 'auctions', name: 'Auction History' }] : []),
    { id: 'ledger', name: 'Group Ledger' },
  ];

  const chitValue = Number(group?.chitValue || group?.value || 0);
  const members = Number(group?.members || 20);
  const duration = Number(group?.duration || group?.months || 20);
  const currentMonth = Number(group?.currentMonth || 1);
  const installmentPerMember = members > 0 ? Math.round(chitValue / members) : 0;
  const totalExpected = installmentPerMember * members;

  // Global data fetches for metrics and members tab
  const ledger = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    } catch {
      return [];
    }
  }, [groupRefreshTrigger]);

  // Fetch Mongo customers in background to keep data live
  useEffect(() => {
    let isMounted = true;
    const fetchMongo = async () => {
      try {
        const res = await fetchClient('/customers');
        if (isMounted && res && res.data && Array.isArray(res.data)) {
          setMongoCustomers(res.data);
        }
      } catch {}
    };
    fetchMongo();
    return () => { isMounted = false; };
  }, [groupRefreshTrigger]);

  const customers = useMemo(() => {
    try {
      const local = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((c: any) => !isMockCustomer(c));
      const combined = [...local];
      mongoCustomers.forEach((mc: any) => {
        if (!isMockCustomer(mc)) {
          const matchIdx = combined.findIndex(c => 
            c.id === (mc.customerCode || mc._id) || 
            c.mongoId === mc._id || 
            (c.mobile && (c.mobile === mc.phone || c.mobile === mc.mobile))
          );
          const mapped = {
            id: mc.customerCode || mc._id,
            mongoId: mc._id,
            name: mc.fullName || mc.name,
            phone: mc.phone || mc.mobile,
            mobile: mc.phone || mc.mobile,
            chits: mc.chits || [],
            ...mc
          };
          if (matchIdx === -1) {
            combined.push(mapped);
          } else {
            combined[matchIdx] = { ...combined[matchIdx], ...mapped };
          }
        }
      });
      return combined;
    } catch {
      return [];
    }
  }, [mongoCustomers, groupRefreshTrigger]);

  // Build resolved list of enrolled members for this group
  const groupMembers = useMemo(() => {
    if (!group) return [];
    const membersList: any[] = [];
    const targetGroupId = String(group.id || group.code || '').trim().toLowerCase();
    const targetGroupName = String(group.name || '').trim().toLowerCase();

    // 1. Direct enrolledMembers on group
    if (Array.isArray(group.enrolledMembers)) {
      group.enrolledMembers.forEach((m: any) => {
        if (isMockCustomer(m)) return;
        const custName = m.customerName || m.name || 'Customer';
        membersList.push({
          ...m,
          customerName: custName,
          ticketNumber: String(m.ticketNumber || membersList.length + 1),
          customerImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=102B63&color=fff&size=150`
        });
      });
    }

    // 2. Members from chitGroupMemberships
    try {
      const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      memberships.forEach((m: any) => {
        if (isMockCustomer({ id: m.customerId, name: m.customerName })) return;
        const mGId = String(m.groupId || '').trim().toLowerCase();
        const mGName = String(m.groupName || '').trim().toLowerCase();
        if (mGId === targetGroupId || mGName === targetGroupName || (targetGroupId && mGId.includes(targetGroupId))) {
          if (!membersList.some(existing => existing.ticketNumber === String(m.ticketNumber) || (existing.customerId && existing.customerId === m.customerId))) {
            const custName = m.customerName || 'Customer';
            membersList.push({
              ...m,
              ticketNumber: String(m.ticketNumber || membersList.length + 1),
              customerName: custName,
              customerImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=102B63&color=fff&size=150`
            });
          }
        }
      });
    } catch { }

    // 3. Members from customers list
    customers.forEach((cust: any) => {
      if (isMockCustomer(cust)) return;
      if (Array.isArray(cust.chits)) {
        cust.chits.forEach((chit: any) => {
          const cGId = String(chit.groupId || '').trim().toLowerCase();
          const cGName = String(chit.groupName || '').trim().toLowerCase();
          if (cGId === targetGroupId || cGName === targetGroupName || (targetGroupId && cGId.includes(targetGroupId))) {
            const custName = chit.customerName || cust.name || cust.fullName || 'Customer';
            const existingIdx = membersList.findIndex(m => m.ticketNumber === String(chit.ticketNumber) || (m.customerId && m.customerId === cust.id));
            const memberData = {
              ...chit,
              customerName: custName,
              customerId: cust.id || cust.customerCode || cust._id,
              mobile: cust.mobile || cust.phone || chit.mobile || '',
              ticketNumber: String(chit.ticketNumber || (existingIdx !== -1 ? membersList[existingIdx].ticketNumber : membersList.length + 1)),
              customerImage: cust.photoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=102B63&color=fff&size=150`
            };
            if (existingIdx === -1) {
              membersList.push(memberData);
            } else {
              membersList[existingIdx] = { ...membersList[existingIdx], ...memberData };
            }
          }
        });
      }
    });

    membersList.sort((a, b) => Number(a.ticketNumber) - Number(b.ticketNumber));
    return membersList;
  }, [group, customers, groupRefreshTrigger]);

  const isMemberPaid = (m: any) => {
    return ledger.some((t: any) =>
      (t.type === 'CREDIT' || t.category === 'INSTALLMENT') &&
      ((t.reference?.includes(m.customerId) || t.reference?.includes(m.customerName) || t.description?.includes(m.customerName) || t.description?.includes(m.customerId) || t.customerName === m.customerName || t.customerId === m.customerId) &&
        (t.reference?.includes(group.id) || t.reference?.includes(group.name) || t.description?.includes(group.id) || t.description?.includes(group.name) || t.groupId === group.id || t.chitGroup === group.name))
    );
  };

  const paidMembersCount = groupMembers.filter(isMemberPaid).length;
  const filled = groupMembers.length;

  // Auto calculate next suggested ticket number
  const nextTicketNumber = useMemo(() => {
    const taken = new Set(groupMembers.map(m => Number(m.ticketNumber)).filter(Boolean));
    for (let i = 1; i <= Math.max(members, 50); i++) {
      if (!taken.has(i)) return String(i);
    }
    return String(groupMembers.length + 1);
  }, [groupMembers, members]);

  // Open Manage Members flow (can specify 'enrolled' list or 'enroll' form)
  const handleOpenManageMembers = (tab?: 'enrolled' | 'enroll' | React.MouseEvent) => {
    const targetTab: 'enrolled' | 'enroll' = (tab === 'enroll' || tab === 'enrolled') ? tab : (groupMembers.length === 0 ? 'enroll' : 'enrolled');
    setActiveTab('members');
    setTicketNumberInput(nextTicketNumber);
    setSchemeInput(isAuction ? 'Auction' : group?.type?.includes('FIX') ? 'Fixed' : 'Regular');
    setSelectedCustomer(null);
    setMemberSearchQuery('');
    setManageMembersModalTab(targetTab);
    setIsAddMemberModalOpen(true);
  };

  // Open Collect Installment flow
  const handleOpenCollect = (targetMember?: any) => {
    const candidate = targetMember || groupMembers.find(m => !isMemberPaid(m)) || groupMembers[0] || null;
    setCollectMember(candidate);
    setCollectAmount(String(installmentPerMember || 5000));
    setCollectMonth(currentMonth > 0 ? currentMonth : 1);
    setCollectMode('Cash');
    setCollectReference('');
    setIsCollectModalOpen(true);
  };

  // Submit Member Enrollment
  const handleEnrollMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer to enroll.');
      return;
    }

    const ticketNo = ticketNumberInput.trim() || nextTicketNumber;
    if (groupMembers.some(m => String(m.ticketNumber) === ticketNo)) {
      alert(`Ticket #${ticketNo} is already allocated in this group. Please choose another ticket number.`);
      return;
    }

    const custName = selectedCustomer.name || selectedCustomer.fullName || 'Customer';
    const custId = selectedCustomer.id || selectedCustomer.customerCode || selectedCustomer._id;
    const custMobile = selectedCustomer.mobile || selectedCustomer.phone || '';

    // 1. Add to chitGroupMemberships in localStorage
    const existingMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const newMembership = {
      id: `MEM-${Date.now()}`,
      groupId: group.id || group.code,
      groupName: group.name,
      customerId: custId,
      customerName: custName,
      mobile: custMobile,
      ticketNumber: ticketNo,
      scheme: schemeInput,
      duration: duration,
      chitValue: chitValue,
      monthlyInstallment: installmentPerMember,
      joiningDate: joiningDateInput,
      joinedAt: joiningDateInput,
      status: 'ACTIVE'
    };
    localStorage.setItem('chitGroupMemberships', JSON.stringify([newMembership, ...existingMemberships]));

    // 2. Append chit to customer chits in mockCustomers
    const existingCustomers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const newChit = {
      id: `CHIT-${Date.now()}`,
      groupId: group.id || group.code,
      groupName: group.name,
      chitValue: chitValue,
      monthlyInstallment: installmentPerMember,
      ticketNumber: ticketNo,
      duration: duration,
      scheme: schemeInput,
      joiningDate: joiningDateInput,
      status: 'ACTIVE'
    };

    let customerMatched = false;
    const updatedCusts = existingCustomers.map((c: any) => {
      if (c.id === custId || c.customerCode === custId || c.mongoId === custId) {
        customerMatched = true;
        const oldChits = Array.isArray(c.chits) ? c.chits : [];
        return {
          ...c,
          chits: [...oldChits, newChit],
          activeChits: oldChits.length + 1,
          pending: (Number(c.pending) || 0) + installmentPerMember
        };
      }
      return c;
    });

    if (!customerMatched) {
      updatedCusts.push({
        ...selectedCustomer,
        id: custId,
        name: custName,
        chits: [newChit],
        activeChits: 1,
        pending: installmentPerMember
      });
    }
    localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));

    // 3. Update mockChitGroups filled count
    const existingGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
    const updatedGroups = existingGroups.map((g: any) => {
      if (g.id === group.id || g.name === group.name || g.code === group.id) {
        const currentEnrolled = Array.isArray(g.enrolledMembers) ? g.enrolledMembers : [];
        const nextEnrolled = [...currentEnrolled, newMembership];
        return {
          ...g,
          filled: nextEnrolled.length,
          enrolledMembers: nextEnrolled
        };
      }
      return g;
    });
    localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));

    // 4. Also call MongoDB backend API if available
    try {
      fetchClient(`/customers/${encodeURIComponent(custId)}/chits`, {
        method: 'POST',
        body: JSON.stringify(newChit)
      }).catch(() => {});
    } catch {}

    window.dispatchEvent(new Event('storage'));
    setGroupRefreshTrigger(prev => prev + 1);
    setIsAddMemberModalOpen(false);
    setToastMessage(`✓ ${custName} enrolled successfully with Ticket #${ticketNo}!`);
  };

  // Submit Collect Installment
  const handleCollectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectMember) {
      alert('Please select a member to collect installment.');
      return;
    }

    const amt = Number(collectAmount) || installmentPerMember;
    const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
    const custId = collectMember.customerId || collectMember.id;
    const custName = collectMember.customerName || collectMember.name;

    // 1. Create entry in master ledgerTransactions
    const existingLedger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const ledgerEntry = {
      id: receiptNo,
      receiptNo: receiptNo,
      date: new Date().toISOString(),
      type: 'CREDIT',
      category: 'INSTALLMENT',
      amount: amt,
      dueAmount: installmentPerMember,
      remainingBalance: Math.max(0, installmentPerMember - amt),
      customerId: custId,
      customerName: custName,
      mobileNumber: collectMember.mobile || '',
      groupId: group.id || group.code,
      chitGroup: group.name,
      monthNumber: String(collectMonth),
      scheme: collectMember.scheme || group.type || 'Regular',
      reference: `${custId} / ${group.name}`,
      description: `Installment Collection - Month ${collectMonth} (${group.name})`,
      collectedBy: user?.name || 'Administrator',
      paymentMode: collectMode,
      referenceNo: collectReference,
      status: 'VERIFIED'
    };
    localStorage.setItem('ledgerTransactions', JSON.stringify([ledgerEntry, ...existingLedger]));

    // 2. Create entry in staffReceipts
    const existingStaff = JSON.parse(localStorage.getItem('staffReceipts') || '[]');
    const staffEntry = {
      receiptNo: receiptNo,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      customerId: custId,
      customerName: custName,
      mobileNumber: collectMember.mobile || '',
      chitGroup: group.name,
      monthNumber: String(collectMonth),
      amount: amt,
      dueAmount: installmentPerMember,
      remainingBalance: Math.max(0, installmentPerMember - amt),
      mode: collectMode,
      referenceNo: collectReference,
      executive: user?.name || 'Administrator',
      status: 'COLLECTED',
      type: 'COLLECTION'
    };
    localStorage.setItem('staffReceipts', JSON.stringify([staffEntry, ...existingStaff]));

    // 3. Update customer totalPaid in mockCustomers
    const existingCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const updatedCusts = existingCusts.map((c: any) => {
      if (c.id === custId || c.customerCode === custId || c.mongoId === custId) {
        return {
          ...c,
          totalPaid: (Number(c.totalPaid) || 0) + amt,
          pending: Math.max(0, (Number(c.pending) || 0) - amt)
        };
      }
      return c;
    });
    localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));

    notifyPaymentSync();
    window.dispatchEvent(new Event('storage'));
    setGroupRefreshTrigger(prev => prev + 1);
    setIsCollectModalOpen(false);
    setToastMessage(`✓ Receipt ${receiptNo} recorded: ₹${amt.toLocaleString('en-IN')} collected for ${custName}!`);
  };

  // Remove / Unenroll Member
  const handleRemoveMember = (m: any) => {
    const custName = m.customerName || 'Customer';
    const ticketNo = m.ticketNumber;
    if (!window.confirm(`Are you sure you want to unenroll ${custName} (Ticket #${ticketNo}) from ${group.name}?`)) {
      return;
    }

    // 1. Remove from chitGroupMemberships
    const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
    const targetGId = String(group.id || group.code || '').trim().toLowerCase();
    const targetGName = String(group.name || '').trim().toLowerCase();

    const filteredMems = memberships.filter((mem: any) => {
      const mGId = String(mem.groupId || '').trim().toLowerCase();
      const mGName = String(mem.groupName || '').trim().toLowerCase();
      const isThisGroup = mGId === targetGId || mGName === targetGName;
      const isThisMember = String(mem.ticketNumber) === String(ticketNo) || mem.customerId === m.customerId;
      return !(isThisGroup && isThisMember);
    });
    localStorage.setItem('chitGroupMemberships', JSON.stringify(filteredMems));

    // 2. Remove chit from customer chits in mockCustomers
    const storedCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    const updatedCusts = storedCusts.map((c: any) => {
      if (c.id === m.customerId || c.customerCode === m.customerId || c.mongoId === m.customerId) {
        const oldChits = Array.isArray(c.chits) ? c.chits : [];
        const filteredChits = oldChits.filter((ch: any) => {
          const cGId = String(ch.groupId || '').trim().toLowerCase();
          const cGName = String(ch.groupName || '').trim().toLowerCase();
          const isThisGroup = cGId === targetGId || cGName === targetGName;
          const isThisTicket = String(ch.ticketNumber) === String(ticketNo);
          return !(isThisGroup && isThisTicket);
        });
        return {
          ...c,
          chits: filteredChits,
          activeChits: filteredChits.length
        };
      }
      return c;
    });
    localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));

    // 3. Update mockChitGroups
    const storedGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
    const updatedGroups = storedGroups.map((g: any) => {
      if (g.id === group.id || g.name === group.name || g.code === group.id) {
        const enrolled = Array.isArray(g.enrolledMembers) ? g.enrolledMembers : [];
        const nextEnrolled = enrolled.filter((mem: any) => String(mem.ticketNumber) !== String(ticketNo) && mem.customerId !== m.customerId);
        return {
          ...g,
          filled: nextEnrolled.length,
          enrolledMembers: nextEnrolled
        };
      }
      return g;
    });
    localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));

    window.dispatchEvent(new Event('storage'));
    setGroupRefreshTrigger(prev => prev + 1);
    setToastMessage(`✓ ${custName} removed from ${group.name}.`);
  };

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center text-sm text-neutral-500">
          <Link to="/admin/chit-groups" className="hover:text-primary-900 transition-colors">Chit Groups</Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900 font-medium">{id}</span>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center text-neutral-400 bg-white rounded-xl border border-neutral-200">
          <AlertCircle className="w-12 h-12 mb-4 opacity-40 text-amber-500" />
          <p className="font-bold text-lg text-neutral-700">Group Not Found</p>
          <p className="text-sm mt-1 text-neutral-500">No chit group with ID <span className="font-mono font-bold text-neutral-800">{id}</span> exists.</p>
          <Link to="/admin/chit-groups" className="mt-6 px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-semibold hover:bg-primary-800 transition-colors shadow-xs">
            Back to Chit Groups
          </Link>
        </div>
      </div>
    );
  }

  // Filtered customer list for enrollment dropdown
  const filteredAvailableCustomers = customers.filter((c: any) => {
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    const name = (c.name || c.fullName || '').toLowerCase();
    const phone = (c.mobile || c.phone || '');
    const cId = (c.id || c.customerCode || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || cId.includes(q);
  }).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#102B63] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-amber-400/50 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-neutral-500">
        <Link to="/admin/chit-groups" className="hover:text-primary-900 transition-colors font-medium">Chit Groups</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 font-bold">{group.id || group.code || group.name}</span>
      </div>

      {/* Header Banner - Responsive Mobile View */}
      <div className="bg-[#102B63] rounded-2xl p-5 sm:p-7 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-sm border border-blue-950">
        <div className="relative z-10 flex items-center space-x-4">
          <div className="p-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-xs shrink-0">
            <Layers className="w-8 h-8 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight truncate">{group.name}</h1>
              <span className={`text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs ${
                group.status === 'ACTIVE' ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-950'
              }`}>
                {group.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-blue-200 text-xs sm:text-sm font-medium">
              {group.id || group.code} • {isAuction ? 'Registered Auction Plan' : 'Fixed Collection Plan'} • {duration} Months
            </p>
          </div>
        </div>

        {/* Action Buttons: Manage Members & Collect Installment */}
        <div className="relative z-20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
          <button
            type="button"
            onClick={() => handleOpenManageMembers('enrolled')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer border border-blue-500/40"
            title="View, unenroll or add members to this chit group"
          >
            <Users className="w-4 h-4 text-white" />
            <span>Manage Members</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenCollect()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95 cursor-pointer border border-emerald-500/40"
            title="Record installment collection for members"
          >
            <Target className="w-4 h-4 text-white" />
            <span>Collect Installment</span>
          </button>
        </div>

        {/* Decorative Graphic */}
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none hidden md:block">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <circle cx="50" cy="50" r="40" />
          </svg>
        </div>
      </div>

      {/* Core Metrics Ribbon - Fully Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs border-l-4 border-l-amber-500 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chit Value</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{formatCurrency(chitValue)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs border-l-4 border-l-blue-600 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cycle / Duration</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              Month {currentMonth} <span className="text-sm font-normal text-slate-400">/ {duration}</span>
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs border-l-4 border-l-emerald-600 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Members</p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">
              {filled} / {members}{' '}
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${filled >= members ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                {filled >= members ? 'Full' : `${members - filled} Seats Open`}
              </span>
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs border-l-4 border-l-purple-600 flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            {isAuction ? <Gavel className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isAuction ? 'Installment / Member' : 'Monthly Installment'}
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{formatCurrency(installmentPerMember)}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {/* Navigation Tabs with Horizontal Scroll */}
        <div className="border-b border-slate-200 flex overflow-x-auto scrollbar-none bg-slate-50/70 p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap transition-all rounded-xl outline-none cursor-pointer ${
                activeTab === tab.id
                  ? "bg-white text-[#102B63] shadow-xs border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              }`}
            >
              {tab.name} {tab.id === 'members' && `(${groupMembers.length})`}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Current Cycle Status {currentMonth > 0 ? `(Month ${currentMonth})` : '(Not Started)'}</span>
                </h3>
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">Installment Expected</p>
                      <p className="text-xs text-slate-500">Per member: {formatCurrency(installmentPerMember)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-black text-slate-900">{formatCurrency(totalExpected)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-emerald-50/80 rounded-xl border border-emerald-200/80">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-emerald-800">Collection Received</p>
                      <p className="text-xs text-emerald-600 font-medium">{paidMembersCount} of {members} members paid</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-black text-emerald-700">{formatCurrency(installmentPerMember * paidMembersCount)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-rose-50/80 rounded-xl border border-rose-200/80">
                    <div>
                      <p className="text-xs sm:text-sm font-bold text-rose-800">Pending Collection</p>
                      <p className="text-xs text-rose-600 font-medium">{members - paidMembersCount} members pending</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base sm:text-lg font-black text-rose-700">{formatCurrency(installmentPerMember * (members - paidMembersCount))}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2.5">
                  <button
                    onClick={() => handleOpenCollect()}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Target className="w-4 h-4" />
                    <span>Collect Next Pending Due</span>
                  </button>
                  <button
                    onClick={() => navigate(`/admin/receipts?chitGroup=${encodeURIComponent(group.name || group.id)}`)}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Receipt className="w-4 h-4 text-blue-600" />
                    <span className="hidden sm:inline">Open Receipts Desk</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-4">Group Summary & Allocation</h3>
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="bg-[#102B63] p-4 text-white">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
                      {isAuction ? 'Auction Plan' : 'Fixed Plan'}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="font-extrabold text-base sm:text-lg">{group.name}</div>
                      <div className="text-xs font-mono text-blue-200">{group.id || group.code}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Chit Value</span>
                      <span className="font-bold text-slate-900">{formatCurrency(chitValue)}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Duration</span>
                      <span className="font-bold text-slate-900">{duration} Months</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Member Capacity</span>
                      <span className="font-bold text-slate-900">{members}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-slate-500">Type</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[11px] uppercase ${isAuction ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {isAuction ? 'Auction' : 'Fixed'}
                      </span>
                    </div>
                    {(() => {
                      const bankInfo = resolveBankForPayment(undefined, group.id || group.code, group.name);
                      return (
                        <div className="flex justify-between items-center text-xs sm:text-sm pt-2.5 border-t border-slate-100">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-blue-700" /> Assigned Bank
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 block text-xs">{bankInfo.bank.bankName}</span>
                            <span className="font-mono text-[10px] text-slate-500 block">UPI: {bankInfo.bank.upiId}</span>
                            <Link to="/admin/banks" className="text-[11px] font-bold text-blue-700 hover:underline">
                              Manage Banks &rarr;
                            </Link>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between text-xs sm:text-sm pt-1">
                      <span className="text-slate-500">Status</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${group.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {group.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-5">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Enrolled Members Directory</h3>
                  <p className="text-xs text-slate-500">
                    {groupMembers.length} active subscribers enrolled • {members - groupMembers.length > 0 ? `${members - groupMembers.length} seats available` : 'Full capacity'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenManageMembers}
                    className="px-4 py-2 bg-[#102B63] hover:bg-[#0c224e] text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <UserPlus className="w-4 h-4 text-amber-400" />
                    <span>+ Enroll Member</span>
                  </button>
                </div>
              </div>

              {/* Members Table - Responsive Mobile Wrap */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <tr>
                      <th className="p-3.5 text-left">Ticket</th>
                      <th className="p-3.5 text-left">Customer Name</th>
                      <th className="p-3.5 text-left">Scheme</th>
                      <th className="p-3.5 text-center">Duration</th>
                      <th className="p-3.5 text-left">Joining Date</th>
                      <th className="p-3.5 text-center">Month {currentMonth} Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white whitespace-nowrap">
                    {groupMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-slate-600">No members enrolled in this group yet.</p>
                          <p className="text-xs text-slate-400 mt-1">Click "Enroll Member" above to add customers to this chit.</p>
                          <button
                            onClick={handleOpenManageMembers}
                            className="mt-4 px-4 py-2 bg-[#102B63] text-white text-xs font-bold rounded-xl shadow-xs"
                          >
                            + Enroll First Member
                          </button>
                        </td>
                      </tr>
                    ) : (
                      groupMembers.map((m, idx) => {
                        const hasPaid = isMemberPaid(m);
                        const scheme = m.scheme || 'Regular';
                        const isFixed = scheme.toLowerCase().includes('fix');
                        const isAuctionScheme = scheme.toLowerCase().includes('auc');

                        return (
                          <tr key={`${m.ticketNumber}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3.5 font-black text-slate-900 font-mono text-sm">
                              #{m.ticketNumber}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <img src={m.customerImage} className="w-8 h-8 rounded-full border border-slate-200 shrink-0" alt="" />
                                <div>
                                  <Link
                                    to={`/admin/customers/${m.customerId}/schedule?group=${encodeURIComponent(group.name || group.id)}`}
                                    className="font-bold text-slate-900 hover:text-blue-700 hover:underline transition-colors block text-xs sm:text-sm"
                                  >
                                    {m.customerName}
                                  </Link>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    ID: {m.customerId} {m.mobile && `• 📞 ${m.mobile}`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isFixed
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isAuctionScheme
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-amber-50 text-amber-900 border border-amber-200'
                              }`}>
                                {scheme}
                              </span>
                            </td>
                            <td className="p-3.5 text-center font-bold text-slate-700">
                              {m.months || m.duration || duration} Mos
                            </td>
                            <td className="p-3.5 text-slate-500 font-medium">
                              {m.joiningDate || m.joinedAt || '—'}
                            </td>
                            <td className="p-3.5 text-center">
                              {hasPaid ? (
                                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-black rounded-lg border border-emerald-200 uppercase">
                                  Paid ✓
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[11px] font-black rounded-lg border border-rose-200 uppercase">
                                  Pending Due
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {!hasPaid ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCollect(m)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
                                    title="Collect installment for this member"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                    <span>Collect ₹{installmentPerMember}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCollect(m)}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Record additional installment or advance"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Receipt</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveMember(m)}
                                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Unenroll member from this chit group"
                                >
                                  <Trash2 className="w-4 h-4" />
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

          {/* GROUP LEDGER TAB */}
          {activeTab === 'ledger' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">Group Transaction Ledger</h3>
                <span className="text-xs font-bold text-slate-500">
                  Total Collected: <strong className="text-emerald-700">{formatCurrency(installmentPerMember * paidMembersCount)}</strong>
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <tr>
                      <th className="p-3 text-left">Receipt #</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Customer</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Mode</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white whitespace-nowrap">
                    {ledger.filter((t: any) =>
                      t.reference?.includes(group.id) ||
                      t.reference?.includes(group.name) ||
                      t.description?.includes(group.name) ||
                      t.groupId === group.id ||
                      t.chitGroup === group.name
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No transactions recorded for this group yet.
                        </td>
                      </tr>
                    ) : (
                      ledger.filter((t: any) =>
                        t.reference?.includes(group.id) ||
                        t.reference?.includes(group.name) ||
                        t.description?.includes(group.name) ||
                        t.groupId === group.id ||
                        t.chitGroup === group.name
                      ).map((tx: any, tIdx: number) => (
                        <tr key={tx.id || tIdx} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-blue-700">{tx.receiptNo || tx.id}</td>
                          <td className="p-3 text-slate-500">{tx.date ? new Date(tx.date).toLocaleDateString('en-IN') : '—'}</td>
                          <td className="p-3 font-bold text-slate-800">{tx.customerName || tx.customerId}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{tx.type}</span></td>
                          <td className="p-3 text-slate-600">{tx.paymentMode || 'Cash'}</td>
                          <td className="p-3 text-right font-black text-emerald-700 font-mono">₹{Number(tx.amount || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'auctions' && (
            <div className="py-12 text-center text-slate-400">
              <Gavel className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-700">Digital Chit Auction Desk</p>
              <p className="text-xs text-slate-500 mt-1">Auctions for {group.name} will be scheduled according to cycle dates.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL 1: MANAGE MEMBERS DIRECTORY & ENROLLMENT MODAL       */}
      {/* ========================================================= */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[#102B63] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600/40 rounded-xl border border-white/20">
                  <Users className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-base">Manage Group Members</h3>
                  <p className="text-xs text-blue-200">{group.name} • {groupMembers.length} Enrolled</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-2.5 gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setManageMembersModalTab('enrolled')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  manageMembersModalTab === 'enrolled'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Enrolled Members ({groupMembers.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setManageMembersModalTab('enroll')}
                className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                  manageMembersModalTab === 'enroll'
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Enroll New Member</span>
              </button>
            </div>

            {/* TAB 1: VIEW & MANAGE ENROLLED MEMBERS */}
            {manageMembersModalTab === 'enrolled' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                {groupMembers.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-slate-700">No members enrolled in {group.name} yet</p>
                    <p className="text-slate-400 text-xs mt-1">Enroll your first customer to assign chit tickets and start collecting installments.</p>
                    <button
                      type="button"
                      onClick={() => setManageMembersModalTab('enroll')}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                    >
                      + Enroll First Member
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                      <span>Showing {groupMembers.length} enrolled subscribers</span>
                      <button
                        type="button"
                        onClick={() => setManageMembersModalTab('enroll')}
                        className="text-blue-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Enroll Another Member</span>
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30 max-h-[50vh] overflow-y-auto">
                      {groupMembers.map((m, idx) => {
                        const paid = isMemberPaid(m);
                        return (
                          <div key={`${m.ticketNumber}_${idx}`} className="p-3.5 flex items-center justify-between gap-3 hover:bg-white transition bg-white/70">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 font-black flex items-center justify-center font-mono text-xs shrink-0 border border-blue-200">
                                #{m.ticketNumber}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                                  <span>{m.customerName}</span>
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {paid ? 'Paid' : 'Due'}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono truncate">
                                  ID: {m.customerId} {m.mobile ? `• 📞 ${m.mobile}` : ''} • Scheme: {m.scheme || 'Regular'}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAddMemberModalOpen(false);
                                  handleOpenCollect(m);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] transition shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Collect payment for this member"
                              >
                                <Target className="w-3 h-3" />
                                <span>Collect</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRemoveMember(m)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Unenroll / Remove member from this chit"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setIsAddMemberModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Close Directory
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: ENROLL NEW MEMBER FORM */}
            {manageMembersModalTab === 'enroll' && (
              <form onSubmit={handleEnrollMemberSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
                {/* Customer Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Customer to Enroll *
                  </label>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      placeholder="Search customer by name, mobile, or ID..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* Filtered suggestions list */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
                    {filteredAvailableCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No matching customers found.
                      </div>
                    ) : (
                      filteredAvailableCustomers.map((cust: any) => {
                        const isSelected = selectedCustomer?.id === cust.id;
                        const isAlreadyEnrolled = groupMembers.some(m => m.customerId === cust.id);

                        return (
                          <div
                            key={cust.id}
                            onClick={() => {
                              if (!isAlreadyEnrolled) {
                                setSelectedCustomer(cust);
                              }
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-blue-50 border-l-4 border-l-blue-600'
                                : isAlreadyEnrolled
                                  ? 'opacity-50 cursor-not-allowed bg-slate-100'
                                  : 'hover:bg-white'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{cust.name || cust.fullName}</span>
                                {isAlreadyEnrolled && (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 rounded">Enrolled</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                ID: {cust.id} • 📞 {cust.mobile || cust.phone || 'No phone'}
                              </div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {selectedCustomer && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-blue-700 block">Selected Customer:</span>
                      <strong className="text-slate-900 text-sm">{selectedCustomer.name || selectedCustomer.fullName}</strong>
                      <p className="text-xs text-slate-500 font-mono">ID: {selectedCustomer.id} • Phone: {selectedCustomer.mobile || selectedCustomer.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Ticket Number & Scheme */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Ticket Number *
                    </label>
                    <input
                      type="text"
                      value={ticketNumberInput}
                      onChange={(e) => setTicketNumberInput(e.target.value)}
                      required
                      placeholder="e.g. 1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Suggested: #{nextTicketNumber}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Scheme Plan *
                    </label>
                    <select
                      value={schemeInput}
                      onChange={(e) => setSchemeInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Regular">Regular Chit</option>
                      <option value="Fixed">Fixed Chit (Bonus)</option>
                      <option value="Auction">Auction Chit</option>
                    </select>
                  </div>
                </div>

                {/* Joining Date & Monthly Installment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Joining Date *
                    </label>
                    <input
                      type="date"
                      value={joiningDateInput}
                      onChange={(e) => setJoiningDateInput(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Monthly Installment
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(installmentPerMember)}
                      disabled
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-xs font-bold text-slate-700"
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setManageMembersModalTab('enrolled')}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    View Members List
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedCustomer}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Enrollment</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: COLLECT INSTALLMENT RECEIPT ENTRY                 */}
      {/* ========================================================= */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-[#102B63] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-400/30">
                  <Target className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-black text-base">Collect Installment Payment</h3>
                  <p className="text-xs text-blue-200">{group.name} • Month {collectMonth}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCollectModalOpen(false)}
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Check if no members enrolled in this group */}
            {groupMembers.length === 0 ? (
              <div className="p-8 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">No Members Enrolled Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    You must enroll at least one member into {group.name} before collecting monthly installments.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCollectModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollectModalOpen(false);
                      handleOpenManageMembers('enroll');
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Enroll Member Now</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Modal Form */
              <form onSubmit={handleCollectSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
                {/* Member Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Enrolled Member *
                  </label>
                  <select
                    value={collectMember?.ticketNumber || ''}
                    onChange={(e) => {
                      const found = groupMembers.find(m => String(m.ticketNumber) === e.target.value);
                      setCollectMember(found || null);
                    }}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">-- Choose Member --</option>
                    {groupMembers.map((m) => {
                      const paid = isMemberPaid(m);
                      return (
                        <option key={m.ticketNumber} value={m.ticketNumber}>
                          Ticket #{m.ticketNumber} - {m.customerName} ({paid ? 'Already Paid ✓' : 'Due ₹' + installmentPerMember})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Selected Member Summary Card */}
                {collectMember && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">
                        Ticket #{collectMember.ticketNumber} • {collectMember.customerName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {collectMember.customerId} • 📞 {collectMember.mobile || 'No phone'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isMemberPaid(collectMember) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isMemberPaid(collectMember) ? 'Month Paid ✓' : 'Payment Due'}
                    </span>
                  </div>
                )}

                {/* Amount & Month */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Amount Received (₹) *
                    </label>
                    <input
                      type="number"
                      value={collectAmount}
                      onChange={(e) => setCollectAmount(e.target.value)}
                      required
                      placeholder="e.g. 5000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setCollectAmount(String(installmentPerMember))}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[10px] font-bold rounded cursor-pointer"
                      >
                        Full (₹{installmentPerMember})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollectAmount(String(Math.round(installmentPerMember / 2)))}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 hover:bg-slate-200 text-[10px] font-bold rounded cursor-pointer"
                      >
                        Half (₹{Math.round(installmentPerMember / 2)})
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Month Cycle
                    </label>
                    <select
                      value={collectMonth}
                      onChange={(e) => setCollectMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {Array.from({ length: duration }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>Month {m} of {duration}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Payment Mode & Reference */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Payment Mode *
                    </label>
                    <select
                      value={collectMode}
                      onChange={(e) => setCollectMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT / IMPS</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Ref / UTR Number
                    </label>
                    <input
                      type="text"
                      value={collectReference}
                      onChange={(e) => setCollectReference(e.target.value)}
                      placeholder="e.g. UTR-12345678"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                {/* Direct Link to Full Receipts Desk */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-600">Need full printer & multi-line details?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollectModalOpen(false);
                      const custId = collectMember?.customerId || '';
                      navigate(`/admin/receipts?customerId=${encodeURIComponent(custId)}&chitGroup=${encodeURIComponent(group.name)}&amount=${collectAmount || installmentPerMember}`);
                    }}
                    className="font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Full Receipt Entry</span>
                    <Receipt className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsCollectModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!collectMember}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Record & Verify Payment</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
