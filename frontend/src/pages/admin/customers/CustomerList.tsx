import { useState, useEffect, useMemo } from 'react';
import { 
  Search,
  Eye, 
  Trash2, 
  Gavel, 
  Calendar, 
  Clock, 
  Edit3, 
  CheckCircle2, 
  X, 
  Sparkles,
  Plus,
  Users
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { Link } from 'react-router-dom';
import { fetchClient } from '../../../api/client';
import { isMockCustomer, isMockGroup } from '../../../utils/cleanMockData';

export const CustomerList = () => {
  const [searchName, setSearchName] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchAadhar, setSearchAadhar] = useState('');
  const [searchPan, setSearchPan] = useState('');
  const [schemeFilter, setSchemeFilter] = useState<'ALL' | 'AUCTION' | 'FIXED' | 'REGULAR' | 'UNASSIGNED'>('ALL');

  // Customer data loaded from MongoDB API + localStorage
  const [allCustomers, setAllCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem('mockCustomers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((p: any) => !isMockCustomer(p)) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Modal state for assigning or updating customer plan
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [assignScheme, setAssignScheme] = useState<'Auction' | 'Fixed' | 'Regular'>('Auction');
  const [assignGroup, setAssignGroup] = useState<string>('');
  const [assignChitValue, setAssignChitValue] = useState<string>('100000');
  const [assignInstallment, setAssignInstallment] = useState<string>('5000');
  const [assignMonths, setAssignMonths] = useState<string>('20');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // List of active chit groups for the modal dropdown
  const availableGroups = useMemo(() => {
    try {
      const g = localStorage.getItem('mockChitGroups');
      return g ? JSON.parse(g).filter((item: any) => !isMockGroup(item)) : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    const loadMongoCustomers = async () => {
      try {
        const localSaved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
        
        let mongoList: any[] = [];
        try {
          const res = await fetchClient('/customers');
          if (res && res.data && Array.isArray(res.data)) {
            mongoList = res.data;
          }
        } catch (e) {
          console.warn('Backend customers API offline, using local data:', e);
        }

        const mapped = mongoList.map((c: any) => {
          const local = localSaved.find((lc: any) => 
            lc.id === (c.customerCode || c._id) || 
            lc.mongoId === c._id || 
            (lc.phone && (lc.phone === c.phone || lc.mobile === c.phone))
          );
          const chits = (c.chits && c.chits.length > 0) ? c.chits : (local?.chits || []);
          const chosenScheme = local?.scheme || c.scheme || (local?.interestedPlan?.includes('Fix') ? 'Fixed' : local?.interestedPlan?.includes('Auc') ? 'Auction' : local?.interestedPlan?.includes('Reg') ? 'Regular' : undefined) || 'Regular';
          
          return {
            id: c.customerCode || c._id,
            mongoId: c._id,
            name: c.fullName || c.name,
            phone: c.phone || c.mobile,
            mobile: c.phone || c.mobile,
            aadhar: c.aadhar || local?.aadhar || '—',
            pan: c.pan || local?.pan || '—',
            branch: c.branchId?.branchName || c.branch || 'Head Office',
            agent: c.assignedAgentId?.name || c.agent || 'System Admin',
            pending: c.pending ?? local?.pending ?? 0,
            activeChits: chits.length,
            chits: chits,
            scheme: chosenScheme,
            interestedPlan: local?.interestedPlan || c.interestedPlan || `${chosenScheme} Scheme`,
            status: c.status || 'ACTIVE'
          };
        });

        const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]'));
        const cleanMapped = mapped.filter((c: any) => !isMockCustomer(c) && !deletedIds.has(c.id) && (!c.mongoId || !deletedIds.has(c.mongoId)));
        
        const localOnly = localSaved.filter((lc: any) => {
          if (isMockCustomer(lc)) return false;
          if (deletedIds.has(lc.id) || (lc.mongoId && deletedIds.has(lc.mongoId)) || (lc.mobile && deletedIds.has(lc.mobile))) return false;
          // If customer has a mongoId but is missing from backend MongoDB list, it was deleted!
          if (lc.mongoId && !mongoList.some((item: any) => item._id === lc.mongoId)) return false;
          return !mongoList.some((item: any) => 
            (item._id && lc.mongoId === item._id) || 
            (item.customerCode && lc.id === item.customerCode) ||
            (item.phone && (lc.mobile === item.phone || lc.phone === item.phone))
          );
        });

        const combined = [...cleanMapped, ...localOnly];

        // Self-heal with websiteLeads (e.g. Lead Agila converted, skipping deleted leads)
        storedLeads.filter((l: any) => l.status !== 'REJECTED' && !deletedIds.has(l.convertedCustomerId)).forEach((lead: any) => {
          const leadPhone = (lead.phone || '').replace(/\D/g, '');
          const leadName = (lead.fullName || '').trim().toLowerCase();

          const existingCust = combined.find((c: any) => {
            const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
            const cName = (c.name || c.fullName || '').trim().toLowerCase();
            return (leadPhone && cPhone && leadPhone === cPhone) || (leadName && cName && leadName === cName);
          });

          const rawP = lead.interestedPlan || '';
          let dScheme: 'Auction' | 'Fixed' | 'Regular' = 'Auction';
          if (rawP.toLowerCase().includes('fix')) dScheme = 'Fixed';
          else if (rawP.toLowerCase().includes('reg')) dScheme = 'Regular';
          else if (rawP.toLowerCase().includes('auc')) dScheme = 'Auction';

          if (existingCust) {
            existingCust.scheme = existingCust.scheme || dScheme;
            existingCust.interestedPlan = existingCust.interestedPlan || lead.interestedPlan || `${dScheme} Scheme`;
            if (!Array.isArray(existingCust.chits) || existingCust.chits.length === 0) {
              existingCust.chits = [
                {
                  groupId: 'PENDING',
                  groupName: lead.interestedPlan || `${dScheme} Scheme (Lead Enrolled)`,
                  scheme: dScheme,
                  chitValue: 100000,
                  monthlyInstallment: 5000,
                  duration: 20,
                  ticketNumber: '1',
                  paymentStatus: 'ACTIVE',
                  joiningDate: existingCust.createdAt || new Date().toISOString()
                }
              ];
              existingCust.activeChits = 1;
            }
          } else if (lead.status === 'CONVERTED' || (lead.fullName && lead.fullName.toLowerCase().includes('agila'))) {
            // Restore converted lead to customers
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
              phone: lead.phone,
              mobile: lead.phone,
              aadhar: '—',
              pan: '—',
              branch: 'Head Office',
              agent: 'System Admin',
              pending: 0,
              activeChits: 1,
              scheme: dScheme,
              interestedPlan: lead.interestedPlan || `${dScheme} Scheme`,
              status: 'ACTIVE',
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
              ]
            });
          }
        });

        setAllCustomers(combined);
        localStorage.setItem('mockCustomers', JSON.stringify(combined));
      } catch (err) {
        console.warn('Could not fetch customers from backend:', err);
      }
    };

    loadMongoCustomers();
  }, []);

  // Filtered customers with scheme & search criteria
  const displayedCustomers = useMemo(() => {
    return allCustomers.filter((c: any) => {
      // Scheme Filter
      if (schemeFilter !== 'ALL') {
        const cScheme = (c.scheme || (c.chits?.[0]?.scheme) || '').toUpperCase();
        if (schemeFilter === 'AUCTION' && !cScheme.includes('AUC')) return false;
        if (schemeFilter === 'FIXED' && !cScheme.includes('FIX')) return false;
        if (schemeFilter === 'REGULAR' && (!cScheme.includes('REG') || cScheme.includes('FIX') || cScheme.includes('AUC'))) return false;
        if (schemeFilter === 'UNASSIGNED' && cScheme && cScheme !== '—') return false;
      }

      // Search filters
      if (searchName && !String(c.name || '').toLowerCase().includes(searchName.toLowerCase())) return false;
      if (searchMobile && !String(c.phone || c.mobile || '').includes(searchMobile)) return false;
      if (searchAadhar && !String(c.aadhar || '').replace(/\s/g, '').includes(searchAadhar.replace(/\s/g, ''))) return false;
      if (searchPan && !String(c.pan || '').toLowerCase().includes(searchPan.toLowerCase())) return false;

      return true;
    });
  }, [allCustomers, schemeFilter, searchName, searchMobile, searchAadhar, searchPan]);

  // Counts by scheme
  const schemeCounts = useMemo(() => {
    let auction = 0;
    let fixed = 0;
    let regular = 0;
    let unassigned = 0;

    allCustomers.forEach((c: any) => {
      const s = (c.scheme || (c.chits?.[0]?.scheme) || '').toUpperCase();
      if (s.includes('AUC')) auction++;
      else if (s.includes('FIX')) fixed++;
      else if (s.includes('REG')) regular++;
      else unassigned++;
    });

    return { total: allCustomers.length, auction, fixed, regular, unassigned };
  }, [allCustomers]);

  const handleDeleteCustomer = (id: string) => {
    const cust = allCustomers.find((c: any) => c.id === id);
    if (window.confirm(`Are you sure you want to delete customer ${cust?.name || id}?`)) {
      const updatedCustomers = allCustomers.filter((c: any) => c.id !== id);
      setAllCustomers(updatedCustomers);
      
      const saved = localStorage.getItem('mockCustomers');
      if (saved) {
        const parsed = JSON.parse(saved);
        const newStorage = parsed.filter((c: any) => c.id !== id && c.customerCode !== id && (!cust?.mongoId || c.mongoId !== cust.mongoId));
        localStorage.setItem('mockCustomers', JSON.stringify(newStorage));
      }

      // Track in deletedCustomerIds
      const deletedIds: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
      if (!deletedIds.includes(id)) deletedIds.push(id);
      if (cust?.mongoId && !deletedIds.includes(cust.mongoId)) deletedIds.push(cust.mongoId);
      if (cust?.phone && !deletedIds.includes(cust.phone)) deletedIds.push(cust.phone);
      localStorage.setItem('deletedCustomerIds', JSON.stringify(deletedIds));

      // Clean from mockChitGroups
      const diskGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
      const updatedGroups = diskGroups.map((g: any) => ({
        ...g,
        enrolledMembers: Array.isArray(g.enrolledMembers) ? g.enrolledMembers.filter((m: any) => m.id !== id && m.customerId !== id) : [],
        filled: Array.isArray(g.enrolledMembers) ? g.enrolledMembers.filter((m: any) => m.id !== id && m.customerId !== id).length : (g.filled || 0)
      }));
      localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));

      // Clean from chitGroupMemberships
      const diskMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      const updatedMemberships = diskMemberships.filter((m: any) => m.customerId !== id && m.id !== id);
      localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

      // Clean from websiteLeads
      try {
        const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
        const updatedLeads = storedLeads.map((l: any) => {
          if (l.convertedCustomerId === id || l.id === id) {
            return { ...l, status: 'REJECTED' };
          }
          return l;
        });
        localStorage.setItem('websiteLeads', JSON.stringify(updatedLeads));
      } catch {}

      // Delete from backend MongoDB
      const targetId = cust?.mongoId || id;
      fetchClient(`/customers/${targetId}`, { method: 'DELETE' }).catch(() => {});

      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleClear = () => {
    setSearchName('');
    setSearchMobile('');
    setSearchAadhar('');
    setSearchPan('');
    setSchemeFilter('ALL');
  };

  // Open modal to assign or change plan
  const handleOpenAssignModal = (customer: any) => {
    setEditingCustomer(customer);
    const existingScheme = customer.scheme || (customer.chits?.[0]?.scheme) || 'Auction';
    setAssignScheme(existingScheme);
    
    const existingChit = customer.chits?.[0];
    setAssignGroup(existingChit?.groupName || existingChit?.groupId || '');
    setAssignChitValue(existingChit?.chitValue ? String(existingChit.chitValue) : '100000');
    setAssignInstallment(existingChit?.monthlyInstallment ? String(existingChit.monthlyInstallment) : '5000');
    setAssignMonths(existingChit?.duration ? String(existingChit.duration) : '20');
  };

  const handleSavePlan = () => {
    if (!editingCustomer) return;

    const chitValNum = Number(assignChitValue) || 100000;
    const monthsNum = Number(assignMonths) || 20;
    const installmentNum = Number(assignInstallment) || (monthsNum > 0 ? Math.round(chitValNum / monthsNum) : 5000);
    const groupNameStr = assignGroup.trim() || `${assignScheme} Series Plan`;

    const updatedCusts = allCustomers.map((c: any) => {
      if (c.id === editingCustomer.id) {
        const updatedChit = {
          groupId: groupNameStr.replace(/\s+/g, '-').toUpperCase(),
          groupName: groupNameStr,
          scheme: assignScheme,
          chitValue: chitValNum,
          monthlyInstallment: installmentNum,
          duration: monthsNum,
          ticketNumber: c.chits?.[0]?.ticketNumber || '1',
          paymentStatus: 'ACTIVE',
          joiningDate: c.chits?.[0]?.joiningDate || new Date().toISOString()
        };

        return {
          ...c,
          scheme: assignScheme,
          interestedPlan: groupNameStr,
          chits: [updatedChit, ...(c.chits?.slice(1) || [])],
          activeChits: Math.max(1, (c.chits?.length || 1))
        };
      }
      return c;
    });

    setAllCustomers(updatedCusts);
    localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
    window.dispatchEvent(new Event('storage'));

    setSaveSuccessMsg(`Successfully updated plan for ${editingCustomer.name}!`);
    setTimeout(() => {
      setSaveSuccessMsg(null);
      setEditingCustomer(null);
    }, 1500);
  };

  return (
    <div className="w-full space-y-6 pb-12 min-w-0">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-900 border border-primary-200/80 mb-2">
            <Users className="w-3.5 h-3.5 text-primary-700" />
            <span>Member Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Directory & Plans
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Search, filter, view member profiles, and allocate chit schemes & installments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/admin/customers/approvals"
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Enrollment Approvals</span>
          </Link>

          <Link
            to="/admin/customers/add"
            className="px-4 py-2 text-xs font-bold text-white bg-primary-900 hover:bg-primary-800 rounded-xl transition-all shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Customer</span>
          </Link>
        </div>
      </div>

      {/* Main Customers Directory Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-200 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-neutral-800">Customer Records</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                View, search, filter and allocate chit schemes for all registered customers.
              </p>
            </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary-50 text-primary-900 border border-primary-200">
                    {displayedCustomers.length} Customer{displayedCustomers.length !== 1 ? 's' : ''} Displayed
                  </span>
                  {(searchName || searchMobile || searchAadhar || searchPan || schemeFilter !== 'ALL') && (
                    <button
                      onClick={handleClear}
                      className="text-xs text-neutral-500 hover:text-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Plan / Scheme Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 mb-6 pt-1">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider mr-1">Filter Scheme:</span>
                
                <button
                  type="button"
                  onClick={() => setSchemeFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    schemeFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  All Schemes ({schemeCounts.total})
                </button>

                <button
                  type="button"
                  onClick={() => setSchemeFilter('AUCTION')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    schemeFilter === 'AUCTION'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                  }`}
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Auction Scheme ({schemeCounts.auction})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSchemeFilter('FIXED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    schemeFilter === 'FIXED'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Fixed Plan ({schemeCounts.fixed})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSchemeFilter('REGULAR')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    schemeFilter === 'REGULAR'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Regular Scheme ({schemeCounts.regular})</span>
                </button>

                {schemeCounts.unassigned > 0 && (
                  <button
                    type="button"
                    onClick={() => setSchemeFilter('UNASSIGNED')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      schemeFilter === 'UNASSIGNED'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span>Unassigned ({schemeCounts.unassigned})</span>
                  </button>
                )}
              </div>

              {/* Search Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Name */}
                <div className="flex border rounded-xl overflow-hidden transition-all border-neutral-300 focus-within:ring-2 focus-within:ring-primary-500">
                  <div className="bg-neutral-50 px-3 py-2 flex items-center border-r border-neutral-200 text-xs font-semibold text-neutral-600 shrink-0">
                    Name
                  </div>
                  <input 
                    placeholder="Search name..."
                    className="flex-1 px-3 py-2 text-xs outline-none bg-white font-medium"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                  />
                </div>

                {/* Mobile Number */}
                <div className="flex border rounded-xl overflow-hidden transition-all border-neutral-300 focus-within:ring-2 focus-within:ring-primary-500">
                  <div className="bg-neutral-50 px-3 py-2 flex items-center border-r border-neutral-200 text-xs font-semibold text-neutral-600 shrink-0">
                    Mobile
                  </div>
                  <input 
                    placeholder="Search phone..."
                    className="flex-1 px-3 py-2 text-xs outline-none bg-white font-medium"
                    value={searchMobile}
                    onChange={(e) => setSearchMobile(e.target.value)}
                  />
                </div>

                {/* Aadhar Number */}
                <div className="flex border rounded-xl overflow-hidden transition-all border-neutral-300 focus-within:ring-2 focus-within:ring-primary-500">
                  <div className="bg-neutral-50 px-3 py-2 flex items-center border-r border-neutral-200 text-xs font-semibold text-neutral-600 shrink-0">
                    Aadhar
                  </div>
                  <input 
                    placeholder="Aadhar no..."
                    className="flex-1 px-3 py-2 text-xs outline-none bg-white font-medium"
                    value={searchAadhar}
                    onChange={(e) => setSearchAadhar(e.target.value)}
                  />
                </div>

                {/* PAN Number */}
                <div className="flex border rounded-xl overflow-hidden transition-all border-neutral-300 focus-within:ring-2 focus-within:ring-primary-500">
                  <div className="bg-neutral-50 px-3 py-2 flex items-center border-r border-neutral-200 text-xs font-semibold text-neutral-600 shrink-0">
                    PAN
                  </div>
                  <input 
                    placeholder="PAN card..."
                    className="flex-1 px-3 py-2 text-xs outline-none bg-white font-medium"
                    value={searchPan}
                    onChange={(e) => setSearchPan(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Customers Table */}
            {displayedCustomers.length > 0 ? (
              <div className="overflow-x-auto min-h-[300px] bg-white">
                <table className="min-w-full divide-y divide-neutral-200 text-xs">
                  <thead className="bg-neutral-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-neutral-600 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-left font-bold text-neutral-600 uppercase tracking-wider">Contact</th>
                      <th className="px-4 py-3 text-left font-bold text-neutral-600 uppercase tracking-wider">Chosen Plan / Scheme</th>
                      <th className="px-4 py-3 text-left font-bold text-neutral-600 uppercase tracking-wider">Identity</th>
                      <th className="px-4 py-3 text-left font-bold text-neutral-600 uppercase tracking-wider">Branch / Agent</th>
                      <th className="px-4 py-3 text-right font-bold text-neutral-600 uppercase tracking-wider">Pending Dues</th>
                      <th className="px-4 py-3 text-center font-bold text-neutral-600 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-center font-bold text-neutral-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {displayedCustomers.map((c) => {
                      const rawScheme = (c.scheme || (c.chits?.[0]?.scheme) || '').toUpperCase();
                      const isAuction = rawScheme.includes('AUC');
                      const isFixed = rawScheme.includes('FIX');
                      const isRegular = !isAuction && !isFixed && (rawScheme.includes('REG') || Boolean(c.scheme));
                      const isUnassigned = !isAuction && !isFixed && !isRegular;

                      const activeChit = c.chits?.[0];
                      const planLabel = c.interestedPlan || activeChit?.groupName || (isAuction ? 'Auction Scheme' : isFixed ? 'Fixed Plan' : isRegular ? 'Regular Scheme' : 'No Plan Allocated');

                      return (
                        <tr key={c.id} className="hover:bg-neutral-50/70 transition-colors">
                          {/* Customer */}
                          <td className="px-4 py-3">
                            <Link to={`/admin/customers/${c.id}`} className="font-bold text-primary-900 hover:text-primary-600 hover:underline transition-colors block text-sm">
                              {c.name}
                            </Link>
                            <div className="text-[11px] text-neutral-400 font-mono mt-0.5">{c.id}</div>
                          </td>

                          {/* Contact */}
                          <td className="px-4 py-3 text-neutral-700 font-medium whitespace-nowrap">
                            {c.phone || c.mobile || '—'}
                          </td>

                          {/* Chosen Plan / Scheme Column */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1 items-start">
                              {isAuction ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                                  <Gavel className="w-3 h-3 text-purple-700" />
                                  <span>Auction Scheme</span>
                                </span>
                              ) : isFixed ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                                  <Calendar className="w-3 h-3 text-emerald-700" />
                                  <span>Fixed Plan</span>
                                </span>
                              ) : isRegular ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-700" />
                                  <span>Regular Scheme</span>
                                </span>
                              ) : isUnassigned ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-300">
                                  <span>Unassigned</span>
                                </span>
                              ) : null}

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-neutral-600 font-medium truncate max-w-[170px]" title={planLabel}>
                                  {planLabel}
                                </span>
                                <button
                                  onClick={() => handleOpenAssignModal(c)}
                                  className="text-[10px] text-primary-700 hover:text-primary-900 font-bold underline hover:no-underline flex items-center gap-0.5"
                                  title="Change or allocate scheme"
                                >
                                  <Edit3 className="w-2.5 h-2.5" />
                                  <span>Edit</span>
                                </button>
                              </div>

                              {activeChit?.chitValue && (
                                <span className="text-[10px] text-neutral-400 font-semibold">
                                  Value: {formatCurrency(activeChit.chitValue)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Identity */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-[11px] text-neutral-800">Aadhar: {c.aadhar || '—'}</div>
                            <div className="text-[10px] text-neutral-400">PAN: {c.pan || '—'}</div>
                          </td>

                          {/* Branch / Agent */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-[11px] text-neutral-900 font-medium">{c.branch || 'Head Office'}</div>
                            <div className="text-[10px] text-neutral-400">{c.agent || 'System Admin'}</div>
                          </td>

                          {/* Pending Dues */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={c.pending > 0 ? "text-danger font-bold text-xs" : "text-success font-semibold text-xs"}>
                              {formatCurrency(c.pending || 0)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                              c.status === 'ACTIVE' 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : c.status === 'PENDING_APPROVAL'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                            }`}>
                              {c.status === 'INACTIVE' ? 'DEACTIVATED' : c.status}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleOpenAssignModal(c)}
                                className="p-1 text-neutral-400 hover:text-primary-700 transition-colors"
                                title="Assign or Change Plan"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <Link to={`/admin/customers/${c.id}`} className="p-1 text-neutral-400 hover:text-primary-900 transition-colors" title="View Profile">
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <button onClick={() => handleDeleteCustomer(c.id)} className="p-1 text-neutral-400 hover:text-danger transition-colors" title="Delete Customer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-neutral-400 bg-white">
                <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-neutral-700">No customers found</p>
                <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                  Try adjusting your search criteria or plan filter to find registered members.
                </p>
              </div>
            )}
          </div>

        {/* Modal: Assign / Change Plan for Customer */}
        {editingCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-150">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <span>Assign / Change Customer Plan</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For <strong>{editingCustomer.name}</strong> ({editingCustomer.id})
                  </p>
                </div>
                <button 
                  onClick={() => setEditingCustomer(null)} 
                  className="text-slate-400 hover:text-slate-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {saveSuccessMsg ? (
                <div className="py-8 text-center space-y-2">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">{saveSuccessMsg}</p>
                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  {/* Scheme Selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Chosen Chit Scheme *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setAssignScheme('Auction')}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          assignScheme === 'Auction'
                            ? 'bg-purple-50 border-purple-400 text-purple-900 ring-2 ring-purple-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Gavel className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                        <span>Auction</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignScheme('Fixed')}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          assignScheme === 'Fixed'
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Calendar className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                        <span>Fixed Plan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignScheme('Regular')}
                        className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                          assignScheme === 'Regular'
                            ? 'bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-300'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Clock className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                        <span>Regular</span>
                      </button>
                    </div>
                  </div>

                  {/* Group Name / Plan Name */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Chit Group / Plan Name
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Gold 10 or Diamond Series"
                      value={assignGroup}
                      onChange={(e) => setAssignGroup(e.target.value)}
                      list="availableGroupsList"
                    />
                    <datalist id="availableGroupsList">
                      {availableGroups.map((g: any) => (
                        <option key={g.id || g.name} value={g.name || g.id} />
                      ))}
                    </datalist>
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
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={assignChitValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignChitValue(val);
                          const m = Number(assignMonths) || 20;
                          if (val && m > 0) {
                            setAssignInstallment(Math.round(Number(val) / m).toString());
                          }
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Monthly Due (₹) *
                      </label>
                      <input
                        type="number"
                        className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        value={assignInstallment}
                        onChange={(e) => setAssignInstallment(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Duration (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                      value={assignMonths}
                      onChange={(e) => {
                        const m = e.target.value;
                        setAssignMonths(m);
                        const v = Number(assignChitValue) || 0;
                        if (v > 0 && Number(m) > 0) {
                          setAssignInstallment(Math.round(v / Number(m)).toString());
                        }
                      }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
                      onClick={() => setEditingCustomer(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-bold text-white bg-primary-900 hover:bg-primary-800 rounded-xl shadow-xs transition-colors"
                      onClick={handleSavePlan}
                    >
                      Save & Allocate Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
