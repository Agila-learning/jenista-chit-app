import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';
import { Platform } from 'react-native';

const cleanDigits = (p?: string): string => (p || '').replace(/\D/g, '');

// In-memory blacklist for immediate reactive suppression within the session
export const inMemoryDeletedCustomerIds = new Set<string>();
export const inMemoryDeletedGroupIds = new Set<string>();

/**
 * Returns the set of blacklisted customer/lead IDs, phone numbers, and names
 */
export const getDeletedCustomerIds = async (): Promise<Set<string>> => {
  const set = new Set<string>(inMemoryDeletedCustomerIds);

  try {
    const rawMobile = await secureStorage.getItem('deleted_customer_ids');
    if (rawMobile) {
      const list = JSON.parse(rawMobile);
      if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
    }
  } catch {}

  // Also check web shared localStorage key
  try {
    const rawWeb = await secureStorage.getItem('deletedCustomerIds');
    if (rawWeb) {
      const list = JSON.parse(rawWeb);
      if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
    }
  } catch {}

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw1 = window.localStorage.getItem('deleted_customer_ids');
      const raw2 = window.localStorage.getItem('deletedCustomerIds');
      [raw1, raw2].forEach(raw => {
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
        }
      });
    } catch {}
  }

  return set;
};

/**
 * Returns the set of blacklisted chit group IDs and names
 */
export const getDeletedGroupIds = async (): Promise<Set<string>> => {
  const set = new Set<string>(inMemoryDeletedGroupIds);

  try {
    const rawMobile = await secureStorage.getItem('deleted_group_ids');
    if (rawMobile) {
      const list = JSON.parse(rawMobile);
      if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
    }
  } catch {}

  try {
    const rawWeb = await secureStorage.getItem('deletedGroupIds');
    if (rawWeb) {
      const list = JSON.parse(rawWeb);
      if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
    }
  } catch {}

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw1 = window.localStorage.getItem('deleted_group_ids');
      const raw2 = window.localStorage.getItem('deletedGroupIds');
      [raw1, raw2].forEach(raw => {
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
        }
      });
    } catch {}
  }

  return set;
};

/**
 * Checks if a chit group is marked as deleted
 */
export const isGroupDeleted = async (id?: string, name?: string): Promise<boolean> => {
  if (!id && !name) return false;
  const deletedSet = await getDeletedGroupIds();
  if (id && deletedSet.has(String(id).toLowerCase().trim())) return true;
  if (name && deletedSet.has(String(name).toLowerCase().trim())) return true;
  return false;
};

/**
 * Checks if a customer or lead is marked as deleted
 */
export const isCustomerOrLeadDeleted = async (
  id?: string,
  phone?: string,
  name?: string
): Promise<boolean> => {
  if (!id && !phone && !name) return false;
  const deletedSet = await getDeletedCustomerIds();

  if (id && deletedSet.has(String(id).toLowerCase().trim())) return true;
  if (phone) {
    const d = cleanDigits(phone);
    if (d && deletedSet.has(d)) return true;
    if (deletedSet.has(String(phone).toLowerCase().trim())) return true;
  }
  if (name) {
    const n = String(name).toLowerCase().trim();
    if (deletedSet.has(n)) return true;
  }
  return false;
};

/**
 * Removes customer identifier and phone from blacklist when actively registered/created
 */
export const unblacklistCustomer = async (
  id?: string,
  phone?: string,
  name?: string
): Promise<void> => {
  const targetId = (id || '').toLowerCase().trim();
  const targetPhone = cleanDigits(phone);
  const targetName = (name || '').toLowerCase().trim();

  if (targetId) inMemoryDeletedCustomerIds.delete(targetId);
  if (targetPhone) inMemoryDeletedCustomerIds.delete(targetPhone);
  if (targetName) inMemoryDeletedCustomerIds.delete(targetName);

  for (const key of ['deleted_customer_ids', 'deletedCustomerIds']) {
    try {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const list: string[] = JSON.parse(raw);
        if (Array.isArray(list)) {
          const filtered = list.filter((item) => {
            const i = String(item).toLowerCase().trim();
            if (targetId && i === targetId) return false;
            if (targetPhone && (i === targetPhone || cleanDigits(i) === targetPhone)) return false;
            if (targetName && i === targetName) return false;
            return true;
          });
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
    for (const key of ['deleted_customer_ids', 'deletedCustomerIds']) {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) {
          const list: string[] = JSON.parse(raw);
          if (Array.isArray(list)) {
            const filtered = list.filter((item) => {
              const i = String(item).toLowerCase().trim();
              if (targetId && i === targetId) return false;
              if (targetPhone && (i === targetPhone || cleanDigits(i) === targetPhone)) return false;
              if (targetName && i === targetName) return false;
              return true;
            });
            window.localStorage.setItem(key, JSON.stringify(filtered));
          }
        }
      } catch {}
    }
  }
};

/**
 * Cascading deletion of a customer across all mobile persistent stores and backend MongoDB
 */
export const cascadeDeleteCustomerMobile = async (target: {
  id: string;
  mongoId?: string;
  phone?: string;
  name?: string;
}): Promise<void> => {
  const targetId = (target.id || target.mongoId || '').trim();
  const targetPhone = cleanDigits(target.phone);
  const targetName = (target.name || '').trim().toLowerCase();

  const idSet = new Set<string>();
  const phoneSet = new Set<string>();
  const nameSet = new Set<string>();

  if (targetId) {
    idSet.add(targetId);
    idSet.add(targetId.toLowerCase());
    const digits = cleanDigits(targetId);
    if (digits.length >= 10) phoneSet.add(digits);
  }
  if (target.mongoId) {
    idSet.add(target.mongoId);
    idSet.add(target.mongoId.toLowerCase());
  }
  if (targetPhone) {
    phoneSet.add(targetPhone);
    idSet.add(targetPhone);
  }
  if (targetName) {
    nameSet.add(targetName);
  }

  // Gather and cross-reference all linked aliases from local customer caches
  for (const key of ['synced_customers', 'mockCustomers', 'mobile_website_leads', 'websiteLeads']) {
    try {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => {
            const cId = String(c.id || c.customerCode || c.mongoId || c._id || '').toLowerCase().trim();
            const cPhone = cleanDigits(c.phone || c.mobile);
            const cName = String(c.name || c.fullName || c.customerName || '').toLowerCase().trim();

            const isMatch = (
              (targetId && (cId === targetId.toLowerCase() || cId === targetId.trim())) ||
              (targetPhone && cPhone && cPhone === targetPhone) ||
              (targetName && cName && cName === targetName.toLowerCase().trim())
            );

            if (isMatch) {
              if (c.id) { idSet.add(String(c.id)); idSet.add(String(c.id).toLowerCase().trim()); }
              if (c.customerCode) { idSet.add(String(c.customerCode)); idSet.add(String(c.customerCode).toLowerCase().trim()); }
              if (c.mongoId) { idSet.add(String(c.mongoId)); idSet.add(String(c.mongoId).toLowerCase().trim()); }
              if (c._id) { idSet.add(String(c._id)); idSet.add(String(c._id).toLowerCase().trim()); }
              if (cPhone) { phoneSet.add(cPhone); idSet.add(cPhone); }
              if (cName) { nameSet.add(cName); }
            }
          });
        }
      }
    } catch {}
  }

  // Update in-memory set immediately
  idSet.forEach(i => inMemoryDeletedCustomerIds.add(i.toLowerCase()));
  phoneSet.forEach(p => inMemoryDeletedCustomerIds.add(p));
  nameSet.forEach(n => inMemoryDeletedCustomerIds.add(n));

  // 1. Blacklist in storage across all keys
  try {
    const raw = await secureStorage.getItem('deleted_customer_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    idSet.forEach(i => { if (!list.includes(i)) list.push(i); });
    phoneSet.forEach(p => { if (!list.includes(p)) list.push(p); });
    nameSet.forEach(n => { if (!list.includes(n)) list.push(n); });
    await secureStorage.setItem('deleted_customer_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedCustomerIds', JSON.stringify(list));

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('deleted_customer_ids', JSON.stringify(list));
      window.localStorage.setItem('deletedCustomerIds', JSON.stringify(list));
    }
  } catch {}

  const matchId = (val?: any): boolean => {
    if (!val) return false;
    const v = String(val).toLowerCase().trim();
    return idSet.has(v) || idSet.has(String(val).trim());
  };

  const matchPhone = (val?: any): boolean => {
    const d = cleanDigits(val);
    return Boolean(d && phoneSet.has(d));
  };

  const matchName = (val?: any): boolean => {
    if (!val) return false;
    const n = String(val).toLowerCase().trim();
    if (nameSet.has(n)) return true;
    return false;
  };

  const isCustomerRecordMatch = (c: any): boolean => {
    if (!c) return false;
    if (matchId(c.id) || matchId(c.customerCode) || matchId(c.mongoId) || matchId(c._id) || matchId(c.customerId)) return true;
    if (matchPhone(c.phone) || matchPhone(c.mobile) || matchPhone(c.mobileNumber)) return true;
    if (matchName(c.name) || matchName(c.fullName) || matchName(c.customerName)) return true;
    return false;
  };

  // 2. Remove from synced_customers & mockCustomers
  try {
    for (const key of ['synced_customers', 'mockCustomers']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(c => !isCustomerRecordMatch(c));
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}

  // 3. Purge from website leads CRM
  try {
    for (const key of ['mobile_website_leads', 'websiteLeads']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(l => !isCustomerRecordMatch(l) && !matchId(l.convertedCustomerId));
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}

  // 4. Scrub from Chit Groups & Memberships
  try {
    for (const key of ['mockChitGroups', 'custom_chit_groups']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const updated = parsed.map(g => {
            if (Array.isArray(g.enrolledMembers)) {
              const remaining = g.enrolledMembers.filter((m: any) => !isCustomerRecordMatch(m));
              return {
                ...g,
                enrolledMembers: remaining,
                filled: remaining.length,
              };
            }
            return g;
          });
          await secureStorage.setItem(key, JSON.stringify(updated));
        }
      }
    }
  } catch {}

  try {
    const rawMem = await secureStorage.getItem('chitGroupMemberships');
    if (rawMem) {
      const parsed: any[] = JSON.parse(rawMem);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((m: any) => !isCustomerRecordMatch(m));
        await secureStorage.setItem('chitGroupMemberships', JSON.stringify(filtered));
      }
    }
  } catch {}

  // 5. Remove payment requests for this customer
  try {
    for (const key of ['payment_requests', 'paymentRequests', 'paymentVerifications', 'mockPaymentRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(p => !isCustomerRecordMatch(p));
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}

  // 6. Remove withdrawal requests
  try {
    for (const key of ['withdrawal_requests', 'withdrawalRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(w => !isCustomerRecordMatch(w));
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}

  // 7. Remove from receipts & ledger
  try {
    for (const key of ['synced_ledger', 'ledgerTransactions', 'staffReceipts', 'mockLedgerTransactions']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(l => !isCustomerRecordMatch(l));
          await secureStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    }
  } catch {}

  // 8. Delete on backend MongoDB
  try {
    const baseUrl = await getActiveBaseUrl();
    const primaryId = target.mongoId || targetId;
    if (primaryId) {
      await fetch(
        `${baseUrl}/customers/${encodeURIComponent(primaryId)}?phone=${encodeURIComponent(targetPhone)}&name=${encodeURIComponent(targetName)}`,
        { method: 'DELETE' }
      );
    }
    if (target.mongoId && target.mongoId !== targetId) {
      await fetch(
        `${baseUrl}/customers/${encodeURIComponent(target.mongoId)}?phone=${encodeURIComponent(targetPhone)}&name=${encodeURIComponent(targetName)}`,
        { method: 'DELETE' }
      ).catch(() => null);
    }
  } catch (err) {
    console.warn('Backend customer deletion completed offline or skipped:', err);
  }
};

/**
 * Cascading deletion of a Chit Group across all mobile persistent stores and backend MongoDB
 */
export const cascadeDeleteGroupMobile = async (target: {
  id: string;
  name?: string;
}): Promise<void> => {
  const gId = (target.id || '').trim();
  const gName = (target.name || gId).trim();
  const gIdLower = gId.toLowerCase();
  const gNameLower = gName.toLowerCase();

  const matchGroup = (val?: string) => {
    if (!val) return false;
    const v = String(val).toLowerCase().trim();
    return v === gIdLower || v === gNameLower;
  };

  // 1. Blacklist in storage
  try {
    const raw = await secureStorage.getItem('deleted_group_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (gId && !list.includes(gId)) list.push(gId);
    if (gName && !list.includes(gName)) list.push(gName);
    await secureStorage.setItem('deleted_group_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedGroupIds', JSON.stringify(list));
  } catch {}

  // 2. Remove from custom_chit_groups & mockChitGroups
  try {
    for (const key of ['custom_chit_groups', 'mockChitGroups']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(g => !matchGroup(g.id) && !matchGroup(g.name) && !matchGroup(g.groupName));
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 3. Scrub from customer chits
  try {
    for (const key of ['synced_customers', 'mockCustomers']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const updated = parsed.map(c => {
          if (Array.isArray(c.chits)) {
            const cleanChits = c.chits.filter((ch: any) => !matchGroup(ch.groupId) && !matchGroup(ch.groupName));
            return {
              ...c,
              chits: cleanChits,
              activeChits: cleanChits.length,
            };
          }
          return c;
        });
        await secureStorage.setItem(key, JSON.stringify(updated));
      }
    }
  } catch {}

  // 4. Scrub from payment_requests, withdrawal_requests, ledger
  try {
    for (const key of ['payment_requests', 'paymentRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(p => !matchGroup(p.groupId) && !matchGroup(p.groupName));
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
    for (const key of ['synced_ledger', 'ledgerTransactions']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(l => !matchGroup(l.groupId) && !matchGroup(l.groupName));
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 5. Delete on backend MongoDB
  try {
    const baseUrl = await getActiveBaseUrl();
    await fetch(`${baseUrl}/chit-groups/${encodeURIComponent(gId)}`, { method: 'DELETE' });
    if (gName && gName !== gId) {
      await fetch(`${baseUrl}/chit-groups/${encodeURIComponent(gName)}`, { method: 'DELETE' }).catch(() => {});
    }
  } catch (err) {
    console.warn('Backend chit group delete error:', err);
  }
};

/**
 * Permanently delete a payment verification request
 */
export const cascadeDeletePaymentRequestMobile = async (target: {
  id: string;
  customerId?: string;
  customerMobile?: string;
  referenceNo?: string;
}): Promise<void> => {
  const reqId = target.id;
  const refNo = target.referenceNo;

  if (reqId) inMemoryDeletedCustomerIds.add(reqId.toLowerCase().trim());
  if (refNo) inMemoryDeletedCustomerIds.add(refNo.toLowerCase().trim());
  if (target.customerId) inMemoryDeletedCustomerIds.add(target.customerId.toLowerCase().trim());
  if (target.customerMobile) {
    const d = cleanDigits(target.customerMobile);
    if (d) inMemoryDeletedCustomerIds.add(d);
  }

  // 1. Blacklist in storage
  try {
    const raw = await secureStorage.getItem('deleted_customer_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (reqId && !list.includes(reqId)) list.push(reqId);
    if (refNo && !list.includes(refNo)) list.push(refNo);
    if (target.customerId && !list.includes(target.customerId)) list.push(target.customerId);
    if (target.customerMobile) {
      const d = cleanDigits(target.customerMobile);
      if (d && !list.includes(d)) list.push(d);
    }
    await secureStorage.setItem('deleted_customer_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedCustomerIds', JSON.stringify(list));
  } catch {}

  // 2. Remove from payment requests and ledger across all stores
  for (const key of ['payment_requests', 'paymentRequests', 'paymentVerifications', 'mockPaymentRequests', 'synced_ledger', 'mockLedgerTransactions', 'ledgerTransactions', 'staffReceipts']) {
    try {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(
          p =>
            p.id !== reqId &&
            p._id !== reqId &&
            p.receiptNo !== reqId &&
            p.receiptNumber !== reqId &&
            (!refNo || (p.referenceNumber !== refNo && p.referenceNo !== refNo && p.reference !== refNo))
        );
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    } catch {}
  }

  // 3. Delete from backend MongoDB
  try {
    const baseUrl = await getActiveBaseUrl();
    await fetch(`${baseUrl}/payments/requests/${encodeURIComponent(reqId)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Backend delete payment request error:', err);
  }
};

/**
 * Permanently delete a withdrawal claim
 */
export const cascadeDeleteWithdrawalRequestMobile = async (id: string): Promise<void> => {
  if (id) inMemoryDeletedCustomerIds.add(id.toLowerCase().trim());

  // 1. Blacklist in storage
  try {
    const raw = await secureStorage.getItem('deleted_customer_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (id && !list.includes(id)) list.push(id);
    await secureStorage.setItem('deleted_customer_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedCustomerIds', JSON.stringify(list));
  } catch {}

  // 2. Remove from stores
  try {
    for (const key of ['withdrawal_requests', 'withdrawalRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(w => w.id !== id && w._id !== id);
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 3. Delete on backend
  try {
    const baseUrl = await getActiveBaseUrl();
    await fetch(`${baseUrl}/payments/withdrawals/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Backend delete withdrawal claim error:', err);
  }

  // 4. Trigger web storage event
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new Event('storage'));
    }
  } catch {}
};

/**
 * Permanently delete a lead
 */
export const cascadeDeleteLeadMobile = async (target: {
  id: string;
  phone?: string;
  name?: string;
  convertedCustomerId?: string;
}): Promise<void> => {
  if (target.id) inMemoryDeletedCustomerIds.add(target.id.toLowerCase().trim());
  if (target.phone) {
    const d = cleanDigits(target.phone);
    if (d) inMemoryDeletedCustomerIds.add(d);
  }
  if (target.name) inMemoryDeletedCustomerIds.add(target.name.toLowerCase().trim());

  // If converted to customer, delete customer too
  if (target.convertedCustomerId) {
    await cascadeDeleteCustomerMobile({
      id: target.convertedCustomerId,
      phone: target.phone,
      name: target.name,
    });
  } else {
    // Blacklist lead
    const deletedSet = await getDeletedCustomerIds();
    const list = Array.from(deletedSet);
    if (target.id && !list.includes(target.id)) list.push(target.id);
    if (target.phone) {
      const d = cleanDigits(target.phone);
      if (d && !list.includes(d)) list.push(d);
    }
    if (target.name && !list.includes(target.name)) list.push(target.name);
    await secureStorage.setItem('deleted_customer_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedCustomerIds', JSON.stringify(list));
  }

  // Remove from leads across all mobile and web keys
  try {
    for (const key of ['mobile_website_leads', 'website_leads', 'websiteLeads']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(l => {
          if (l.id === target.id) return false;
          if (target.phone && cleanDigits(l.phone) === cleanDigits(target.phone)) return false;
          if (target.name && l.fullName?.toLowerCase().trim() === target.name.toLowerCase().trim()) return false;
          return true;
        });
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}
};
