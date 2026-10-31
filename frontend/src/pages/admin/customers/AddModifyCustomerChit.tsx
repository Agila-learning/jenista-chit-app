import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, UserCheck } from 'lucide-react';
import { fetchClient } from '../../../api/client';
import { isMockGroup } from '../../../utils/cleanMockData';

export const AddModifyCustomerChit = () => {
  const [pendingCustomers, setPendingCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loadPendingCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch directly from MongoDB backend
      const res = await fetchClient('/customers?status=PENDING_APPROVAL');
      if (res && res.data && Array.isArray(res.data)) {
        const saved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        const mongoCustomers = res.data.map((c: any) => {
          const local = saved.find((lc: any) => 
            lc.id === (c.customerCode || c._id) || 
            lc.mongoId === c._id || 
            (lc.mobile && (lc.mobile === c.phone || lc.phone === c.phone))
          );
          return {
            id: c.customerCode || c._id,
            mongoId: c._id,
            name: c.fullName || c.name,
            mobile: c.phone || c.mobile,
            phone: c.phone || c.mobile,
            address: c.address,
            status: c.status,
            referredBy: c.referredBy || local?.referredBy || null,
            scheme: c.scheme || local?.scheme || 'Regular',
            interestedPlan: c.interestedPlan || local?.interestedPlan,
            chits: (c.chits && c.chits.length > 0) ? c.chits : (local?.chits || [])
          };
        });
        setPendingCustomers(mongoCustomers);
        
        // Also sync local storage mockCustomers without stripping fields
        const nonPendingLocal = saved.filter((s: any) => s.status !== 'PENDING_APPROVAL');
        const updatedStorage = [...nonPendingLocal, ...mongoCustomers];
        localStorage.setItem('mockCustomers', JSON.stringify(updatedStorage));
        return;
      }
    } catch (e) {
      console.warn('API error fetching pending customers, reading fallback:', e);
    } finally {
      setIsLoading(false);
    }

    // Fallback to localStorage
    const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
    setPendingCustomers(customers.filter((c: any) => c.status === 'PENDING_APPROVAL'));
  };

  useEffect(() => {
    loadPendingCustomers();
  }, []);

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const handleApprove = async (id: string, mongoId?: string) => {
    try {
      // 1. Cross-reference with website leads to extract chosen plan / scheme
      const storedLeads = JSON.parse(localStorage.getItem('websiteLeads') || '[]');
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');

      const targetCustomer = customers.find((c: any) => 
        c.id === id || c.mongoId === mongoId || c.customerCode === id
      );

      const targetPhone = (targetCustomer?.mobile || targetCustomer?.phone || '').replace(/\D/g, '');
      const targetName = (targetCustomer?.name || targetCustomer?.fullName || '').trim().toLowerCase();

      let matchedLead = storedLeads.find((l: any) => {
        const lPhone = (l.phone || '').replace(/\D/g, '');
        const lName = (l.fullName || '').trim().toLowerCase();
        return (targetPhone && lPhone && targetPhone === lPhone) || (targetName && lName && targetName === lName);
      });

      let chosenScheme: 'Auction' | 'Fixed' | 'Regular' = targetCustomer?.scheme || 'Regular';
      let planName = targetCustomer?.interestedPlan || `${chosenScheme} Scheme`;

      if (matchedLead) {
        const rawP = matchedLead.interestedPlan || '';
        if (rawP.toLowerCase().includes('fix')) chosenScheme = 'Fixed';
        else if (rawP.toLowerCase().includes('reg')) chosenScheme = 'Regular';
        else if (rawP.toLowerCase().includes('auc')) chosenScheme = 'Auction';
        planName = matchedLead.interestedPlan || `${chosenScheme} Scheme`;

        // Mark lead as converted
        matchedLead.status = 'CONVERTED';
        matchedLead.convertedCustomerId = id;
        localStorage.setItem('websiteLeads', JSON.stringify(storedLeads));
      }

      // 2. Resolve target group from customer request or active Admin-created groups
      const diskGroups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
      const cleanGroups = diskGroups.filter((g: any) => !isMockGroup(g));

      const targetGroupId = targetCustomer?.requestedGroupId || targetCustomer?.chits?.[0]?.groupId;
      let targetGroup = cleanGroups.find((g: any) => g.id === targetGroupId || g.name === targetGroupId || g.code === targetGroupId);
      if (!targetGroup && cleanGroups.length > 0) {
        targetGroup = cleanGroups[0];
      }

      const now = new Date();
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
      const monthJoined = targetCustomer?.monthJoined || now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      const paymentStartsMonth = targetCustomer?.paymentStartsMonth || nextMonthDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

      let assignedTicket = targetCustomer?.chits?.[0]?.ticketNumber || '1';
      if (targetGroup) {
        const existingMembers = Array.isArray(targetGroup.enrolledMembers) ? targetGroup.enrolledMembers : [];
        const cleanPhone = (targetCustomer?.mobile || targetCustomer?.phone || '').replace(/\D/g, '');
        const alreadyEnrolled = existingMembers.some((m: any) => 
          m.customerId === id || (cleanPhone && (m.mobile || m.phone || '').replace(/\D/g, '') === cleanPhone)
        );

        if (!alreadyEnrolled) {
          assignedTicket = `#0${existingMembers.length + 1}`;
          const newMember = {
            customerId: id,
            customerName: targetCustomer?.name || targetCustomer?.fullName,
            mobile: targetCustomer?.mobile || targetCustomer?.phone,
            phone: targetCustomer?.mobile || targetCustomer?.phone,
            ticketNumber: assignedTicket,
            scheme: targetGroup.scheme || chosenScheme || 'Regular',
            chitValue: targetGroup.value,
            monthlyInstallment: Math.round(Number(targetGroup.value) / Number(targetGroup.duration || 20)),
            monthJoined,
            paymentStartsMonth,
            joiningDate: targetCustomer?.joiningDate || now.toISOString(),
            dueDate: nextMonthDate.toISOString().split('T')[0],
            paymentStatus: 'DUE',
            status: 'Active'
          };

          const updatedEnrolled = [...existingMembers, newMember];
          const updatedGroups = diskGroups.map((g: any) => {
            if (g.id === targetGroup.id || g.name === targetGroup.name) {
              return {
                ...g,
                enrolledMembers: updatedEnrolled,
                filled: updatedEnrolled.length
              };
            }
            return g;
          });

          localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));

          // Update chitGroupMemberships
          const diskMemberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
          const updatedMemberships = [
            ...diskMemberships.filter((m: any) => !(m.customerId === id && m.groupId === targetGroup.id)),
            {
              customerId: id,
              customerName: targetCustomer?.name || targetCustomer?.fullName,
              mobile: targetCustomer?.mobile || targetCustomer?.phone,
              phone: targetCustomer?.mobile || targetCustomer?.phone,
              groupId: targetGroup.id,
              groupName: targetGroup.name,
              ticketNumber: assignedTicket,
              scheme: targetGroup.scheme || chosenScheme || 'Regular',
              chitValue: targetGroup.value,
              monthlyInstallment: Math.round(Number(targetGroup.value) / Number(targetGroup.duration || 20)),
              monthJoined,
              paymentStartsMonth,
              joiningDate: targetCustomer?.joiningDate || now.toISOString(),
              dueDate: nextMonthDate.toISOString().split('T')[0],
              paymentStatus: 'DUE'
            }
          ];
          localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));
        }
      }

      // 3. Update customer in mockCustomers with active scheme, confirmed group, and next month payment start
      const updated = customers.map((c: any) => {
        if (c.id === id || c.mongoId === mongoId || c.customerCode === id) {
          const hasExistingValidChit = Array.isArray(c.chits) && c.chits.length > 0 && c.chits[0].groupId !== 'PENDING';
          const assignedChits = hasExistingValidChit ? c.chits : (
            targetGroup ? [{
              groupId: targetGroup.id,
              groupName: targetGroup.name,
              scheme: targetGroup.scheme || chosenScheme || 'Regular',
              chitValue: Number(targetGroup.value || 100000),
              monthlyInstallment: Math.round(Number(targetGroup.value || 100000) / Number(targetGroup.duration || 20)),
              duration: Number(targetGroup.duration || 20),
              months: Number(targetGroup.duration || 20),
              ticketNumber: assignedTicket,
              paymentStatus: 'DUE',
              joiningDate: c.joiningDate || now.toISOString(),
              monthJoined,
              paymentStartsMonth,
              dueDate: nextMonthDate.toISOString().split('T')[0],
              installmentsPaid: 0
            }] : []
          );

          return {
            ...c,
            status: 'ACTIVE',
            kycStatus: 'VERIFIED',
            scheme: chosenScheme,
            interestedPlan: targetGroup?.name || planName,
            monthJoined,
            paymentStartsMonth,
            chits: assignedChits
          };
        }
        return c;
      });

      localStorage.setItem('mockCustomers', JSON.stringify(updated));
      setPendingCustomers(prev => prev.filter(c => c.id !== id && c.mongoId !== mongoId));

      // 3. Broadcast storage event so Topbar and Sidebar badges decrement immediately
      window.dispatchEvent(new Event('storage'));

      // 4. Post to backend
      const targetId = mongoId || id;
      await fetchClient(`/customers/${targetId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ 
          status: 'ACTIVE', 
          kycStatus: 'VERIFIED',
          scheme: chosenScheme,
          interestedPlan: planName
        }),
      });
    } catch (e) {
      console.warn('Failed to update status on server:', e);
    }

    setToastMsg(`Customer approved and activated successfully!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleReject = async (id: string, mongoId?: string) => {
    try {
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updated = customers.map((c: any) => 
        (c.id === id || c.mongoId === mongoId || c.customerCode === id) 
          ? { ...c, status: 'REJECTED' } 
          : c
      );
      localStorage.setItem('mockCustomers', JSON.stringify(updated));
      setPendingCustomers(prev => prev.filter(c => c.id !== id && c.mongoId !== mongoId));
      window.dispatchEvent(new Event('storage'));

      const targetId = mongoId || id;
      await fetchClient(`/customers/${targetId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'REJECTED' }),
      });
    } catch (e) {
      console.warn('Failed to update status on server:', e);
    }

    setToastMsg(`Customer registration marked as Rejected.`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const filtered = pendingCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.mobile.includes(searchQuery)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">Customer Approvals</h1>
          <p className="text-sm text-neutral-500 mt-1">Review and approve new customer registrations.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text"
              placeholder="Search pending..."
              className="pl-9 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-64 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMsg}</span>
          </div>
          <button 
            onClick={() => setToastMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-neutral-500 text-sm">Loading pending approvals...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
              <UserCheck className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 mb-1">No pending approvals</h3>
            <p className="text-neutral-500 text-sm max-w-sm">All customer registrations have been reviewed. There are no new requests at this time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Customer Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Mobile Number</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Registration ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-neutral-500 uppercase tracking-wider">Referred By</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-neutral-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-100">
                {filtered.map(customer => (
                  <tr key={customer.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary-900">{customer.name}</div>
                    </td>
                    <td className="px-6 py-4 text-neutral-600 font-medium">
                      {customer.mobile}
                    </td>
                    <td className="px-6 py-4 text-neutral-500 font-mono text-sm">
                      {customer.id}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 font-medium">
                      {customer.referredBy ? <span className="text-primary-600">{customer.referredBy}</span> : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button 
                        onClick={() => handleReject(customer.id, customer.mongoId)}
                        className="inline-flex items-center text-sm font-medium text-danger hover:text-danger-dark transition-colors px-3 py-1.5 rounded-md hover:bg-danger-light/50"
                      >
                        <XCircle className="w-4 h-4 mr-1.5" /> Reject
                      </button>
                      <button 
                        onClick={() => handleApprove(customer.id, customer.mongoId)}
                        className="inline-flex items-center text-sm font-medium text-success hover:text-success-dark transition-colors px-3 py-1.5 rounded-md bg-success-light/50 hover:bg-success-light"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
