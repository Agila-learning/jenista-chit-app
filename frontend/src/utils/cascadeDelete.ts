import { fetchClient } from '../api/client';

export interface CascadeDeleteTarget {
  customerId?: string;
  mongoId?: string;
  leadId?: string;
  phone?: string;
  mobile?: string;
  name?: string;
  fullName?: string;
}

/**
 * Normalizes phone numbers to digits only for reliable matching
 */
const cleanDigits = (p?: string): string => (p || '').replace(/\D/g, '');

/**
 * Permanently deletes a customer and ALL of their associated records everywhere:
 * - Customer profiles & credentials (mockCustomers)
 * - Landing Page CRM Leads (websiteLeads)
 * - Payment Section: verification requests (paymentRequests)
 * - Withdrawal / Disbursal claims (withdrawalRequests)
 * - Cash receipts & collection registers (staffReceipts)
 * - General Ledger financial transactions (ledgerTransactions)
 * - Chit Group memberships & enrollments (mockChitGroups, chitGroupMemberships)
 * - Bank account assignments (bankAssignments, companyBankAssignments)
 * - Live notifications & alerts (systemNotifications)
 * - Backend MongoDB database collections via cascading API
 */
export const cascadeDeleteCustomer = async (target: CascadeDeleteTarget): Promise<void> => {
  const targetId = target.customerId || target.mongoId || target.leadId || '';
  const targetPhone = cleanDigits(target.phone || target.mobile);
  const targetName = (target.name || target.fullName || '').trim().toLowerCase();

  // 1. Gather all related customer records from storage to extract all linked IDs/phones/names
  const idSet = new Set<string>();
  const phoneSet = new Set<string>();
  const nameSet = new Set<string>();

  if (targetId) idSet.add(targetId);
  if (target.mongoId) idSet.add(target.mongoId);
  if (target.customerId) idSet.add(target.customerId);
  if (targetPhone) phoneSet.add(targetPhone);
  if (targetName) nameSet.add(targetName);

  // Cross-reference with mockCustomers
  try {
    const rawCusts = localStorage.getItem('mockCustomers');
    if (rawCusts) {
      const parsed: any[] = JSON.parse(rawCusts);
      parsed.forEach((c: any) => {
        const cPhone = cleanDigits(c.phone || c.mobile);
        const cName = (c.name || c.fullName || '').trim().toLowerCase();
        const isMatch = (
          (targetId && (c.id === targetId || c.customerCode === targetId || c.mongoId === targetId)) ||
          (targetPhone && cPhone && cPhone === targetPhone) ||
          (targetName && cName && cName === targetName)
        );
        if (isMatch) {
          if (c.id) idSet.add(c.id);
          if (c.customerCode) idSet.add(c.customerCode);
          if (c.mongoId) idSet.add(c.mongoId);
          if (cPhone) phoneSet.add(cPhone);
          if (cName) nameSet.add(cName);
        }
      });
    }
  } catch {}

  // Cross-reference with websiteLeads
  try {
    const rawLeads = localStorage.getItem('websiteLeads');
    if (rawLeads) {
      const parsed: any[] = JSON.parse(rawLeads);
      parsed.forEach((l: any) => {
        const lPhone = cleanDigits(l.phone || l.mobile);
        const lName = (l.fullName || l.name || '').trim().toLowerCase();
        const isMatch = (
          (targetId && (l.id === targetId || l.convertedCustomerId === targetId)) ||
          (targetPhone && lPhone && lPhone === targetPhone) ||
          (targetName && lName && lName === targetName)
        );
        if (isMatch) {
          if (l.id) idSet.add(l.id);
          if (l.convertedCustomerId) idSet.add(l.convertedCustomerId);
          if (lPhone) phoneSet.add(lPhone);
          if (lName) nameSet.add(lName);
        }
      });
    }
  } catch {}

  const matchId = (val?: string) => Boolean(val && idSet.has(val));
  const matchPhone = (val?: string) => {
    const d = cleanDigits(val);
    return Boolean(d && phoneSet.has(d));
  };
  const matchName = (val?: string) => {
    const n = (val || '').trim().toLowerCase();
    return Boolean(n && nameSet.has(n));
  };

  // 2. Track in deletedCustomerIds blacklist so no background sync or polling resurrects them
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
    idSet.forEach(id => {
      if (!deletedList.includes(id)) deletedList.push(id);
    });
    phoneSet.forEach(ph => {
      if (!deletedList.includes(ph)) deletedList.push(ph);
    });
    localStorage.setItem('deletedCustomerIds', JSON.stringify(deletedList));
  } catch {}

  // 3. Purge from mockCustomers
  try {
    const rawCusts = localStorage.getItem('mockCustomers');
    if (rawCusts) {
      const parsed: any[] = JSON.parse(rawCusts);
      const cleanCusts = parsed.filter(c => {
        if (matchId(c.id) || matchId(c.customerCode) || matchId(c.mongoId)) return false;
        if (matchPhone(c.phone) || matchPhone(c.mobile)) return false;
        if (matchName(c.name) || matchName(c.fullName)) return false;
        return true;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(cleanCusts));
    }
  } catch {}

  // 4. Purge completely from websiteLeads (do NOT keep as rejected, remove entire record)
  try {
    const rawLeads = localStorage.getItem('websiteLeads');
    if (rawLeads) {
      const parsed: any[] = JSON.parse(rawLeads);
      const cleanLeads = parsed.filter(l => {
        if (matchId(l.id) || matchId(l.convertedCustomerId)) return false;
        if (matchPhone(l.phone) || matchPhone(l.mobile)) return false;
        if (matchName(l.fullName) || matchName(l.name)) return false;
        return true;
      });
      localStorage.setItem('websiteLeads', JSON.stringify(cleanLeads));
    }
  } catch {}

  // 5. Purge from paymentRequests (Payments verification section)
  try {
    const rawPayments = localStorage.getItem('paymentRequests');
    if (rawPayments) {
      const parsed: any[] = JSON.parse(rawPayments);
      const cleanPayments = parsed.filter((p: any) => {
        if (matchId(p.id) || matchId(p.customerId)) return false;
        if (matchPhone(p.mobile) || matchPhone(p.phone)) return false;
        if (matchName(p.customerName)) return false;
        return true;
      });
      localStorage.setItem('paymentRequests', JSON.stringify(cleanPayments));
    }
  } catch {}

  // 6. Purge from withdrawalRequests (Payments disbursals / prize money claims)
  try {
    const rawWithdrawals = localStorage.getItem('withdrawalRequests');
    if (rawWithdrawals) {
      const parsed: any[] = JSON.parse(rawWithdrawals);
      const cleanWithdrawals = parsed.filter((w: any) => {
        if (matchId(w.id) || matchId(w.customerId)) return false;
        if (matchPhone(w.mobile) || matchPhone(w.phone)) return false;
        if (matchName(w.customerName)) return false;
        return true;
      });
      localStorage.setItem('withdrawalRequests', JSON.stringify(cleanWithdrawals));
    }
  } catch {}

  // 7. Purge from staffReceipts (Cashier / staff receipts register)
  try {
    const rawReceipts = localStorage.getItem('staffReceipts');
    if (rawReceipts) {
      const parsed: any[] = JSON.parse(rawReceipts);
      const cleanReceipts = parsed.filter((r: any) => {
        if (matchId(r.receiptNo) || matchId(r.customerId)) return false;
        if (matchPhone(r.mobileNumber) || matchPhone(r.phone)) return false;
        if (matchName(r.customerName)) return false;
        return true;
      });
      localStorage.setItem('staffReceipts', JSON.stringify(cleanReceipts));
    }
  } catch {}

  // 8. Purge from ledgerTransactions (Financial ledger entries)
  try {
    const rawLedger = localStorage.getItem('ledgerTransactions');
    if (rawLedger) {
      const parsed: any[] = JSON.parse(rawLedger);
      const cleanLedger = parsed.filter((l: any) => {
        if (matchId(l.id) || matchId(l.customerId) || matchId(l.receiptNo) || matchId(l.paymentRequestId)) return false;
        const refCustId = l.reference?.split('/')?.[0]?.trim();
        if (matchId(refCustId)) return false;
        if (matchPhone(l.mobileNumber) || matchPhone(l.phone)) return false;
        if (matchName(l.customerName)) return false;
        return true;
      });
      localStorage.setItem('ledgerTransactions', JSON.stringify(cleanLedger));
    }
  } catch {}

  // 9. Purge from mockChitGroups (enrolledMembers list & filled count)
  try {
    const rawGroups = localStorage.getItem('mockChitGroups');
    if (rawGroups) {
      const parsed: any[] = JSON.parse(rawGroups);
      const updatedGroups = parsed.map((g: any) => {
        if (Array.isArray(g.enrolledMembers)) {
          const remaining = g.enrolledMembers.filter((m: any) => {
            if (matchId(m.id) || matchId(m.customerId)) return false;
            if (matchPhone(m.mobile) || matchPhone(m.phone)) return false;
            if (matchName(m.customerName) || matchName(m.name)) return false;
            return true;
          });
          return {
            ...g,
            enrolledMembers: remaining,
            filled: remaining.length
          };
        }
        return g;
      });
      localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
    }
  } catch {}

  // 10. Purge from chitGroupMemberships
  try {
    const rawMemberships = localStorage.getItem('chitGroupMemberships');
    if (rawMemberships) {
      const parsed: any[] = JSON.parse(rawMemberships);
      const cleanMemberships = parsed.filter((m: any) => {
        if (matchId(m.customerId) || matchId(m.id)) return false;
        if (matchPhone(m.mobile) || matchPhone(m.phone)) return false;
        if (matchName(m.customerName) || matchName(m.name)) return false;
        return true;
      });
      localStorage.setItem('chitGroupMemberships', JSON.stringify(cleanMemberships));
    }
  } catch {}

  // 11. Purge from bankAssignments / companyBankAssignments
  try {
    ['bankAssignments', 'companyBankAssignments'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.customerAssignments) {
          Object.keys(parsed.customerAssignments).forEach(k => {
            if (matchId(k)) delete parsed.customerAssignments[k];
          });
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    });
  } catch {}

  // 12. Purge from systemNotifications
  try {
    const rawNotifs = localStorage.getItem('systemNotifications');
    if (rawNotifs) {
      const parsed: any[] = JSON.parse(rawNotifs);
      const cleanNotifs = parsed.filter((n: any) => {
        if (matchId(n.metadata?.customerId)) return false;
        if (matchName(n.metadata?.customerName)) return false;
        if (n.message && (
          Array.from(idSet).some(id => n.message.includes(id)) ||
          Array.from(phoneSet).some(ph => n.message.includes(ph))
        )) return false;
        return true;
      });
      localStorage.setItem('systemNotifications', JSON.stringify(cleanNotifs));
    }
  } catch {}

  // 13. Dispatch reactive events to immediately refresh all open UI components
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('paymentSync'));
  window.dispatchEvent(new CustomEvent('notificationSync'));

  // 14. Permanently delete across all MongoDB Atlas collections via Backend
  try {
    const primaryId = target.mongoId || targetId;
    const qPhone = targetPhone || '';
    const qName = encodeURIComponent(target.name || target.fullName || '');
    if (primaryId) {
      await fetchClient(`/customers/${encodeURIComponent(primaryId)}?phone=${encodeURIComponent(qPhone)}&name=${qName}`, {
        method: 'DELETE'
      });
    }
  } catch (err) {
    console.warn('Backend cascading deletion request failed or completed offline:', err);
  }
};

/**
 * Permanently deletes a website lead and all of its associated records everywhere
 */
export const cascadeDeleteLead = async (params: {
  leadId: string;
  phone?: string;
  name?: string;
  fullName?: string;
  convertedCustomerId?: string;
}): Promise<void> => {
  return cascadeDeleteCustomer({
    leadId: params.leadId,
    customerId: params.convertedCustomerId,
    phone: params.phone,
    name: params.fullName || params.name
  });
};

export interface CascadeDeleteGroupTarget {
  groupId?: string;
  groupName?: string;
  mongoId?: string;
  groupCode?: string;
}

/**
 * Checks whether a chit group has been deleted
 */
export const isGroupDeleted = (id?: string, name?: string): boolean => {
  if (!id && !name) return false;
  try {
    const raw = localStorage.getItem('deletedGroupIds') || localStorage.getItem('deletedChitGroups');
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return false;
    const set = new Set(list.map(s => String(s).toLowerCase().trim()));
    if (id && set.has(String(id).toLowerCase().trim())) return true;
    if (name && set.has(String(name).toLowerCase().trim())) return true;
  } catch {}
  return false;
};

/**
 * Checks whether a customer or lead has been deleted
 */
export const isCustomerOrLeadDeleted = (id?: string, phone?: string, name?: string): boolean => {
  if (!id && !phone && !name) return false;
  try {
    const raw = localStorage.getItem('deletedCustomerIds');
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    if (!Array.isArray(list) || list.length === 0) return false;
    const set = new Set(list.map(s => String(s).toLowerCase().trim()));
    const pSet = new Set(list.map(s => cleanDigits(s)).filter(Boolean));

    if (id && set.has(String(id).toLowerCase().trim())) return true;
    if (phone) {
      const p = cleanDigits(phone);
      if (p && (pSet.has(p) || set.has(p))) return true;
    }
    if (name && set.has(String(name).toLowerCase().trim())) return true;
  } catch {}
  return false;
};

/**
 * Permanently deletes a chit group and ALL of its associated records everywhere:
 * - Group catalogue (mockChitGroups)
 * - Group memberships & enrollments (chitGroupMemberships)
 * - Removes group enrollments from customer profiles (mockCustomers[].chits)
 * - Payment requests for this group (paymentRequests)
 * - Withdrawal claims for this group (withdrawalRequests)
 * - Receipts referencing this group (staffReceipts)
 * - General ledger transactions referencing this group (ledgerTransactions)
 * - Bank routing assignments (companyBankAssignments)
 * - Notifications for this group (systemNotifications)
 * - Backend MongoDB collections via DELETE /chit-groups/:id
 */
export const cascadeDeleteGroup = async (target: CascadeDeleteGroupTarget | string): Promise<void> => {
  const targetObj: CascadeDeleteGroupTarget = typeof target === 'string'
    ? { groupId: target, groupName: target }
    : target;

  const idSet = new Set<string>();
  const nameSet = new Set<string>();

  const addId = (val?: string) => {
    if (!val) return;
    const s = String(val).trim();
    if (!s) return;
    idSet.add(s);
    idSet.add(s.toLowerCase());
    nameSet.add(s);
    nameSet.add(s.toLowerCase());
  };

  addId(targetObj.groupId);
  addId(targetObj.groupName);
  addId(targetObj.mongoId);
  addId(targetObj.groupCode);

  // 1. Cross-reference with mockChitGroups in localStorage to find matching details
  try {
    const rawGroups = localStorage.getItem('mockChitGroups');
    if (rawGroups) {
      const parsed: any[] = JSON.parse(rawGroups);
      parsed.forEach((g: any) => {
        const gId = String(g.id || g.code || '').trim();
        const gName = String(g.name || g.groupName || '').trim();
        const gMongo = String(g.mongoId || g._id || '').trim();
        const isMatch = (
          (gId && (idSet.has(gId) || idSet.has(gId.toLowerCase()))) ||
          (gName && (nameSet.has(gName) || nameSet.has(gName.toLowerCase()))) ||
          (gMongo && (idSet.has(gMongo) || idSet.has(gMongo.toLowerCase())))
        );
        if (isMatch) {
          addId(g.id);
          addId(g.code);
          addId(g.name);
          addId(g.groupName);
          addId(g.groupCode);
          addId(g.mongoId);
          addId(g._id);
        }
      });
    }
  } catch {}

  const matchGroup = (idOrName?: string) => {
    if (!idOrName) return false;
    const s = String(idOrName).trim().toLowerCase();
    return idSet.has(s) || nameSet.has(s);
  };

  // 2. Blacklist in deletedGroupIds & deletedChitGroups so sync loops NEVER resurrect it
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('deletedGroupIds') || '[]');
    idSet.forEach(item => {
      const lower = item.toLowerCase();
      if (!deletedList.includes(lower)) deletedList.push(lower);
    });
    localStorage.setItem('deletedGroupIds', JSON.stringify(deletedList));
    localStorage.setItem('deletedChitGroups', JSON.stringify(deletedList));
  } catch {}

  // 3. Purge from mockChitGroups
  try {
    const rawGroups = localStorage.getItem('mockChitGroups');
    if (rawGroups) {
      const parsed: any[] = JSON.parse(rawGroups);
      const cleanGroups = parsed.filter((g: any) => !matchGroup(g.id) && !matchGroup(g.name) && !matchGroup(g.code) && !matchGroup(g.mongoId));
      localStorage.setItem('mockChitGroups', JSON.stringify(cleanGroups));
    }
  } catch {}

  // 4. Purge from chitGroupMemberships
  try {
    const rawMem = localStorage.getItem('chitGroupMemberships');
    if (rawMem) {
      const parsed: any[] = JSON.parse(rawMem);
      const cleanMem = parsed.filter((m: any) => !matchGroup(m.groupId) && !matchGroup(m.groupName));
      localStorage.setItem('chitGroupMemberships', JSON.stringify(cleanMem));
    }
  } catch {}

  // 5. Purge group from mockCustomers.chits
  try {
    const rawCusts = localStorage.getItem('mockCustomers');
    if (rawCusts) {
      const parsed: any[] = JSON.parse(rawCusts);
      const updatedCusts = parsed.map((c: any) => {
        if (Array.isArray(c.chits)) {
          const remainingChits = c.chits.filter((ch: any) => !matchGroup(ch.groupId) && !matchGroup(ch.groupName));
          return {
            ...c,
            chits: remainingChits,
            activeChits: remainingChits.length
          };
        }
        return c;
      });
      localStorage.setItem('mockCustomers', JSON.stringify(updatedCusts));
    }
  } catch {}

  // 6. Purge from paymentRequests
  try {
    const rawPayments = localStorage.getItem('paymentRequests');
    if (rawPayments) {
      const parsed: any[] = JSON.parse(rawPayments);
      const cleanPayments = parsed.filter((p: any) => !matchGroup(p.groupId) && !matchGroup(p.groupName));
      localStorage.setItem('paymentRequests', JSON.stringify(cleanPayments));
    }
  } catch {}

  // 7. Purge from withdrawalRequests
  try {
    const rawWithdrawals = localStorage.getItem('withdrawalRequests');
    if (rawWithdrawals) {
      const parsed: any[] = JSON.parse(rawWithdrawals);
      const cleanWithdrawals = parsed.filter((w: any) => !matchGroup(w.groupId) && !matchGroup(w.groupName));
      localStorage.setItem('withdrawalRequests', JSON.stringify(cleanWithdrawals));
    }
  } catch {}

  // 8. Purge from staffReceipts
  try {
    const rawReceipts = localStorage.getItem('staffReceipts');
    if (rawReceipts) {
      const parsed: any[] = JSON.parse(rawReceipts);
      const cleanReceipts = parsed.filter((r: any) => !matchGroup(r.chitGroup) && !matchGroup(r.groupName));
      localStorage.setItem('staffReceipts', JSON.stringify(cleanReceipts));
    }
  } catch {}

  // 9. Purge from ledgerTransactions
  try {
    const rawLedger = localStorage.getItem('ledgerTransactions');
    if (rawLedger) {
      const parsed: any[] = JSON.parse(rawLedger);
      const cleanLedger = parsed.filter((l: any) => !matchGroup(l.groupId) && !matchGroup(l.groupName) && !matchGroup(l.group));
      localStorage.setItem('ledgerTransactions', JSON.stringify(cleanLedger));
    }
  } catch {}

  // 10. Purge from bankAssignments / companyBankAssignments
  try {
    ['bankAssignments', 'companyBankAssignments'].forEach(key => {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.groupAssignments) {
          Object.keys(parsed.groupAssignments).forEach(k => {
            if (matchGroup(k)) delete parsed.groupAssignments[k];
          });
          localStorage.setItem(key, JSON.stringify(parsed));
        }
      }
    });
  } catch {}

  // 11. Purge from systemNotifications
  try {
    const rawNotifs = localStorage.getItem('systemNotifications');
    if (rawNotifs) {
      const parsed: any[] = JSON.parse(rawNotifs);
      const cleanNotifs = parsed.filter((n: any) => {
        if (matchGroup(n.metadata?.groupId) || matchGroup(n.metadata?.groupName)) return false;
        return true;
      });
      localStorage.setItem('systemNotifications', JSON.stringify(cleanNotifs));
    }
  } catch {}

  // 12. Dispatch reactive events
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('paymentSync'));
  window.dispatchEvent(new CustomEvent('notificationSync'));

  // 13. Call backend MongoDB deletion API
  try {
    const primaryId = targetObj.mongoId || targetObj.groupId || targetObj.groupName;
    if (primaryId) {
      await fetchClient(`/chit-groups/${encodeURIComponent(primaryId)}`, {
        method: 'DELETE'
      });
    }
    if (targetObj.groupName && targetObj.groupName !== primaryId) {
      await fetchClient(`/chit-groups/${encodeURIComponent(targetObj.groupName)}`, {
        method: 'DELETE'
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Backend chit group deletion completed offline or failed:', err);
  }
};

/**
 * Startup integrity sanitizer: purges any lingering payment, withdrawal, or ledger records
 * belonging to blacklisted deletedCustomerIds and deletedGroupIds.
 */
export const cleanupDeletedRecords = (): void => {
  try {
    const deletedRaw = localStorage.getItem('deletedCustomerIds');
    const deletedGroupRaw = localStorage.getItem('deletedGroupIds') || localStorage.getItem('deletedChitGroups');

    const deletedSet = new Set<string>();
    const deletedPhoneSet = new Set<string>();
    if (deletedRaw) {
      const list: string[] = JSON.parse(deletedRaw);
      if (Array.isArray(list)) {
        list.forEach(i => {
          deletedSet.add(String(i).toLowerCase().trim());
          const d = cleanDigits(i);
          if (d) deletedPhoneSet.add(d);
        });
      }
    }

    const deletedGroupSet = new Set<string>();
    if (deletedGroupRaw) {
      const gList: string[] = JSON.parse(deletedGroupRaw);
      if (Array.isArray(gList)) {
        gList.forEach(g => deletedGroupSet.add(String(g).toLowerCase().trim()));
      }
    }

    const isRecordDeleted = (id?: string, phone?: string, name?: string): boolean => {
      if (id && deletedSet.has(String(id).toLowerCase().trim())) return true;
      if (phone) {
        const digits = cleanDigits(phone);
        if (digits && deletedPhoneSet.has(digits)) return true;
      }
      if (name && deletedSet.has(String(name).toLowerCase().trim())) return true;
      return false;
    };

    const isGrpDeleted = (id?: string, name?: string): boolean => {
      if (id && deletedGroupSet.has(String(id).toLowerCase().trim())) return true;
      if (name && deletedGroupSet.has(String(name).toLowerCase().trim())) return true;
      return false;
    };

    // Clean mockChitGroups
    if (deletedGroupSet.size > 0) {
      const rawGroups = localStorage.getItem('mockChitGroups');
      if (rawGroups) {
        const parsed = JSON.parse(rawGroups);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(g => !isGrpDeleted(g.id, g.name) && !isGrpDeleted(g.code, g.groupName) && !isGrpDeleted(g.mongoId));
          if (clean.length !== parsed.length) {
            localStorage.setItem('mockChitGroups', JSON.stringify(clean));
          }
        }
      }

      // Clean chitGroupMemberships
      const rawMem = localStorage.getItem('chitGroupMemberships');
      if (rawMem) {
        const parsed = JSON.parse(rawMem);
        if (Array.isArray(parsed)) {
          const clean = parsed.filter(m => !isGrpDeleted(m.groupId, m.groupName) && !isRecordDeleted(m.customerId, m.mobile, m.customerName));
          if (clean.length !== parsed.length) {
            localStorage.setItem('chitGroupMemberships', JSON.stringify(clean));
          }
        }
      }

      // Clean mockCustomers chits
      const rawCusts = localStorage.getItem('mockCustomers');
      if (rawCusts) {
        const parsed = JSON.parse(rawCusts);
        if (Array.isArray(parsed)) {
          let modified = false;
          const clean = parsed.map((c: any) => {
            if (Array.isArray(c.chits)) {
              const remaining = c.chits.filter((ch: any) => !isGrpDeleted(ch.groupId, ch.groupName));
              if (remaining.length !== c.chits.length) {
                modified = true;
                return { ...c, chits: remaining, activeChits: remaining.length };
              }
            }
            return c;
          });
          if (modified) {
            localStorage.setItem('mockCustomers', JSON.stringify(clean));
          }
        }
      }
    }

    // Clean paymentRequests
    const rawPayments = localStorage.getItem('paymentRequests');
    if (rawPayments) {
      const parsed = JSON.parse(rawPayments);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(p => 
          !isRecordDeleted(p.id, p.mobile, p.customerName) && 
          !isRecordDeleted(p.customerId, p.mobile, p.customerName) &&
          !isGrpDeleted(p.groupId, p.groupName)
        );
        if (clean.length !== parsed.length) {
          localStorage.setItem('paymentRequests', JSON.stringify(clean));
        }
      }
    }

    // Clean withdrawalRequests
    const rawWithdrawals = localStorage.getItem('withdrawalRequests');
    if (rawWithdrawals) {
      const parsed = JSON.parse(rawWithdrawals);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(w => 
          !isRecordDeleted(w.id, w.mobile, w.customerName) && 
          !isRecordDeleted(w.customerId, w.mobile, w.customerName) &&
          !isGrpDeleted(w.groupId, w.groupName)
        );
        if (clean.length !== parsed.length) {
          localStorage.setItem('withdrawalRequests', JSON.stringify(clean));
        }
      }
    }

    // Clean staffReceipts
    const rawReceipts = localStorage.getItem('staffReceipts');
    if (rawReceipts) {
      const parsed = JSON.parse(rawReceipts);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(r => 
          !isRecordDeleted(r.receiptNo, r.mobileNumber, r.customerName) && 
          !isRecordDeleted(r.customerId) &&
          !isGrpDeleted(r.chitGroup, r.groupName)
        );
        if (clean.length !== parsed.length) {
          localStorage.setItem('staffReceipts', JSON.stringify(clean));
        }
      }
    }

    // Clean ledgerTransactions
    const rawLedger = localStorage.getItem('ledgerTransactions');
    if (rawLedger) {
      const parsed = JSON.parse(rawLedger);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(l => 
          !isRecordDeleted(l.id, l.mobileNumber, l.customerName) && 
          !isRecordDeleted(l.customerId) && 
          !isRecordDeleted(l.paymentRequestId) &&
          !isGrpDeleted(l.groupId, l.groupName) &&
          !isGrpDeleted(l.group)
        );
        if (clean.length !== parsed.length) {
          localStorage.setItem('ledgerTransactions', JSON.stringify(clean));
        }
      }
    }
  } catch (err) {
    console.error('Error during cleanupDeletedRecords:', err);
  }
};

export interface CascadeDeletePaymentTarget {
  id: string;
  customerId?: string;
  customerName?: string;
  mobile?: string;
  referenceNo?: string;
  groupId?: string;
}

/**
 * Permanently deletes a payment verification request and all related receipt & ledger records
 */
export const cascadeDeletePaymentRequest = async (target: CascadeDeletePaymentTarget): Promise<void> => {
  const reqId = target.id;
  const custId = target.customerId;
  const mobileDigits = cleanDigits(target.mobile);

  // 1. Blacklist the payment request ID and customer/phone so sync never pulls it back
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
    if (reqId && !deletedList.includes(reqId)) deletedList.push(reqId);
    if (custId && !deletedList.includes(custId)) deletedList.push(custId);
    if (mobileDigits && !deletedList.includes(mobileDigits)) deletedList.push(mobileDigits);
    localStorage.setItem('deletedCustomerIds', JSON.stringify(deletedList));
  } catch {}

  // 2. Remove from paymentRequests in localStorage
  try {
    const rawPayments = localStorage.getItem('paymentRequests');
    if (rawPayments) {
      const parsed: any[] = JSON.parse(rawPayments);
      const remaining = parsed.filter((p: any) => p.id !== reqId && p._id !== reqId);
      localStorage.setItem('paymentRequests', JSON.stringify(remaining));
    }
  } catch {}

  // 3. Remove from staffReceipts in localStorage
  try {
    const rawReceipts = localStorage.getItem('staffReceipts');
    if (rawReceipts) {
      const parsed: any[] = JSON.parse(rawReceipts);
      const remaining = parsed.filter((r: any) => r.receiptNo !== reqId && (!target.referenceNo || r.referenceNo !== target.referenceNo));
      localStorage.setItem('staffReceipts', JSON.stringify(remaining));
    }
  } catch {}

  // 4. Remove from ledgerTransactions in localStorage
  try {
    const rawLedger = localStorage.getItem('ledgerTransactions');
    if (rawLedger) {
      const parsed: any[] = JSON.parse(rawLedger);
      const remaining = parsed.filter((l: any) => l.paymentRequestId !== reqId && l.id !== reqId && (!target.referenceNo || l.referenceNo !== target.referenceNo));
      localStorage.setItem('ledgerTransactions', JSON.stringify(remaining));
    }
  } catch {}

  // 5. Remove matching notifications
  try {
    const rawNotifs = localStorage.getItem('systemNotifications');
    if (rawNotifs) {
      const parsed: any[] = JSON.parse(rawNotifs);
      const remaining = parsed.filter((n: any) => n.metadata?.leadId !== reqId && (!target.referenceNo || n.metadata?.referenceNo !== target.referenceNo));
      localStorage.setItem('systemNotifications', JSON.stringify(remaining));
    }
  } catch {}

  // 6. Dispatch reactive storage & paymentSync events
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('paymentSync'));
  window.dispatchEvent(new CustomEvent('notificationSync'));

  // 7. Permanently delete from backend MongoDB
  try {
    await fetchClient(`/payments/requests/${encodeURIComponent(reqId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Backend payment request deletion offline or completed:', err);
  }
};

/**
 * Permanently deletes a withdrawal disbursal claim and purges its records
 */
export const cascadeDeleteWithdrawalRequest = async (target: { id: string; customerId?: string }): Promise<void> => {
  const reqId = target.id;
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('deletedCustomerIds') || '[]');
    if (reqId && !deletedList.includes(reqId)) {
      deletedList.push(reqId);
      localStorage.setItem('deletedCustomerIds', JSON.stringify(deletedList));
    }
  } catch {}

  try {
    const rawW = localStorage.getItem('withdrawalRequests');
    if (rawW) {
      const parsed: any[] = JSON.parse(rawW);
      const remaining = parsed.filter((w: any) => w.id !== reqId && w._id !== reqId);
      localStorage.setItem('withdrawalRequests', JSON.stringify(remaining));
    }
  } catch {}

  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('paymentSync'));
  window.dispatchEvent(new CustomEvent('notificationSync'));

  try {
    await fetchClient(`/payments/withdrawals/${encodeURIComponent(reqId)}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.warn('Backend withdrawal deletion offline or completed:', err);
  }
};
