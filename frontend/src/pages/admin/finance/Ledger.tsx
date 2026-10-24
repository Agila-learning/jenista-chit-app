import { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Search, Filter, Download, ArrowUpRight, ArrowDownRight, BookOpen, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '../../../utils/format';
import { printCashReceipt } from '../../../utils/receiptPrinter';

export const Ledger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Load transactions from localStorage (recorded via Payments module)
    const saved = localStorage.getItem('ledgerTransactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  const filtered = transactions.filter(txn => {
    const q = searchTerm.toLowerCase();
    return (
      (txn.id || '').toLowerCase().includes(q) ||
      (txn.reference || '').toLowerCase().includes(q) ||
      (txn.description || '').toLowerCase().includes(q)
    );
  });

  // Compute summary from real transactions
  const totalCredits = transactions.filter(t => t.type === 'CREDIT').reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalDebits = transactions.filter(t => t.type === 'DEBIT').reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance = totalCredits - totalDebits;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">General Ledger</h1>
          <p className="text-sm text-neutral-500">Immutable record of all organizational financial transactions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="primary">Manual Entry</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Net Balance</p>
          <h3 className="text-2xl font-bold text-primary-900">{formatCurrency(balance)}</h3>
          <p className="text-xs text-neutral-400 mt-2">Credits minus Debits</p>
        </div>
        <div className="card p-5 border-l-4 border-l-success">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Credits</p>
          <h3 className="text-2xl font-bold text-success">{formatCurrency(totalCredits)}</h3>
          <div className="flex items-center text-xs text-neutral-500 mt-2">
            <ArrowUpRight className="w-3 h-3 text-success mr-1" />
            <span>Installments, Commissions</span>
          </div>
        </div>
        <div className="card p-5 border-l-4 border-l-danger">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Total Debits</p>
          <h3 className="text-2xl font-bold text-danger">{formatCurrency(totalDebits)}</h3>
          <div className="flex items-center text-xs text-neutral-500 mt-2">
            <ArrowDownRight className="w-3 h-3 text-danger mr-1" />
            <span>Disbursals, Expenses</span>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <Input 
              className="pl-10" 
              placeholder="Search by TXN ID, Reference, or Description..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="bg-white">
              <Filter className="w-4 h-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-200">
            <thead>
              <tr>
                <th className="table-header">Transaction ID & Date</th>
                <th className="table-header">Category & Description</th>
                <th className="table-header">Reference</th>
                <th className="table-header text-right">Debit</th>
                <th className="table-header text-right">Credit</th>
                <th className="table-header text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
                    <p className="font-semibold text-neutral-500">No transactions recorded yet</p>
                    <p className="text-xs text-neutral-400 mt-1">Transactions recorded via the Payments module will appear here.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((txn) => (
                  <tr key={txn.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="table-cell">
                      <div className="font-medium text-primary-900">{txn.id}</div>
                      <div className="text-xs text-neutral-500">{txn.date ? formatDate(new Date(txn.date)) : '—'}</div>
                    </td>
                    <td className="table-cell">
                      <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-600 mb-1">
                        {txn.category}
                      </div>
                      <div className="text-neutral-700 max-w-xs truncate" title={txn.description}>{txn.description}</div>
                    </td>
                    <td className="table-cell font-mono text-xs text-neutral-500">{txn.reference}</td>
                    <td className="table-cell text-right">
                      {txn.type === 'DEBIT' ? (
                        <span className="text-danger font-medium">{formatCurrency(txn.amount)}</span>
                      ) : (
                        <span className="text-neutral-300">-</span>
                      )}
                    </td>
                    <td className="table-cell text-right">
                      {txn.type === 'CREDIT' ? (
                        <span className="text-success font-medium">{formatCurrency(txn.amount)}</span>
                      ) : (
                        <span className="text-neutral-300">-</span>
                      )}
                    </td>
                    <td className="table-cell text-right whitespace-nowrap">
                      {txn.type === 'CREDIT' ? (
                        <button 
                          onClick={() => printCashReceipt({
                            receiptNo: txn.id,
                            date: txn.date,
                            customerName: txn.customerName || (txn.reference?.split('/')?.[0]?.trim()) || 'Valued Member',
                            customerId: txn.customerId || '',
                            groupName: txn.groupId || (txn.reference?.split('/')?.[1]?.trim()) || 'Chit Fund Group',
                            paymentMode: (txn.description || '').toLowerCase().includes('cash') ? 'CASH' : 'Online Payment',
                            amount: txn.amount,
                            description: txn.description,
                            referenceNo: txn.reference,
                            collectedBy: 'Jenista General Accounts'
                          })}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs transition-all hover:scale-105 ${
                            (txn.description || '').toLowerCase().includes('cash')
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                              : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-300'
                          }`}
                          title="Print Official Payment Receipt Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      ) : (
                        <span className="text-neutral-300 text-xs">—</span>
                      )}
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
