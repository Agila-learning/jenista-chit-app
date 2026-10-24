import { ChitPlanEngine } from './base.engine';

export class RegularPlanEngine extends ChitPlanEngine {
  constructor(configuration: any) {
    super(configuration);
  }

  validateMembership(memberData: any): boolean {
    if (memberData.status !== 'ACTIVE') return false;
    return true;
  }

  /**
   * Returns regular chit installment according to month in schedule (20 months)
   * Formula:
   * Month 1: 5% (gross)
   * Months 2-8: 3.75%
   * Month 9: 3.85%, Month 10: 3.95%, Month 11: 4.05%, Month 12: 4.15%, Month 13: 4.25%, Month 14: 4.35%
   * Month 15: 4.50%, Month 16: 4.60%, Month 17: 4.70%, Month 18: 4.80%, Month 19: 4.90%, Month 20: 5.00%
   */
  calculateInstallment(cycleData: any): number {
    const month = cycleData.monthNumber || 1;
    const chitValue = this.configuration.chitValue || (this.configuration.installmentAmount * 20);

    const dueRates: { [key: number]: number } = {
      1: 0.05,
      2: 0.0375, 3: 0.0375, 4: 0.0375, 5: 0.0375, 6: 0.0375, 7: 0.0375, 8: 0.0375,
      9: 0.0385, 10: 0.0395, 11: 0.0405, 12: 0.0415, 13: 0.0425, 14: 0.0435,
      15: 0.0450, 16: 0.0460, 17: 0.0470, 18: 0.0480, 19: 0.0490, 20: 0.0500
    };

    const rate = dueRates[month] ?? 0.05;
    return Math.round(chitValue * rate);
  }

  validateCycle(cycleData: any): boolean {
    if (cycleData.status === 'CLOSED') return false;
    return true;
  }

  /**
   * Calculates payout for the month according to the Jenista Chits brochure schedule.
   * Month 1: Foreman/Company Chit
   * Months 2-8: 70% Payout
   * Month 9-14: 72% to 82%
   * Month 15-20: 85% to 95%
   */
  calculatePayout(data: any): any {
    const month = data.monthNumber || 1;
    const chitValue = this.configuration.chitValue || (this.configuration.installmentAmount * 20);

    const payoutRates: { [key: number]: number } = {
      1: 0,
      2: 0.70, 3: 0.70, 4: 0.70, 5: 0.70, 6: 0.70, 7: 0.70, 8: 0.70,
      9: 0.72, 10: 0.74, 11: 0.76, 12: 0.78, 13: 0.80, 14: 0.82,
      15: 0.85, 16: 0.87, 17: 0.89, 18: 0.91, 19: 0.93, 20: 0.95
    };

    const payoutRate = payoutRates[month] ?? 0.95;
    const payoutAmount = Math.round(chitValue * payoutRate);
    const commission = Math.round(chitValue * 0.05);

    return {
      monthNumber: month,
      grossAmount: chitValue,
      isCompanyChit: month === 1,
      commission,
      netPayout: payoutAmount,
    };
  }

  async processCycle(cycleData: any): Promise<any> {
    return {
      success: true,
      type: 'REGULAR_CYCLE_PROCESSED',
      payoutCalculation: this.calculatePayout(cycleData)
    };
  }
}
