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
  status: 'PAID' | 'DUE' | 'PARTIALLY_PAID' | 'OVERDUE';
  amountPaid: number;       // Cumulative amount credited towards this month's installment
  paidOn?: string;          // Date when payment was completed
  paymentMode?: string;     // Cash / UPI / Bank Transfer
  receiptNo?: string;
  referenceNo?: string;
  dividend?: number;
  notes?: string;
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
 *        - If withdrawn: no further dividend relief, pays full grossDue
 *    - REGULAR:
 *        - Standard 20M brochure table with dividends and payouts
 *
 * 2. Due Date Calculation:
 *    - Uses the group's designated due day (default 15).
 *    - Month 1 due date starts from joiningDate's month or current month on day 15,
 *      and increments month-by-month for the full duration.
 *
 * 3. Payment Allocation ("Added to the last not completed dues"):
 *    - All credits recorded in ledgerTransactions for this customer and group
 *      are allocated sequentially to the earliest unpaid installment.
 *    - If partial payment is made, row reflects PARTIALLY_PAID. Once target due is met,
 *      marked PAID with the latest payment date.
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
    // fallback if invalid date string
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
      // If marked withdrawn but no date available, treat Month 1 as disbursal month
      disbursalMonthIndex = 1;
    }
  }

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

  // Also check ledgerTransactions for DEBIT DISBURSAL if withdrawnAt wasn't explicitly given
  if (isWithdrawn && !withdrawnAt && rawLedger.length > 0) {
    const cleanMobile = mobile.replace(/\D/g, '');
    const groupIdentifierLower = groupId.toLowerCase();
    const groupNameLower = groupName.toLowerCase();
    const disbursalTx = rawLedger.find((t: any) => {
      if (t.type !== 'DEBIT' && t.category !== 'DISBURSAL') return false;
      const ref = String(t.reference || '').toLowerCase();
      const desc = String(t.description || '').toLowerCase();
      const tCustId = String(t.customerId || '').toLowerCase();
      const tGroupId = String(t.groupId || '').toLowerCase();
      const matchesCust = tCustId === customerId.toLowerCase() || ref.includes(customerId.toLowerCase()) || (cleanMobile && (ref.includes(cleanMobile) || desc.includes(cleanMobile)));
      const matchesGrp = tGroupId === groupIdentifierLower || tGroupId === groupNameLower || ref.includes(groupIdentifierLower) || ref.includes(groupNameLower);
      return matchesCust && matchesGrp;
    });
    if (disbursalTx && disbursalTx.date) {
      const dDate = new Date(disbursalTx.date);
      if (!isNaN(dDate.getTime())) {
        const diff = (dDate.getFullYear() - startDate.getFullYear()) * 12 + (dDate.getMonth() - startDate.getMonth()) + 1;
        disbursalMonthIndex = Math.max(1, Math.min(totalDurationMonths, diff));
      }
    }
  }

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
  const totalPaidAmount = totalCreditAvailable;

  // If customer object already recorded higher totalPaid, use it
  if (chit?.paymentStatus === 'PAID' && totalCreditAvailable === 0) {
    totalCreditAvailable = Number(chit?.monthlyInstallment || chitValue / totalDurationMonths);
  }

  // 3. Generate 1..totalDurationMonths Rows
  const schedule: DueInstallmentRow[] = [];
  let remainingPaidPool = totalCreditAvailable;
  let totalDueAmount = 0;
  let completedMonthsCount = 0;
  let currentDueMonthIndex = 1;

  for (let m = 1; m <= totalDurationMonths; m++) {
    // Calculate Due Date for Month m (starting from joiningDate with day 15)
    const rowDate = new Date(startDate.getFullYear(), startDate.getMonth() + (m - 1), dueDayOfMonth);
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

    if (scheme === 'Fixed' && fixedDetails) {
      const fixedRow = fixedDetails.schedule[m - 1];
      grossDue = fixedRow?.due || fixedDetails.monthlyDue;
      eligiblePayout = fixedRow?.payout || Math.round(chitValue * (0.95 + (m - 1) * 0.01));

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

      // If already withdrawn, winner pays full gross due (no dividend deduction)
      if (isWithdrawn && m >= disbursalMonthIndex) {
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

    // Apply available payments sequentially ("added to the last not completed dues")
    let amountPaidForThisMonth = 0;
    let rowStatus: DueInstallmentRow['status'] = 'DUE';
    let paidOn: string | undefined = undefined;
    let paymentMode: string | undefined = undefined;
    let receiptNo: string | undefined = undefined;
    let referenceNo: string | undefined = undefined;

    if (remainingPaidPool >= revisedDue) {
      amountPaidForThisMonth = revisedDue;
      remainingPaidPool -= revisedDue;
      rowStatus = 'PAID';
      completedMonthsCount++;
    } else if (remainingPaidPool > 0) {
      amountPaidForThisMonth = remainingPaidPool;
      remainingPaidPool = 0;
      rowStatus = 'PARTIALLY_PAID';
    } else {
      amountPaidForThisMonth = 0;
      // Check if past due date
      const today = new Date();
      if (today.getTime() > rowDate.getTime() + 86400000) {
        rowStatus = 'OVERDUE';
      } else {
        rowStatus = 'DUE';
      }
    }

    // Attach transaction info if paid
    if (amountPaidForThisMonth > 0 && matchedPayments.length > 0) {
      const latestTx = matchedPayments[Math.min(m - 1, matchedPayments.length - 1)];
      if (latestTx) {
        paidOn = latestTx.date
          ? new Date(latestTx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
          : undefined;
        paymentMode = latestTx.paymentMode || ((latestTx.description || '').toLowerCase().includes('cash') ? 'CASH' : 'Online / UPI');
        receiptNo = latestTx.id;
        referenceNo = latestTx.reference;
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
      isWithdrawn,
      status: rowStatus,
      amountPaid: amountPaidForThisMonth,
      paidOn,
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
  const currentEligiblePrizeAmount = isWithdrawn ? 0 : (currentMonthRow?.eligiblePayout || Math.round(chitValue * 0.95));

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
