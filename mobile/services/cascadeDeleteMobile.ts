import { secureStorage } from './storage';
import { getActiveBaseUrl } from './dataSync';

const cleanDigits = (p?: string): string => (p || '').replace(/\D/g, '');

/**
 * Returns the set of blacklisted customer/lead IDs, phone numbers, and names
 */
export const getDeletedCustomerIds = async (): Promise<Set<string>> => {
  const set = new Set<string>();
  try {
    const rawMobile = await secureStorage.getItem('deleted_customer_ids');
    if (rawMobile) {
      const list = JSON.parse(rawMobile);
      if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
    }
  } catch {}

  // Also check web shared localStorage key if in web mode
  try {
    const rawWeb = await secureStorage.getItem('deletedCustomerIds');
    if (rawWeb) {
      const list = JSON.parse(rawWeb);
      if (Array.isArray(list)) list.forEach(i => set.add(String(i).toLowerCase().trim()));
    }
  } catch {}

  return set;
};

/**
 * Returns the set of blacklisted chit group IDs and names
 */
export const getDeletedGroupIds = async (): Promise<Set<string>> => {
  const set = new Set<string>();
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
  if (name && deletedSet.has(String(name).toLowerCase().trim())) return true;
  return false;
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
  const targetId = target.id || target.mongoId || '';
  const targetPhone = cleanDigits(target.phone);
  const targetName = (target.name || '').trim().toLowerCase();

  const idSet = new Set<string>();
  const phoneSet = new Set<string>();
  const nameSet = new Set<string>();

  if (targetId) idSet.add(targetId);
  if (target.mongoId) idSet.add(target.mongoId);
  if (targetPhone) phoneSet.add(targetPhone);
  if (targetName) nameSet.add(targetName);

  // 1. Blacklist in storage
  try {
    const raw = await secureStorage.getItem('deleted_customer_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    idSet.forEach(i => { if (!list.includes(i)) list.push(i); });
    phoneSet.forEach(p => { if (!list.includes(p)) list.push(p); });
    if (targetName && !list.includes(targetName)) list.push(targetName);
    await secureStorage.setItem('deleted_customer_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedCustomerIds', JSON.stringify(list));
  } catch {}

  // 2. Remove from synced_customers & mockCustomers
  try {
    for (const key of ['synced_customers', 'mockCustomers']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(c => {
          const cId = c.id || c.customerCode || c.mongoId;
          const cPhone = cleanDigits(c.phone || c.mobile);
          const cName = (c.name || c.fullName || '').trim().toLowerCase();
          if (cId && idSet.has(cId)) return false;
          if (cPhone && phoneSet.has(cPhone)) return false;
          if (cName && nameSet.has(cName)) return false;
          return true;
        });
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 3. Remove payment requests for this customer
  try {
    for (const key of ['payment_requests', 'paymentRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(p => {
          const pCustId = p.customerId;
          const pPhone = cleanDigits(p.customerMobile || p.mobile);
          const pName = (p.customerName || '').trim().toLowerCase();
          if (pCustId && idSet.has(pCustId)) return false;
          if (pPhone && phoneSet.has(pPhone)) return false;
          if (pName && nameSet.has(pName)) return false;
          return true;
        });
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 4. Remove withdrawal requests
  try {
    for (const key of ['withdrawal_requests', 'withdrawalRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(w => {
          const wCustId = w.customerId;
          const wParamPhone = cleanDigits(w.mobile || w.phone);
          const wName = (w.customerName || '').trim().toLowerCase();
          if (wCustId && idSet.has(wCustId)) return false;
          if (wParamPhone && phoneSet.has(wParamPhone)) return false;
          if (wName && nameSet.has(wName)) return false;
          return true;
        });
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 5. Remove from receipts & ledger
  try {
    for (const key of ['synced_ledger', 'ledgerTransactions', 'staffReceipts']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(l => {
          const lCustId = l.customerId;
          const lPhone = cleanDigits(l.customerMobile || l.mobileNumber || l.mobile);
          const lName = (l.customerName || '').trim().toLowerCase();
          if (lCustId && idSet.has(lCustId)) return false;
          if (lPhone && phoneSet.has(lPhone)) return false;
          if (lName && nameSet.has(lName)) return false;
          return true;
        });
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

  // 6. Delete on backend MongoDB
  try {
    const baseUrl = await getActiveBaseUrl();
    const primaryId = target.mongoId || targetId;
    if (primaryId) {
      await fetch(
        `${baseUrl}/customers/${encodeURIComponent(primaryId)}?phone=${encodeURIComponent(targetPhone)}&name=${encodeURIComponent(targetName)}`,
        { method: 'DELETE' }
      );
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
}): Promise<void> => {
  const reqId = target.id;

  // 1. Blacklist in storage
  try {
    const raw = await secureStorage.getItem('deleted_customer_ids');
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (reqId && !list.includes(reqId)) list.push(reqId);
    await secureStorage.setItem('deleted_customer_ids', JSON.stringify(list));
    await secureStorage.setItem('deletedCustomerIds', JSON.stringify(list));
  } catch {}

  // 2. Remove from payment requests
  try {
    for (const key of ['payment_requests', 'paymentRequests']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(p => p.id !== reqId && p._id !== reqId);
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}

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

  try {
    const baseUrl = await getActiveBaseUrl();
    await fetch(`${baseUrl}/payments/withdrawals/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Backend delete withdrawal claim error:', err);
  }
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

  // Remove from leads
  try {
    for (const key of ['website_leads', 'websiteLeads']) {
      const raw = await secureStorage.getItem(key);
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const filtered = parsed.filter(l => l.id !== target.id);
        await secureStorage.setItem(key, JSON.stringify(filtered));
      }
    }
  } catch {}
};
