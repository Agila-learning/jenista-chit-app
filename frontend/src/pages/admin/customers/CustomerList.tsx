import { useState, useEffect } from 'react';
import { ActionLayout } from '../../../components/layout/ActionLayout';
import type { ActionType } from '../../../components/layout/ActionLayout';
import { Search, Eye, Trash2 } from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/format';
import { Link } from 'react-router-dom';
import { fetchClient } from '../../../api/client';
import { isMockCustomer } from '../../../utils/cleanMockData';

export const CustomerList = () => {
  const [searchName, setSearchName] = useState('');
  const [searchMobile, setSearchMobile] = useState('');
  const [searchAadhar, setSearchAadhar] = useState('');
  const [searchPan, setSearchPan] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);

  // Customer data loaded from MongoDB API + localStorage
  const [allCustomers, setAllCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem('mockCustomers');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((p: any) => !isMockCustomer(p)) : [];
    }
    return [];
  });

  useEffect(() => {
    const loadMongoCustomers = async () => {
      try {
        const res = await fetchClient('/customers');
        if (res && res.data && Array.isArray(res.data)) {
          const localSaved = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
          const mapped = res.data.map((c: any) => {
            const local = localSaved.find((lc: any) => 
              lc.id === (c.customerCode || c._id) || 
              lc.mongoId === c._id || 
              (lc.phone && (lc.phone === c.phone || lc.mobile === c.phone))
            );
            const chits = (c.chits && c.chits.length > 0) ? c.chits : (local?.chits || []);
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
              status: c.status || 'ACTIVE'
            };
          });
          const cleanMapped = mapped.filter((c: any) => !isMockCustomer(c));
          const localOnly = localSaved.filter((lc: any) => 
            !isMockCustomer(lc) &&
            !res.data.some((item: any) => 
              (item._id && lc.mongoId === item._id) || 
              (item.customerCode && lc.id === item.customerCode) ||
              (item.phone && (lc.mobile === item.phone || lc.phone === item.phone))
            )
          );
          const combined = [...cleanMapped, ...localOnly];
          setAllCustomers(combined);
          setFilteredCustomers(combined);
          setHasSearched(true);
          localStorage.setItem('mockCustomers', JSON.stringify(combined));
        }
      } catch (err) {
        console.warn('Could not fetch customers from backend:', err);
      }
    };
    loadMongoCustomers();
  }, []);

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      const updatedCustomers = allCustomers.filter((c: any) => c.id !== id);
      setAllCustomers(updatedCustomers);
      
      const saved = localStorage.getItem('mockCustomers');
      if (saved) {
        const parsed = JSON.parse(saved);
        const newStorage = parsed.filter((c: any) => c.id !== id);
        localStorage.setItem('mockCustomers', JSON.stringify(newStorage));
      }
      
      setFilteredCustomers(prev => prev.filter((c: any) => c.id !== id));
    }
  };

  const handleSearch = () => {
    // If all fields are empty, show all customers
    if (!searchName && !searchMobile && !searchAadhar && !searchPan) {
      setFilteredCustomers(allCustomers);
      setHasSearched(true);
      return;
    }

    const results = allCustomers.filter((c: any) => {
      const matchName = searchName ? c.name.toLowerCase().includes(searchName.toLowerCase()) : true;
      const matchMobile = searchMobile ? c.phone.includes(searchMobile) : true;
      const matchAadhar = searchAadhar ? c.aadhar.replace(/\s/g, '').includes(searchAadhar.replace(/\s/g, '')) : true;
      const matchPan = searchPan ? c.pan.toLowerCase().includes(searchPan.toLowerCase()) : true;
      
      return matchName && matchMobile && matchAadhar && matchPan;
    });

    setFilteredCustomers(results);
    setHasSearched(true);
  };

  const handleClear = () => {
    setSearchName('');
    setSearchMobile('');
    setSearchAadhar('');
    setSearchPan('');
    setHasSearched(false);
    setFilteredCustomers([]);
  };

  const renderContent = (action: ActionType) => {
    const isViewActive = action === 'VIEW';

    return (
      <div className="flex justify-center w-full">
        <div className="w-full max-w-5xl space-y-6">
          <div className="card p-0 overflow-hidden bg-white border border-neutral-200">
            <div className="p-8 border-b border-neutral-200 bg-white flex justify-center">
              <div className="w-full max-w-lg">
                <h3 className="text-lg font-bold text-neutral-800 mb-6 text-center">Search Customer Details</h3>
                
                <div className="flex flex-col gap-4">
                  {/* Name */}
                  <div className={`flex border rounded-md overflow-hidden transition-all ${isViewActive ? 'border-neutral-300 focus-within:ring-1 focus-within:ring-primary-900 focus-within:border-primary-900' : 'border-neutral-200 opacity-70'}`}>
                    <div className="bg-neutral-100 px-4 py-2.5 flex items-center border-r border-neutral-200 w-36 text-sm font-semibold text-neutral-700 shrink-0">
                      Name
                    </div>
                    <div className="flex-1 relative flex items-center bg-white">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className={`h-4 w-4 ${isViewActive ? 'text-neutral-400' : 'text-neutral-300'}`} />
                      </div>
                      <input 
                        disabled={!isViewActive}
                        className="w-full pl-9 pr-3 py-2.5 text-sm outline-none bg-transparent disabled:cursor-not-allowed" 
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Mobile Number */}
                  <div className={`flex border rounded-md overflow-hidden transition-all ${isViewActive ? 'border-neutral-300 focus-within:ring-1 focus-within:ring-primary-900 focus-within:border-primary-900' : 'border-neutral-200 opacity-70'}`}>
                    <div className="bg-neutral-100 px-4 py-2.5 flex items-center border-r border-neutral-200 w-36 text-sm font-semibold text-neutral-700 shrink-0">
                      Mobile Number
                    </div>
                    <input 
                      disabled={!isViewActive}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-white disabled:bg-neutral-50 disabled:cursor-not-allowed"
                      value={searchMobile}
                      onChange={(e) => setSearchMobile(e.target.value)}
                    />
                  </div>

                  {/* Aadhar Number */}
                  <div className={`flex border rounded-md overflow-hidden transition-all ${isViewActive ? 'border-neutral-300 focus-within:ring-1 focus-within:ring-primary-900 focus-within:border-primary-900' : 'border-neutral-200 opacity-70'}`}>
                    <div className="bg-neutral-100 px-4 py-2.5 flex items-center border-r border-neutral-200 w-36 text-sm font-semibold text-neutral-700 shrink-0">
                      Aadhar Number
                    </div>
                    <input 
                      disabled={!isViewActive}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-white disabled:bg-neutral-50 disabled:cursor-not-allowed"
                      value={searchAadhar}
                      onChange={(e) => setSearchAadhar(e.target.value)}
                    />
                  </div>

                  {/* PAN Number */}
                  <div className={`flex border rounded-md overflow-hidden transition-all ${isViewActive ? 'border-neutral-300 focus-within:ring-1 focus-within:ring-primary-900 focus-within:border-primary-900' : 'border-neutral-200 opacity-70'}`}>
                    <div className="bg-neutral-100 px-4 py-2.5 flex items-center border-r border-neutral-200 w-36 text-sm font-semibold text-neutral-700 shrink-0">
                      PAN Number
                    </div>
                    <input 
                      disabled={!isViewActive}
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-white disabled:bg-neutral-50 disabled:cursor-not-allowed"
                      value={searchPan}
                      onChange={(e) => setSearchPan(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-8">
                  <Button 
                    variant={isViewActive ? "primary" : "secondary"} 
                    className="w-48" 
                    onClick={handleSearch}
                    disabled={!isViewActive}
                  >
                    Search
                  </Button>
                </div>
              </div>
            </div>

            {isViewActive && hasSearched && (
              filteredCustomers.length > 0 ? (
                <div className="overflow-x-auto min-h-[300px] bg-white">
                  <table className="min-w-full divide-y divide-neutral-200">
                    <thead>
                      <tr>
                        <th className="table-header text-center">Customer</th>
                        <th className="table-header text-center">Contact</th>
                        <th className="table-header text-center">Identity</th>
                        <th className="table-header text-center">Branch / Agent</th>
                        <th className="table-header text-center">Pending Dues</th>
                        <th className="table-header text-center">Status</th>
                        <th className="table-header text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-neutral-200 text-center">
                      {filteredCustomers.map((c) => (
                        <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                          <td className="table-cell">
                            <Link to={`/admin/customers/${c.id}`} className="font-medium text-primary-900 hover:text-primary-600 hover:underline transition-colors block">
                              {c.name}
                            </Link>
                            <div className="text-xs text-neutral-500">{c.id}</div>
                          </td>
                          <td className="table-cell text-neutral-600">{c.phone}</td>
                          <td className="table-cell">
                            <div className="text-xs text-neutral-900">Aadhar: {c.aadhar}</div>
                            <div className="text-xs text-neutral-500">PAN: {c.pan}</div>
                          </td>
                          <td className="table-cell">
                            <div className="text-neutral-900">{c.branch}</div>
                            <div className="text-xs text-neutral-500">{c.agent}</div>
                          </td>
                          <td className="table-cell">
                            <span className={c.pending > 0 ? "text-danger font-medium" : "text-success font-medium"}>
                              {formatCurrency(c.pending)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              c.status === 'ACTIVE' 
                                ? 'bg-success-light text-success border border-emerald-200' 
                                : c.status === 'PENDING_APPROVAL'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-danger-light text-danger border border-danger/30'
                            }`}>
                              {c.status === 'INACTIVE' ? 'DEACTIVATED' : c.status}
                            </span>
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center justify-center space-x-3">
                              <Link to={`/admin/customers/${c.id}`} className="text-neutral-400 hover:text-primary-900 transition-colors" title="View Profile">
                                <Eye className="w-4 h-4" />
                              </Link>
                              <button onClick={() => handleDeleteCustomer(c.id)} className="text-neutral-400 hover:text-danger transition-colors" title="Delete Customer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-neutral-400 bg-white">
                  <p className="text-sm font-medium">No customers found matching the search criteria.</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ActionLayout 
      title="Customer Details"
      allowedActions={['VIEW']}
      renderContent={renderContent}
      onClear={handleClear}
      onCancel={handleClear}
    />
  );
};
