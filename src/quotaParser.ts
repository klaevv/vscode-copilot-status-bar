import { QuotaSnapshot } from "./types";
import { Helpers } from "./helpers";
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredNumber(source: JsonObject, key: string): number {
  const value = source[key];
  if (value === undefined || value === null) {
    throw new Error(`Copilot quota response did not contain data for ${key}`);
  }
  const parsedValue= Helpers.tryParseNumber(value)
  if (!parsedValue.success || !parsedValue.valueIsFinite) {
    throw new Error(`Copilot quota response value for ${key} was not a valid number! Received: '${value}'`);
  }
  return Helpers.roundTo(parsedValue.value);
}

/**
 * Attempts to parse an optional number from the given source object.
 * Returns the number if it exists and is finite, otherwise returns the default value if provided, or undefined.
 */
function optionalNumber(
  source: JsonObject,
  key: string,
  defaultValue: number | null | undefined = undefined
) : number | undefined | null {
  try {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      
      return Helpers.roundTo(value);
    }
  } catch {
    // ignore errors and return undefined
  }
  return defaultValue;
}
function requiredBoolean(source: JsonObject, key: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") {
    throw new Error(`Copilot quota response had an invalid ${key}`);
  }
  return value;
}

function optionalNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function parseCopilotUserResponse(
  value: unknown,
  capturedAt = new Date(),
): QuotaSnapshot {
  if (!isObject(value)) {
    throw new Error("Copilot quota response was not an object");
  }

  const snapshots = value.quota_snapshots;
  if (!isObject(snapshots)) {
    throw new Error("Copilot quota response had no recognizable quota snapshot");
  }

  // Free plans report "chat"; paid plans report "premium_interactions".
  const field = snapshots.premium_interactions ?? snapshots.chat;
  if (!isObject(field)) {
    throw new Error("Copilot quota response had no recognizable quota snapshot");
  }

  const resetDateUtc = optionalNonEmptyString(value.quota_reset_date_utc);
  const resetDateOnly = optionalNonEmptyString(value.quota_reset_date);
  const resetDateRaw = resetDateUtc ?? resetDateOnly;
  const parsedResetDate = resetDateRaw ? new Date(resetDateRaw) : null;
  const resetDate =
    parsedResetDate && Number.isFinite(parsedResetDate.getTime()) ? parsedResetDate : null;
  let rv: QuotaSnapshot =
    {
      planName: optionalNonEmptyString(value.copilot_plan) ?? "unknown",
      quotaTotal: requiredNumber(field, "entitlement"),
      unlimited: requiredBoolean(field, "unlimited"),
      quotaUsed: optionalNumber(field, "credits_used"),
      quotaRemaining: optionalNumber(field, "quota_remaining"),
      percentUsed: null,
      percentageFactor: null,
      percentRemaining: requiredNumber(field, "percent_remaining"),
      overageEnabled: requiredBoolean(field, "overage_permitted"),
      overageUsed: requiredNumber(field, "overage_count"),
      resetDate: resetDate,
      resetDateHasTime: resetDate !== null && resetDateUtc !== undefined,
      capturedAt: capturedAt
    } as QuotaSnapshot;

  rv.percentUsed = Helpers.roundTo(100 - (rv.percentRemaining ?? 0));
  
  rv.percentageFactor = Helpers.roundTo(((
    rv.quotaTotal !== null && 
    rv.quotaTotal !== undefined && 
    rv.quotaTotal !== 0
  ) ? 100 / rv.quotaTotal : 0),5);

  return rv;
}
