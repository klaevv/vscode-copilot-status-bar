import * as vscode from 'vscode';
export interface QuotaSnapshot {
  /**
   * The name of the plan.
   * Field contained in response obj: true
   * Field name in the response object: `copilot_plan`
   */
  planName: string;

  //////////
  // quota related fields
  //////////

  // ****
  // maximum related fields:
  // ****

  /**
   * Indicates whether the quota is unlimited.
   * Needed for calculations involving quota limits
   * and avoiding division by zero.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.unlimited`
   */
  unlimited: boolean;

  /**
   * The total quota limit.
   * Should be a positive number if `unlimited` is false.
   * Ignored if `unlimited` is true, but should still be a valid not zero number.
   * suggested to be -1 when unlimited.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.entitlement`
   */
  quotaTotal: number;

  // ****
  // retrieved values from the quota provider
  // if provider does only provide absolute OR percentage value
  // the missing value will be calculated from the available one.
  // ****

  /**
   * The amount of quota used.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.credits_used`
   */
  quotaUsed: number | null | undefined;

  /**
   * The percentage of quota used.
   * 
   * Field contained in response obj: false
   * Field name in the response object: ``
   */
  percentUsed: number | null | undefined;
  // ****
  // calculated fields:
  // ****
  /**
   * The amount of quota remaining.
   * -1 if the quota is unlimited.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.quota_remaining`
   */
  quotaRemaining: number | null | undefined;

  /**
   * The percentage of quota remaining.
   * 100 if the quota is unlimited.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.percent_remaining`
   */
  percentRemaining: number | null | undefined;

  // ****
  // used for internal calculations, calculated once per snapshot,
  // to avoid repeated computation of exceptional values, like division by zero.
  // ****

  /**
   * The factor used for percentage calculations.
   * 0 if the quota is unlimited, otherwise 100 / quotaTotal.
   * 
   * Field contained in response obj: false
   * Field name in the response object: ``
   */
  percentageFactor: number | null | undefined;

  // ****
  // misc fields
  // **** 

  /**
   * Indicates whether overage is enabled.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.overage_permitted`
   */
  overageEnabled: boolean;

  /**
   * The amount of overage used.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_snapshots.premium_interactions.overage_count`
   */
  overageUsed: number;

  /**
   * The reset date of the quota.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `quota_reset_date`
   */
  resetDate: Date | null | undefined;
  
  
  /**
   * Indicates whether the resetDate includes a meaningful time-of-day.
   * False when resetDate was derived from a date-only field (no time-of-day is meaningful).
   * 
   * Field contained in response obj: indirect, derived from `quota_reset_date`
   * Field name in the response object: ``
   */
  resetDateHasTime: boolean;

  /**
   * The timestamp when the snapshot was captured.
   * 
   * Field contained in response obj: true
   * Field name in the response object: `timestamp_utc`
   */
  capturedAt: Date;
}

export type DisplayMode = 'Used' | 'Remaining';
export interface CachedConfiguration {
    displayMode: DisplayMode;
    showRemaining: boolean;
}