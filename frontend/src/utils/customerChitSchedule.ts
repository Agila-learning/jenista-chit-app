import {
  calculateFixedPlanSchedule,
  calculateAuctionPlanSchedule,
  calculateRegularPlanSchedule,
} from './chitCalculations';

export interface DueInstallmentRow {
  monthNumber: number;
  monthName: string;
  dueDate: string;          // Formatted e.g. "15 Nov 2026"
  dueDateIso: string;
  grossDue: number;         // Standard / original monthly due
  revisedDue: number;       // Adjusted due (e.g. after post-draw or dividend)
  eligiblePayout: number;   // Prize / withdrawal money eligible if claimed in this month
  isWithdrawn: boolean;     // Whether chit was already claimed / withdrawn
  isDisbursalMonth?: boolean;     // The exact month of disbursal
  isPostDisbursalMonth?: boolean; // Whether 1% post-draw fee applies
  isCompanyMonth?: boolean;       // Month 1 allocated to company (members cannot withdraw)
  status: 'PAID' | 'DUE' | 'PARTIALLY_PAID' | 'OVERDUE';
  amountPaid: number;       // Cumulative amount credited towards this month's installment
  paidOn?: string;          // Formatted Date & Time e.g. "15 Nov 2024 · 02:30 PM"
  paidOnIso?: string;       // ISO date string
  paidDateOnly?: string;    // "15 Nov 2024"
  paidTimeOnly?: string;    // "02:30 PM"
  recordCreatedAt?: string; // Timestamp when record was created
  paymentMode?: string;     // Cash / UPI / Bank Transfer
  receiptNo?: string;
  referenceNo?: string;
  dividend?: number;
  notes?: string;
  transactionId?: string;
}

export interface CustomerChitScheduleSummary {
  customerId: string;
  customerName: string;
  mobile: string;
  groupId: string;
  groupName: string;
  ticketNumber: string;
  scheme: 'Regular' | 'Fixed' | 'Auction';
  chitValue: number;
  totalDurationMonths: number;
  joiningDate: string;
  dueDayOfMonth: number; // e.g. 15

  // Financial totals
  totalDueAmount: number;      // Sum of all months revised dues
  totalPaidAmount: number;     // Total collected in ledger
  remainingBalanceDue: number; // Total dues left to pay
  completedMonthsCount: number;// Months fully paid
  currentDueMonthIndex: number;// Next unpaid month (1-indexed)

  // Status & Prize Details
  isWithdrawn: boolean;
  withdrawnAmount?: number;
  withdrawnAt?: string;
  withdrawnRef?: string;
  currentEligiblePrizeAmount: number; // What customer could claim right now if eligible

  // Schedule Rows (1 to totalDurationMonths)
  schedule: DueInstallmentRow[];
}

/**
 * Builds the dynamic pre-chart and dues schedule for a customer's chit enrollment.
 *
 * Rules:
 * 1. Base Dues & Payouts are computed according to Scheme:
 *    - FIXED: 
 *        - Gross due = Value / Months
 *        - Payout = 95% + (month - 1) * 1% (Month 1: 95%, Month 20: 114%)
 *        - If already withdrawn: post-draw monthly due = Gross due + 1% of chitValue
 *    - AUCTION:
 *        - Reverse auction dividend schedule computes netDue and payout per month
 *        - If withdrawn: no further dividend relief; from NEXT month, 1% post-draw fee is added
 *    - REGULAR:
 *        - Standard 20M brochure table with dividends and payouts
 *        - From NEXT month of disbursal, 1% post-draw fee is added
 *
 * 2. Due Date Calculation:
 *    - Uses the group's designated due day (default 15).
 *    - Month 1 due date starts from joiningDate's month or current month on day 15,
 *      and increments month-by-month for the full duration.
 *
 * 3. Payment Allocation ("Added to the last not completed dues"):
 *    - All credits recorded in ledgerTransactions for this customer and group
 *      are allocated sequentially to the earliest unpaid installment.
 *    - Explicit month-tagged payments map directly to their target month.
 */
export const buildCustomerChitSchedule = (params: {
  customer: any;
  chit: any;
  group?: any;
  ledgerTransactions?: any[];
}): CustomerChitScheduleSummary => {
  const { customer, chit, group } = params;

  const customerId = customer?.id || customer?.customerCode || customer?.mongoId || 'CUST';
  const customerName = customer?.name || customer?.fullName || 'Customer';
  const mobile = customer?.mobile || customer?.phone || '—';

  const groupId = chit?.groupId || group?.id || group?.code || 'GROUP';
  const groupName = chit?.groupName || group?.name || groupId;
  const ticketNumber = chit?.ticketNumber || '1';

  const chitValue = Number(chit?.chitValue || chit?.amount || group?.value || 100000);
  const totalDurationMonths = Number(chit?.duration || chit?.months || group?.duration || group?.months || 20);

  // Raw scheme detection (checks scheme, type, groupName, groupId, or customer scheme)
  const combinedSchemeHint = `${chit?.scheme || ''} ${group?.scheme || ''} ${group?.type || ''} ${chit?.groupName || ''} ${chit?.groupId || ''} ${group?.name || ''} ${group?.id || ''} ${customer?.scheme || ''}`.toUpperCase();
  const scheme: 'Regular' | 'Fixed' | 'Auction' = combinedSchemeHint.includes('FIX')
    ? 'Fixed'
    : combinedSchemeHint.includes('AUC')
      ? 'Auction'
      : 'Regular';

  // Joining / start date determination
  const joiningDateIso = chit?.joiningDate || chit?.createdAt || new Date().toISOString();
  const startDate = new Date(joiningDateIso);
  if (isNaN(startDate.getTime())) {
    startDate.setTime(Date.now());
  }

  // Due Day determination (default 15)
  let dueDayOfMonth = 15;
  if (chit?.dueDate) {
    const parts = chit.dueDate.split('-');
    if (parts.length >= 3) {
      const d = parseInt(parts[2], 10);
      if (!isNaN(d) && d >= 1 && d <= 31) dueDayOfMonth = d;
    }
  }

  // Withdrawal state & Disbursal Month calculation
  const isWithdrawn = Boolean(chit?.isWithdrawn || chit?.status === 'Withdrawn');
  const withdrawnAmount = Number(chit?.withdrawnAmount || 0);
  const withdrawnAt = chit?.withdrawnAt || chit?.disbursedAt;
  const withdrawnRef = chit?.payoutRef || chit?.disbursedRef;

  // Determine the exact month index (1..totalDurationMonths) in which the disbursal occurred.
  // The 1% fee will ONLY be added from the next month (m > disbursalMonthIndex), NOT in the disbursal month.
  let disbursalMonthIndex = 0;
  if (isWithdrawn) {
    if (chit?.withdrawnMonth && Number(chit.withdrawnMonth) > 0) {
      disbursalMonthIndex = Number(chit.withdrawnMonth);
    } else if (withdrawnAt) {
      const wDate = new Date(withdrawnAt);
      if (!isNaN(wDate.getTime())) {
        const diffMonths = (wDate.getFullYear() - startDate.getFullYear()) * 12 + (wDate.getMonth() - startDate.getMonth()) + 1;
        disbursalMonthIndex = Math.max(1, Math.min(totalDurationMonths, diffMonths));
      } else {
        disbursalMonthIndex = 1;
      }
    } else {
      disbursalMonthIndex = 1;
    }
  }

  // Check withdrawal requests from localStorage for any disbursed claim
  try {
    const rawW = localStorage.getItem('withdrawalRequests');
    if (rawW) {
      const parsedW = JSON.parse(rawW);
      const matchedW = parsedW.find((w: any) => 
        (w.status === 'DISBURSED' || w.status === 'APPROVED') &&
        (w.customerId === customerId || w.mobile === mobile) &&
        (String(w.groupId).toLowerCase() === String(groupId).toLowerCase() || String(w.groupName).toLowerCase() === String(groupName).toLowerCase())
      );
      if (matchedW) {
        if (matchedW.disbursedMonth) {
          disbursalMonthIndex = Number(matchedW.disbursedMonth);
        } else if (matchedW.monthNumber) {
          disbursalMonthIndex = Number(matchedW.monthNumber);
        } else if (matchedW.disbursedAt || matchedW.requestedAt) {
          const wDate = new Date(matchedW.disbursedAt || matchedW.requestedAt);
          if (!isNaN(wDate.getTime())) {
            const diffMonths = (wDate.getFullYear() - startDate.getFullYear()) * 12 + (wDate.getMonth() - startDate.getMonth()) + 1;
            disbursalMonthIndex = Math.max(1, Math.min(totalDurationMonths, diffMonths));
          }
        }
      }
    }
  } catch {}

  // 1. Fetch pre-calculated scheme schedules from calculations utility
  const fixedDetails = scheme === 'Fixed' ? calculateFixedPlanSchedule(chitValue, totalDurationMonths) : null;
  const auctionDetails = scheme === 'Auction' ? calculateAuctionPlanSchedule(chitValue, totalDurationMonths) : null;
  const regularDetails = scheme === 'Regular' ? calculateRegularPlanSchedule(chitValue, totalDurationMonths) : null;

  // 2. Fetch payments from ledger
  const rawLedger = params.ledgerTransactions || (() => {
    try {
      return JSON.parse(localStorage.getItem('ledgerTransactions') || '[]');
    } catch {
      return [];
    }
  })();

  const cleanMobile = mobile.replace(/\D/g, '');
  const groupIdentifierLower = groupId.toLowerCase();
  const groupNameLower = groupName.toLowerCase();

  // Filter credit payments for this customer and this group
  const matchedPayments = rawLedger
    .filter((t: any) => {
      if (t.type !== 'CREDIT' && t.category !== 'INSTALLMENT') return false;
      const ref = String(t.reference || '').toLowerCase();
      const desc = String(t.description || '').toLowerCase();
      const tGroupId = String(t.groupId || '').toLowerCase();
      const tCustId = String(t.customerId || '').toLowerCase();

      const matchesCustomer =
        tCustId === customerId.toLowerCase() ||
        ref.includes(customerId.toLowerCase()) ||
        desc.includes(customerId.toLowerCase()) ||
        (cleanMobile && (ref.includes(cleanMobile) || desc.includes(cleanMobile)));

      const matchesGroup =
        tGroupId === groupIdentifierLower ||
        tGroupId === groupNameLower ||
        ref.includes(groupIdentifierLower) ||
        ref.includes(groupNameLower) ||
        desc.includes(groupIdentifierLower) ||
        desc.includes(groupNameLower);

      return matchesCustomer && matchesGroup;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalCreditAvailable = matchedPayments.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

  // If customer object already recorded higher totalPaid, use it
  if (chit?.paymentStatus === 'PAID' && totalCreditAvailable === 0) {
    totalCreditAvailable = Number(chit?.monthlyInstallment || chitValue / totalDurationMonths);
  }

  // Separate month-specific payments vs general unallocated payments
  const monthSpecificPaymentsMap: Record<number, any[]> = {};
  const unassignedPayments: any[] = [];

  matchedPayments.forEach((t: any) => {
    let targetM: number | null = null;
    if (t.monthNumber && Number(t.monthNumber) >= 1 && Number(t.monthNumber) <= totalDurationMonths) {
      targetM = Number(t.monthNumber);
    } else if (t.description) {
      const match = String(t.description).match(/Month\s+(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= totalDurationMonths) targetM = num;
      }
    }

    if (targetM !== null) {
      if (!monthSpecificPaymentsMap[targetM]) monthSpecificPaymentsMap[targetM] = [];
      monthSpecificPaymentsMap[targetM].push(t);
    } else {
      unassignedPayments.push(t);
    }
  });

  let remainingUnassignedPool = unassignedPayments.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  if (chit?.paymentStatus === 'PAID' && totalCreditAvailable > 0 && remainingUnassignedPool === 0 && Object.keys(monthSpecificPaymentsMap).length === 0) {
    remainingUnassignedPool = totalCreditAvailable;
  }

  // 3. Generate 1..totalDurationMonths Rows
  const schedule: DueInstallmentRow[] = [];
  let totalDueAmount = 0;
  let completedMonthsCount = 0;
  let currentDueMonthIndex = 1;

  for (let m = 1; m <= totalDurationMonths; m++) {
    // Customers start making monthly payments from the next month after joining/registration
    // e.g., Joining in October 2026 starts Month 1 in November 2026 on the dueDayOfMonth
    const rowDate = new Date(startDate.getFullYear(), startDate.getMonth() + m, dueDayOfMonth);
    const dueDateIso = rowDate.toISOString().split('T')[0];
    const dueDateFormatted = rowDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const monthName = rowDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    // Determine baseline gross due and prize payout
    let grossDue = Math.round(chitValue / totalDurationMonths);
    let revisedDue = grossDue;
    let eligiblePayout = Math.round(chitValue * 0.95);
    let dividend = 0;

    // Check if 1% post-disbursal addition applies for this specific month:
    // User requirement: from NEXT month of disbursed, the 1% is added, NOT on the current/disbursed month.
    const isPostDisbursalMonth = isWithdrawn && disbursalMonthIndex > 0 && m > disbursalMonthIndex;
    const isDisbursalMonth = isWithdrawn && disbursalMonthIndex === m;

    let isCompanyMonth = false;

    if (scheme === 'Fixed' && fixedDetails) {
      const fixedRow = fixedDetails.schedule[m - 1];
      grossDue = fixedRow?.due || fixedDetails.monthlyDue;
      isCompanyMonth = !!fixedRow?.isCompany || m === 1;
      eligiblePayout = isCompanyMonth ? 0 : (fixedRow?.payout || 0);

      if (isPostDisbursalMonth) {
        revisedDue = grossDue + fixedDetails.postDrawFee;
      } else {
        revisedDue = grossDue;
      }
    } else if (scheme === 'Auction' && auctionDetails) {
      const aucRow = auctionDetails.schedule[m - 1];
      grossDue = auctionDetails.grossDue;
      eligiblePayout = aucRow?.payout || chitValue - (aucRow?.totalDiscount || 0);
      dividend = aucRow?.dividend || 0;

      // If already withdrawn: winner pays gross due in disbursal month, and grossDue + 1% interest starting next month!
      if (isPostDisbursalMonth) {
        const postDrawFee = Math.round(chitValue * 0.01);
        revisedDue = grossDue + postDrawFee;
      } else if (isWithdrawn && m >= disbursalMonthIndex) {
        revisedDue = grossDue;
      } else {
        revisedDue = Math.max(0, grossDue - dividend);
      }
    } else if (scheme === 'Regular' && regularDetails) {
      const regRow = regularDetails.schedule[m - 1];
      grossDue = regularDetails.grossDue;
      eligiblePayout = regRow?.payment || Math.round(chitValue * 0.95);
      dividend = regRow?.dividend || 0;

      // 1% of chit value is added to the due starting from the NEXT month after disbursal.
      // In the disbursed month (and before), customer pays the base gross due (₹5,000 for 1L)
      if (isPostDisbursalMonth) {
        const postDrawFee = Math.round(chitValue * 0.01);
        revisedDue = grossDue + postDrawFee;
      } else {
        revisedDue = regRow?.due || grossDue;
      }
    }

    totalDueAmount += revisedDue;

    // Apply payments for this month:
    // First, check if specific payments exist for Month m
    const specificTxs = monthSpecificPaymentsMap[m] || [];
    let amountPaidForThisMonth = specificTxs.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

    // If specific paid is less than revisedDue, draw from unassigned pool
    if (amountPaidForThisMonth < revisedDue && remainingUnassignedPool > 0) {
      const needed = revisedDue - amountPaidForThisMonth;
      const take = Math.min(needed, remainingUnassignedPool);
      amountPaidForThisMonth += take;
      remainingUnassignedPool -= take;
    }

    let rowStatus: DueInstallmentRow['status'] = 'DUE';
    if (amountPaidForThisMonth >= revisedDue) {
      rowStatus = 'PAID';
      completedMonthsCount++;
    } else if (amountPaidForThisMonth > 0) {
      rowStatus = 'PARTIALLY_PAID';
    } else {
      const today = new Date();
      // Overdue appears ONLY when the actual payment due date has strictly passed and remains unpaid
      const dueDayEnd = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate(), 23, 59, 59, 999);
      if (today.getTime() > dueDayEnd.getTime()) {
        rowStatus = 'OVERDUE';
      } else {
        rowStatus = 'DUE';
      }
    }

    // Determine latest transaction details for this month
    const latestTx = specificTxs.length > 0
      ? specificTxs[specificTxs.length - 1]
      : (matchedPayments[Math.min(m - 1, matchedPayments.length - 1)] || null);

    let paidOn: string | undefined = undefined;
    let paidDateOnly: string | undefined = undefined;
    let paidTimeOnly: string | undefined = undefined;
    let paidOnIso: string | undefined = undefined;
    let recordCreatedAt: string | undefined = undefined;
    let transactionId: string | undefined = undefined;
    let paymentMode: string | undefined = undefined;
    let receiptNo: string | undefined = undefined;
    let referenceNo: string | undefined = undefined;

    if (amountPaidForThisMonth > 0 && latestTx) {
      paidOnIso = latestTx.date;
      transactionId = latestTx.id;
      recordCreatedAt = latestTx.createdAt || latestTx.recordedAt;
      paymentMode = latestTx.paymentMode || ((latestTx.description || '').toLowerCase().includes('cash') ? 'CASH' : 'Online / UPI');
      receiptNo = latestTx.id;
      referenceNo = latestTx.referenceNo || latestTx.reference;

      const txDateObj = new Date(latestTx.date);
      if (!isNaN(txDateObj.getTime())) {
        paidDateOnly = txDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        paidTimeOnly = txDateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        paidOn = `${paidDateOnly} · ${paidTimeOnly}`;
      }
    }

    schedule.push({
      monthNumber: m,
      monthName,
      dueDate: dueDateFormatted,
      dueDateIso,
      grossDue,
      revisedDue,
      eligiblePayout,
      isCompanyMonth,
      isWithdrawn,
      isDisbursalMonth,
      isPostDisbursalMonth,
      status: rowStatus,
      amountPaid: amountPaidForThisMonth,
      paidOn,
      paidOnIso,
      paidDateOnly,
      paidTimeOnly,
      recordCreatedAt,
      transactionId,
      paymentMode,
      receiptNo,
      referenceNo,
      dividend,
      notes: undefined
    });
  }

  // Find first unpaid month index
  const firstUnpaid = schedule.findIndex(r => r.status !== 'PAID');
  currentDueMonthIndex = firstUnpaid === -1 ? totalDurationMonths : firstUnpaid + 1;

  // Current eligible prize: If not withdrawn, what could customer claim in the current active month
  const currentMonthRow = schedule[currentDueMonthIndex - 1] || schedule[0];
  let currentEligiblePrizeAmount = 0;
  if (!isWithdrawn) {
    if (scheme === 'Fixed' && currentDueMonthIndex === 1) {
      // Month 1 is Company month; earliest member prize claim starts from Month 2 payout
      currentEligiblePrizeAmount = schedule[1]?.eligiblePayout || Math.round(chitValue * 0.70);
    } else {
      currentEligiblePrizeAmount = currentMonthRow?.eligiblePayout || Math.round(chitValue * 0.95);
    }
  }

  const totalPaidAmount = schedule.reduce((sum, r) => sum + r.amountPaid, 0);
  const remainingBalanceDue = Math.max(0, totalDueAmount - totalPaidAmount);

  return {
    customerId,
    customerName,
    mobile,
    groupId,
    groupName,
    ticketNumber,
    scheme,
    chitValue,
    totalDurationMonths,
    joiningDate: joiningDateIso,
    dueDayOfMonth,
    totalDueAmount,
    totalPaidAmount,
    remainingBalanceDue,
    completedMonthsCount,
    currentDueMonthIndex,
    isWithdrawn,
    withdrawnAmount: isWithdrawn ? (withdrawnAmount || Math.round(chitValue * 0.95)) : undefined,
    withdrawnAt,
    withdrawnRef,
    currentEligiblePrizeAmount,
    schedule
  };
};
