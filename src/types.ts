export interface QuotaSnapshot {
  planName: string;
  entitlement: number;
  unlimited: boolean;
  percentRemaining: number;
  overageEnabled: boolean;
  overageUsed: number;
  resetDate: Date | null;
  // False when resetDate was derived from a date-only field (no time-of-day is meaningful).
  resetDateHasTime: boolean;
  capturedAt: Date;
}
