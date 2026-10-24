import { ChitPlanEngine } from './base.engine';

export class FixedPlanEngine extends ChitPlanEngine {
  constructor(configuration: any) {
    super(configuration);
  }

  validateMembership(memberData: any): boolean {
    if (memberData.status !== 'ACTIVE') return false;
    return true;
  }

  calculateInstallment(cycleData: any): number {
    return this.configuration.installmentAmount || 0;
  }

  validateCycle(cycleData: any): boolean {
    if (cycleData.status === 'CLOSED') return false;
    return true;
  }

  calculatePayout(data: any): any {
    const grossAmount = this.configuration.installmentAmount * this.configuration.durationMonths;
    let commission = 0;
    
    if (this.configuration.commissionRule?.type === 'PERCENTAGE') {
      commission = (grossAmount * this.configuration.commissionRule.value) / 100;
    }

    const deductions = commission; // Additional deductions could be configured
    const netAmount = grossAmount - deductions;

    return {
      grossAmount,
      commission,
      deductions,
      netAmount,
    };
  }

  async processCycle(cycleData: any): Promise<any> {
    // Determine eligibility: e.g. member who reached completion or specific month
    // Calculate Payout using calculatePayout
    // This returns the structure for the service layer to create Payout & Ledger
    return {
      success: true,
      type: 'FIXED_CYCLE_PROCESSED',
      payoutCalculation: this.calculatePayout({})
    };
  }
}

