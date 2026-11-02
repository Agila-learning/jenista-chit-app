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

/**
 * Startup integrity sanitizer: purges any lingering payment, withdrawal, or ledger records
 * belonging to blacklisted deletedCustomerIds.
 */
export const cleanupDeletedRecords = (): void => {
  try {
    const deletedRaw = localStorage.getItem('deletedCustomerIds');
    if (!deletedRaw) return;
    const deletedList: string[] = JSON.parse(deletedRaw);
    if (!Array.isArray(deletedList) || deletedList.length === 0) return;

    const deletedSet = new Set(deletedList.map(item => String(item).toLowerCase().trim()));
    const deletedPhoneSet = new Set(deletedList.map(item => cleanDigits(item)).filter(Boolean));

    const isRecordDeleted = (id?: string, phone?: string, _name?: string): boolean => {
      if (id && deletedSet.has(String(id).toLowerCase().trim())) return true;
      if (phone) {
        const digits = cleanDigits(phone);
        if (digits && deletedPhoneSet.has(digits)) return true;
      }
      return false;
    };

    // Clean paymentRequests
    const rawPayments = localStorage.getItem('paymentRequests');
    if (rawPayments) {
      const parsed = JSON.parse(rawPayments);
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(p => !isRecordDeleted(p.id, p.mobile, p.customerName) && !isRecordDeleted(p.customerId));
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
        const clean = parsed.filter(w => !isRecordDeleted(w.id, w.mobile, w.customerName) && !isRecordDeleted(w.customerId));
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
        const clean = parsed.filter(r => !isRecordDeleted(r.receiptNo, r.mobileNumber, r.customerName) && !isRecordDeleted(r.customerId));
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
        const clean = parsed.filter(l => !isRecordDeleted(l.id, l.mobileNumber, l.customerName) && !isRecordDeleted(l.customerId) && !isRecordDeleted(l.paymentRequestId));
        if (clean.length !== parsed.length) {
          localStorage.setItem('ledgerTransactions', JSON.stringify(clean));
        }
      }
    }
  } catch (err) {
    console.error('Error during cleanupDeletedRecords:', err);
  }
};
