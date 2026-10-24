import { fetchClient } from '../api/client';
import { resolveBankForPayment, recordBankCredit } from './bankAccountsData';

export interface PaymentRequest {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  groupId: string;
  groupName?: string;
  ticketNumber?: string;
  amount: number;
  paymentMode: string;
  referenceNo: string;
  bankAccountId?: string;
  bankName?: string;
  paymentScreenshot?: string;
  screenshotUrl?: string;
  submittedAt: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  verifiedAt?: string;
  rejectedAt?: string;
}

// Cross-tab / cross-window sync channel
let paymentSyncChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    paymentSyncChannel = new BroadcastChannel('jenista_payment_channel');
  }
} catch {
  paymentSyncChannel = null;
}

export const notifyPaymentSync = (data?: any) => {
  try {
    if (paymentSyncChannel) {
      paymentSyncChannel.postMessage({ type: 'PAYMENT_UPDATED', timestamp: Date.now(), data });
    }
  } catch { }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
  }
};

export const onPaymentSync = (callback: () => void): (() => void) => {
  const handler = () => {
    callback();
  };
  if (paymentSyncChannel) {
    paymentSyncChannel.addEventListener('message', handler);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handler);
  }
  return () => {
    if (paymentSyncChannel) {
      paymentSyncChannel.removeEventListener('message', handler);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handler);
    }
  };
};

export const createSampleReceiptSvg = (
  name: string,
  amount: number,
  mode: string,
  ref: string,
  dateStr: string
): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="490" viewBox="0 0 380 490">
    <defs>
      <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#15803d" />
        <stop offset="100%" stop-color="#166534" />
      </linearGradient>
    </defs>
    <rect width="380" height="490" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <rect width="380" height="110" rx="16" fill="url(#headerGrad)"/>
    <rect y="94" width="380" height="16" fill="#166534"/>
    
    <circle cx="190" cy="55" r="26" fill="#ffffff"/>
    <path d="M180 55 l7 7 l14 -14" fill="none" stroke="#15803d" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    
    <text x="190" y="145" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="bold" fill="#15803d" text-anchor="middle" letter-spacing="1">PAYMENT SUCCESSFUL</text>
    <text x="190" y="185" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="900" fill="#0f172a" text-anchor="middle">₹${amount.toLocaleString('en-IN')}</text>
    
    <line x1="30" y1="210" x2="350" y2="210" stroke="#f1f5f9" stroke-width="2" stroke-dasharray="6"/>
    
    <text x="40" y="240" font-family="sans-serif" font-size="10" fill="#94a3b8" font-weight="bold" letter-spacing="0.5">PAID TO</text>
    <text x="40" y="260" font-family="sans-serif" font-size="15" fill="#0f172a" font-weight="bold">Jenista Chit Funds Pvt Ltd</text>
    <text x="40" y="277" font-family="sans-serif" font-size="11" fill="#64748b">jenistachits@upi · Verified Merchant</text>

    <text x="40" y="312" font-family="sans-serif" font-size="10" fill="#94a3b8" font-weight="bold" letter-spacing="0.5">PAID BY</text>
    <text x="40" y="332" font-family="sans-serif" font-size="14" fill="#0f172a" font-weight="bold">${name}</text>

    <line x1="30" y1="352" x2="350" y2="352" stroke="#f1f5f9" stroke-width="2"/>

    <text x="40" y="380" font-family="sans-serif" font-size="10" fill="#94a3b8" font-weight="bold" letter-spacing="0.5">PAYMENT MODE</text>
    <text x="40" y="398" font-family="sans-serif" font-size="13" fill="#1e293b" font-weight="bold">${mode}</text>

    <text x="40" y="430" font-family="sans-serif" font-size="10" fill="#94a3b8" font-weight="bold" letter-spacing="0.5">UPI / BANK REF (UTR)</text>
    <text x="40" y="448" font-family="monospace" font-size="12" fill="#0f172a" font-weight="bold">${ref}</text>

    <text x="340" y="448" font-family="sans-serif" font-size="10" fill="#94a3b8" text-anchor="end">${dateStr}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const defaultPaymentRequests: PaymentRequest[] = [];

export const isPendingPayment = (status: string | undefined): boolean => {
  if (!status) return true;
  const s = String(status).toUpperCase();
  return s === 'PENDING' || s === 'PENDING_VERIFICATION' || s === 'SUBMITTED';
};

export const getStoredPaymentRequests = (): PaymentRequest[] => {
  try {
    const raw = localStorage.getItem('paymentRequests');
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Filter out initial mock payment request IDs
    const realOnly = parsed.filter((r: any) =>
      !['PAY-78201', 'PAY-78202', 'PAY-78203', 'PAY-78190'].includes(r.id)
    );
    if (realOnly.length !== parsed.length) {
      localStorage.setItem('paymentRequests', JSON.stringify(realOnly));
    }
    return realOnly;
  } catch (err) {
    console.error('Error reading paymentRequests:', err);
    return [];
  }
};

/**
 * Fetch latest payment requests from Backend API with local storage fallback and two-way sync
 */
export const syncPaymentRequestsWithBackend = async (): Promise<PaymentRequest[]> => {
  try {
    const res: any = await fetchClient('/payments/requests');
    if (res && res.data && Array.isArray(res.data)) {
      const backendList: PaymentRequest[] = res.data.map((r: any) => ({
        id: r.id,
        customerId: r.customerId,
        customerName: r.customerName,
        mobile: r.mobile,
        groupId: r.groupId,
        groupName: r.groupName,
        ticketNumber: r.ticketNumber,
        amount: Number(r.amount),
        paymentMode: r.paymentMode,
        referenceNo: r.referenceNo,
        bankAccountId: r.bankAccountId,
        bankName: r.bankName,
        paymentScreenshot: r.paymentScreenshot || r.screenshotUrl,
        screenshotUrl: r.screenshotUrl || r.paymentScreenshot,
        submittedAt: r.submittedAt || r.createdAt,
        status: r.status,
        remarks: r.remarks,
        verifiedAt: r.verifiedAt,
        rejectedAt: r.rejectedAt
      }));

      // Merge backend items with local items
      const local = getStoredPaymentRequests();
      const backendIds = new Set(backendList.map(b => b.id));

      // Push any local requests that were created offline or in InPrivate to the backend DB
      const unsyncedLocal = local.filter(item => !backendIds.has(item.id));
      if (unsyncedLocal.length > 0) {
        Promise.allSettled(
          unsyncedLocal.map(item =>
            fetchClient('/payments/requests', {
              method: 'POST',
              body: JSON.stringify(item)
            })
          )
        ).catch(() => {});
      }

      const localMap = new Map<string, PaymentRequest>(local.map(item => [item.id, item]));

      // Add backend items (backend status takes precedence if approved/rejected)
      backendList.forEach(item => {
        const existing = localMap.get(item.id);
        if (!existing || item.status === 'APPROVED' || item.status === 'REJECTED') {
          localMap.set(item.id, item);
        }
      });

      const merged = Array.from(localMap.values()).sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      localStorage.setItem('paymentRequests', JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn('Backend payment requests sync unavailable, using local cache:', err);
  }
  return getStoredPaymentRequests();
};

export const savePaymentRequest = async (req: PaymentRequest) => {
  // 1. Save locally
  const current = getStoredPaymentRequests();
  const filtered = current.filter(r => r.id !== req.id);
  const updated = [req, ...filtered];
  localStorage.setItem('paymentRequests', JSON.stringify(updated));

  // 2. Broadcast immediately
  notifyPaymentSync(req);

  // 3. Post to backend DB so other browsers / InPrivate windows receive it
  try {
    await fetchClient('/payments/requests', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  } catch (err) {
    console.warn('Could not post payment request to backend:', err);
  }

  return updated;
};

export const approvePaymentRequestAction = async (req: PaymentRequest) => {
  // 1. Resolve and credit receiving bank account
  const assignedBank = req.bankAccountId
    ? { id: req.bankAccountId, bankName: req.bankName || 'Company Bank' }
    : resolveBankForPayment(req.customerId, req.groupId, req.groupName).bank;

  if (assignedBank?.id) {
    recordBankCredit(assignedBank.id, Number(req.amount));
  }

  // 2. Update Payment Request status
  const allReqs = getStoredPaymentRequests();
  const updatedReqs = allReqs.map((r: any) =>
    r.id === req.id ? {
      ...r,
      status: 'APPROVED',
      verifiedAt: new Date().toISOString(),
      bankAccountId: assignedBank?.id,
      bankName: assignedBank?.bankName
    } : r
  );
  localStorage.setItem('paymentRequests', JSON.stringify(updatedReqs));

  // 3. Add to ledgerTransactions
  const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
  const newLedgerEntry = {
    id: `REC-${Date.now().toString().slice(-6)}`,
    date: new Date().toISOString(),
    type: 'CREDIT',
    category: 'INSTALLMENT',
    amount: Number(req.amount),
    reference: `${req.customerId} / ${req.groupId}`,
    description: `Customer Online Payment (${req.paymentMode} Ref: ${req.referenceNo}) - Deposited to ${assignedBank?.bankName || 'Bank'}`,
    customerName: req.customerName,
    customerId: req.customerId,
    groupId: req.groupId,
    bankAccountId: assignedBank?.id,
    bankName: assignedBank?.bankName,
    paymentMode: req.paymentMode,
    paymentScreenshot: req.paymentScreenshot || req.screenshotUrl,
    screenshotUrl: req.paymentScreenshot || req.screenshotUrl,
    status: 'VERIFIED'
  };
  localStorage.setItem('ledgerTransactions', JSON.stringify([newLedgerEntry, ...ledger]));

  // 4. Update mockCustomers
  const customers = JSON.parse(localStorage.getItem('mockCustomers') || '[]');
  const cleanReqPhone = (req.mobile || '').replace(/\D/g, '');
  const updatedCustomers = customers.map((c: any) => {
    const cPhone = (c.mobile || c.phone || '').replace(/\D/g, '');
    if (c.id === req.customerId || (cleanReqPhone && cPhone === cleanReqPhone)) {
      const chits = Array.isArray(c.chits) ? c.chits.map((ch: any) => {
        if (ch.groupId === req.groupId) {
          return { ...ch, paymentStatus: 'PAID' };
        }
        return ch;
      }) : [];
      const curPaid = Number(c.totalPaid || 0);
      const curPending = Number(c.pending || 0);
      return {
        ...c,
        chits,
        totalPaid: curPaid + Number(req.amount),
        pending: Math.max(0, curPending - Number(req.amount))
      };
    }
    return c;
  });
  localStorage.setItem('mockCustomers', JSON.stringify(updatedCustomers));

  // 5. Update Chit Group Memberships
  const memberships = JSON.parse(localStorage.getItem('chitGroupMemberships') || '[]');
  const updatedMemberships = memberships.map((m: any) => {
    const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
    if ((m.customerId === req.customerId || (cleanReqPhone && mPhone === cleanReqPhone)) && m.groupId === req.groupId) {
      return { ...m, paymentStatus: 'PAID' };
    }
    return m;
  });
  localStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMemberships));

  // 6. Update Chit Groups enrolled members
  const groups = JSON.parse(localStorage.getItem('mockChitGroups') || '[]');
  const updatedGroups = groups.map((g: any) => {
    if (g.code === req.groupId || g.id === req.groupId) {
      const members = Array.isArray(g.enrolledMembers) ? g.enrolledMembers.map((m: any) => {
        const mPhone = (m.mobile || m.phone || '').replace(/\D/g, '');
        if (m.customerId === req.customerId || (cleanReqPhone && mPhone === cleanReqPhone)) {
          return { ...m, paymentStatus: 'PAID' };
        }
        return m;
      }) : [];
      return { ...g, enrolledMembers: members };
    }
    return g;
  });
  localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));

  // 7. Sync to API backend if online
  try {
    await fetchClient(`/payments/requests/${req.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'APPROVED',
        verifiedAt: new Date().toISOString(),
        bankAccountId: assignedBank?.id,
        bankName: assignedBank?.bankName
      })
    });
  } catch (err) {
    console.warn('Could not sync approved payment status to backend:', err);
  }

  try {
    const targetCust = updatedCustomers.find((c: any) =>
      c.id === req.customerId || c.customerCode === req.customerId || (cleanReqPhone && (c.mobile || c.phone || '').replace(/\D/g, '') === cleanReqPhone)
    );
    const targetId = targetCust?.mongoId || targetCust?.customerCode || targetCust?.id || req.customerId;
    if (targetId && targetCust) {
      fetchClient(`/customers/${targetId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          totalPaid: targetCust.totalPaid,
          pending: targetCust.pending,
          chits: targetCust.chits
        })
      }).catch(err => console.warn('Could not sync approved payment to MongoDB:', err));
    }
  } catch { }

  notifyPaymentSync();
};

export const rejectPaymentRequestAction = async (reqId: string) => {
  const allReqs = getStoredPaymentRequests();
  const updatedReqs = allReqs.map((r: any) =>
    r.id === reqId ? { ...r, status: 'REJECTED', rejectedAt: new Date().toISOString() } : r
  );
  localStorage.setItem('paymentRequests', JSON.stringify(updatedReqs));

  try {
    await fetchClient(`/payments/requests/${reqId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'REJECTED',
        rejectedAt: new Date().toISOString()
      })
    });
  } catch (err) {
    console.warn('Could not sync rejected payment status to backend:', err);
  }

  notifyPaymentSync();
};