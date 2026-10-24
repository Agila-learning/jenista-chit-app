/**
 * Utility to identify and purge mock chit groups, mock customers, and associated dummy data.
 */

export const MOCK_GROUP_IDS = new Set([
  'CG-REG-101', 'CG-REG-102', 'CG-REG-103', 'CG-REG-104',
  'CG-FIX-201', 'CG-FIX-202',
  'CG-AUC-301', 'CG-AUC-302',
  'CHIT-100K-A', 'CHIT-200K-B'
]);

export const MOCK_GROUP_NAMES = new Set([
  'Regular 1L - Group A',
  'Regular 2L - Group B',
  'Regular 5L - Group C',
  'Regular 10L - Group D',
  'Fixed 1L - Series A',
  'Fixed 2L - Series B',
  'Auction 5L - Gold A',
  'Auction 10L - Diamond B',
  'Gold Series A'
]);

export const MOCK_CUSTOMER_IDS = new Set([
  'TC-10045', 'TC-10046', 'TC-10047', 'TC-10048',
  'CUST-1001', 'CUST-1002', 'CUST-1003', 'CUST-1004', 'CUST-1005',
  'CUST-1006', 'CUST-1007', 'CUST-1008', 'CUST-1009', 'CUST-1010',
  'CUST-1011', 'CUST-1012', 'CUST-1013', 'CUST-1014', 'CUST-1015',
  'CUST-1016', 'CUST-1017', 'CUST-1018', 'CUST-1019', 'CUST-1020'
]);

export const MOCK_CUSTOMER_NAMES = new Set([
  'S. Murugan', 'K. Selvam', 'R. Priya', 'M. Kumar', 'A. Lakshmi',
  'V. Saravanan', 'P. Suresh', 'T. Anand', 'D. Kavitha', 'N. Ramesh',
  'B. Divya', 'J. Karthik', 'G. Balaji', 'S. Vijay', 'M. Senthil',
  'K. Revathi', 'P. Mani', 'R. Vignesh', 'E. Rajesh', 'S. Deepa',
  'Rahul Sharma', 'Karthik Subramanian', 'Priya Meenakshi', 'Customer Demo'
]);

export const isMockGroup = (g: any): boolean => {
  if (!g) return false;
  const id = String(g.id || g.code || g.groupId || '').trim();
  const name = String(g.name || g.groupName || '').trim();

  if (MOCK_GROUP_IDS.has(id)) return true;
  if (MOCK_GROUP_NAMES.has(name)) return true;
  if (/^CHIT-(100K-A|200K-B)$/i.test(id)) return true;
  return false;
};

export const isMockCustomer = (c: any): boolean => {
  if (!c) return false;
  const id = String(c.id || c.customerId || c.customerCode || c.mongoId || '').trim();
  const name = String(c.name || c.customerName || c.fullName || '').trim();

  if (MOCK_CUSTOMER_IDS.has(id)) return true;
  if (MOCK_CUSTOMER_NAMES.has(name)) return true;
  if (/^CUST-10(0[1-9]|1[0-9]|20)$/.test(id)) return true;
  if (/^TC-1004[5-8]$/.test(id)) return true;
  return false;
};

export const purgeMockData = (): void => {
  try {
    // 1. Purge mock groups
    const rawGroups = localStorage.getItem('mockChitGroups');
    if (rawGroups) {
      const parsedGroups = JSON.parse(rawGroups);
      if (Array.isArray(parsedGroups)) {
        const cleanGroups = parsedGroups
          .filter((g: any) => !isMockGroup(g))
          .map((g: any) => {
            const cleanEnrolled = Array.isArray(g.enrolledMembers)
              ? g.enrolledMembers.filter((m: any) => !isMockCustomer(m))
              : [];
            return {
              ...g,
              enrolledMembers: cleanEnrolled,
              filled: cleanEnrolled.length
            };
          });
        localStorage.setItem('mockChitGroups', JSON.stringify(cleanGroups));
      }
    }

    // 2. Purge mock customers
    const rawCustomers = localStorage.getItem('mockCustomers');
    if (rawCustomers) {
      const parsedCustomers = JSON.parse(rawCustomers);
      if (Array.isArray(parsedCustomers)) {
        const cleanCustomers = parsedCustomers
          .filter((c: any) => !isMockCustomer(c))
          .map((c: any) => {
            const cleanChits = Array.isArray(c.chits)
              ? c.chits.filter((ch: any) => !isMockGroup(ch))
              : [];
            return {
              ...c,
              chits: cleanChits,
              activeChits: cleanChits.length
            };
          });
        localStorage.setItem('mockCustomers', JSON.stringify(cleanCustomers));
      }
    }

    // 3. Purge chitGroupMemberships
    const rawMemberships = localStorage.getItem('chitGroupMemberships');
    if (rawMemberships) {
      const parsedMemberships = JSON.parse(rawMemberships);
      if (Array.isArray(parsedMemberships)) {
        const cleanMemberships = parsedMemberships.filter((m: any) => 
          !isMockGroup({ id: m.groupId, name: m.groupName }) &&
          !isMockCustomer({ id: m.customerId, name: m.customerName })
        );
        localStorage.setItem('chitGroupMemberships', JSON.stringify(cleanMemberships));
      }
    }

    // 4. Purge staffReceipts
    const rawReceipts = localStorage.getItem('staffReceipts');
    if (rawReceipts) {
      const parsedReceipts = JSON.parse(rawReceipts);
      if (Array.isArray(parsedReceipts)) {
        const cleanReceipts = parsedReceipts.filter((r: any) =>
          !isMockCustomer({ id: r.customerId, name: r.customerName }) &&
          !isMockGroup({ id: r.chitGroup, name: r.chitGroup })
        );
        localStorage.setItem('staffReceipts', JSON.stringify(cleanReceipts));
      }
    }

    // 5. Purge bankAssignments
    const rawBankAssignments = localStorage.getItem('bankAssignments');
    if (rawBankAssignments) {
      const parsedAssignments = JSON.parse(rawBankAssignments);
      if (parsedAssignments && typeof parsedAssignments === 'object') {
        const cleanGroupAssignments: Record<string, string> = {};
        if (parsedAssignments.groupAssignments) {
          Object.entries(parsedAssignments.groupAssignments).forEach(([k, v]) => {
            if (!isMockGroup({ id: k }) && typeof v === 'string') {
              cleanGroupAssignments[k] = v;
            }
          });
        }
        const cleanCustomerAssignments: Record<string, string> = {};
        if (parsedAssignments.customerAssignments) {
          Object.entries(parsedAssignments.customerAssignments).forEach(([k, v]) => {
            if (!isMockCustomer({ id: k }) && typeof v === 'string') {
              cleanCustomerAssignments[k] = v;
            }
          });
        }
        localStorage.setItem('bankAssignments', JSON.stringify({
          groupAssignments: cleanGroupAssignments,
          customerAssignments: cleanCustomerAssignments
        }));
      }
    }

    // 6. Purge paymentRequests: only drop static hardcoded dummy IDs, never real or demo customer submissions
    const rawPayments = localStorage.getItem('paymentRequests');
    if (rawPayments) {
      const parsedPayments = JSON.parse(rawPayments);
      if (Array.isArray(parsedPayments)) {
        const cleanPayments = parsedPayments.filter((p: any) =>
          !['PAY-78201', 'PAY-78202', 'PAY-78203', 'PAY-78190'].includes(p.id)
        );
        localStorage.setItem('paymentRequests', JSON.stringify(cleanPayments));
      }
    }
  } catch (err) {
    console.error('Error purging mock data:', err);
  }
};
