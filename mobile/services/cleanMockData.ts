/**
 * cleanMockData.ts (Mobile)
 * Utility to identify, filter, and purge mock chit groups, mock demo customers,
 * and static dummy transactions from the mobile application.
 * Mirrors the exact cleanup logic from the Web Application.
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
