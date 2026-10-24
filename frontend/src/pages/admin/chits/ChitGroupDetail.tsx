import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { formatCurrency } from '../../../utils/format';
import { Layers, Gavel, Calendar, Users, Target, AlertCircle, Landmark } from 'lucide-react';
import { resolveBankForPayment } from '../../../utils/bankAccountsData';
import { isMockGroup, isMockCustomer } from '../../../utils/cleanMockData';

export const ChitGroupDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [group, setGroup] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem('mockChitGroups');
    if (saved) {
      try {
        const groups = JSON.parse(saved);
        const found = groups.find((g: any) => (g.id || g.code) === id && !isMockGroup(g));
        setGroup(found || null);
      } catch {
        setGroup(null);
      }
    }
  }, [id]);

  const isAuction = group?.type === 'AUCTION';

  // Dynamically compute tabs based on group type
  const tabs = [
    { id: 'overview', name: 'Overview & Health' },
    { id: 'members', name: 'Members & Allocations' },
    ...(isAuction ? [{ id: 'auctions', name: 'Auction History' }] : []),
    { id: 'ledger', name: 'Group Ledger' },
  ];

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center text-sm text-neutral-500">
          <Link to="/admin/chit-groups" className="hover:text-primary-900 transition-colors">Chit Groups</Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900 font-medium">{id}</span>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center text-neutral-400 bg-white rounded-xl border border-neutral-200">
          <AlertCircle className="w-12 h-12 mb-4 opacity-40" />
          <p className="font-bold text-lg text-neutral-600">Group Not Found</p>
          <p className="text-sm mt-1">No chit group with ID <span className="font-mono font-bold">{id}</span> exists.</p>
          <Link to="/admin/chit-groups" className="mt-6 px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-semibold hover:bg-primary-800 transition-colors">
            Back to Chit Groups
          </Link>
        </div>
      </div>
    );
  }

  const chitValue = Number(group.chitValue || group.value || 0);
  const members = Number(group.members || 0);
  const filled = Number(group.filled || 0);
  const duration = Number(group.duration || 0);
  const currentMonth = Number(group.currentMonth || 0);
  const installmentPerMember = members > 0 ? chitValue / members : 0;
  const totalExpected = installmentPerMember * members;

  // Global data fetches for metrics and members tab
  const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
  const customers = (JSON.parse(localStorage.getItem('mockCustomers') || '[]')).filter((c: any) => !isMockCustomer(c));

  const groupMembers: any[] = [];
  const targetGroupId = group.id || group.code;

  // 1. Direct enrolledMembers on group
  if (Array.isArray(group.enrolledMembers)) {
    group.enrolledMembers.forEach((m: any) => {
      if (isMockCustomer(m)) return;
      const custName = m.customerName || 'Customer';
      groupMembers.push({
        ...m,
        customerName: custName,
        customerImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=6366f1&color=fff&size=150`
      });
    });
  }

  // 2. Members from chitGroupMemberships
  const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
  memberships.forEach((m: any) => {
    if (isMockCustomer({ id: m.customerId, name: m.customerName })) return;
    if (m.groupId === targetGroupId || m.groupName === group.name) {
      if (!groupMembers.some(existing => existing.ticketNumber === m.ticketNumber || (existing.customerId && existing.customerId === m.customerId))) {
        const custName = m.customerName || 'Customer';
        groupMembers.push({
          ...m,
          customerName: custName,
          customerImage: `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=6366f1&color=fff&size=150`
        });
      }
    }
  });

  // 3. Members from customers list
  customers.forEach((cust: any) => {
    if (isMockCustomer(cust)) return;
    if (cust.chits) {
      cust.chits.forEach((chit: any) => {
        if (chit.groupId === targetGroupId || chit.groupName === group.name) {
          const custName = chit.customerName || cust.name || cust.fullName || 'Customer';
          const existingIdx = groupMembers.findIndex(m => m.ticketNumber === chit.ticketNumber || (m.customerId && m.customerId === cust.id));
          const memberData = {
            ...chit,
            customerName: custName,
            customerId: cust.id,
            customerImage: cust.photoPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(custName)}&background=6366f1&color=fff&size=150`
          };
          if (existingIdx === -1) {
            groupMembers.push(memberData);
          } else {
            groupMembers[existingIdx] = { ...groupMembers[existingIdx], ...memberData };
          }
        }
      });
    }
  });

  groupMembers.sort((a, b) => Number(a.ticketNumber) - Number(b.ticketNumber));

  const paidMembersCount = groupMembers.filter((m) => {
    return ledger.some((t: any) =>
      (t.type === 'CREDIT' || t.category === 'INSTALLMENT') &&
      ((t.reference?.includes(m.customerId) || t.reference?.includes(m.customerName) || t.description?.includes(m.customerName) || t.description?.includes(m.customerId) || t.customerName === m.customerName || t.customerId === m.customerId) &&
        (t.reference?.includes(m.groupId) || t.description?.includes(m.groupId) || t.groupId === m.groupId))
    );
  }).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center text-sm text-neutral-500">
        <Link to="/admin/chit-groups" className="hover:text-primary-900 transition-colors">Chit Groups</Link>
        <span className="mx-2">/</span>
        <span className="text-neutral-900 font-medium">{group.id || group.code}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-primary-900 rounded-lg p-6 sm:p-8 text-white relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 flex items-center space-x-4">
          <div className="p-3 bg-primary-800 rounded-lg border border-primary-700">
            <Layers className="w-8 h-8 text-accent" />
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{group.name}</h1>
              <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm ${group.status === 'ACTIVE' ? 'bg-success text-white' : 'bg-accent text-primary-900'
                }`}>{group.status || 'FORMATION'}</span>
            </div>
            <p className="text-primary-200 font-medium">
              {group.id || group.code} • {isAuction ? 'Registered Auction Plan' : 'Fixed Collection Plan'}
            </p>
          </div>
        </div>

        <div className="relative z-10 flex gap-3 w-full md:w-auto">
          <Button variant="secondary" className="bg-primary-800 text-white border-primary-700 hover:bg-primary-700 w-full md:w-auto">
            Manage Members
          </Button>
          {isAuction ? (
            <Button variant="accent" className="w-full md:w-auto">
              <Gavel className="w-4 h-4 mr-2" /> Start Auction
            </Button>
          ) : (
            <Button variant="accent" className="w-full md:w-auto">
              <Target className="w-4 h-4 mr-2" /> Collect Installment
            </Button>
          )}
        </div>

        {/* Decorative Graphic */}
        <div className="absolute right-0 top-0 w-64 h-full opacity-10 pointer-events-none hidden md:block">
          <svg viewBox="0 0 100 100" className="w-full h-full fill-current">
            <circle cx="50" cy="50" r="40" />
          </svg>
        </div>
      </div>

      {/* Core Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-l-accent flex items-center space-x-4">
          <Target className="w-8 h-8 text-neutral-300 hidden sm:block" />
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Chit Value</p>
            <h3 className="text-xl font-bold text-primary-900">{formatCurrency(chitValue)}</h3>
          </div>
        </div>
        <div className="card p-4 flex items-center space-x-4">
          <Calendar className="w-8 h-8 text-neutral-300 hidden sm:block" />
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Cycle / Duration</p>
            <h3 className="text-xl font-bold text-primary-900">
              Month {currentMonth} <span className="text-sm font-normal text-neutral-400">/ {duration}</span>
            </h3>
          </div>
        </div>
        <div className="card p-4 flex items-center space-x-4">
          <Users className="w-8 h-8 text-neutral-300 hidden sm:block" />
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Total Members</p>
            <h3 className="text-xl font-bold text-primary-900">
              {filled} / {members}{' '}
              <span className={`text-sm font-normal ${filled >= members ? 'text-success' : 'text-amber-500'}`}>
                {filled >= members ? 'Filled' : 'Open'}
              </span>
            </h3>
          </div>
        </div>
        <div className="card p-4 flex items-center space-x-4">
          {isAuction ? <Gavel className="w-8 h-8 text-neutral-300 hidden sm:block" /> : <Target className="w-8 h-8 text-neutral-300 hidden sm:block" />}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
              {isAuction ? 'Installment / Member' : 'Monthly Installment'}
            </p>
            <h3 className="text-xl font-bold text-primary-900">{formatCurrency(installmentPerMember)}</h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="card p-0">
        <div className="bg-white border-b border-neutral-200 flex overflow-x-auto scrollbar-none rounded-t-lg">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 outline-none ${activeTab === tab.id
                  ? "border-primary-900 text-primary-900 bg-neutral-50"
                  : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
                }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              <div>
                <h3 className="text-lg font-bold text-primary-900 mb-4">
                  Current Cycle Status {currentMonth > 0 ? `(Month ${currentMonth})` : '(Not Started)'}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                    <div>
                      <p className="text-sm font-medium text-primary-900">Installment Expected</p>
                      <p className="text-xs text-neutral-500">Per member: {formatCurrency(installmentPerMember)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-900">{formatCurrency(totalExpected)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-success-light rounded-lg border border-success border-opacity-20">
                    <div>
                      <p className="text-sm font-medium text-success">Collection Received</p>
                      <p className="text-xs text-success opacity-80">{paidMembersCount} of {members} members paid</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">{formatCurrency(installmentPerMember * paidMembersCount)}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-4 bg-danger-light rounded-lg border border-danger border-opacity-20">
                    <div>
                      <p className="text-sm font-medium text-danger">Pending Collection</p>
                      <p className="text-xs text-danger opacity-80">{members - paidMembersCount} members pending</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-danger">{formatCurrency(installmentPerMember * (members - paidMembersCount))}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-primary-900 mb-4">Group Summary</h3>
                <div className="border border-neutral-200 rounded-lg overflow-hidden">
                  <div className="bg-primary-900 p-4 text-white">
                    <div className="text-xs font-bold uppercase tracking-wider text-accent mb-1">
                      {isAuction ? 'Auction Plan' : 'Fixed Plan'}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-lg">{group.name}</div>
                      <div className="text-sm text-primary-200">{group.id || group.code}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-white space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Chit Value</span>
                      <span className="font-bold text-primary-900">{formatCurrency(chitValue)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Duration</span>
                      <span className="font-bold text-primary-900">{duration} Months</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Member Capacity</span>
                      <span className="font-bold text-primary-900">{members}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Type</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-xs uppercase ${isAuction ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                        {isAuction ? 'Auction' : 'Fixed'}
                      </span>
                    </div>
                    {(() => {
                      const bankInfo = resolveBankForPayment(undefined, group.id || group.code, group.name);
                      return (
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-neutral-100">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <Landmark className="w-3.5 h-3.5 text-primary-700" /> Assigned Bank
                          </span>
                          <div className="text-right">
                            <span className="font-bold text-neutral-900 block text-xs">{bankInfo.bank.bankName}</span>
                            <span className="font-mono text-[10px] text-neutral-500 block">UPI: {bankInfo.bank.upiId}</span>
                            <Link to="/admin/banks" className="text-[11px] font-bold text-primary-700 hover:underline">
                              Change Bank &rarr;
                            </Link>
                          </div>
                        </div>
                      );
                    })()}
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Status</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-xs uppercase ${group.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>{group.status || 'FORMATION'}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-primary-900">Enrolled Members</h3>
                <Link to="/admin/customers/chit" className="px-4 py-2 bg-primary-900 text-white rounded-lg text-sm font-semibold hover:bg-primary-800 transition-colors flex items-center">
                  <Users className="w-4 h-4 mr-2" /> Add Member
                </Link>
              </div>
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-neutral-50 text-xs font-bold text-neutral-500 uppercase tracking-wider border-b border-neutral-200">
                    <tr>
                      <th className="p-4">Ticket No</th>
                      <th className="p-4">Customer Name</th>
                      <th className="p-4">Scheme / Plan</th>
                      <th className="p-4 text-center">Duration</th>
                      <th className="p-4">Joining Date</th>
                      <th className="p-4">Payment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {(() => {
                      if (groupMembers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-neutral-400">
                              <Users className="w-8 h-8 mx-auto mb-3 text-neutral-300" />
                              <p>No members enrolled in this group yet.</p>
                            </td>
                          </tr>
                        );
                      }

                      return groupMembers.map((m, idx) => {
                        const hasPaid = ledger.some((t: any) =>
                          (t.type === 'CREDIT' || t.category === 'INSTALLMENT') &&
                          ((t.reference?.includes(m.customerId) || t.reference?.includes(m.customerName) || t.description?.includes(m.customerName) || t.description?.includes(m.customerId) || t.customerName === m.customerName || t.customerId === m.customerId) &&
                            (t.reference?.includes(m.groupId) || t.description?.includes(m.groupId) || t.groupId === m.groupId))
                        );

                        const scheme = m.scheme || 'Regular';
                        const isFixed = scheme.toLowerCase().includes('fix');
                        const isAuction = scheme.toLowerCase().includes('auc');

                        return (
                          <tr key={idx} className="hover:bg-neutral-50 transition-colors">
                            <td className="p-4 font-bold text-primary-900">#{m.ticketNumber}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <img src={m.customerImage} className="w-8 h-8 rounded-full border border-neutral-200" alt="" />
                                <div>
                                  <Link 
                                    to={`/admin/customers/${m.customerId}/schedule?group=${encodeURIComponent(group.name || group.id || targetGroupId)}`}
                                    className="font-bold text-neutral-800 hover:text-amber-800 hover:underline transition-colors block"
                                    title="View due amount, due date, paid on, and autocalculated pre-chart"
                                  >
                                    {m.customerName}
                                  </Link>
                                  <div className="text-xs text-neutral-500">{m.customerId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isFixed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isAuction
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                {scheme}
                              </span>
                            </td>
                            <td className="p-4 text-center text-xs font-bold text-neutral-700">
                              {m.months || m.duration || group.duration || 20} Mos
                            </td>
                            <td className="p-4 text-sm text-neutral-600">{m.joiningDate}</td>
                            <td className="p-4">
                              {hasPaid ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded uppercase">Paid</span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded uppercase">Not Paid</span>
                              )}
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

          {activeTab !== 'overview' && activeTab !== 'members' && (
            <div className="py-12 text-center text-neutral-500">
              <Layers className="w-12 h-12 mx-auto mb-4 text-neutral-300" />
              <p>Detailed {activeTab} view will render here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
