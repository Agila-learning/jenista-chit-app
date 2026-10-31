import { secureStorage } from './storage';
import { Customer, ChitGroup, PaymentRequest, LedgerTransaction } from '../types';
import { isMockCustomer, isMockGroup } from './cleanMockData';

/**
 * DataSyncManager:
 * Synchronizes and unifies live backend MongoDB records with persistent mobile storage,
 * reproducing the exact state used by the Web Application (Customers, Active Chits, Groups,
 * Ledger entries, Payment Requests, and Bank Accounts).
 */

const envPort = process.env.PORT || process.env.EXPO_PUBLIC_BACKEND_PORT || '3000';
const customEnvUrl = process.env.EXPO_PUBLIC_API_URL;
const LIVE_RENDER_API = 'https://jenista-chits.onrender.com/api/v1';
const CANDIDATE_LOCAL_APIS = [
  ...(customEnvUrl ? [customEnvUrl] : []),
  `http://localhost:${envPort}/api/v1`,
  `http://127.0.0.1:${envPort}/api/v1`,
  `http://192.168.1.35:${envPort}/api/v1`,
  `http://10.0.2.2:${envPort}/api/v1`,
  `http://192.168.1.39:${envPort}/api/v1`,
];

export const getActiveBaseUrl = async (): Promise<string> => {
  // Check custom override from user settings first
  try {
    const custom = await secureStorage.getItem('custom_api_base_url');
    if (custom && custom.trim().startsWith('http')) {
      return custom.trim();
    }
  } catch {}

  // Test if any local backend is reachable first, else fallback smoothly to live Render API
  for (const candidate of CANDIDATE_LOCAL_APIS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 600);
      const res = await fetch(`${candidate.replace('/api/v1', '')}/health`, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);
      if (res && res.status === 200) {
        return candidate;
      }
    } catch {}
  }
  return LIVE_RENDER_API;
};

// Initial Seed Data matching the Web App when backend collections are being initialized
const DEFAULT_COMPANY_BANKS = [
  {
    id: 'BANK-001',
    bankName: 'HDFC Bank',
    accountHolderName: 'Jenista Chits Pvt Ltd',
    accountNumber: '50200084729104',
    ifscCode: 'HDFC0000123',
    branch: 'Thoothukudi Branch',
    accountType: 'CURRENT',
    upiId: 'jenistachits@hdfcbank',
    isDefault: true,
    status: 'ACTIVE',
    totalReceived: 0,
    transactionsCount: 0,
  },
  {
    id: 'BANK-002',
    bankName: 'ICICI Bank',
    accountHolderName: 'Jenista Chits Pvt Ltd',
    accountNumber: '001105023948',
    ifscCode: 'ICIC0000011',
    branch: 'Hosur Branch',
    accountType: 'CURRENT',
    upiId: 'jenistachits@icici',
    isDefault: false,
    status: 'ACTIVE',
    totalReceived: 0,
    transactionsCount: 0,
  },
  {
    id: 'BANK-003',
    bankName: 'State Bank of India',
    accountHolderName: 'Jenista Chits Pvt Ltd',
    accountNumber: '39482019384',
    ifscCode: 'SBIN0001234',
    branch: 'Pudukkottai Branch',
    accountType: 'CURRENT',
    upiId: 'jenistachits@sbi',
    isDefault: false,
    status: 'ACTIVE',
    totalReceived: 0,
    transactionsCount: 0,
  },
];

export const DataSyncManager = {
  /**
   * Sync all customers from MongoDB + local persistent cache
   */
  async getCustomers(): Promise<Customer[]> {
    let mongoCustomers: any[] = [];
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/customers`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          mongoCustomers = json.data;
        }
      }
    } catch (e) {
      console.warn('Backend fetch customers failed, loading from local cache:', e);
    }

    const localSavedStr = await secureStorage.getItem('synced_customers');
    const localSaved: any[] = localSavedStr ? JSON.parse(localSavedStr) : [];

    // Map MongoDB records
    const mappedMongo: Customer[] = mongoCustomers.map((c) => {
      const existing = localSaved.find(
        (l) => l.id === (c.customerCode || c._id) || l.mongoId === c._id
      );
      const chits = c.chits && c.chits.length > 0 ? c.chits : existing?.chits || [];

      // Calculate total paid & pending from actual chits
      const totalPaid =
        c.totalPaid ??
        existing?.totalPaid ??
        chits.reduce((acc: number, ch: any) => acc + Number(ch.totalPaid || ch.paidAmount || 0), 0);

      const pending =
        c.pending ??
        existing?.pending ??
        chits.reduce((acc: number, ch: any) => acc + Number(ch.pending || (ch.paymentStatus === 'DUE' ? ch.monthlyInstallment : 0) || 0), 0);

      return {
        id: c.customerCode || c._id,
        mongoId: c._id,
        name: c.fullName || c.name || 'Member',
        fullName: c.fullName || c.name,
        phone: c.phone || c.mobile || '',
        mobile: c.phone || c.mobile || '',
        aadhar: c.aadhar || existing?.aadhar || '—',
        pan: c.pan || existing?.pan || '—',
        address: c.address || existing?.address || '',
        branch: c.branchId?.branchName || c.branch || 'Head Office',
        pending: Number(pending),
        totalPaid: Number(totalPaid),
        activeChits: chits.length,
        chits,
        status: c.status || 'ACTIVE',
      };
    });

    // Merge any locally added customers that haven't reached mongo yet
    const unmergedLocal = localSaved.filter(
      (loc) => !mappedMongo.some((m) => m.id === loc.id || (loc.mongoId && m.mongoId === loc.mongoId))
    );

    const merged = [...mappedMongo, ...unmergedLocal]
      .filter((c) => !isMockCustomer(c))
      .map((c) => ({
        ...c,
        chits: Array.isArray(c.chits) ? c.chits.filter((ch: any) => !isMockGroup(ch)) : [],
      }));

    await secureStorage.setItem('synced_customers', JSON.stringify(merged));
    return merged;
  },

  /**
   * Save or register new customer across backend and persistent mobile cache
   */
  async saveCustomer(customerData: Partial<Customer>): Promise<Customer> {
    let mongoSaved: any = null;
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      if (res.ok) {
        const json = await res.json();
        mongoSaved = json.data;
      }
    } catch (e) {
      console.warn('Backend save customer error:', e);
    }

    const newCustomer: Customer = {
      id: mongoSaved?.customerCode || mongoSaved?._id || `TC-${Math.floor(10000 + Math.random() * 90000)}`,
      mongoId: mongoSaved?._id,
      name: customerData.name || customerData.fullName || 'Member',
      fullName: customerData.fullName || customerData.name,
      phone: customerData.phone || customerData.mobile || '',
      mobile: customerData.mobile || customerData.phone || '',
      aadhar: customerData.aadhar || '—',
      pan: customerData.pan || '—',
      address: customerData.address || '',
      city: customerData.city || '',
      pending: 0,
      totalPaid: 0,
      chits: [],
      status: 'ACTIVE',
    };

    const existing = await this.getCustomers();
    const updated = [newCustomer, ...existing.filter((c) => c.id !== newCustomer.id)];
    await secureStorage.setItem('synced_customers', JSON.stringify(updated));
    return newCustomer;
  },

  /**
   * Sync and discover Chit Groups from all sources
   */
  async getChitGroups(): Promise<ChitGroup[]> {
    const customers = await this.getCustomers();
    const groupMap = new Map<string, ChitGroup>();

    // 1. Discover all active groups populated by enrolled members
    customers.forEach((c) => {
      if (Array.isArray(c.chits)) {
        c.chits.forEach((ch: any) => {
          const gId = String(ch.groupId || ch.groupName || '').trim();
          const gName = String(ch.groupName || ch.groupId || gId).trim();
          if (gId) {
            const existing = groupMap.get(gId.toLowerCase());
            const monthly = Number(ch.monthlyInstallment || 0);
            const val = Number(ch.chitValue || (monthly > 0 ? monthly * 20 : 100000));
            const dur = Number(ch.duration || 20);

            if (!existing) {
              groupMap.set(gId.toLowerCase(), {
                id: gId,
                name: gName,
                type: ch.scheme || (gName.toLowerCase().includes('fix') ? 'Fixed' : 'Auction'),
                value: val,
                duration: dur,
                currentMonth: Number(ch.ticketNumber || 1),
                members: 20,
                filled: 1,
                status: 'ACTIVE',
              });
            } else {
              existing.filled = (existing.filled || 0) + 1;
            }
          }
        });
      }
    });

    // 2. Fetch live groups from MongoDB backend if available
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/chit-groups`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          json.data.forEach((bg: any) => {
            const gId = String(bg.groupCode || bg._id || '').trim();
            const gName = String(bg.groupName || gId).trim();
            if (gId && !isMockGroup({ id: gId, name: gName })) {
              const existing = groupMap.get(gId.toLowerCase());
              if (!existing) {
                groupMap.set(gId.toLowerCase(), {
                  id: gId,
                  name: gName,
                  type: bg.planType || 'Auction',
                  value: Number(bg.value || 100000),
                  duration: Number(bg.duration || 20),
                  currentMonth: 1,
                  members: Number(bg.members || 20),
                  filled: 0,
                  status: bg.status || 'ACTIVE',
                });
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('Backend fetch chit-groups error:', e);
    }

    // 3. Add saved custom groups from local storage
    const customStored = await secureStorage.getItem('custom_chit_groups');
    if (customStored) {
      try {
        const customGroups: ChitGroup[] = JSON.parse(customStored);
        if (Array.isArray(customGroups)) {
          customGroups.forEach((cg) => {
            if (cg.id && !isMockGroup(cg)) {
              const low = cg.id.toLowerCase();
              if (!groupMap.has(low)) {
                groupMap.set(low, cg);
              }
            }
          });
        }
      } catch {}
    }

    // Filter all groups to ensure no mock groups exist
    const finalGroups = Array.from(groupMap.values()).filter((g) => !isMockGroup(g));
    return finalGroups;
  },

  /**
   * Create and persist a new Chit Group
   */
  async createChitGroup(groupData: Partial<ChitGroup>): Promise<ChitGroup> {
    const gCode = (groupData.id || groupData.name || `CG-${Date.now().toString().slice(-4)}`).trim();
    const gName = (groupData.name || gCode).trim();
    const val = Number(groupData.value || 100000);
    const dur = Number(groupData.duration || 20);
    const members = Number(groupData.members || 20);
    const monthly = dur > 0 ? Math.round(val / dur) : 5000;
    const pType = groupData.type || 'Auction';

    const newGroup: ChitGroup = {
      id: gCode,
      name: gName,
      type: pType,
      value: val,
      duration: dur,
      currentMonth: 1,
      members,
      filled: 0,
      status: 'ACTIVE',
    };

    // 1. Persist to MongoDB backend
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/chit-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupCode: gCode,
          groupName: gName,
          chitValue: val,
          durationMonths: dur,
          memberCount: members,
          monthlyInstallment: monthly,
          planType: pType,
        }),
      });
    } catch (e) {
      console.warn('Backend create chit group error:', e);
    }

    // 2. Cache in local storage
    let existingCustom: ChitGroup[] = [];
    const customStored = await secureStorage.getItem('custom_chit_groups');
    if (customStored) {
      try {
        existingCustom = JSON.parse(customStored);
      } catch {}
    }

    const updatedCustom = [newGroup, ...existingCustom.filter((g) => g.id !== newGroup.id)];
    await secureStorage.setItem('custom_chit_groups', JSON.stringify(updatedCustom));
    return newGroup;
  },

  /**
   * Enroll a member / customer into a Chit Group
   */
  async enrollMemberToGroup(params: {
    customerId: string;
    groupId: string;
    groupName: string;
    scheme: string;
    chitValue: number;
    duration: number;
    monthlyInstallment: number;
  }): Promise<void> {
    const customers = await this.getCustomers();
    const targetCust = customers.find(
      (c) => c.id === params.customerId || c.mongoId === params.customerId
    );
    const existingChits = targetCust && Array.isArray(targetCust.chits) ? targetCust.chits : [];
    const nextTicket = (existingChits.length + 1).toString();

    const newChit = {
      groupId: params.groupId,
      groupName: params.groupName,
      scheme: params.scheme,
      chitValue: params.chitValue,
      duration: params.duration,
      monthlyInstallment: params.monthlyInstallment,
      ticketNumber: nextTicket,
      paymentStatus: 'DUE',
      joinedDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    };

    // 1. Sync directly to MongoDB customer record
    const targetLookupId = targetCust?.mongoId || targetCust?.id || params.customerId;
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/customers/${encodeURIComponent(targetLookupId)}/chits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChit),
      });
    } catch (e) {
      console.warn('Backend sync chit error:', e);
    }

    // 2. Update local state
    const updatedCusts = customers.map((c) => {
      if (c.id === params.customerId || c.mongoId === params.customerId) {
        return {
          ...c,
          pending: (Number(c.pending) || 0) + params.monthlyInstallment,
          chits: [...existingChits, newChit],
          activeChits: existingChits.length + 1,
        };
      }
      return c;
    });

    await secureStorage.setItem('synced_customers', JSON.stringify(updatedCusts));
  },

  /**
   * Get and persist Ledger Transactions
   */
  async getLedgerTransactions(): Promise<LedgerTransaction[]> {
    let mongoReceipts: any[] = [];
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/receipts`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          mongoReceipts = json.data;
        }
      }
    } catch (e) {
      console.warn('Backend fetch receipts error:', e);
    }

    const mappedMongo: LedgerTransaction[] = mongoReceipts.map((r) => ({
      id: r.receiptNumber,
      date: r.receiptDate || r.createdAt || new Date().toISOString(),
      type: 'CREDIT',
      category: 'INSTALLMENT',
      amount: Number(r.amount || 0),
      reference: r.referenceNo || `${r.customerId || 'CUST'} / ${r.groupName || r.chitGroupId || 'Chit'}`,
      description: `Collection Voucher #${r.receiptNumber} - ${r.customerName || 'Member'}`,
      collectedBy: r.executive || 'Jenista Staff',
      paymentMode: r.paymentMethod || 'Cash',
      customerName: r.customerName,
      customerId: r.customerId,
      groupName: r.groupName || r.chitGroupId,
    }));

    // Local ledger
    const raw = await secureStorage.getItem('synced_ledger');
    let localLedger: LedgerTransaction[] = [];
    if (raw) {
      try {
        localLedger = JSON.parse(raw);
      } catch {}
    }

    const seenIds = new Set(mappedMongo.map((m) => m.id));
    const combined = [...mappedMongo, ...localLedger.filter((l) => !seenIds.has(l.id))];

    // Sort by date descending
    combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  },

  /**
   * Record new receipt / installment payment into Ledger and MongoDB
   */
  async recordReceipt(receiptData: {
    receiptNo: string;
    customerId: string;
    customerName: string;
    chitGroup: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string;
    executive?: string;
    paymentDate?: string;
  }): Promise<void> {
    const entryDate = receiptData.paymentDate || new Date().toISOString();

    // 1. Post to MongoDB backend /receipts
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptNo: receiptData.receiptNo,
          customerId: receiptData.customerId,
          customerName: receiptData.customerName,
          chitGroup: receiptData.chitGroup,
          groupName: receiptData.chitGroup,
          amount: Number(receiptData.amount),
          paymentMode: receiptData.paymentMode,
          referenceNo: receiptData.referenceNo || '',
          executive: receiptData.executive || 'Staff User',
          receiptDate: entryDate,
        }),
      });
    } catch (e) {
      console.warn('Backend record receipt error:', e);
    }

    // 2. Save in local ledger
    const ledger = await this.getLedgerTransactions();
    const entry: LedgerTransaction = {
      id: receiptData.receiptNo,
      date: entryDate,
      type: 'CREDIT',
      category: 'INSTALLMENT',
      amount: Number(receiptData.amount),
      reference: `${receiptData.customerId} / ${receiptData.chitGroup}`,
      description: `Collection Voucher #${receiptData.receiptNo} - ${receiptData.customerName}`,
      collectedBy: receiptData.executive || 'Staff Executive',
      paymentMode: receiptData.paymentMode,
      customerName: receiptData.customerName,
      customerId: receiptData.customerId,
      groupName: receiptData.chitGroup,
    };

    const updatedLedger = [entry, ...ledger.filter((l) => l.id !== entry.id)];
    await secureStorage.setItem('synced_ledger', JSON.stringify(updatedLedger));

    // 3. Update customer's paid & pending balances in persistent storage
    const customers = await this.getCustomers();
    const updatedCusts = customers.map((c) => {
      if (c.id === receiptData.customerId || c.name === receiptData.customerName) {
        return {
          ...c,
          totalPaid: Number(c.totalPaid || 0) + Number(receiptData.amount),
          pending: Math.max(0, Number(c.pending || 0) - Number(receiptData.amount)),
        };
      }
      return c;
    });
    await secureStorage.setItem('synced_customers', JSON.stringify(updatedCusts));
  },

  /**
   * Get and manage Company Banks
   */
  async getBankAccounts() {
    const raw = await secureStorage.getItem('company_banks');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    await secureStorage.setItem('company_banks', JSON.stringify(DEFAULT_COMPANY_BANKS));
    return DEFAULT_COMPANY_BANKS;
  },

  async saveBankAccounts(banks: any[]) {
    await secureStorage.setItem('company_banks', JSON.stringify(banks));
  },

  /**
   * Test Server Connectivity (health & latency)
   */
  async testServerConnection(): Promise<{ connected: boolean; url: string; latencyMs: number; statusText: string }> {
    const start = Date.now();
    try {
      const baseUrl = await getActiveBaseUrl();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${baseUrl.replace('/api/v1', '')}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - start;
      if (res.ok) {
        return { connected: true, url: baseUrl, latencyMs, statusText: 'Online (MongoDB Connected)' };
      }
      return { connected: false, url: baseUrl, latencyMs, statusText: `HTTP ${res.status}` };
    } catch (e: any) {
      return { connected: false, url: 'Offline', latencyMs: Date.now() - start, statusText: e?.message || 'Connection Refused' };
    }
  },

  /**
   * Payment Requests Sync (Installment Verification Proofs)
   */
  async getPaymentRequests(): Promise<PaymentRequest[]> {
    let mongoReqs: any[] = [];
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/payments/requests`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          mongoReqs = json.data;
        }
      }
    } catch (e) {
      console.warn('Backend fetch payment requests error:', e);
    }

    const raw = await secureStorage.getItem('payment_requests');
    let localReqs: PaymentRequest[] = [];
    if (raw) {
      try {
        localReqs = JSON.parse(raw);
      } catch {}
    }

    const mappedMongo: PaymentRequest[] = mongoReqs.map((m) => ({
      id: m.id || m._id,
      customerId: m.customerId,
      customerName: m.customerName || 'Customer',
      customerMobile: m.customerMobile || m.mobile || '',
      groupId: m.groupId || '',
      groupName: m.groupName || m.groupId || 'Chit Group',
      ticketNumber: m.ticketNumber || '1',
      amount: Number(m.amount || 0),
      paymentMode: m.paymentMode || 'UPI',
      referenceNumber: m.referenceNumber || m.referenceNo || '',
      status: m.status || 'PENDING',
      requestedAt: m.requestedAt || m.createdAt || new Date().toISOString(),
      approvedAt: m.approvedAt,
      rejectedAt: m.rejectedAt,
      adminNotes: m.adminNotes,
    }));

    const seenIds = new Set(mappedMongo.map((m) => m.id));
    const merged = [...mappedMongo, ...localReqs.filter((l) => !seenIds.has(l.id))].filter(
      (r) => !['PAY-78201', 'PAY-78202', 'PAY-78203', 'PAY-78190'].includes(r.id)
    );

    merged.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    await secureStorage.setItem('payment_requests', JSON.stringify(merged));
    return merged;
  },

  async submitPaymentRequest(reqData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    const id = reqData.id || `PAY-${Date.now().toString().slice(-6)}`;
    const newReq: PaymentRequest = {
      id,
      customerId: reqData.customerId || 'CUST',
      customerName: reqData.customerName || 'Customer',
      customerMobile: reqData.customerMobile || '',
      groupId: reqData.groupId || '',
      groupName: reqData.groupName || reqData.groupId || 'Chit Group',
      ticketNumber: reqData.ticketNumber || '1',
      amount: Number(reqData.amount || 0),
      paymentMode: reqData.paymentMode || 'UPI',
      referenceNumber: reqData.referenceNumber || `REF-${Date.now().toString().slice(-5)}`,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      adminNotes: reqData.adminNotes,
    };

    // 1. Send to backend
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/payments/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq),
      });
    } catch (e) {
      console.warn('Backend submit payment request error:', e);
    }

    // 2. Save in local cache
    const existing = await this.getPaymentRequests();
    const updated = [newReq, ...existing.filter((r) => r.id !== id)];
    await secureStorage.setItem('payment_requests', JSON.stringify(updated));
    return newReq;
  },

  async updatePaymentRequest(id: string, updateData: Partial<PaymentRequest>): Promise<void> {
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/payments/requests/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    } catch (e) {
      console.warn('Backend update payment request error:', e);
    }

    const existing = await this.getPaymentRequests();
    const updated = existing.map((r) => (r.id === id ? { ...r, ...updateData } : r));
    await secureStorage.setItem('payment_requests', JSON.stringify(updated));
  },

  /**
   * Prize Money Withdrawal Claims Sync
   */
  async getWithdrawalRequests(): Promise<any[]> {
    let mongoClaims: any[] = [];
    try {
      const baseUrl = await getActiveBaseUrl();
      const res = await fetch(`${baseUrl}/payments/withdrawals`);
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.data)) {
          mongoClaims = json.data;
        }
      }
    } catch (e) {
      console.warn('Backend fetch withdrawals error:', e);
    }

    const raw = await secureStorage.getItem('withdrawal_requests');
    let localClaims: any[] = [];
    if (raw) {
      try {
        localClaims = JSON.parse(raw);
      } catch {}
    }

    const mappedMongo = mongoClaims.map((m) => ({
      id: m.id || m._id,
      customerId: m.customerId,
      customerName: m.customerName || 'Customer',
      mobile: m.mobile || m.phone || '',
      groupId: m.groupId,
      groupName: m.groupName || m.groupId,
      ticketNumber: m.ticketNumber || '',
      chitValue: Number(m.chitValue || 0),
      eligibleAmount: Number(m.eligibleAmount || 0),
      payoutMethod: m.payoutMethod || 'Bank Transfer',
      payoutDetails: m.payoutDetails || {},
      status: m.status || 'PENDING_ADMIN_DISBURSAL',
      requestedAt: m.requestedAt || m.createdAt || new Date().toISOString(),
      disbursedAt: m.disbursedAt,
      transactionReference: m.transactionReference,
    }));

    const seenIds = new Set(mappedMongo.map((m) => m.id));
    const merged = [...mappedMongo, ...localClaims.filter((l) => !seenIds.has(l.id))];
    merged.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    await secureStorage.setItem('withdrawal_requests', JSON.stringify(merged));
    return merged;
  },

  async submitWithdrawalRequest(claimData: any): Promise<any> {
    const id = claimData.id || `WDR-${Date.now().toString().slice(-6)}`;
    const newClaim = {
      ...claimData,
      id,
      requestedAt: new Date().toISOString(),
      status: 'PENDING_ADMIN_DISBURSAL',
    };

    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/payments/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClaim),
      });
    } catch (e) {
      console.warn('Backend submit withdrawal claim error:', e);
    }

    const existing = await this.getWithdrawalRequests();
    const updated = [newClaim, ...existing.filter((w) => w.id !== id)];
    await secureStorage.setItem('withdrawal_requests', JSON.stringify(updated));
    return newClaim;
  },

  async updateWithdrawalRequest(id: string, updateData: any): Promise<void> {
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/payments/withdrawals/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
    } catch (e) {
      console.warn('Backend update withdrawal claim error:', e);
    }

    const existing = await this.getWithdrawalRequests();
    const updated = existing.map((w) => (w.id === id ? { ...w, ...updateData } : w));
    await secureStorage.setItem('withdrawal_requests', JSON.stringify(updated));
  },
};
