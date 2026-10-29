export interface FixedMonthRow {
  month: number;
  due: number;
  duePct: number;
  payout: number;
  payoutPct: number;
  isCompany: boolean;
  payoutDisplay: string;
}

export interface FixedPlanDetails {
  chitValue: number;
  months: number;
  members: number;
  monthlyDue: number;       // Month 1 due (5% of chit value)
  month1Due: number;        // Month 1 due (5% of chit value)
  standardDue: number;      // Months 2-8 due (3.75% of chit value)
  postDrawFee: number;      // 1% of chit value
  postDrawTotalDue: number; // standardDue + postDrawFee
  minPayout: number;        // Month 2 payout (70% of chit value)
  maxPayout: number;        // Month 20 payout (95% of chit value)
  totalDue: number;         // Total dues across 20 months (e.g. 84,350 for 1L)
  schedule: FixedMonthRow[];
}

export interface AuctionMonthRow {
  month: number;
  discountPct: number;
  totalDiscount: number;
  payout: number;
  commission: number;
  dividend: number;
  netDue: number;
}

export interface AuctionPlanDetails {
  chitValue: number;
  months: number;
  members: number;
  grossDue: number;
  commission: number;
  minNetDue: number;
  maxNetDue: number;
  minPayout: number;
  maxPayout: number;
  totalInvested: number;
  totalDividends: number;
  schedule: AuctionMonthRow[];
}

/**
 * Standard Jenista Chits 20 Months - 20 Members Fixed Plan Schedule Ratio Matrix
 * Matches official company poster:
 * - Month 1: 5.00% Due (V * 0.05), Payment = COMPANY (Foreman/Company takes Month 1)
 * - Months 2-8: 3.75% Due (V * 0.0375), Payment = 70.00% (V * 0.70)
 * - Month 9:  3.85% Due (V * 0.0385), Payment = 72.00% (V * 0.72)
 * - Month 10: 3.95% Due (V * 0.0395), Payment = 74.00% (V * 0.74)
 * - Month 11: 4.05% Due (V * 0.0405), Payment = 76.00% (V * 0.76)
 * - Month 12: 4.15% Due (V * 0.0415), Payment = 78.00% (V * 0.78)
 * - Month 13: 4.25% Due (V * 0.0425), Payment = 80.00% (V * 0.80)
 * - Month 14: 4.35% Due (V * 0.0435), Payment = 82.00% (V * 0.82)
 * - Month 15: 4.50% Due (V * 0.0450), Payment = 85.00% (V * 0.85)
 * - Month 16: 4.60% Due (V * 0.0460), Payment = 87.00% (V * 0.87)
 * - Month 17: 4.70% Due (V * 0.0470), Payment = 89.00% (V * 0.89)
 * - Month 18: 4.80% Due (V * 0.0480), Payment = 91.00% (V * 0.91)
 * - Month 19: 4.90% Due (V * 0.0490), Payment = 93.00% (V * 0.93)
 * - Month 20: 5.00% Due (V * 0.0500), Payment = 95.00% (V * 0.95)
 *
 * Total Due Sum = 84.35% of Chit Value (e.g. 84,350 for 1L, 1,68,700 for 2L, 4,21,750 for 5L, 8,43,500 for 10L)
 * Final Month Payout = 95.00% of Chit Value (e.g. 95,000 for 1L, 1,90,000 for 2L, 4,75,000 for 5L, 9,50,000 for 10L)
 */
export const fixedScheduleRatioMatrix: { month: number; duePct: number; paymentPct: number; isCompany?: boolean }[] = [
  { month: 1, duePct: 0.0500, paymentPct: 0, isCompany: true },
  { month: 2, duePct: 0.0375, paymentPct: 0.70 },
  { month: 3, duePct: 0.0375, paymentPct: 0.70 },
  { month: 4, duePct: 0.0375, paymentPct: 0.70 },
  { month: 5, duePct: 0.0375, paymentPct: 0.70 },
  { month: 6, duePct: 0.0375, paymentPct: 0.70 },
  { month: 7, duePct: 0.0375, paymentPct: 0.70 },
  { month: 8, duePct: 0.0375, paymentPct: 0.70 },
  { month: 9, duePct: 0.0385, paymentPct: 0.72 },
  { month: 10, duePct: 0.0395, paymentPct: 0.74 },
  { month: 11, duePct: 0.0405, paymentPct: 0.76 },
  { month: 12, duePct: 0.0415, paymentPct: 0.78 },
  { month: 13, duePct: 0.0425, paymentPct: 0.80 },
  { month: 14, duePct: 0.0435, paymentPct: 0.82 },
  { month: 15, duePct: 0.0450, paymentPct: 0.85 },
  { month: 16, duePct: 0.0460, paymentPct: 0.87 },
  { month: 17, duePct: 0.0470, paymentPct: 0.89 },
  { month: 18, duePct: 0.0480, paymentPct: 0.91 },
  { month: 19, duePct: 0.0490, paymentPct: 0.93 },
  { month: 20, duePct: 0.0500, paymentPct: 0.95 },
];

/**
 * Auto-calculates the complete 20-month schedule for a Fixed Chit Plan.
 */
export const calculateFixedPlanSchedule = (chitValue: number, months: number = 20): FixedPlanDetails => {
  const members = months;
  const postDrawFee = Math.round(chitValue * 0.01);
  let totalDue = 0;

  const schedule: FixedMonthRow[] = [];

  for (let m = 1; m <= months; m++) {
    const config = fixedScheduleRatioMatrix[m - 1] || {
      month: m,
      duePct: 1 / months,
      paymentPct: 0.70 + ((m - 1) / months) * 0.25,
      isCompany: m === 1,
    };

    const due = Math.round(chitValue * config.duePct);
    const isCompany = !!config.isCompany;
    const payout = isCompany ? 0 : Math.round(chitValue * config.paymentPct);
    const payoutDisplay = isCompany ? 'COMPANY' : payout.toLocaleString('en-IN');

    totalDue += due;

    schedule.push({
      month: m,
      due,
      duePct: config.duePct,
      payout,
      payoutPct: config.paymentPct,
      isCompany,
      payoutDisplay,
    });
  }

  const eligiblePayouts = schedule.filter(r => !r.isCompany).map(r => r.payout);
  const standardDue = schedule[1]?.due || Math.round(chitValue * 0.0375);
  const month1Due = schedule[0]?.due || Math.round(chitValue * 0.05);

  return {
    chitValue,
    months,
    members,
    monthlyDue: month1Due,
    month1Due,
    standardDue,
    postDrawFee,
    postDrawTotalDue: standardDue + postDrawFee,
    minPayout: eligiblePayouts.length > 0 ? Math.min(...eligiblePayouts) : Math.round(chitValue * 0.70),
    maxPayout: eligiblePayouts.length > 0 ? Math.max(...eligiblePayouts) : Math.round(chitValue * 0.95),
    totalDue,
    schedule,
  };
};

// Standard Tamil Nadu 20-Month Reverse Auction Discount percentages
const defaultDiscountSchedule = [
  5,   // Month 1 (Foreman Chit: 5% commission, full net payout)
  30,  // Month 2 (Max Auction Cap: 30%)
  28,  // Month 3
  26,  // Month 4
  24,  // Month 5
  22,  // Month 6
  20,  // Month 7
  18,  // Month 8
  16,  // Month 9
  15,  // Month 10
  14,  // Month 11
  13,  // Month 12
  12,  // Month 13
  11,  // Month 14
  10,  // Month 15
  9,   // Month 16
  8,   // Month 17
  7,   // Month 18
  6,   // Month 19
  5,   // Month 20 (Foreman commission only)
];

/**
 * Auto-calculates the complete 20-month schedule for an Auction Chit Plan.
 * Rule:
 * - 20 months, 20 members
 * - Gross Due = Chit Value / 20
 * - Foreman Commission = 5% of Chit Value
 * - Divisible discount = Total Bid Discount - Foreman Commission
 * - Dividend per member = Divisible discount / 20
 * - Net Due = Gross Due - Dividend per member
 * - Payout = Chit Value - Total Bid Discount
 */
export const calculateAuctionPlanSchedule = (chitValue: number, months: number = 20): AuctionPlanDetails => {
  const members = months;
  const grossDue = Math.round(chitValue / months);
  const commission = Math.round(chitValue * 0.05);

  const schedule: AuctionMonthRow[] = [];
  let totalInvested = 0;
  let totalDividends = 0;

  for (let m = 1; m <= months; m++) {
    const discountPct = defaultDiscountSchedule[m - 1] ?? 5;
    const totalDiscount = Math.round(chitValue * (discountPct / 100));
    const payout = chitValue - totalDiscount;

    let dividend = 0;
    if (m === 1 || discountPct <= 5) {
      dividend = 0;
    } else {
      const divisibleDiscount = Math.max(0, totalDiscount - commission);
      dividend = Math.round(divisibleDiscount / members);
    }

    const netDue = grossDue - dividend;
    totalInvested += netDue;
    totalDividends += dividend;

    schedule.push({
      month: m,
      discountPct,
      totalDiscount,
      payout,
      commission,
      dividend,
      netDue,
    });
  }

  const netDues = schedule.map(r => r.netDue);
  const payouts = schedule.map(r => r.payout);

  return {
    chitValue,
    months,
    members,
    grossDue,
    commission,
    minNetDue: Math.min(...netDues),
    maxNetDue: Math.max(...netDues),
    minPayout: Math.min(...payouts),
    maxPayout: Math.max(...payouts),
    totalInvested,
    totalDividends,
    schedule,
  };
};

export interface RegularMonthRow {
  month: number;
  duePct: number;
  due: number;
  paymentPct: number;
  payment: number;
  isCompany: boolean;
  paymentDisplay: string;
  dividend: number;
  bidDiscountPct: number;
}

export interface RegularPlanDetails {
  chitValue: number;
  months: number;
  members: number;
  grossDue: number;
  firstMonthDue: number;
  minDue: number;
  maxDue: number;
  totalDue: number;
  minPayout: number;
  maxPayout: number;
  totalDividends: number;
  foremanCommission: number;
  schedule: RegularMonthRow[];
}

export const defaultRegularCategories = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

export const regularPlanTerms = [
  {
    id: 1,
    tamil: 'தொடர்ந்து 3 மாதங்கள் சீட்டுத்தொகை கட்டத் தவறினால் சீட்டிலிருந்து நீக்கப்படுவோர், சீட்டு முடிந்தவுடன் கட்டிய பணம் வழங்கப்படும்.',
    english: 'Members failing to pay chit installments for 3 consecutive months will be removed from the chit, and their paid amount will be refunded upon chit completion.',
  },
  {
    id: 2,
    tamil: 'சீட்டுத்தொகை எடுத்தவருக்கு ஜாமீன்தாரரும் Co.Applicant-ம் முழுப் பொறுப்பு.',
    english: 'The Guarantor and Co-Applicant are fully responsible for the member taking the prize money.',
  },
  {
    id: 3,
    tamil: 'தினசரி மற்றும் மாதந்தோறும் சீட்டுத்தொகை வசூலிக்கப்படும்',
    english: 'Chit installments are collected on a daily and monthly basis.',
  },
  {
    id: 4,
    tamil: 'சீட்டு எடுத்த நாள் ஜாமீன்தாரருடன் சேர்ந்து Co.Applicant உடன் வந்து, நகல் வங்கி காசோலை (Cheque) இவைகளை சமர்ப்பித்து 10 நாட்களுக்குள் பணம் பெற்றுக் கொள்ளலாம்.',
    english: 'Prize winner must visit with Guarantor and Co-Applicant, submit required document copies and bank cheque, and receive payment within 10 days.',
  },
];

/**
 * Standard Jenista Chits 20 Months - 20 Members Regular Plan Schedule Ratio Map
 * Month 1: 5% Due, COMPANY payout
 * Month 2-8: 3.75% Due, 70% Payout (30% bid discount)
 * Month 9: 3.85% Due, 72% Payout (28% bid discount)
 * Month 10: 3.95% Due, 74% Payout (26% bid discount)
 * Month 11: 4.05% Due, 76% Payout (24% bid discount)
 * Month 12: 4.15% Due, 78% Payout (22% bid discount)
 * Month 13: 4.25% Due, 80% Payout (20% bid discount)
 * Month 14: 4.35% Due, 82% Payout (18% bid discount)
 * Month 15: 4.50% Due, 85% Payout (15% bid discount)
 * Month 16: 4.60% Due, 87% Payout (13% bid discount)
 * Month 17: 4.70% Due, 89% Payout (11% bid discount)
 * Month 18: 4.80% Due, 91% Payout (9% bid discount)
 * Month 19: 4.90% Due, 93% Payout (7% bid discount)
 * Month 20: 5.00% Due, 95% Payout (5% bid discount / Foreman Comm)
 */
const regularScheduleRatioMatrix: { month: number; duePct: number; paymentPct: number; isCompany?: boolean }[] = [
  { month: 1, duePct: 0.05, paymentPct: 0, isCompany: true },
  { month: 2, duePct: 0.0375, paymentPct: 0.70 },
  { month: 3, duePct: 0.0375, paymentPct: 0.70 },
  { month: 4, duePct: 0.0375, paymentPct: 0.70 },
  { month: 5, duePct: 0.0375, paymentPct: 0.70 },
  { month: 6, duePct: 0.0375, paymentPct: 0.70 },
  { month: 7, duePct: 0.0375, paymentPct: 0.70 },
  { month: 8, duePct: 0.0375, paymentPct: 0.70 },
  { month: 9, duePct: 0.0385, paymentPct: 0.72 },
  { month: 10, duePct: 0.0395, paymentPct: 0.74 },
  { month: 11, duePct: 0.0405, paymentPct: 0.76 },
  { month: 12, duePct: 0.0415, paymentPct: 0.78 },
  { month: 13, duePct: 0.0425, paymentPct: 0.80 },
  { month: 14, duePct: 0.0435, paymentPct: 0.82 },
  { month: 15, duePct: 0.0450, paymentPct: 0.85 },
  { month: 16, duePct: 0.0460, paymentPct: 0.87 },
  { month: 17, duePct: 0.0470, paymentPct: 0.89 },
  { month: 18, duePct: 0.0480, paymentPct: 0.91 },
  { month: 19, duePct: 0.0490, paymentPct: 0.93 },
  { month: 20, duePct: 0.0500, paymentPct: 0.95 },
];

/**
 * Auto-calculates the complete 20-month schedule for a Regular Chit Plan (Jenista Chits Standard Brochure).
 */
export const calculateRegularPlanSchedule = (chitValue: number, months: number = 20): RegularPlanDetails => {
  const members = months;
  const grossDue = Math.round(chitValue / months);
  const foremanCommission = Math.round(chitValue * 0.05);

  let totalDue = 0;
  let totalDividends = 0;

  const schedule: RegularMonthRow[] = regularScheduleRatioMatrix.map((item) => {
    const due = Math.round(chitValue * item.duePct);
    const payment = Math.round(chitValue * item.paymentPct);
    const isCompany = !!item.isCompany;
    const paymentDisplay = isCompany ? 'COMPANY' : payment.toLocaleString('en-IN');
    
    // Total discount = Chit Value - Payment
    const totalDiscount = isCompany ? foremanCommission : chitValue - payment;
    const bidDiscountPct = isCompany ? 0 : Math.round((totalDiscount / chitValue) * 100);
    
    // Divisible dividend = Gross Due - Net Due
    const dividend = isCompany ? 0 : Math.max(0, grossDue - due);

    totalDue += due;
    totalDividends += dividend;

    return {
      month: item.month,
      duePct: item.duePct,
      due,
      paymentPct: item.paymentPct,
      payment,
      isCompany,
      paymentDisplay,
      dividend,
      bidDiscountPct,
    };
  });

  const dues = schedule.map(r => r.due);
  const eligiblePayouts = schedule.filter(r => !r.isCompany).map(r => r.payment);

  return {
    chitValue,
    months,
    members,
    grossDue,
    firstMonthDue: schedule[0]?.due || grossDue,
    minDue: Math.min(...dues),
    maxDue: Math.max(...dues),
    totalDue,
    minPayout: Math.min(...eligiblePayouts),
    maxPayout: Math.max(...eligiblePayouts),
    totalDividends,
    foremanCommission,
    schedule,
  };
};
