export interface FixedMonthRow {
  month: number;
  due: number;
  payout: number;
}

export interface FixedPlanDetails {
  chitValue: number;
  months: number;
  members: number;
  monthlyDue: number;
  postDrawFee: number;
  postDrawTotalDue: number;
  minPayout: number;
  maxPayout: number;
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

export const calculateFixedPlanSchedule = (chitValue: number, months: number = 20): FixedPlanDetails => {
  const members = months;
  const monthlyDue = Math.round(chitValue / months);
  const postDrawFee = Math.round(chitValue * 0.01);
  const postDrawTotalDue = monthlyDue + postDrawFee;

  const schedule: FixedMonthRow[] = [];
  for (let m = 1; m <= months; m++) {
    const payoutMultiplier = 0.95 + (m - 1) * 0.01;
    const payout = Math.round(chitValue * payoutMultiplier);
    schedule.push({
      month: m,
      due: monthlyDue,
      payout,
    });
  }

  return {
    chitValue,
    months,
    members,
    monthlyDue,
    postDrawFee,
    postDrawTotalDue,
    minPayout: schedule[0]?.payout || Math.round(chitValue * 0.95),
    maxPayout: schedule[months - 1]?.payout || Math.round(chitValue * 1.14),
    schedule,
  };
};

const defaultDiscountSchedule = [
  5, 30, 28, 26, 24, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5
];

export const calculateAuctionPlanSchedule = (chitValue: number, months: number = 20): AuctionPlanDetails => {
  const members = months;
  const grossDue = Math.round(chitValue / months);
  const commission = Math.round(chitValue * 0.05);

  const schedule: AuctionMonthRow[] = [];
  let totalDividends = 0;
  let totalInvested = 0;

  for (let m = 1; m <= months; m++) {
    const discountPct = defaultDiscountSchedule[m - 1] ?? 5;
    const totalDiscount = Math.round(chitValue * (discountPct / 100));
    const payout = chitValue - totalDiscount;

    let dividend = 0;
    if (m === 1) {
      dividend = 0;
    } else {
      const distributable = totalDiscount - commission;
      dividend = Math.round(distributable / members);
    }

    const netDue = grossDue - dividend;
    totalDividends += dividend;
    totalInvested += netDue;

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

  const netDues = schedule.map((r) => r.netDue);
  const payouts = schedule.map((r) => r.payout);

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
    const totalDiscount = isCompany ? foremanCommission : chitValue - payment;
    const bidDiscountPct = isCompany ? 0 : Math.round((totalDiscount / chitValue) * 100);
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

  const dues = schedule.map((r) => r.due);
  const payments = schedule.filter((r) => !r.isCompany).map((r) => r.payment);

  return {
    chitValue,
    months,
    members,
    grossDue,
    firstMonthDue: schedule[0]?.due || Math.round(chitValue * 0.05),
    minDue: Math.min(...dues),
    maxDue: Math.max(...dues),
    totalDue,
    minPayout: Math.min(...payments),
    maxPayout: Math.max(...payments),
    totalDividends,
    foremanCommission,
    schedule,
  };
};

export const defaultRegularCategories = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

export const defaultFixedCategories = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

export const defaultAuctionCategories = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

