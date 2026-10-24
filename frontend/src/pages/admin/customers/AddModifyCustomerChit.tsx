import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Search, UserCheck } from 'lucide-react';
import { fetchClient } from '../../../api/client';

export const AddModifyCustomerChit = () => {
  const [pendingCustomers, setPendingCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPendingCustomers();
  }, []);

  const loadPendingCustomers = async () => {
    setIsLoading(true);
    try {
      // Fetch directly from MongoDB backend
      const res = await fetchClient('/customers?status=PENDING_APPROVAL');
      if (res && res.data && Array.isArray(res.data)) {
        const mongoCustomers = res.data.map((c: any) => ({
          id: c.customerCode || c._id,
          mongoId: c._id,
          name: c.fullName || c.name,
          mobile: c.phone || c.mobile,
          address: c.address,
          status: c.status,
          referredBy: c.referredBy || null,
        }));
        setPendingCustomers(mongoCustomers);
        
        // Also sync local storage mockCustomers for any offline usage
        const saved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
        const updatedStorage = [...saved.filter((s: any) => s.status !== 'PENDING_APPROVAL'), ...mongoCustomers];
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

  const handleApprove = async (id: string, mongoId?: string) => {
    if (window.confirm('Are you sure you want to approve this customer registration?')) {
      try {
        await fetchClient(`/customers/${mongoId || id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'ACTIVE' }),
        });
      } catch (e) {
        console.warn('Failed to update status on server:', e);
      }

      // Update in local cache
      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updated = customers.map((c: any) => (c.id === id || c.mongoId === mongoId) ? { ...c, status: 'ACTIVE' } : c);
      localStorage.setItem('mockCustomers', JSON.stringify(updated));
      await loadPendingCustomers();
    }
  };

  const handleReject = async (id: string, mongoId?: string) => {
    if (window.confirm('Are you sure you want to reject this registration? The customer will not be able to log in.')) {
      try {
        await fetchClient(`/customers/${mongoId || id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'REJECTED' }),
        });
      } catch (e) {
        console.warn('Failed to update status on server:', e);
      }

      const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updated = customers.map((c: any) => (c.id === id || c.mongoId === mongoId) ? { ...c, status: 'REJECTED' } : c);
      localStorage.setItem('mockCustomers', JSON.stringify(updated));
      await loadPendingCustomers();
    }
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
