import { isMockGroup, isMockCustomer } from './cleanMockData';

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  accountType: 'CURRENT' | 'SAVINGS';
  upiId: string;
  qrCodeUrl?: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  totalReceived: number;
  transactionsCount: number;
  notes?: string;
  createdAt: string;
}

export interface BankAssignments {
  groupAssignments: Record<string, string>; // { groupId: bankId }
  customerAssignments: Record<string, string>; // { customerId: bankId }
}

const DEFAULT_BANKS: BankAccount[] = [
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
    notes: 'Primary collections account for regular plans and default company UPI',
    createdAt: '2026-01-15T09:00:00.000Z'
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
    notes: 'Secondary account designated for high-value auction and fixed series',
    createdAt: '2026-02-10T10:30:00.000Z'
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
    notes: 'Designated account for collections and customer deposits',
    createdAt: '2026-03-01T11:00:00.000Z'
  }
];

const DEFAULT_ASSIGNMENTS: BankAssignments = {
  groupAssignments: {},
  customerAssignments: {}
};

export const getStoredBankAccounts = (): BankAccount[] => {
  try {
    const raw = localStorage.getItem('companyBankAccounts');
    if (!raw) {
      localStorage.setItem('companyBankAccounts', JSON.stringify(DEFAULT_BANKS));
      return DEFAULT_BANKS;
    }
    const parsed: BankAccount[] = JSON.parse(raw);
    let changed = false;
    const sanitized = parsed.map(b => {
      // Clear legacy mock tallies if present
      if (b.id === 'BANK-001' && (b.totalReceived === 360000 || b.transactionsCount === 14)) {
        changed = true;
        return { ...b, totalReceived: 0, transactionsCount: 0 };
      }
      if (b.id === 'BANK-002' && (b.totalReceived === 210000 || b.transactionsCount === 8)) {
        changed = true;
        return { ...b, totalReceived: 0, transactionsCount: 0 };
      }
      if (b.id === 'BANK-003' && (b.totalReceived === 145000 || b.transactionsCount === 6)) {
        changed = true;
        return { ...b, totalReceived: 0, transactionsCount: 0 };
      }
      return b;
    });

    if (changed) {
      localStorage.setItem('companyBankAccounts', JSON.stringify(sanitized));
      return sanitized;
    }
    return parsed;
  } catch {
    return DEFAULT_BANKS;
  }
};

export const saveStoredBankAccounts = (banks: BankAccount[]) => {
  localStorage.setItem('companyBankAccounts', JSON.stringify(banks));
  window.dispatchEvent(new Event('storage'));
};

export const getStoredBankAssignments = (): BankAssignments => {
  try {
    const raw = localStorage.getItem('companyBankAssignments');
    if (!raw) {
      localStorage.setItem('companyBankAssignments', JSON.stringify(DEFAULT_ASSIGNMENTS));
      return DEFAULT_ASSIGNMENTS;
    }
    const parsed = JSON.parse(raw);
    const cleanGroupAssignments: Record<string, string> = {};
    if (parsed.groupAssignments) {
      Object.entries(parsed.groupAssignments).forEach(([k, v]) => {
        if (!isMockGroup({ id: k }) && typeof v === 'string') {
          cleanGroupAssignments[k] = v;
        }
      });
    }
    const cleanCustomerAssignments: Record<string, string> = {};
    if (parsed.customerAssignments) {
      Object.entries(parsed.customerAssignments).forEach(([k, v]) => {
        if (!isMockCustomer({ id: k }) && typeof v === 'string') {
          cleanCustomerAssignments[k] = v;
        }
      });
    }
    return {
      groupAssignments: cleanGroupAssignments,
      customerAssignments: cleanCustomerAssignments
    };
  } catch {
    return DEFAULT_ASSIGNMENTS;
  }
};

export const saveStoredBankAssignments = (assignments: BankAssignments) => {
  localStorage.setItem('companyBankAssignments', JSON.stringify(assignments));
  window.dispatchEvent(new Event('storage'));
};

export const assignBankToGroup = (groupId: string, bankId: string) => {
  const current = getStoredBankAssignments();
  current.groupAssignments[groupId] = bankId;
  saveStoredBankAssignments(current);
};

export const assignBankToCustomer = (customerId: string, bankId: string) => {
  const current = getStoredBankAssignments();
  if (!bankId || bankId === 'INHERIT') {
    delete current.customerAssignments[customerId];
  } else {
    current.customerAssignments[customerId] = bankId;
  }
  saveStoredBankAssignments(current);
};

export interface BankResolutionResult {
  bank: BankAccount;
  scope: 'CUSTOMER' | 'GROUP' | 'DEFAULT';
  sourceName?: string;
}

/**
 * Resolves the designated receiving bank account for a given customer and group.
 * Hierarchy:
 * 1. Individual customer custom assignment
 * 2. Chit group assignment
 * 3. Default company master bank account
 */
export const resolveBankForPayment = (
  customerId?: string,
  groupId?: string,
  groupName?: string
): BankResolutionResult => {
  const banks = getStoredBankAccounts();
  const activeBanks = banks.filter(b => b.status === 'ACTIVE');
  const defaultBank = activeBanks.find(b => b.isDefault) || activeBanks[0] || banks[0] || DEFAULT_BANKS[0];
  const assignments = getStoredBankAssignments();

  // 1. Customer level custom assignment
  if (customerId && assignments.customerAssignments[customerId]) {
    const assignedId = assignments.customerAssignments[customerId];
    const match = activeBanks.find(b => b.id === assignedId);
    if (match) {
      return { bank: match, scope: 'CUSTOMER', sourceName: 'Individual Customer Custom Bank' };
    }
  }

  // 2. Group level assignment
  const targetGroupKey = groupId || groupName;
  if (targetGroupKey && assignments.groupAssignments[targetGroupKey]) {
    const assignedId = assignments.groupAssignments[targetGroupKey];
    const match = activeBanks.find(b => b.id === assignedId);
    if (match) {
      return { bank: match, scope: 'GROUP', sourceName: `Assigned for Group ${targetGroupKey}` };
    }
  }

  // 3. Fallback to default
  return { bank: defaultBank, scope: 'DEFAULT', sourceName: 'Company Default Bank Account' };
};

/**
 * Calculates real-time total funds received into a specific bank account from ledger + payment requests.
 */
export const getBankReceivedStats = (bankId: string) => {
  const banks = getStoredBankAccounts();
  const bank = banks.find(b => b.id === bankId);
  const ledger = JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
  const reqs = JSON.parse(localStorage.getItem('paymentRequests') || '[]');

  const matchedLedger = ledger.filter((t: any) => {
    if (t.type !== 'CREDIT') return false;
    return (
      t.bankAccountId === bankId ||
      (bank && (t.bankName === bank.bankName || t.paymentMode?.includes(bank.bankName) || t.description?.includes(bank.bankName)))
    );
  });

  const matchedReqs = reqs.filter((r: any) => {
    return r.status === 'APPROVED' && (r.bankAccountId === bankId || (bank && r.bankName === bank.bankName));
  });

  const ledgerSum = matchedLedger.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const baseTally = Number(bank?.totalReceived || 0);

  const totalCalculated = Math.max(ledgerSum, baseTally);
  const totalCount = Math.max(matchedLedger.length, matchedReqs.length, Number(bank?.transactionsCount || 0));

  return {
    totalReceived: totalCalculated,
    transactionsCount: totalCount,
    transactions: matchedLedger
  };
};

/**
 * Credits a payment amount to a specific bank account when verified/approved.
 */
export const recordBankCredit = (bankId: string, amount: number) => {
  const banks = getStoredBankAccounts();
  const updated = banks.map(b => {
    if (b.id === bankId) {
      return {
        ...b,
        totalReceived: (Number(b.totalReceived) || 0) + Number(amount),
        transactionsCount: (Number(b.transactionsCount) || 0) + 1
      };
    }
    return b;
  });
  saveStoredBankAccounts(updated);
};

/**
 * Generates an SVG UPI QR Code representation with UPI logo styling and clear scanning guides.
 */
export const generateUpiQrBadge = (upiId: string, payeeName: string, _amount?: number): string => {
  // Standard SVG with QR-pattern aesthetics & UPI styling
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
    <desc>Pay to ${encodeURIComponent(upiId)} (${encodeURIComponent(payeeName)})</desc>
    <rect width="240" height="240" rx="16" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="2"/>
    <!-- Corner Positioning Markers -->
    <rect x="20" y="20" width="48" height="48" rx="8" fill="none" stroke="%23713f12" stroke-width="6"/>
    <rect x="32" y="32" width="24" height="24" rx="4" fill="%23713f12"/>
    <rect x="172" y="20" width="48" height="48" rx="8" fill="none" stroke="%23713f12" stroke-width="6"/>
    <rect x="184" y="32" width="24" height="24" rx="4" fill="%23713f12"/>
    <rect x="20" y="172" width="48" height="48" rx="8" fill="none" stroke="%23713f12" stroke-width="6"/>
    <rect x="32" y="184" width="24" height="24" rx="4" fill="%23713f12"/>
    <!-- QR Data Matrix Dots -->
    <g fill="%231e293b">
      <rect x="80" y="24" width="8" height="16" rx="2"/>
      <rect x="96" y="24" width="16" height="8" rx="2"/>
      <rect x="120" y="24" width="8" height="24" rx="2"/>
      <rect x="136" y="32" width="24" height="8" rx="2"/>
      <rect x="80" y="48" width="16" height="8" rx="2"/>
      <rect x="104" y="44" width="8" height="16" rx="2"/>
      <rect x="124" y="56" width="16" height="12" rx="2"/>
      <rect x="148" y="48" width="12" height="16" rx="2"/>
      <rect x="24" y="80" width="16" height="8" rx="2"/>
      <rect x="48" y="80" width="12" height="16" rx="2"/>
      <rect x="24" y="104" width="8" height="16" rx="2"/>
      <rect x="40" y="104" width="16" height="8" rx="2"/>
      <rect x="24" y="128" width="16" height="12" rx="2"/>
      <rect x="48" y="128" width="8" height="16" rx="2"/>
      <rect x="32" y="152" width="24" height="8" rx="2"/>
      <rect x="80" y="80" width="24" height="8" rx="2"/>
      <rect x="112" y="80" width="8" height="20" rx="2"/>
      <rect x="128" y="80" width="32" height="8" rx="2"/>
      <rect x="168" y="80" width="8" height="24" rx="2"/>
      <rect x="184" y="84" width="16" height="8" rx="2"/>
      <rect x="208" y="80" width="8" height="16" rx="2"/>
      <rect x="80" y="96" width="8" height="24" rx="2"/>
      <rect x="96" y="104" width="16" height="16" rx="2"/>
      <rect x="124" y="96" width="8" height="24" rx="2"/>
      <rect x="140" y="100" width="20" height="8" rx="2"/>
      <rect x="168" y="112" width="24" height="8" rx="2"/>
      <rect x="200" y="104" width="16" height="16" rx="2"/>
      <rect x="80" y="128" width="20" height="8" rx="2"/>
      <rect x="108" y="128" width="24" height="12" rx="2"/>
      <rect x="140" y="116" width="16" height="24" rx="2"/>
      <rect x="164" y="128" width="8" height="16" rx="2"/>
      <rect x="180" y="128" width="24" height="8" rx="2"/>
      <rect x="212" y="128" width="8" height="16" rx="2"/>
      <rect x="80" y="148" width="16" height="16" rx="2"/>
      <rect x="104" y="148" width="24" height="8" rx="2"/>
      <rect x="136" y="148" width="8" height="24" rx="2"/>
      <rect x="152" y="148" width="24" height="8" rx="2"/>
      <rect x="184" y="144" width="16" height="16" rx="2"/>
      <rect x="208" y="152" width="12" height="12" rx="2"/>
      <rect x="80" y="172" width="16" height="8" rx="2"/>
      <rect x="104" y="168" width="8" height="16" rx="2"/>
      <rect x="120" y="180" width="24" height="8" rx="2"/>
      <rect x="152" y="168" width="12" height="20" rx="2"/>
      <rect x="172" y="172" width="16" height="8" rx="2"/>
      <rect x="196" y="176" width="20" height="8" rx="2"/>
      <rect x="80" y="192" width="24" height="8" rx="2"/>
      <rect x="112" y="196" width="16" height="16" rx="2"/>
      <rect x="136" y="192" width="8" height="20" rx="2"/>
      <rect x="152" y="196" width="24" height="8" rx="2"/>
      <rect x="184" y="192" width="12" height="20" rx="2"/>
      <rect x="204" y="192" width="16" height="8" rx="2"/>
      <rect x="80" y="208" width="8" height="8" rx="2"/>
      <rect x="96" y="208" width="8" height="8" rx="2"/>
      <rect x="144" y="208" width="16" height="8" rx="2"/>
      <rect x="176" y="208" width="8" height="8" rx="2"/>
      <rect x="200" y="208" width="20" height="8" rx="2"/>
    </g>
    <!-- Center UPI Logo Badge -->
    <rect x="95" y="95" width="50" height="50" rx="10" fill="%23ffffff" stroke="%23ca8a04" stroke-width="2"/>
    <text x="120" y="125" font-family="Arial, sans-serif" font-size="14" font-weight="900" fill="%23713f12" text-anchor="middle">UPI</text>
  </svg>`;
};
