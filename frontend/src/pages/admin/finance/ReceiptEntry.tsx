import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Printer, CheckCircle2, RotateCcw } from 'lucide-react';
import { fetchClient } from '../../../api/client';
import { printCashReceipt } from '../../../utils/receiptPrinter';
import { useAuth } from '../../../store/AuthContext';
import { isMockCustomer, isMockGroup } from '../../../utils/cleanMockData';
import { notifyPaymentSync } from '../../../utils/paymentRequestsData';

interface ReceiptData {
  receiptNo: string;
  receiptDate: string;
  receiptMode: string;
  type: string;
  customerId: string;
  customerName: string;
  mobileNumber: string;
  chitGroup: string;
  monthNumber: string;
  expectedInstallment: string;
  receiptAmt: string;
  referenceNo: string;
  executive: string;
  remarks: string;
}

const EMPTY: ReceiptData = {
  receiptNo: '',
  receiptDate: new Date().toISOString().split('T')[0],
  receiptMode: '',
  type: 'COLLECTION',
  customerId: '',
  customerName: '',
  mobileNumber: '',
  chitGroup: '',
  monthNumber: '',
  expectedInstallment: '',
  receiptAmt: '',
  referenceNo: '',
  executive: 'Admin User',
  remarks: '',
};

export const ReceiptEntry = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState<ReceiptData>({ ...EMPTY, executive: user?.name || 'Staff User' });
  const [saved, setSaved] = useState(false);
  const [customersDB, setCustomersDB] = useState<any[]>([]);
  const [chitGroups, setChitGroups] = useState<any[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Inbuilt Admin Signature & Signatory States
  const [adminSignature, setAdminSignature] = useState<string>(() => localStorage.getItem('adminSignature') || '');
  const [signatoryName, setSignatoryName] = useState<string>(() => localStorage.getItem('adminSignatoryName') || 'System Admin');
  const [signatoryTitle, setSignatoryTitle] = useState<string>(() => localStorage.getItem('adminSignatoryTitle') || 'Authorized Signatory');

  useEffect(() => {
    const c = localStorage.getItem('mockCustomers');
    let loadedCusts: any[] = [];
    if (c) {
      try {
        const parsed = JSON.parse(c);
        loadedCusts = Array.isArray(parsed) ? parsed.filter((cust: any) => !isMockCustomer(cust)) : [];
        setCustomersDB(loadedCusts);
      } catch {
        setCustomersDB([]);
      }
    }
    const g = localStorage.getItem('mockChitGroups');
    if (g) {
      try {
        const parsed = JSON.parse(g);
        setChitGroups(Array.isArray(parsed) ? parsed.filter((grp: any) => !isMockGroup(grp)) : []);
      } catch {
        setChitGroups([]);
      }
    }
    
    // Auto-generate receipt number
    const nextNo = `REC-${Date.now().toString().slice(-6)}`;
    
    // Check if query params were passed from Staff Dashboard
    const paramCustId = searchParams.get('customerId');
    const paramAmt = searchParams.get('amount');
    const paramGroup = searchParams.get('chitGroup');

    if (paramCustId && loadedCusts.length > 0) {
      const found = loadedCusts.find((cust: any) => cust.id === paramCustId || cust.mongoId === paramCustId);
      if (found) {
        setForm(f => ({
          ...f,
          receiptNo: nextNo,
          executive: user?.name || 'Staff User',
          customerId: found.id,
          customerName: found.name,
          mobileNumber: found.mobile || found.phone || '',
          receiptAmt: paramAmt || String(found.pending || ''),
          chitGroup: paramGroup || (found.chits && found.chits[0]?.groupName) || '',
        }));
        return;
      }
    }

    setForm(f => ({ ...f, receiptNo: nextNo, executive: user?.name || 'Staff User' }));

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
              pending: item.pending ?? local?.pending ?? 0,
              totalPaid: item.totalPaid ?? local?.totalPaid ?? 0,
              chits: chits,
            };
          });
          const cleanMapped = mapped.filter((item: any) => !isMockCustomer(item));
          const existingLocal = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
          const localOnly = existingLocal.filter((loc: any) => 
            !cleanMapped.some((m: any) => m.id === loc.id || (loc.mongoId && m.mongoId === loc.mongoId) || (loc.customerCode && m.customerCode === loc.customerCode))
          );
          const merged = [...cleanMapped, ...localOnly];
          setCustomersDB(merged);
          localStorage.setItem('mockCustomers', JSON.stringify(merged));
        }
      })
      .catch((err: any) => console.warn('Could not sync receipt entry customers:', err));

    const syncSignatures = () => {
      setAdminSignature(localStorage.getItem('adminSignature') || '');
      setSignatoryName(localStorage.getItem('adminSignatoryName') || 'System Admin');
      setSignatoryTitle(localStorage.getItem('adminSignatoryTitle') || 'Authorized Signatory');
    };
    window.addEventListener('storage', syncSignatures);
    return () => window.removeEventListener('storage', syncSignatures);
  }, []);

  const set = (key: keyof ReceiptData, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  // Auto-calculation of monthly installment based on customer chits & chit group
  const getMonthlyDue = (groupId: string, custId?: string) => {
    if (!groupId) return 0;
    const targetCustId = custId || form.customerId;
    const customer = customersDB.find(c => c.id === targetCustId || c.mongoId === targetCustId);
    const custChit = customer?.chits?.find((ch: any) => 
      ch.groupId === groupId || ch.groupName === groupId || ch.id === groupId
    );
    if (custChit) {
      if (custChit.monthlyInstallment) return Number(custChit.monthlyInstallment);
      if (custChit.chitValue && custChit.duration) {
        return Math.round(Number(custChit.chitValue) / Number(custChit.duration));
      }
    }

    const group = chitGroups.find(g => 
      g.id === groupId || g.code === groupId || g.name === groupId
    );
    if (group) {
      if (group.customerChitAmount) return Number(group.customerChitAmount);
      if (group.installment) return Number(group.installment);
      if (group.monthlyContribution) return Number(group.monthlyContribution);
      if (group.value && group.duration) {
        return Math.round(Number(group.value) / Number(group.duration));
      }
    }
    return 0;
  };

  const getGroupScheme = (groupId: string): 'Fixed' | 'Auction' | 'Regular' => {
    if (!groupId) return 'Regular';
    const customer = customersDB.find(c => c.id === form.customerId || c.mongoId === form.customerId);
    const custChit = customer?.chits?.find((ch: any) => 
      ch.groupId === groupId || ch.groupName === groupId || ch.id === groupId
    );
    const group = chitGroups.find(g => 
      g.id === groupId || g.code === groupId || g.name === groupId
    );
    const combined = `${custChit?.scheme || ''} ${group?.scheme || ''} ${group?.type || ''} ${groupId}`.toUpperCase();
    if (combined.includes('FIX')) return 'Fixed';
    if (combined.includes('AUC')) return 'Auction';
    return 'Regular';
  };

  const filteredCustomers = customersDB.filter(c => {
    const q = customerQuery.toLowerCase();
    return c.id?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q) || c.mobile?.includes(q);
  });

  const selectedCustomerChits = customersDB
    .find(c => c.id === form.customerId)
    ?.chits || [];

  const handleSelectCustomer = (c: any) => {
    const firstChit = c.chits && c.chits.length > 0 ? c.chits[0] : null;
    const initialGroup = firstChit ? (firstChit.groupId || firstChit.groupName) : '';
    const initialMonth = '1';
    const due = initialGroup ? getMonthlyDue(initialGroup, c.id) : 0;

    setForm(f => ({
      ...f,
      customerId: c.id,
      customerName: c.name || '',
      mobileNumber: c.mobile || c.phone || '',
      chitGroup: initialGroup,
      monthNumber: initialMonth,
      expectedInstallment: due > 0 ? String(due) : '',
      receiptAmt: due > 0 ? String(due) : (f.receiptAmt || '')
    }));
    setShowCustomerPicker(false);
    setCustomerQuery('');
  };

  const handleGroupChange = (newGroup: string) => {
    const month = form.monthNumber || '1';
    const due = getMonthlyDue(newGroup, form.customerId);
    setForm(f => ({
      ...f,
      chitGroup: newGroup,
      monthNumber: month,
      expectedInstallment: due > 0 ? String(due) : '',
      receiptAmt: due > 0 ? String(due) : f.receiptAmt
    }));
  };

  const handleMonthChange = (newMonth: string) => {
    const due = getMonthlyDue(form.chitGroup, form.customerId);
    setForm(f => ({
      ...f,
      monthNumber: newMonth,
      expectedInstallment: due > 0 ? String(due) : f.expectedInstallment,
      receiptAmt: due > 0 ? String(due) : f.receiptAmt
    }));
  };

  const handleSave = () => {
    if (!form.customerName || !form.receiptAmt || !form.receiptMode) {
      alert('Please fill Customer, Amount, and Payment Mode.');
      return;
    }

    const paidNum = Number(form.receiptAmt);
    const expectedNum = Number(form.expectedInstallment || paidNum);
    const isPartialPayment = expectedNum > 0 && paidNum < expectedNum;
    const balanceRemaining = Math.max(0, expectedNum - paidNum);

    // 1. Save to master ledger with complete metadata
    const existing = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    const entry = {
      id: form.receiptNo,
      receiptNo: form.receiptNo,
      date: new Date().toISOString(),
      type: form.type === 'COLLECTION' ? 'CREDIT' : 'DEBIT',
      category: form.type === 'COLLECTION' ? 'INSTALLMENT' : 'DISBURSAL',
      amount: paidNum,
      dueAmount: expectedNum,
      remainingBalance: balanceRemaining,
      isPartial: isPartialPayment,
      customerId: form.customerId,
      customerName: form.customerName,
      mobileNumber: form.mobileNumber,
      groupId: form.chitGroup,
      chitGroup: form.chitGroup,
      monthNumber: form.monthNumber,
      scheme: getGroupScheme(form.chitGroup),
      reference: `${form.customerId} / ${form.chitGroup}`,
      description: `${form.type === 'COLLECTION' ? 'Collection' : 'Disbursal'} - Month ${form.monthNumber || '—'}${isPartialPayment ? ` (Partial: ₹${balanceRemaining.toLocaleString('en-IN')} Pending)` : ''}`,
      collectedBy: form.executive || user?.name || 'Staff User',
      paymentMode: form.receiptMode,
      status: 'VERIFIED'
    };
    localStorage.setItem('ledgerTransactions', JSON.stringify([entry, ...existing]));

    // 2. Save to staffReceipts for Staff Dashboard & EOD Settlement
    const staffReceipt = {
      receiptNo: form.receiptNo,
      date: form.receiptDate || new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      customerId: form.customerId,
      customerName: form.customerName,
      mobileNumber: form.mobileNumber,
      chitGroup: form.chitGroup,
      monthNumber: form.monthNumber,
      amount: paidNum,
      dueAmount: expectedNum,
      remainingBalance: balanceRemaining,
      isPartial: isPartialPayment,
      mode: form.receiptMode,
      referenceNo: form.referenceNo,
      executive: form.executive || user?.name || 'Staff User',
      status: isPartialPayment ? 'PARTIAL' : 'COLLECTED',
      type: form.type,
    };
    const existingStaffRecs = JSON.parse(localStorage.getItem('staffReceipts') || '[]');
    localStorage.setItem('staffReceipts', JSON.stringify([staffReceipt, ...existingStaffRecs]));

    // 3. Update customer record in mockCustomers
    try {
      const storedCusts = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
      const updatedCusts = storedCusts.map((c: any) => {
        if (c.id === form.customerId || c.mongoId === form.customerId) {
          const currentTotalPaid = Number(c.totalPaid || 0);
          const currentPending = Number(c.pending || 0);
          return {
            ...c,
            totalPaid: currentTotalPaid + paidNum,
            pending: isPartialPayment 
              ? Math.max(0, currentPending - paidNum + balanceRemaining)
              : Math.max(0, currentPending - paidNum),
            lastPayment: {
              receiptNo: form.receiptNo,
              date: form.receiptDate,
              amount: paidNum,
              dueAmount: expectedNum,
              isPartial: isPartialPayment,
              month: form.monthNumber
            }
          };
        }
        return c;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
      setCustomersDB(updatedCusts);
    } catch (err) {
      console.warn('Could not update customer record:', err);
    }

    // 4. Update Chit Group Memberships
    try {
      const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
      const cleanMobile = form.mobileNumber.replace(/\D/g, '');
      const updatedMemberships = memberships.map((m: any) => {
        const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
        if ((m.customerId === form.customerId || (cleanMobile && mPhone === cleanMobile)) && 
            (m.groupId === form.chitGroup || m.groupName === form.chitGroup)) {
          return {
            ...m,
            paymentStatus: isPartialPayment ? 'PARTIAL' : 'PAID',
            lastPaidMonth: form.monthNumber,
            lastPaidDate: form.receiptDate,
          };
        }
        return m;
      });
      localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));
    } catch (mErr) {
      console.warn('Could not update chitGroupMemberships:', mErr);
    }

    // 5. Update mockChitGroups enrolledMembers
    try {
      const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
      const cleanMobile = form.mobileNumber.replace(/\D/g, '');
      const updatedGroups = groups.map((g: any) => {
        if (g.code === form.chitGroup || g.id === form.chitGroup || g.name === form.chitGroup) {
          const members = Array.isArray(g.enrolledMembers) ? g.enrolledMembers.map((m: any) => {
            const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
            if (m.customerId === form.customerId || (cleanMobile && mPhone === cleanMobile)) {
              return {
                ...m,
                paymentStatus: isPartialPayment ? 'PARTIAL' : 'PAID',
                lastPaidMonth: form.monthNumber,
                lastPaidDate: form.receiptDate,
              };
            }
            return m;
          }) : [];
          return { ...g, enrolledMembers: members };
        }
        return g;
      });
      localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
    } catch (gErr) {
      console.warn('Could not update mockChitGroups:', gErr);
    }

    // 6. Broadcast payment event across tabs/roles (Staff, Customer, Admin)
    notifyPaymentSync(entry);
    setSaved(true);
  };

  const handleReset = () => {
    const nextNo = `REC-${Date.now().toString().slice(-6)}`;
    setForm({ ...EMPTY, receiptNo: nextNo, executive: user?.name || 'Staff User' });
    setSaved(false);
  };

  const handlePrint = () => {
    const expNum = Number(form.expectedInstallment || form.receiptAmt);
    const paidNum = Number(form.receiptAmt || 0);
    const isPart = expNum > 0 && paidNum < expNum;

    printCashReceipt({
      receiptNo: form.receiptNo,
      date: form.receiptDate,
      customerName: form.customerName,
      customerId: form.customerId,
      customerMobile: form.mobileNumber,
      groupName: form.chitGroup,
      monthNumber: form.monthNumber,
      paymentMode: form.receiptMode || 'CASH',
      amount: form.receiptAmt,
      expectedInstallment: expNum,
      isPartial: isPart,
      remainingBalance: Math.max(0, expNum - paidNum),
      adminSignature: adminSignature,
      signatoryName: signatoryName,
      signatoryTitle: signatoryTitle,
      description: `${form.type === 'COLLECTION' ? 'Collection' : 'Disbursal'} - Month ${form.monthNumber || '—'} - ${form.customerName || 'Customer'}`,
      referenceNo: form.referenceNo,
      collectedBy: form.executive || 'Jenista Cash Counter'
    });
  };

  const expectedAmt = Number(form.expectedInstallment || 0);
  const amtNum = Number(form.receiptAmt || 0);
  const isPartial = expectedAmt > 0 && amtNum > 0 && amtNum < expectedAmt;
  const remainingBalance = Math.max(0, expectedAmt - amtNum);

  return (
    <div className="space-y-6" onClick={() => showCustomerPicker && setShowCustomerPicker(false)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">Receipt Entry</h1>
          <p className="text-sm text-neutral-500">Generate and record chit fund collection / disbursal receipts.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> New / Reset
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center gap-2 px-5 py-2 bg-primary-900 text-white rounded-lg text-sm font-bold hover:bg-primary-800 transition-colors disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saved ? 'Saved' : 'Save & Record'}
          </button>
        </div>
      </div>

      {/* CUSTOMER PICKER MODAL */}
      {showCustomerPicker && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20 backdrop-blur-sm"
          onClick={e => { e.stopPropagation(); setShowCustomerPicker(false); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                autoFocus
                value={customerQuery}
                onChange={e => setCustomerQuery(e.target.value)}
                placeholder="Search by ID, Name or Phone..."
                className="flex-1 text-sm font-medium outline-none bg-transparent"
              />
            </div>
            <div className="max-h-72 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">No customers found.</p>
              ) : filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="flex justify-between items-center px-5 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{c.id} · {c.mobile}</p>
                  </div>
                  <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">Select</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-6">
        {/* LEFT – FORM */}
        <div className="flex-1 space-y-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* SECTION 1 */}
          <div className="bg-slate-800 text-white px-6 py-3 text-xs font-black uppercase tracking-widest">
            Transaction Information
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 divide-x divide-y divide-slate-100 border-b border-slate-100">
            {/* Row 1 */}
            <Field label="Receipt Type">
              <select value={form.type} onChange={e => set('type', e.target.value)} className="field-select">
                <option value="COLLECTION">Collection</option>
                <option value="DISBURSAL">Disbursal</option>
              </select>
            </Field>
            <Field label="Chit Group">
              <div>
                <select 
                  value={form.chitGroup} 
                  onChange={e => handleGroupChange(e.target.value)} 
                  className="field-select font-semibold text-slate-800"
                >
                  <option value="">-- Select --</option>
                  {selectedCustomerChits.length > 0
                    ? selectedCustomerChits.map((ch: any, i: number) => <option key={i} value={ch.groupId || ch.groupName}>{ch.groupId || ch.groupName}</option>)
                    : chitGroups.map((g: any, i: number) => <option key={i} value={g.code || g.id}>{g.code || g.id} – {g.name}</option>)
                  }
                </select>
                {form.chitGroup && (
                  <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-medium">Scheme:</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      getGroupScheme(form.chitGroup) === 'Fixed'
                        ? 'bg-blue-100 text-blue-800'
                        : getGroupScheme(form.chitGroup) === 'Auction'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {getGroupScheme(form.chitGroup)} Chit
                    </span>
                  </div>
                )}
              </div>
            </Field>
            <Field label="Receipt No.">
              <input value={form.receiptNo} readOnly className="field-input font-mono bg-slate-50" />
            </Field>
            <Field label="Reference No.">
              <input value={form.referenceNo} onChange={e => set('referenceNo', e.target.value)} placeholder="UTR / Cheque No." className="field-input" />
            </Field>

            {/* Row 2 */}
            <Field label="Customer Name" colSpan>
              <div className="relative flex">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setShowCustomerPicker(true); }}
                  className="pl-3 pr-2 flex items-center bg-slate-50 border-r border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                </button>
                <input
                  value={form.customerName}
                  readOnly
                  onClick={e => { e.stopPropagation(); setShowCustomerPicker(true); }}
                  placeholder="Click lens to search..."
                  className="field-input cursor-pointer font-bold text-slate-800"
                />
              </div>
            </Field>
            <Field label="Mobile Number">
              <input value={form.mobileNumber} readOnly className="field-input bg-slate-50" placeholder="Auto-filled" />
            </Field>
            <Field label="Executive">
              <input value={form.executive} onChange={e => set('executive', e.target.value)} className="field-input" />
            </Field>

            {/* Row 3 */}
            <Field label="Payment Mode">
              <select value={form.receiptMode} onChange={e => set('receiptMode', e.target.value)} className="field-select">
                <option value="">-- Select --</option>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
                <option value="NEFT">NEFT / IMPS</option>
                <option value="CHEQUE">Cheque</option>
                <option value="DD">Demand Draft</option>
              </select>
            </Field>
            <Field label="Receipt Date">
              <input type="date" value={form.receiptDate} onChange={e => set('receiptDate', e.target.value)} className="field-input" />
            </Field>
            <Field label="Month No.">
              <input 
                type="number" 
                min="1"
                value={form.monthNumber} 
                onChange={e => handleMonthChange(e.target.value)} 
                placeholder="e.g. 1" 
                className="field-input font-bold text-slate-800" 
              />
            </Field>
            <Field label="Receipt Amount (₹)">
              <div>
                <input 
                  type="number" 
                  value={form.receiptAmt} 
                  onChange={e => set('receiptAmt', e.target.value)} 
                  placeholder="0.00" 
                  className={`field-input font-bold text-lg ${isPartial ? 'text-amber-800 bg-amber-50/40' : 'text-slate-900'}`} 
                />
                {expectedAmt > 0 && (
                  <div className="px-3 py-1 text-[10px] flex items-center justify-between bg-slate-50 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">
                      Due: <strong>₹{expectedAmt.toLocaleString('en-IN')}</strong>
                    </span>
                    {isPartial && (
                      <button
                        type="button"
                        onClick={() => set('receiptAmt', String(expectedAmt))}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                      >
                        Reset to Full Due
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Field>

            {/* Row 4 - Remarks full width */}
            <Field label="Remarks" fullWidth>
              <input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes..." className="field-input" />
            </Field>
          </div>

          {/* Partial Payment Banner in Form */}
          {isPartial && (
            <div className="px-6 py-3 bg-amber-50/90 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                <span>
                  <strong>Partial Payment:</strong> Collecting ₹{amtNum.toLocaleString('en-IN')} of ₹{expectedAmt.toLocaleString('en-IN')} monthly installment.
                </span>
              </div>
              <span className="font-bold text-amber-900 bg-amber-100/90 px-2.5 py-1 rounded border border-amber-300 shrink-0">
                ₹{remainingBalance.toLocaleString('en-IN')} Remaining Balance
              </span>
            </div>
          )}

          {saved && (
            <div className="px-6 py-4 bg-green-50 border-t border-green-200 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <p className="text-sm font-bold text-green-800">Transaction recorded successfully in the General Ledger.</p>
            </div>
          )}
        </div>

        {/* RIGHT – RECEIPT PREVIEW */}
        <div className="w-full xl:w-80 shrink-0">
          <div ref={printRef} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm font-mono text-xs">
            {/* Perforated top */}
            <div className="h-3 bg-[repeating-linear-gradient(90deg,_transparent_0px,_transparent_8px,_#e2e8f0_8px,_#e2e8f0_10px)]" />

            <div className="px-6 pt-5 pb-4 border-b-2 border-dashed border-slate-200">
              <div className="text-center mb-3">
                <img 
                  src="/assets/Chit logo.jpg.jpeg" 
                  alt="Jenista Chits Logo" 
                  className="w-12 h-12 mx-auto mb-2 object-contain rounded-md"
                />
                <p className="text-base font-black tracking-widest uppercase text-slate-900 leading-tight">Jenista Chits</p>
                <p className="text-[10px] text-amber-700 tracking-wider font-bold mt-0.5">Faith, Commitment, Victory</p>
                <p className="text-[9px] text-slate-400 tracking-wider">Financial Services Pvt. Ltd.</p>
                <span className="inline-block mt-2 px-3 py-0.5 border border-slate-800 text-[9px] font-black tracking-widest uppercase text-slate-800">
                  {form.type === 'COLLECTION' ? 'Collection Receipt' : 'Disbursal Receipt'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <ReceiptRow label="Receipt No." value={form.receiptNo} mono />
                <ReceiptRow label="Date" value={form.receiptDate ? new Date(form.receiptDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'} />
              </div>
            </div>

            <div className="px-6 py-4 border-b border-dashed border-slate-200 space-y-1.5 text-[11px]">
              <ReceiptRow label="Customer" value={form.customerName || '—'} bold />
              <ReceiptRow label="ID" value={form.customerId || '—'} mono />
              <ReceiptRow label="Mobile" value={form.mobileNumber || '—'} mono />
              <ReceiptRow label="Chit Group" value={form.chitGroup || '—'} />
              <ReceiptRow label="Month" value={form.monthNumber || '—'} />
            </div>

            <div className="px-6 py-4 border-b border-dashed border-slate-200 space-y-1.5 text-[11px]">
              <ReceiptRow label="Mode" value={form.receiptMode || '—'} />
              <ReceiptRow label="Ref. No." value={form.referenceNo || '—'} mono />
              {form.remarks && <ReceiptRow label="Remarks" value={form.remarks} />}
            </div>

            {isPartial ? (
              <div className="px-6 py-3.5 border-b-2 border-dashed border-slate-200 space-y-1.5 bg-amber-50/40">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Monthly Due</span>
                  <span className="font-bold text-slate-800">₹{expectedAmt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-emerald-700 font-bold uppercase tracking-wider">Amount Paid</span>
                  <span className="font-black text-emerald-800 text-sm">₹{amtNum.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-amber-700 font-bold uppercase tracking-wider">Remaining Due</span>
                  <span className="font-black text-amber-800">₹{remainingBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-1 border-t border-dashed border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-amber-800">Status</span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    PARTIAL PAYMENT
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-6 py-4 border-b-2 border-dashed border-slate-200">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Amount</span>
                  <span className="text-xl font-black text-slate-900 tracking-tight">
                    ₹{amtNum > 0 ? amtNum.toLocaleString('en-IN') : '0.00'}
                  </span>
                </div>
              </div>
            )}

            <div className="px-6 py-4 text-center space-y-2">
              {adminSignature ? (
                <div className="flex flex-col items-center justify-center my-1">
                  <img src={adminSignature} alt="Authorized Signatory" className="h-10 max-w-[130px] object-contain mb-1" />
                  <div className="w-32 border-t border-slate-400"></div>
                  <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-1">
                    {signatoryName}
                  </span>
                  <span className="text-[8px] text-slate-500 font-medium">
                    {signatoryTitle}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-1">
                  <div className="w-32 border-t border-slate-400 mt-6"></div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    Authorized Signatory
                  </span>
                </div>
              )}
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Executive: {form.executive}</p>
              <p className="text-[9px] text-slate-400">Thank you for your trust in Jenista Chits.</p>
              <p className="text-[9px] text-slate-400">Computer-generated receipt.</p>
            </div>

            {/* Perforated bottom */}
            <div className="h-3 bg-[repeating-linear-gradient(90deg,_transparent_0px,_transparent_8px,_#e2e8f0_8px,_#e2e8f0_10px)]" />
          </div>
        </div>
      </div>

      <style>{`
        .field-input { width: 100%; padding: 10px 12px; font-size: 13px; background: white; outline: none; transition: background 0.15s; }
        .field-input:focus { background: #f8fafc; }
        .field-select { width: 100%; padding: 10px 12px; font-size: 13px; background: white; outline: none; appearance: none; cursor: pointer; }
        .field-select:focus { background: #f8fafc; }
      `}</style>
    </div>
  );
};

const Field = ({ label, children, colSpan, fullWidth }: { label: string; children: React.ReactNode; colSpan?: boolean; fullWidth?: boolean }) => (
  <div className={`flex flex-col ${fullWidth ? 'col-span-4' : colSpan ? 'col-span-2' : 'col-span-1'}`}>
    <span className="px-3 pt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    {children}
  </div>
);

const ReceiptRow = ({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) => (
  <div className="flex justify-between items-start gap-2">
    <span className="text-slate-400 shrink-0">{label}</span>
    <span className={`text-right text-slate-800 break-all ${mono ? 'font-mono' : ''} ${bold ? 'font-bold' : ''}`}>{value}</span>
  </div>
);
