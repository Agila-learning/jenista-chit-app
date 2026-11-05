import { ChitPlanEngine } from './base.engine';

/**
 * FixedPlanEngine
 * Standard Jenista Chits 20-Month Fixed Plan Scheme:
 * - FOR FIXED PLAN ALONE: Month 1 is Company Chit (goes strictly to Company / Foreman)
 * - Month 1: 5.00% Due (chitValue * 0.05), Member Net Payout = 0 (COMPANY)
 * - Months 2-8: 3.75% Due, 70% Member Payout
 * - Month 9:  3.85% Due, 72% Member Payout
 * - Month 10: 3.95% Due, 74% Member Payout
 * - Month 11: 4.05% Due, 76% Member Payout
 * - Month 12: 4.15% Due, 78% Member Payout
 * - Month 13: 4.25% Due, 80% Member Payout
 * - Month 14: 4.35% Due, 82% Member Payout
 * - Month 15: 4.50% Due, 85% Member Payout
 * - Month 16: 4.60% Due, 87% Member Payout
 * - Month 17: 4.70% Due, 89% Member Payout
 * - Month 18: 4.80% Due, 91% Member Payout
 * - Month 19: 4.90% Due, 93% Member Payout
 * - Month 20: 5.00% Due, 95% Member Payout
 * 
 * Total Member Due Sum = 84.35% of Chit Value
 * Final Month Member Payout = 95.00% of Chit Value
 */
export class FixedPlanEngine extends ChitPlanEngine {
  constructor(configuration: any) {
    super(configuration);
  }

  validateMembership(memberData: any): boolean {
    if (memberData.status !== 'ACTIVE') return false;
    return true;
  }

  calculateInstallment(cycleData: any): number {
    const month = Number(cycleData.monthNumber || cycleData.cycleNumber || 1);
    const duration = Number(this.configuration.durationMonths || 20);
    const chitValue = Number(
      this.configuration.chitValue ||
      (this.configuration.installmentAmount ? this.configuration.installmentAmount * duration : 100000)
    );

    const dueRates: { [key: number]: number } = {
      1: 0.0500,
      2: 0.0375, 3: 0.0375, 4: 0.0375, 5: 0.0375, 6: 0.0375, 7: 0.0375, 8: 0.0375,
      9: 0.0385, 10: 0.0395, 11: 0.0405, 12: 0.0415, 13: 0.0425, 14: 0.0435,
      15: 0.0450, 16: 0.0460, 17: 0.0470, 18: 0.0480, 19: 0.0490, 20: 0.0500,
    };

    const rate = dueRates[month] ?? (1 / duration);
    return Math.round(chitValue * rate);
  }

  validateCycle(cycleData: any): boolean {
    if (cycleData.status === 'CLOSED') return false;
    return true;
  }

  calculatePayout(data: any): any {
    const month = Number(data.monthNumber || data.cycleNumber || 1);
    const duration = Number(this.configuration.durationMonths || 20);
    const chitValue = Number(
      this.configuration.chitValue ||
      (this.configuration.installmentAmount ? this.configuration.installmentAmount * duration : 100000)
    );

    // FIXED PLAN ALONE: Month 1 goes strictly to Company
    const isCompany = month === 1;

    const payoutRates: { [key: number]: number } = {
      1: 0, // 1st month goes to company
      2: 0.70, 3: 0.70, 4: 0.70, 5: 0.70, 6: 0.70, 7: 0.70, 8: 0.70,
      9: 0.72, 10: 0.74, 11: 0.76, 12: 0.78, 13: 0.80, 14: 0.82,
      15: 0.85, 16: 0.87, 17: 0.89, 18: 0.91, 19: 0.93, 20: 0.95,
    };

    const payoutRate = isCompany ? 0 : (payoutRates[month] ?? 0.95);
    const netAmount = Math.round(chitValue * payoutRate);
    const commission = Math.round(chitValue * 0.05);
    const deductions = isCompany ? chitValue : chitValue - netAmount;

    return {
      monthNumber: month,
      grossAmount: chitValue,
      isCompanyChit: isCompany,
      commission,
      deductions,
      netAmount,
      companyChitAmount: isCompany ? chitValue : 0,
      payoutDisplay: isCompany ? 'COMPANY' : netAmount.toLocaleString('en-IN'),
    };
  }

  async processCycle(cycleData: any): Promise<any> {
    const month = Number(cycleData.monthNumber || cycleData.cycleNumber || 1);
    return {
      success: true,
      type: 'FIXED_CYCLE_PROCESSED',
      monthNumber: month,
      isCompanyChit: month === 1,
      payoutCalculation: this.calculatePayout(cycleData),
    };
  }
}
