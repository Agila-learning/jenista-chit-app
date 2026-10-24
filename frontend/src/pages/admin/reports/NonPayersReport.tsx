import { useState, useEffect } from 'react';
import { FileText, Download, Filter, Search, AlertCircle, Phone } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { isMockGroup, isMockCustomer } from '../../../utils/cleanMockData';

export const NonPayersReport = () => {
  const [nonPayers, setNonPayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [groups, setGroups] = useState<any[]>([]);

  useEffect(() => {
    // 1. Load data
    const allGroups = (JSON.parse(localStorage.getItem('mockChitGroups') || '[]')).filter((g: any) => !isMockGroup(g));
    const customers = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((c: any) => !isMockCustomer(c));
    const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');

    setGroups(allGroups);

    const nonPayersList: any[] = [];

    // 2. Identify Non-Payers
    allGroups.forEach((group: any) => {
      const groupId = group.id || group.code;
      const chitValue = Number(group.chitValue || group.value || 0);
      const members = Number(group.members || 0);
      const installmentAmt = members > 0 ? chitValue / members : 0;

      // Find all members in this group
      customers.forEach((cust: any) => {
        if (cust.chits) {
          cust.chits.forEach((chit: any) => {
            if (chit.groupId === groupId) {
              // Check if they paid
              const hasPaid = ledger.some((t: any) => 
                (t.type === 'CREDIT' || t.category === 'INSTALLMENT') && 
                ((t.reference?.includes(cust.id) || t.reference?.includes(cust.name) || t.description?.includes(cust.name) || t.description?.includes(cust.id) || t.customerName === cust.name || t.customerId === cust.id) &&
                (t.reference?.includes(groupId) || t.description?.includes(groupId) || t.groupId === groupId))
              );

              if (!hasPaid) {
                nonPayersList.push({
                  customerId: cust.id,
                  customerName: cust.name,
                  mobile: cust.mobile || cust.phone || '+91 9999999999',
                  groupId: groupId,
                  groupName: group.name,
                  ticketNumber: chit.ticketNumber,
                  amountDue: installmentAmt,
                });
              }
            }
          });
        }
      });
    });

    setNonPayers(nonPayersList);
  }, []);

  const filteredData = nonPayers.filter(p => {
    const matchesSearch = p.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || p.customerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = groupFilter ? p.groupId === groupFilter : true;
    return matchesSearch && matchesGroup;
  });

  const totalAmountPending = filteredData.reduce((sum, item) => sum + item.amountDue, 0);

  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("No data to export");
      return;
    }
    
    const headers = ['Customer Name', 'Customer ID', 'Mobile', 'Group Name', 'Group ID', 'Ticket Number', 'Amount Due (INR)'];
    const rows = filteredData.map(item => [
      `"${item.customerName}"`,
      `"${item.customerId}"`,
      `"${item.mobile}"`,
      `"${item.groupName}"`,
      `"${item.groupId}"`,
      `"${item.ticketNumber}"`,
      item.amountDue
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Non_Payers_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">Non-Payers Report</h1>
          <p className="text-sm text-neutral-500">Track pending installments across all active chit groups.</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 text-neutral-700 rounded-lg shadow-sm hover:bg-neutral-50 hover:text-primary-900 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-bold">Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl border border-danger border-opacity-20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertCircle className="w-16 h-16 text-danger" />
          </div>
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Total Defaulters</p>
          <p className="text-3xl font-black text-danger">{filteredData.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-danger border-opacity-20 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <FileText className="w-16 h-16 text-danger" />
          </div>
          <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-2">Total Outstanding Amount</p>
          <p className="text-3xl font-black text-danger">{formatCurrency(totalAmountPending)}</p>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Filters */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search customer..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-neutral-400" />
            <select 
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:border-primary-500"
            >
              <option value="">All Chit Groups</option>
              {groups.map(g => (
                <option key={g.id || g.code} value={g.id || g.code}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
              <tr>
                <th className="p-4">Customer</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Chit Group</th>
                <th className="p-4">Ticket</th>
                <th className="p-4 text-right">Amount Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-neutral-400">
                    No non-payers found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-neutral-900">{item.customerName}</div>
                      <div className="text-xs text-neutral-500 font-mono">{item.customerId}</div>
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2 text-neutral-700">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        {item.mobile}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-primary-900">{item.groupName}</div>
                      <div className="text-xs text-neutral-500 font-mono">{item.groupId}</div>
                    </td>
                    <td className="p-4 font-bold text-neutral-700">#{item.ticketNumber}</td>
                    <td className="p-4 text-right font-bold text-danger">
                      {formatCurrency(item.amountDue)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};
