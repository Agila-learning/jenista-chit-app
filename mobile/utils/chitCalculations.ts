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
  monthlyDue: number;
  month1Due: number;
  standardDue: number;
  postDrawFee: number;
  postDrawTotalDue: number;
  minPayout: number;
  maxPayout: number;
  totalDue: number;
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
 * Official Jenista Chits Fixed Scheme Schedule (Poster 1)
 * 20 Months - 20 Members
 * Fixed Monthly Due = 5.00% of Chit Value (e.g. ₹5,000 for 1L, ₹10,000 for 2L, ₹25,000 for 5L, ₹50,000 for 10L)
 * Month 1: Due = 5.00%, Payment = Company Chit
 * Month 2: Due = 5.00%, Payment = 95.00% (e.g. ₹95,000 for 1L)
 * Month 3: Due = 5.00%, Payment = 96.00% (e.g. ₹96,000 for 1L)
 * Month 4: Due = 5.00%, Payment = 97.00% (e.g. ₹97,000 for 1L)
 * Month 5: Due = 5.00%, Payment = 98.00% (e.g. ₹98,000 for 1L)
 * Month 6: Due = 5.00%, Payment = 99.00% (e.g. ₹99,000 for 1L)
 * Month 7: Due = 5.00%, Payment = 100.00% (e.g. ₹1,00,000 for 1L)
 * Month 8: Due = 5.00%, Payment = 101.00% (e.g. ₹1,01,000 for 1L)
 * Month 9: Due = 5.00%, Payment = 102.00% (e.g. ₹1,02,000 for 1L)
 * Month 10: Due = 5.00%, Payment = 103.00% (e.g. ₹1,03,000 for 1L)
 * Month 11: Due = 5.00%, Payment = 104.00% (e.g. ₹1,04,000 for 1L)
 * Month 12: Due = 5.00%, Payment = 105.00% (e.g. ₹1,05,000 for 1L)
 * Month 13: Due = 5.00%, Payment = 106.00% (e.g. ₹1,06,000 for 1L)
 * Month 14: Due = 5.00%, Payment = 107.00% (e.g. ₹1,07,000 for 1L)
 * Month 15: Due = 5.00%, Payment = 108.00% (e.g. ₹1,08,000 for 1L)
 * Month 16: Due = 5.00%, Payment = 109.00% (e.g. ₹1,09,000 for 1L)
 * Month 17: Due = 5.00%, Payment = 110.00% (e.g. ₹1,10,000 for 1L)
 * Month 18: Due = 5.00%, Payment = 111.00% (e.g. ₹1,11,000 for 1L)
 * Month 19: Due = 5.00%, Payment = 112.00% (e.g. ₹1,12,000 for 1L)
 * Month 20: Due = 5.00%, Payment = 113.00% (e.g. ₹1,13,000 for 1L)
 *
 * Rule 7: Prized Member Post-Draw Installment:
 * Standard Due (5%) + 1% Post-Draw Fee = 6% of Chit Value
 * ₹1,00,000: ₹5,000 + ₹1,000 = ₹6,000/mo
 * ₹2,00,000: ₹10,000 + ₹2,000 = ₹12,000/mo
 * ₹5,00,000: ₹25,000 + ₹5,000 = ₹30,000/mo
 * ₹10,00,000: ₹50,000 + ₹10,000 = ₹60,000/mo
 */
export const fixedScheduleRatioMatrix: { month: number; duePct: number; paymentPct: number; isCompany?: boolean }[] = [
  { month: 1, duePct: 0.05, paymentPct: 0, isCompany: true },
  { month: 2, duePct: 0.05, paymentPct: 0.95 },
  { month: 3, duePct: 0.05, paymentPct: 0.96 },
  { month: 4, duePct: 0.05, paymentPct: 0.97 },
  { month: 5, duePct: 0.05, paymentPct: 0.98 },
  { month: 6, duePct: 0.05, paymentPct: 0.99 },
  { month: 7, duePct: 0.05, paymentPct: 1.00 },
  { month: 8, duePct: 0.05, paymentPct: 1.01 },
  { month: 9, duePct: 0.05, paymentPct: 1.02 },
  { month: 10, duePct: 0.05, paymentPct: 1.03 },
  { month: 11, duePct: 0.05, paymentPct: 1.04 },
  { month: 12, duePct: 0.05, paymentPct: 1.05 },
  { month: 13, duePct: 0.05, paymentPct: 1.06 },
  { month: 14, duePct: 0.05, paymentPct: 1.07 },
  { month: 15, duePct: 0.05, paymentPct: 1.08 },
  { month: 16, duePct: 0.05, paymentPct: 1.09 },
  { month: 17, duePct: 0.05, paymentPct: 1.10 },
  { month: 18, duePct: 0.05, paymentPct: 1.11 },
  { month: 19, duePct: 0.05, paymentPct: 1.12 },
  { month: 20, duePct: 0.05, paymentPct: 1.13 },
];

export const calculateFixedPlanSchedule = (chitValue: number, months: number = 20): FixedPlanDetails => {
  const members = months;
  const postDrawFee = Math.round(chitValue * 0.01);
  let totalDue = 0;

  const schedule: FixedMonthRow[] = [];
  for (let m = 1; m <= months; m++) {
    const config = fixedScheduleRatioMatrix[m - 1] || {
      month: m,
      duePct: 1 / months,
      paymentPct: 0.95 + ((m - 2) * 0.01),
      isCompany: m === 1,
    };

    const due = Math.round(chitValue * config.duePct);
    const isCompany = !!config.isCompany;
    const payout = isCompany ? 0 : Math.round(chitValue * config.paymentPct);
    const payoutDisplay = isCompany ? 'Company' : payout.toLocaleString('en-IN');

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

  const eligiblePayouts = schedule.filter((r) => !r.isCompany).map((r) => r.payout);
  const monthlyDue = Math.round(chitValue / months);

  return {
    chitValue,
    months,
    members,
    monthlyDue,
    month1Due: monthlyDue,
    standardDue: monthlyDue,
    postDrawFee,
    postDrawTotalDue: monthlyDue + postDrawFee,
    minPayout: eligiblePayouts.length > 0 ? Math.min(...eligiblePayouts) : Math.round(chitValue * 0.95),
    maxPayout: eligiblePayouts.length > 0 ? Math.max(...eligiblePayouts) : Math.round(chitValue * 1.13),
    totalDue,
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

export const fixedPlanTerms = [
  {
    id: 1,
    tamil: '1. பிரதிமாதம் 10/15 ம் தேதி மாலை 6.00 மணி முதல் 7.00 மணி வரை ஏலம் விடப்படும்.',
    english: '1. Auction/Draw is conducted on the 10th/15th of every month from 6:00 PM to 7:00 PM.',
  },
  {
    id: 2,
    tamil: '2. ஏலம் நடைபெற்று முடிந்து 3 நாட்களுக்குள் சீட்டுத்தொகையை கண்டிப்பாக செலுத்த வேண்டும்.',
    english: '2. Chit installment must be paid strictly within 3 days after auction completion.',
  },
  {
    id: 3,
    tamil: '3. தொடர்ந்து 3 மாதங்கள் சீட்டு கட்ட தவறினால் சீட்டிலிருந்து நீக்கப்படுவர், சீட்டு முடிந்தவுடன் கட்டிய பணம் வழங்கப்படும்.',
    english: '3. Members failing to pay chit installments for 3 consecutive months will be removed from the chit; paid amount refunded upon chit completion.',
  },
  {
    id: 4,
    tamil: '4. சீட்டு எடுத்தவருக்கு ஜாமீன்தாரரும் Co.Applicant-ம் முழுப் பொறுப்பு.',
    english: '4. The Guarantor and Co-Applicant bear full responsibility for the member receiving the prize money.',
  },
  {
    id: 5,
    tamil: '5. குலுக்கல் சீட்டு வாடிக்கையாளர்கள் குலுக்கல் நேரத்திற்கு முன்பாக சீட்டு தொகையை கண்டிப்பாக செலுத்த வேண்டும்.',
    english: '5. Lucky draw chit subscribers must pay their installment before the draw time.',
  },
  {
    id: 6,
    tamil: '6. சீட்டு எடுத்த நபர் ஜாமீன்தாரருடன் சேர்ந்து Co.Applicant உடன் வந்து, முத்திரைத்தாள் (பத்திரம்), அடையாள அட்டை நகல் வங்கி காசோலை (Cheque) இவைகளை சமர்ப்பித்து சீட்டு முடிந்து 10 நாட்களுக்குள் பணம் பெற்றுக் கொள்ளலாம்.',
    english: '6. Prized subscriber must visit with Guarantor & Co-Applicant, submit stamped bond, ID copies, and bank cheque, and receive prize amount within 10 days.',
  },
  {
    id: 7,
    tamil: '7. சீட்டு வேண்டுபவர்களை மட்டுமே குலுக்கலில் சேர்த்துக்கொள்ளப்படும். சீட்டு எடுத்த நபர் சீட்டு எடுத்த அடுத்த மாதத்திலிருந்து கீழ்கண்டவாறு பணம் செலுத்தவேண்டும்: 1,00,000 சீட்டுக்கு ரூ. 5,000 + 1,000/- = ரூ. 6,000; 2,00,000 சீட்டுக்கு ரூ. 10,000 + 2,000/- = ரூ. 12,000; 5,00,000 சீட்டுக்கு ரூ. 25,000 + 5,000/- = ரூ. 30,000; 10,00,000 சீட்டுக்கு ரூ. 50,000 + 10,000/- = ரூ. 60,000 கட்டவேண்டும்.',
    english: '7. Only members requesting the chit are included in draw. Prized subscriber must pay installment + 1% extra from next month: ₹1L: ₹6,000/mo, ₹2L: ₹12,000/mo, ₹5L: ₹30,000/mo, ₹10L: ₹60,000/mo.',
  },
];

export const regularPlanTerms = [
  {
    id: 1,
    tamil: '1. பிரதிமாதம் 10 /15 ம் தேதி மாலை 6.00 மணி முதல் 7.00 மணி வரை ஏலம் விடப்படும்.',
    english: '1. Auction is conducted on the 10th / 15th of every month from 6:00 PM to 7:00 PM.',
  },
  {
    id: 2,
    tamil: '2. ஏலம் நடைபெற்று முடிந்து 3 நாட்களுக்குள் சீட்டுத்தொகையை கண்டிப்பாக செலுத்த வேண்டும்.',
    english: '2. Chit installment must be paid strictly within 3 days after auction completion.',
  },
  {
    id: 3,
    tamil: '3. தொடர்ந்து 3 மாதங்கள் சீட்டு கட்ட தவறினால் சீட்டிலிருந்து நீக்கப்படுவர், சீட்டு முடிந்தவுடன் கட்டிய பணம் வழங்கப்படும்.',
    english: '3. Members failing to pay chit installments for 3 consecutive months will be removed from the chit; paid amount refunded upon chit completion.',
  },
  {
    id: 4,
    tamil: '4. சீட்டு எடுத்தவருக்கு ஜாமீன்தாரரும் Co.Applicant-ம் முழுப் பொறுப்பு.',
    english: '4. The Guarantor and Co-Applicant bear full responsibility for the member receiving the prize money.',
  },
  {
    id: 5,
    tamil: '5. குலுக்கல் சீட்டு வாடிக்கையாளர்கள் குலுக்கல் நேரத்திற்கு முன்பாக சீட்டுதொகையை கண்டிப்பாக செலுத்த வேண்டும்.',
    english: '5. Chit subscribers must pay the chit installment before the auction/draw time.',
  },
  {
    id: 6,
    tamil: '6. சீட்டு எடுத்த நபர் ஜாமீன்தாரருடன் சேர்ந்து Co.Applicant உடன் வந்து, முத்திரைத்தாள் (பத்திரம்/சீட்டுத் தொகைக்கு ஏற்றார் போல் நில பத்திர பதிவு அல்லது ஏதேனும் ஒரு உடைமை), அடையாள அட்டை நகல், வங்கி காசோலை (cheque) இவைகளை சமர்ப்பித்து சீட்டு முடிந்து 10 நாட்களுக்குள் பணம் பெற்றுக் கொள்ளலாம்.',
    english: '6. Prized subscriber must visit with Guarantor & Co-Applicant, submit stamped bond / property deed / security document, ID proofs, and signed cheques to receive payment within 10 days.',
  },
];

export const regularScheduleRatioMatrix: { month: number; duePct: number; paymentPct: number; isCompany?: boolean }[] = [
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

