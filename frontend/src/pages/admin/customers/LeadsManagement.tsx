import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  Phone, 
  Mail, 
  ArrowRight, 
  UserCheck, 
  Sparkles
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { 
  getStoredLeads, 
  updateLeadStatus, 
  onNotificationSync, 
  addSystemNotification,
  type WebsiteLead 
} from '../../../utils/notificationsData';
import { fetchClient } from '../../../api/client';
import { formatDate } from '../../../utils/format';
import { useNavigate } from 'react-router-dom';

export const LeadsManagement: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'NEW' | 'CONVERTED' | 'REJECTED'>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [convertingLeadId, setConvertingLeadId] = useState<string | null>(null);

  const loadData = () => {
    setLeads(getStoredLeads());
  };

  useEffect(() => {
    loadData();
    const unsub = onNotificationSync(loadData);
    return () => unsub();
  }, []);

  const handleConvertToCustomer = async (lead: WebsiteLead) => {
    setConvertingLeadId(lead.id);

    try {
      // 1. Generate unique customer code
      const nextId = `TC-${Math.floor(10000 + Math.random() * 90000)}`;

      // 2. Add to mockCustomers
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const newCustomer = {
        id: nextId,
        customerCode: nextId,
        name: lead.fullName,
        fullName: lead.fullName,
        mobile: lead.phone,
        phone: lead.phone,
        email: lead.email || '',
        address: 'Lead Inquirer (Landing Page Registration)',
        status: 'ACTIVE',
        kycStatus: 'VERIFIED',
        totalPaid: 0,
        pending: 0,
        chits: [],
        createdAt: new Date().toISOString()
      };

      const updatedCustomers = [newCustomer, ...customers.filter((c: any) => c.id !== nextId && c.mobile !== lead.phone)];
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));

      // 3. Post to backend MongoDB if online
      try {
        await fetchClient('/customers', {
          method: 'POST',
          body: JSON.stringify({
            customerCode: nextId,
            fullName: lead.fullName,
            phone: lead.phone,
            email: lead.email,
            address: 'Website Lead Conversion',
            status: 'ACTIVE'
          })
        });
      } catch (err) {
        console.warn('Backend customer lead post skipped/offline:', err);
      }

      // 4. Update lead status
      updateLeadStatus(lead.id, 'CONVERTED', nextId);

      // 5. Notify system
      addSystemNotification({
        type: 'NEW_REGISTRATION',
        title: 'Lead Converted to Active Member',
        message: `${lead.fullName} was enrolled as Customer ${nextId} from landing page inquiry.`,
        targetRole: 'ADMIN',
        metadata: {
          customerId: nextId,
          customerName: lead.fullName
        }
      });

      loadData();
      setActionSuccessMsg(`Success! ${lead.fullName} converted to Customer with ID: ${nextId}`);
      setTimeout(() => setActionSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Error converting lead to customer:', err);
      alert('Failed to convert lead. Please try again.');
    } finally {
      setConvertingLeadId(null);
    }
  };

  const handleRejectLead = (lead: WebsiteLead) => {
    updateLeadStatus(lead.id, 'REJECTED');
    loadData();
    setActionSuccessMsg(`Enquiry from ${lead.fullName} marked as Rejected.`);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Filter leads
  const filteredLeads = leads.filter(l => {
    if (filterStatus !== 'ALL' && l.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = l.fullName.toLowerCase().includes(q);
      const matchPhone = l.phone.includes(q);
      const matchEmail = (l.email || '').toLowerCase().includes(q);
      const matchPlan = (l.interestedPlan || '').toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchPlan;
    }
    return true;
  });

  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'NEW').length;
  const convertedCount = leads.filter(l => l.status === 'CONVERTED').length;
  const rejectedCount = leads.filter(l => l.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Landing Page CRM
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Website Leads & Enquiries
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Incoming prospect enquiries submitted via the landing page contact and scheme forms.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            onClick={() => navigate('/admin/customers')}
            className="text-xs font-semibold"
          >
            <Users className="w-4 h-4 mr-1.5" />
            Customer Directory
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate('/admin/customers/add')}
            className="text-xs font-semibold"
          >
            Manual Registration
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Enquiries</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalLeads}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">From landing page</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-xs text-amber-800 font-bold uppercase tracking-wider">New / Unprocessed</span>
          <p className="text-2xl font-black text-amber-700 mt-1">{newLeadsCount}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">Requires follow-up</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Converted Members</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{convertedCount}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">Active customers</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Rejected</span>
          <p className="text-2xl font-black text-slate-600 mt-1">{rejectedCount}</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Closed enquiries</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input 
              type="text"
              placeholder="Search by name, mobile, plan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {(['ALL', 'NEW', 'CONVERTED', 'REJECTED'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterStatus === status
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status === 'ALL' ? 'All Leads' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Leads Table */}
        <div className="overflow-x-auto">
          {filteredLeads.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">No enquiries found</p>
              <p className="text-xs text-slate-500 mt-0.5">Leads submitted through the landing page form will automatically show up here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Prospect Name & Contact</th>
                  <th className="py-3.5 px-4">Interested Chit Scheme</th>
                  <th className="py-3.5 px-4">Message / Notes</th>
                  <th className="py-3.5 px-4">Enquiry Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredLeads.map(lead => {
                  const isNew = lead.status === 'NEW';
                  const isConverted = lead.status === 'CONVERTED';
                  const isRejected = lead.status === 'REJECTED';

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-900 text-sm">{lead.fullName}</div>
                        <div className="flex items-center gap-2 mt-1 text-slate-500 text-[11px]">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" /> {lead.phone}
                          </span>
                          {lead.email && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400" /> {lead.email}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-semibold border border-blue-200/60 text-xs">
                          {lead.interestedPlan || 'General Plan'}
                        </span>
                      </td>

                      <td className="py-4 px-4 max-w-xs">
                        <p className="text-slate-600 line-clamp-2 text-xs" title={lead.message}>
                          {lead.message || '—'}
                        </p>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-slate-500 text-xs">
                        {lead.submittedAt ? formatDate(new Date(lead.submittedAt)) : '—'}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        {isNew && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            ● New Enquiry
                          </span>
                        )}
                        {isConverted && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Converted ({lead.convertedCustomerId})
                          </span>
                        )}
                        {isRejected && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        {isNew ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleRejectLead(lead)}
                              className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConvertToCustomer(lead)}
                              disabled={convertingLeadId === lead.id}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-sm flex items-center gap-1"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              {convertingLeadId === lead.id ? 'Converting...' : 'Convert to Customer'}
                            </button>
                          </div>
                        ) : isConverted ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/customers/${lead.convertedCustomerId}`)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-auto"
                          >
                            <span>View Customer Profile</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConvertToCustomer(lead)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                          >
                            Re-activate & Convert
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
