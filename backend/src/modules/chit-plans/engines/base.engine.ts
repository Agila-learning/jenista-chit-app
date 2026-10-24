export abstract class ChitPlanEngine {
  protected configuration: any;

  constructor(configuration: any) {
    this.configuration = configuration;
  }

  abstract validateMembership(memberData: any): boolean;
  abstract calculateInstallment(cycleData: any): number;
  abstract validateCycle(cycleData: any): boolean;
  abstract calculatePayout(data: any): any;
  abstract processCycle(cycleData: any): Promise<any>;
}
