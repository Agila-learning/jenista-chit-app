import { secureStorage } from './storage';
import { Customer, ChitGroup, PaymentRequest, LedgerTransaction } from '../types';
import { isMockCustomer, isMockGroup } from './cleanMockData';
import {
  cascadeDeleteCustomerMobile,
  cascadeDeleteGroupMobile,
  cascadeDeletePaymentRequestMobile,
  cascadeDeleteWithdrawalRequestMobile,
  cascadeDeleteLeadMobile,
  isGroupDeleted,
  isCustomerOrLeadDeleted,
  getDeletedCustomerIds,
  getDeletedGroupIds,
  unblacklistCustomer,
  inMemoryDeletedCustomerIds,
  inMemoryDeletedGroupIds,
} from './cascadeDeleteMobile';

/**
 * DataSyncManager:
 * Synchronizes and unifies live backend MongoDB records with persistent mobile storage,
 * reproducing the exact state used by the Web Application (Customers, Active Chits, Groups,
 * Ledger entries, Payment Requests, and Bank Accounts).
 */

import { Platform } from 'react-native';

const envPort = process.env.PORT || process.env.EXPO_PUBLIC_BACKEND_PORT || '3000';
const PROD_API_URL = 'https://jenista-chits.onrender.com/api/v1';
const customEnvUrl = process.env.EXPO_PUBLIC_API_URL;
const LOCAL_DEV_IP = '192.168.1.39';

let cachedBaseUrl: string | null = null;

/**
 * Normalizes group names (stripping punctuation, spaces, and hyphens)
 * to safely merge identical groups like "JJ F 2 T" and "JJ-F-2-T".
 */
export const normalizeGroupName = (name?: string): string => {
  if (!name) return '';
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Accurately detects chit scheme type ('Fixed', 'Regular', 'Auction')
 * from group/plan type and naming conventions.
 */
export const getGroupSchemeType = (group: any): 'Fixed' | 'Regular' | 'Auction' => {
  const gType = String(group?.type || group?.planType || group?.scheme || '').toUpperCase();
  const gName = String(group?.name || group?.groupName || group?.id || '').toUpperCase();

  if (gType.includes('FIX') || gName.includes('FIX') || gName.includes(' F ') || gName.includes('-F-')) {
    return 'Fixed';
  }
  if (gType.includes('AUC') || gName.includes('AUC') || gName.includes(' A ') || gName.includes('-A-')) {
    return 'Auction';
  }
  return 'Regular';
};

/**
 * Unified customer scheme matching function used across Dashboard KPI cards,
 * Customer Directory, and Chit Groups to guarantee 100% synchronized counts.
 */
export const customerBelongsToScheme = (
  c: any,
  scheme: 'ALL' | 'FIXED' | 'REGULAR' | 'AUCTION'
): boolean => {
  if (scheme === 'ALL') return true;

  // 1. Check in enrolled chits
  if (Array.isArray(c.chits) && c.chits.length > 0) {
    const hasMatch = c.chits.some((ch: any) => {
      const sch = String(ch.scheme || ch.type || ch.groupType || ch.plan || '').toUpperCase();
      const gName = String(ch.groupName || ch.groupId || '').toUpperCase();

      if (scheme === 'FIXED') {
        return sch.includes('FIX') || gName.includes('FIX') || gName.includes(' F ') || gName.includes('-F-');
      }
      if (scheme === 'AUCTION') {
        return sch.includes('AUC') || gName.includes('AUC') || gName.includes(' A ') || gName.includes('-A-');
      }
      if (scheme === 'REGULAR') {
        return (
          sch.includes('REG') ||
          gName.includes('REG') ||
          gName.includes(' R ') ||
          gName.includes('-R-') ||
          (!sch.includes('FIX') && !sch.includes('AUC') && !gName.includes('FIX') && !gName.includes('AUC'))
        );
      }
      return false;
    });
    if (hasMatch) return true;
  }

  // 2. Check direct scheme or interestedPlan on customer profile
  const direct = String(c.scheme || c.interestedPlan || c.plan || '').toUpperCase();
  if (direct) {
    if (scheme === 'FIXED') return direct.includes('FIX');
    if (scheme === 'AUCTION') return direct.includes('AUC');
    if (scheme === 'REGULAR') return direct.includes('REG') || (!direct.includes('FIX') && !direct.includes('AUC'));
  }

  return false;
};

export const getActiveBaseUrl = async (): Promise<string> => {
  // 1. User manual override
  try {
    const custom = await secureStorage.getItem('custom_api_base_url');
    if (custom && custom.trim().startsWith('http')) {
      cachedBaseUrl = custom.trim();
      return cachedBaseUrl;
    }
  } catch {}

  // 2. If running on Web, use localhost:3000 directly matching web app
  if (Platform.OS === 'web') {
    return customEnvUrl || `http://localhost:${envPort}/api/v1`;
  }

  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  // 3. For native devices (Android APK, Standalone, Emulator), test candidate endpoints
  const candidates = [
    `http://${LOCAL_DEV_IP}:${envPort}/api/v1`,
    `http://10.0.2.2:${envPort}/api/v1`,
    customEnvUrl,
    `http://localhost:${envPort}/api/v1`,
    PROD_API_URL,
  ].filter(Boolean) as string[];

  const uniqueCandidates = Array.from(new Set(candidates));

  for (const candidate of uniqueCandidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const healthUrl = `${candidate.replace(/\/api\/v1\/?$/, '')}/health`;
      const res = await fetch(healthUrl, {
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeout);
      if (res && res.status === 200) {
        cachedBaseUrl = candidate;
        return candidate;
      }
    } catch {}
  }

  // Fallback to active LAN dev endpoint or production
  cachedBaseUrl = `http://${LOCAL_DEV_IP}:${envPort}/api/v1`;
  return cachedBaseUrl;
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

    const rawSources = [
      await secureStorage.getItem('mockCustomers'),
      await secureStorage.getItem('synced_customers'),
    ];
    const localSavedMap = new Map<string, any>();
    for (const src of rawSources) {
      if (src) {
        try {
          const list = JSON.parse(src);
          if (Array.isArray(list)) {
            list.forEach((item) => {
              const k = (item.id || item.customerCode || item.mongoId || item._id || '').toLowerCase().trim();
              if (k && !localSavedMap.has(k)) {
                localSavedMap.set(k, item);
              }
            });
          }
        } catch {}
      }
    }
    const localSaved = Array.from(localSavedMap.values());

    // Map MongoDB records
    const mappedMongo: Customer[] = mongoCustomers.map((c) => {
      const existing = localSaved.find(
        (l) => l.id === (c.customerCode || c._id) || l.mongoId === c._id
      );
      const chits = c.chits && c.chits.length > 0 ? c.chits : existing?.chits || [];

      // Calculate total paid & pending from actual chits
      const chitPendingTotal = chits.reduce((acc: number, ch: any) => {
        const p = Number(ch.pending || ch.dueAmount || 0);
        if (p > 0) return acc + p;
        if (String(ch.paymentStatus || '').toUpperCase() === 'DUE') {
          return acc + Number(ch.monthlyInstallment || ch.installmentAmount || 0);
        }
        return acc;
      }, 0);

      const chitPaidTotal = chits.reduce((acc: number, ch: any) => {
        const p = Number(ch.totalPaid || ch.paidAmount || 0);
        if (p > 0) return acc + p;
        if (String(ch.paymentStatus || '').toUpperCase() === 'PAID') {
          return acc + Number(ch.monthlyInstallment || 0);
        }
        return acc;
      }, 0);

      const totalPaid = Math.max(Number(c.totalPaid || 0), Number(existing?.totalPaid || 0), chitPaidTotal);
      const pending = Math.max(Number(c.pending || 0), Number(existing?.pending || 0), chitPendingTotal);

        const rawSch = String(c.scheme || chits[0]?.scheme || existing?.scheme || c.interestedPlan || existing?.interestedPlan || 'Regular').toUpperCase();
        const resolvedScheme: 'Regular' | 'Fixed' | 'Auction' = rawSch.includes('FIX') ? 'Fixed' : rawSch.includes('AUC') ? 'Auction' : 'Regular';
        const resolvedPlan = c.interestedPlan || chits[0]?.groupName || existing?.interestedPlan || `${resolvedScheme} Scheme`;

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
          scheme: resolvedScheme,
          interestedPlan: resolvedPlan,
          chits,
          status: c.status || 'ACTIVE',
        };
    });

    // Merge any locally added customers that haven't reached mongo yet
    const unmergedLocal = localSaved.filter((loc) => {
      // If customer has a mongoId and we got live MongoDB data, but mongoId is missing, it was deleted!
      if (loc.mongoId && mongoCustomers.length > 0 && !mongoCustomers.some((m) => m._id === loc.mongoId)) {
        return false;
      }
      return !mappedMongo.some((m) => m.id === loc.id || (loc.mongoId && m.mongoId === loc.mongoId));
    });

    const deletedCustomerIds = await getDeletedCustomerIds();
    const cleanDigits = (p?: string) => (p || '').replace(/\D/g, '');

    const isRecordDeleted = (c: any): boolean => {
      if (isMockCustomer(c)) return true;
      const cId = String(c.id || c.customerCode || '').toLowerCase().trim();
      const cMongo = String(c.mongoId || c._id || '').toLowerCase().trim();
      const cPhone = cleanDigits(c.phone || c.mobile);
      const cName = String(c.name || c.fullName || '').toLowerCase().trim();

      if (cId && deletedCustomerIds.has(cId)) return true;
      if (cMongo && deletedCustomerIds.has(cMongo)) return true;
      if (cPhone && deletedCustomerIds.has(cPhone)) return true;
      if (cName && deletedCustomerIds.has(cName)) return true;
      return false;
    };

    const merged = [...mappedMongo, ...unmergedLocal]
      .filter((c) => !isRecordDeleted(c))
      .map((c) => ({
        ...c,
        chits: Array.isArray(c.chits) ? c.chits.filter((ch: any) => !isMockGroup(ch)) : [],
      }));

    await secureStorage.setItem('synced_customers', JSON.stringify(merged));
    await secureStorage.setItem('mockCustomers', JSON.stringify(merged));
    return merged;
  },

  /**
   * Save or register new customer across backend and persistent mobile cache
   */
  async saveCustomer(customerData: Partial<Customer>): Promise<Customer> {
    // Un-blacklist this customer if previously deleted
    await unblacklistCustomer(
      customerData.id,
      customerData.phone || customerData.mobile,
      customerData.name || customerData.fullName
    );

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
      scheme: (customerData as any).scheme || (customerData as any).interestedPlan,
      interestedPlan: (customerData as any).interestedPlan || (customerData as any).scheme,
      chits: customerData.chits || [],
      status: 'ACTIVE',
    };

    const existing = await this.getCustomers();
    const updated = [newCustomer, ...existing.filter((c) => c.id !== newCustomer.id)];
    await secureStorage.setItem('synced_customers', JSON.stringify(updated));
    await secureStorage.setItem('mockCustomers', JSON.stringify(updated));
    return newCustomer;
  },

  /**
   * Update existing customer details across backend and local storage
   */
  async updateCustomer(customerId: string, patchData: Partial<Customer>): Promise<Customer | null> {
    const customers = await this.getCustomers();
    const target = customers.find((c) => c.id === customerId || c.mongoId === customerId);
    if (!target) return null;

    let updatedChits = target.chits;
    if (patchData.scheme && Array.isArray(target.chits) && target.chits.length > 0) {
      updatedChits = target.chits.map((ch: any, idx: number) => {
        if (idx === 0) {
          return {
            ...ch,
            scheme: patchData.scheme,
            groupName: patchData.interestedPlan || (ch.groupName ? ch.groupName.replace(/Regular|Fixed|Auction/i, patchData.scheme!) : `${patchData.scheme} Scheme`),
          };
        }
        return ch;
      });
    }

    const updatedCustomer: Customer = {
      ...target,
      ...patchData,
      chits: updatedChits,
    };

    // 1. Update in backend
    try {
      const baseUrl = await getActiveBaseUrl();
      const lookupId = target.mongoId || target.id;
      await fetch(`${baseUrl}/customers/${encodeURIComponent(lookupId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patchData,
          chits: updatedChits,
        }),
      });
    } catch (e) {
      console.warn('Backend update customer error:', e);
    }

    // 2. Update local storage
    const updatedList = customers.map((c) => (c.id === customerId || c.mongoId === customerId ? updatedCustomer : c));
    await secureStorage.setItem('synced_customers', JSON.stringify(updatedList));
    await secureStorage.setItem('mockCustomers', JSON.stringify(updatedList));
    return updatedCustomer;
  },

  /**
   * Permanently delete customer with full cascade across all chits, receipts, and ledger
   */
  async deleteCustomer(target: { id: string; mongoId?: string; phone?: string; name?: string }): Promise<void> {
    await cascadeDeleteCustomerMobile(target);
  },

  /**
   * Sync and discover Chit Groups from all sources, merged cleanly by normalized name
   */
  async getChitGroups(): Promise<ChitGroup[]> {
    const customers = await this.getCustomers();
    const groupMap = new Map<string, ChitGroup>();

    // Helper to register or merge into groupMap
    const registerOrMergeGroup = (g: Partial<ChitGroup>) => {
      const gId = String(g.id || g.name || '').trim();
      const gName = String(g.name || g.id || gId).trim();
      if (!gId && !gName) return;

      const normKey = normalizeGroupName(gName) || normalizeGroupName(gId);
      if (!normKey) return;

      const pType = getGroupSchemeType({ type: g.type, name: gName, id: gId });
      const val = Number(g.value || 100000);
      const dur = Number(g.duration || 20);

      const existing = groupMap.get(normKey);
      if (!existing) {
        groupMap.set(normKey, {
          id: gId,
          name: gName,
          type: pType,
          value: val,
          duration: dur,
          currentMonth: Number(g.currentMonth || 1),
          members: Number(g.members || 20),
          filled: 0,
          status: g.status || 'ACTIVE',
        });
      } else {
        // Upgrade type if previously Regular and now specific
        if (existing.type === 'Regular' && pType !== 'Regular') {
          existing.type = pType;
        }
        if (val > 0) existing.value = val;
        if (dur > 0) existing.duration = dur;
      }
    };

    // 1. Discover all active groups populated by enrolled members
    customers.forEach((c) => {
      if (Array.isArray(c.chits)) {
        c.chits.forEach((ch: any) => {
          const gId = String(ch.groupId || ch.groupName || '').trim();
          const gName = String(ch.groupName || ch.groupId || gId).trim();
          const monthly = Number(ch.monthlyInstallment || 0);
          const val = Number(ch.chitValue || (monthly > 0 ? monthly * 20 : 100000));
          const dur = Number(ch.duration || 20);
          registerOrMergeGroup({
            id: gId,
            name: gName,
            type: ch.scheme,
            value: val,
            duration: dur,
          });
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
              registerOrMergeGroup({
                id: gId,
                name: gName,
                type: bg.planType,
                value: Number(bg.value || bg.chitValue || 100000),
                duration: Number(bg.duration || bg.durationMonths || 20),
                members: Number(bg.members || bg.memberCount || 20),
                status: bg.status || 'ACTIVE',
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Backend fetch chit-groups error:', e);
    }

    // 3. Add saved custom groups from local storage
    const groupSources = [
      await secureStorage.getItem('mockChitGroups'),
      await secureStorage.getItem('custom_chit_groups'),
    ];
    for (const src of groupSources) {
      if (src) {
        try {
          const customGroups: ChitGroup[] = JSON.parse(src);
          if (Array.isArray(customGroups)) {
            customGroups.forEach((cg) => {
              registerOrMergeGroup(cg);
            });
          }
        } catch {}
      }
    }

    // 3b. Add groups discovered from chitGroupMemberships
    let storedMemberships: any[] = [];
    try {
      const rawMem = await secureStorage.getItem('chitGroupMemberships');
      if (rawMem) {
        const mems = JSON.parse(rawMem);
        if (Array.isArray(mems)) {
          storedMemberships = mems;
          mems.forEach((m: any) => {
            const gId = String(m.groupId || m.groupName || '').trim();
            const gName = String(m.groupName || m.groupId || gId).trim();
            if (gId && !isMockGroup({ id: gId, name: gName })) {
              registerOrMergeGroup({
                id: gId,
                name: gName,
                type: m.scheme,
                value: Number(m.chitValue || 100000),
                duration: Number(m.duration || m.months || 20),
              });
            }
          });
        }
      }
    } catch {}

    // Filter all groups to ensure no mock groups exist and blacklisted groups are excluded
    const deletedGroupIds = await getDeletedGroupIds();
    const finalGroups = Array.from(groupMap.values()).filter((g) => {
      if (isMockGroup(g)) return false;
      const gId = String(g.id || '').toLowerCase().trim();
      const gName = String(g.name || '').toLowerCase().trim();
      const normKey = normalizeGroupName(g.name);
      if (gId && deletedGroupIds.has(gId)) return false;
      if (gName && deletedGroupIds.has(gName)) return false;
      if (normKey && deletedGroupIds.has(normKey)) return false;
      return true;
    });

    // Accurately compute filled count for each group by counting unique enrolled members
    finalGroups.forEach((grp) => {
      const normGName = normalizeGroupName(grp.name);
      const normGId = normalizeGroupName(grp.id);
      const enrolledSet = new Set<string>();

      // From customer chits
      customers.forEach((c) => {
        const cId = c.id || c.mongoId || c.phone || 'CUST';
        if (Array.isArray(c.chits)) {
          c.chits.forEach((ch: any, idx: number) => {
            const normChName = normalizeGroupName(ch.groupName);
            const normChId = normalizeGroupName(ch.groupId);
            if (
              (normGName && (normChName === normGName || normChId === normGName)) ||
              (normGId && (normChId === normGId || normChName === normGId))
            ) {
              enrolledSet.add(`${cId}_t_${ch.ticketNumber || idx}`);
            }
          });
        }
      });

      // From storedMemberships
      storedMemberships.forEach((m: any, idx: number) => {
        const normMName = normalizeGroupName(m.groupName);
        const normMId = normalizeGroupName(m.groupId);
        if (
          (normGName && (normMName === normGName || normMId === normGName)) ||
          (normGId && (normMId === normGId || normMName === normGId))
        ) {
          const mCustId = m.customerId || m.id || m.mobile || 'MEM';
          enrolledSet.add(`${mCustId}_t_${m.ticketNumber || idx}`);
        }
      });

      grp.filled = enrolledSet.size;
    });

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
    const customStored =
      (await secureStorage.getItem('custom_chit_groups')) ||
      (await secureStorage.getItem('mockChitGroups'));
    if (customStored) {
      try {
        existingCustom = JSON.parse(customStored);
      } catch {}
    }

    const updatedCustom = [newGroup, ...existingCustom.filter((g) => g.id !== newGroup.id)];
    await secureStorage.setItem('custom_chit_groups', JSON.stringify(updatedCustom));
    await secureStorage.setItem('mockChitGroups', JSON.stringify(updatedCustom));
    return newGroup;
  },

  /**
   * Update existing Chit Group details
   */
  async updateChitGroup(groupId: string, patchData: Partial<ChitGroup>): Promise<ChitGroup | null> {
    const groups = await this.getChitGroups();
    const target = groups.find((g) => g.id === groupId);
    if (!target) return null;

    const updatedGroup: ChitGroup = {
      ...target,
      ...patchData,
    };

    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/chit-groups/${encodeURIComponent(groupId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchData),
      });
    } catch (e) {
      console.warn('Backend update chit group error:', e);
    }

    const customStored =
      (await secureStorage.getItem('custom_chit_groups')) ||
      (await secureStorage.getItem('mockChitGroups'));
    let existingCustom: ChitGroup[] = customStored ? JSON.parse(customStored) : [];
    existingCustom = existingCustom.map((g) => (g.id === groupId ? updatedGroup : g));
    await secureStorage.setItem('custom_chit_groups', JSON.stringify(existingCustom));
    await secureStorage.setItem('mockChitGroups', JSON.stringify(existingCustom));
    return updatedGroup;
  },

  /**
   * Permanently delete Chit Group with full cascading cleanup
   */
  async deleteChitGroup(target: { id: string; name?: string }): Promise<void> {
    await cascadeDeleteGroupMobile(target);
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

    // 1. Sync directly to MongoDB customer record (both PATCH /customers/:id and POST /customers/:id/chits)
    const targetLookupId = targetCust?.mongoId || targetCust?.id || params.customerId;
    const otherChits = existingChits.filter((ch: any) => ch.groupId !== params.groupId);
    try {
      const baseUrl = await getActiveBaseUrl();
      // Update customer scheme and interestedPlan in backend
      await fetch(`${baseUrl}/customers/${encodeURIComponent(targetLookupId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheme: params.scheme,
          interestedPlan: params.groupName,
          chits: [newChit, ...otherChits],
        }),
      });

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
          scheme: params.scheme as any,
          interestedPlan: params.groupName,
          pending: (Number(c.pending) || 0) + params.monthlyInstallment,
          chits: [newChit, ...otherChits],
          activeChits: otherChits.length + 1,
        };
      }
      return c;
    });

    await secureStorage.setItem('synced_customers', JSON.stringify(updatedCusts));
    await secureStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
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

    // Local ledger merged across all sources
    const ledgerSources = [
      await secureStorage.getItem('ledgerTransactions'),
      await secureStorage.getItem('synced_ledger'),
      await secureStorage.getItem('mockLedgerTransactions'),
    ];
    const localLedgerMap = new Map<string, LedgerTransaction>();
    for (const src of ledgerSources) {
      if (src) {
        try {
          const list = JSON.parse(src);
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              if (item && item.id) {
                const low = String(item.id).toLowerCase().trim();
                if (!localLedgerMap.has(low)) {
                  localLedgerMap.set(low, item);
                }
              }
            });
          }
        } catch {}
      }
    }
    const localLedger = Array.from(localLedgerMap.values());

    const voidedRaw = (await secureStorage.getItem('voided_receipt_numbers')) || (await secureStorage.getItem('voidedReceiptNumbers'));
    const voidedSet = new Set<string>();
    if (voidedRaw) {
      try {
        JSON.parse(voidedRaw).forEach((v: string) => voidedSet.add(String(v).toLowerCase()));
      } catch {}
    }

    const seenIds = new Set(mappedMongo.map((m) => m.id));
    const deletedCustomerIds = await getDeletedCustomerIds();
    const deletedGroupIds = await getDeletedGroupIds();
    const cleanDigits = (p?: string) => (p || '').replace(/\D/g, '');

    const combined = [...mappedMongo, ...localLedger.filter((l) => !seenIds.has(l.id))]
      .filter((t) => {
        const tId = String(t.id || '').toLowerCase().trim();
        if (voidedSet.has(tId)) return false;
        if (inMemoryDeletedCustomerIds.has(tId)) return false;

        const cId = String(t.customerId || '').toLowerCase().trim();
        const cPhone = cleanDigits((t as any).customerMobile || (t as any).mobileNumber || (t as any).mobile);
        const cName = String(t.customerName || '').toLowerCase().trim();
        const gName = String(t.groupName || (t as any).chitGroup || (t as any).groupId || '').toLowerCase().trim();

        if (cId && (deletedCustomerIds.has(cId) || inMemoryDeletedCustomerIds.has(cId))) return false;
        if (cPhone && (deletedCustomerIds.has(cPhone) || inMemoryDeletedCustomerIds.has(cPhone))) return false;
        if (cName && (deletedCustomerIds.has(cName) || inMemoryDeletedCustomerIds.has(cName))) return false;
        if (tId && (deletedCustomerIds.has(tId) || inMemoryDeletedCustomerIds.has(tId))) return false;
        if (gName && (deletedGroupIds.has(gName) || inMemoryDeletedGroupIds.has(gName))) return false;
        return true;
      });

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

    // 2. Save in local ledger across all storage keys
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
    await secureStorage.setItem('mockLedgerTransactions', JSON.stringify(updatedLedger));
    await secureStorage.setItem('ledgerTransactions', JSON.stringify(updatedLedger));

    // 2b. Add to staffReceipts for instant reflection on Staff and Customer dashboards
    try {
      const rawStaff = await secureStorage.getItem('staffReceipts');
      const staffList = rawStaff ? JSON.parse(rawStaff) : [];
      const staffEntry = {
        receiptNo: receiptData.receiptNo,
        date: entryDate.split('T')[0],
        timestamp: entryDate,
        customerId: receiptData.customerId,
        customerName: receiptData.customerName,
        mobileNumber: '',
        chitGroup: receiptData.chitGroup,
        monthNumber: '1',
        amount: Number(receiptData.amount),
        dueAmount: Number(receiptData.amount),
        remainingBalance: 0,
        isPartial: false,
        mode: receiptData.paymentMode,
        referenceNo: receiptData.referenceNo || '',
        executive: receiptData.executive || 'Jenista Staff',
        status: 'COLLECTED',
        type: 'COLLECTION',
      };
      await secureStorage.setItem(
        'staffReceipts',
        JSON.stringify([staffEntry, ...staffList.filter((s: any) => s.receiptNo !== receiptData.receiptNo)])
      );
    } catch {}

    // 3. Update customer's paid & pending balances and chits in persistent storage
    const customers = await this.getCustomers();
    const cleanCustId = String(receiptData.customerId).trim().toLowerCase();
    const cleanCustName = String(receiptData.customerName).trim().toLowerCase();
    const amt = Number(receiptData.amount || 0);

    const updatedCusts = customers.map((c) => {
      const cId = String(c.id || c.mongoId || '').toLowerCase();
      const cName = String(c.name || c.fullName || '').toLowerCase();
      if (cId === cleanCustId || cName === cleanCustName) {
        const curPaid = Number(c.totalPaid || 0);
        const curPending = Number(c.pending || 0);
        const chits = Array.isArray(c.chits)
          ? c.chits.map((ch: any) => {
              if (
                !receiptData.chitGroup ||
                ch.groupId === receiptData.chitGroup ||
                ch.groupName === receiptData.chitGroup
              ) {
                return {
                  ...ch,
                  paymentStatus: 'PAID',
                  totalPaid: Number(ch.totalPaid || ch.paidAmount || 0) + amt,
                  pending: Math.max(0, Number(ch.pending || ch.monthlyInstallment || 0) - amt),
                };
              }
              return ch;
            })
          : [];

        return {
          ...c,
          totalPaid: curPaid + amt,
          pending: Math.max(0, curPending - amt),
          chits,
        };
      }
      return c;
    });
    await secureStorage.setItem('synced_customers', JSON.stringify(updatedCusts));
    await secureStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));

    // 4. Update Chit Group Memberships and mockChitGroups
    try {
      const rawMem = await secureStorage.getItem('chitGroupMemberships');
      if (rawMem) {
        const memberships = JSON.parse(rawMem);
        const updatedMem = memberships.map((m: any) => {
          if (
            (String(m.customerId).toLowerCase() === cleanCustId || String(m.customerName).toLowerCase() === cleanCustName) &&
            (!receiptData.chitGroup || m.groupId === receiptData.chitGroup || m.groupName === receiptData.chitGroup)
          ) {
            return { ...m, paymentStatus: 'PAID' };
          }
          return m;
        });
        await secureStorage.setItem('chitGroupMemberships', JSON.stringify(updatedMem));
      }
    } catch {}

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
  },

  /**
   * Get and manage Company Banks
   */
  async getBankAccounts() {
    const raw =
      (await secureStorage.getItem('company_banks')) ||
      (await secureStorage.getItem('companyBankAccounts'));
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    await secureStorage.setItem('company_banks', JSON.stringify(DEFAULT_COMPANY_BANKS));
    await secureStorage.setItem('companyBankAccounts', JSON.stringify(DEFAULT_COMPANY_BANKS));
    return DEFAULT_COMPANY_BANKS;
  },

  async saveBankAccounts(banks: any[]) {
    await secureStorage.setItem('company_banks', JSON.stringify(banks));
    await secureStorage.setItem('companyBankAccounts', JSON.stringify(banks));
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

    const pSources = [
      await secureStorage.getItem('paymentRequests'),
      await secureStorage.getItem('payment_requests'),
      await secureStorage.getItem('paymentVerifications'),
      await secureStorage.getItem('mockPaymentRequests'),
    ];
    const localReqsMap = new Map<string, PaymentRequest>();
    for (const src of pSources) {
      if (src) {
        try {
          const list = JSON.parse(src);
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              const key = String(item.id || item._id || item.referenceNumber || '').toLowerCase().trim();
              if (key && !localReqsMap.has(key)) {
                localReqsMap.set(key, item);
              }
            });
          }
        } catch {}
      }
    }
    const localReqs: PaymentRequest[] = Array.from(localReqsMap.values());

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

    const deletedIds = await getDeletedCustomerIds();
    const cleanDigits = (p?: string) => (p || '').replace(/\D/g, '');
    const seenIds = new Set(mappedMongo.map((m) => m.id));
    const merged = [...mappedMongo, ...localReqs.filter((l) => !seenIds.has(l.id))].filter((r) => {
      const rId = String(r.id || '').toLowerCase();
      const rCustId = String(r.customerId || '').toLowerCase();
      const rPhone = cleanDigits(r.customerMobile);
      const rName = String(r.customerName || '').toLowerCase().trim();

      if (['PAY-78201', 'PAY-78202', 'PAY-78203', 'PAY-78190'].includes(r.id)) return false;
      if (rId && deletedIds.has(rId)) return false;
      if (rCustId && deletedIds.has(rCustId)) return false;
      if (rPhone && deletedIds.has(rPhone)) return false;
      if (rName && deletedIds.has(rName)) return false;
      if (r.referenceNumber && deletedIds.has(String(r.referenceNumber).toLowerCase())) return false;
      return true;
    });

    merged.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    await secureStorage.setItem('payment_requests', JSON.stringify(merged));
    await secureStorage.setItem('paymentRequests', JSON.stringify(merged));
    await secureStorage.setItem('paymentVerifications', JSON.stringify(merged));
    await secureStorage.setItem('mockPaymentRequests', JSON.stringify(merged));
    return merged;
  },

  async submitPaymentRequest(reqData: Partial<PaymentRequest>): Promise<PaymentRequest> {
    const id = reqData.id || `PAY-${Date.now().toString().slice(-6)}`;
    const planName = reqData.planName || reqData.scheme || 'Regular';
    const monthNumber = reqData.monthNumber || '1';

    // Duplicate check across existing requests
    const existing = await this.getPaymentRequests();
    const isDuplicate = existing.some(r => {
      if (r.id === id) return false;
      const sameCust = (r.customerId && reqData.customerId && r.customerId === reqData.customerId) || 
                       (r.customerMobile && reqData.customerMobile && r.customerMobile.replace(/\D/g, '') === reqData.customerMobile.replace(/\D/g, ''));
      const sameGroup = String(r.groupId || r.groupName || '').toLowerCase() === String(reqData.groupId || reqData.groupName || '').toLowerCase();
      const sameMonth = String(r.monthNumber || '1') === String(monthNumber);
      const samePlan = String(r.planName || r.scheme || 'Regular').toLowerCase() === String(planName).toLowerCase();
      const isActive = r.status === 'PENDING' || r.status === 'APPROVED' || (r as any).status === 'PENDING_VERIFICATION';
      return sameCust && sameGroup && sameMonth && samePlan && isActive;
    });

    if (isDuplicate) {
      throw new Error(`Duplicate Payment Alert: A payment request for Group ${reqData.groupName || reqData.groupId} (${planName} Plan - Month ${monthNumber}) is already submitted. Duplicate requests are not permitted.`);
    }

    const newReq: PaymentRequest = {
      id,
      customerId: reqData.customerId || 'CUST',
      customerName: reqData.customerName || 'Customer',
      customerMobile: reqData.customerMobile || '',
      groupId: reqData.groupId || '',
      groupName: reqData.groupName || reqData.groupId || 'Chit Group',
      planName,
      scheme: planName,
      monthNumber,
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

    // 2. Save in local cache across all storage keys
    const currentList = await this.getPaymentRequests();
    const updated = [newReq, ...currentList.filter((r) => r.id !== id)];
    await secureStorage.setItem('payment_requests', JSON.stringify(updated));
    await secureStorage.setItem('paymentRequests', JSON.stringify(updated));
    await secureStorage.setItem('paymentVerifications', JSON.stringify(updated));
    await secureStorage.setItem('mockPaymentRequests', JSON.stringify(updated));

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
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
    const updated = existing.map((r) =>
      r.id === id || (r as any)._id === id || r.referenceNumber === id ? { ...r, ...updateData } : r
    );
    await secureStorage.setItem('payment_requests', JSON.stringify(updated));
    await secureStorage.setItem('paymentRequests', JSON.stringify(updated));
    await secureStorage.setItem('paymentVerifications', JSON.stringify(updated));
    await secureStorage.setItem('mockPaymentRequests', JSON.stringify(updated));

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage'));
    }
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

    const deletedIds = await getDeletedCustomerIds();
    const seenIds = new Set(mappedMongo.map((m) => m.id));
    const merged = [...mappedMongo, ...localClaims.filter((l) => !seenIds.has(l.id))];
    const filtered = merged.filter((claim) => {
      const cId = String(claim.id || '').toLowerCase().trim();
      const custId = String(claim.customerId || '').toLowerCase().trim();
      const mobile = String(claim.mobile || '').replace(/\D/g, '');
      const name = String(claim.customerName || '').toLowerCase().trim();
      if (cId && deletedIds.has(cId)) return false;
      if (custId && deletedIds.has(custId)) return false;
      if (mobile && deletedIds.has(mobile)) return false;
      if (name && deletedIds.has(name)) return false;
      return true;
    });
    filtered.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    await secureStorage.setItem('withdrawal_requests', JSON.stringify(filtered));
    return filtered;
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

  /**
   * Delete Payment Request with permanent cascade and blacklisting
   */
  async deletePaymentRequest(
    target: { id: string; customerId?: string; customerMobile?: string; referenceNo?: string } | string,
    referenceNo?: string
  ): Promise<void> {
    if (typeof target === 'string') {
      await cascadeDeletePaymentRequestMobile({ id: target, referenceNo });
    } else {
      await cascadeDeletePaymentRequestMobile({ ...target, referenceNo: target.referenceNo || referenceNo });
    }
  },

  /**
   * Delete Prize Withdrawal Claim
   */
  async deleteWithdrawalRequest(id: string): Promise<void> {
    await cascadeDeleteWithdrawalRequestMobile(id);
  },

  /**
   * Delete Lead Inquiry
   */
  async deleteLead(
    target: { id: string; phone?: string; name?: string; convertedCustomerId?: string } | string,
    phone?: string,
    name?: string
  ): Promise<void> {
    if (typeof target === 'string') {
      await cascadeDeleteLeadMobile({ id: target, phone, name });
    } else {
      await cascadeDeleteLeadMobile(target);
    }
  },

  /**
   * Add Manual Entry to General Ledger (Credit or Debit)
   */
  async addManualLedgerEntry(entryData: {
    type: 'CREDIT' | 'DEBIT';
    category: string;
    amount: number;
    description: string;
    paymentMode?: string;
    reference?: string;
    customerName?: string;
    customerId?: string;
    groupName?: string;
  }): Promise<LedgerTransaction> {
    const entryDate = new Date().toISOString();
    const id = `TXN-${Date.now().toString().slice(-6)}`;

    const newTxn: LedgerTransaction = {
      id,
      date: entryDate,
      type: entryData.type,
      category: (entryData.category || 'INSTALLMENT') as any,
      amount: Number(entryData.amount),
      reference: entryData.reference || id,
      description: entryData.description,
      collectedBy: 'Jenista Admin',
      paymentMode: entryData.paymentMode || 'Cash',
      customerName: entryData.customerName,
      customerId: entryData.customerId,
      groupName: entryData.groupName,
    };

    const ledger = await this.getLedgerTransactions();
    const updatedLedger = [newTxn, ...ledger];
    await secureStorage.setItem('synced_ledger', JSON.stringify(updatedLedger));
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}
    return newTxn;
  },

  /**
   * Void / Delete Receipt from Ledger
   */
  async voidReceipt(receiptNo: string): Promise<void> {
    const lowReceipt = (receiptNo || '').toLowerCase().trim();
    if (lowReceipt) {
      inMemoryDeletedCustomerIds.add(lowReceipt);
    }

    // 1. Blacklist receiptNo
    try {
      const raw = (await secureStorage.getItem('voided_receipt_numbers')) || (await secureStorage.getItem('voidedReceiptNumbers'));
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (receiptNo && !list.includes(receiptNo)) list.push(receiptNo);
      await secureStorage.setItem('voided_receipt_numbers', JSON.stringify(list));
      await secureStorage.setItem('voidedReceiptNumbers', JSON.stringify(list));

      const rawCust = await secureStorage.getItem('deleted_customer_ids');
      const custIds: string[] = rawCust ? JSON.parse(rawCust) : [];
      if (receiptNo && !custIds.includes(receiptNo)) custIds.push(receiptNo);
      await secureStorage.setItem('deleted_customer_ids', JSON.stringify(custIds));
      await secureStorage.setItem('deletedCustomerIds', JSON.stringify(custIds));
    } catch {}

    // 2. Remove from ledger stores & payment requests
    for (const key of ['synced_ledger', 'mockLedgerTransactions', 'ledgerTransactions', 'payment_requests', 'paymentRequests']) {
      try {
        const raw = await secureStorage.getItem(key);
        if (raw) {
          const list: any[] = JSON.parse(raw);
          const filtered = list.filter((l) => l.id !== receiptNo && l.reference !== receiptNo && l.referenceNumber !== receiptNo);
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      } catch {}
    }

    // 3. Remove from staffReceipts
    try {
      const raw = await secureStorage.getItem('staffReceipts');
      if (raw) {
        const list: any[] = JSON.parse(raw);
        const filtered = list.filter((r) => r.id !== receiptNo && r.receiptNumber !== receiptNo && r.receiptNo !== receiptNo);
        await secureStorage.setItem('staffReceipts', JSON.stringify(filtered));
      }
    } catch {}

    // 4. Delete on backend MongoDB if endpoint available
    try {
      const baseUrl = await getActiveBaseUrl();
      await fetch(`${baseUrl}/receipts/${encodeURIComponent(receiptNo)}`, { method: 'DELETE' });
    } catch {}

    // 5. Trigger web storage event
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('storage'));
      }
    } catch {}
  },
};
