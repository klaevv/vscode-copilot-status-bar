import { QuotaSnapshot } from "./types";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredNumber(source: JsonObject, key: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Copilot quota response had an invalid ${key}`);
  }
  return value;
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

  return {
    planName: optionalNonEmptyString(value.copilot_plan) ?? "unknown",
    entitlement: requiredNumber(field, "entitlement"),
    unlimited: requiredBoolean(field, "unlimited"),
    percentRemaining: requiredNumber(field, "percent_remaining"),
    overageEnabled: requiredBoolean(field, "overage_permitted"),
    overageUsed: requiredNumber(field, "overage_count"),
    resetDate,
    resetDateHasTime: resetDate !== null && resetDateUtc !== undefined,
    capturedAt,
  };
}
