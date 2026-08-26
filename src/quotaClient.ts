import * as vscode from "vscode";
import { QuotaSnapshot } from "./types";

const GITHUB_AUTH_PROVIDER_ID = "github";
const GITHUB_SCOPES = ["user:email"];
const QUOTA_URL = "https://api.github.com/copilot_internal/user";
const USER_AGENT = "vscode-copilot-status-bar";

export async function getSilentGitHubSession(): Promise<vscode.AuthenticationSession | undefined> {
  return vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, GITHUB_SCOPES, { createIfNone: false });
}

export async function signIn(): Promise<vscode.AuthenticationSession | undefined> {
  return vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, GITHUB_SCOPES, { createIfNone: true });
}

// Reads a short, non-sensitive slice of an error response body for diagnostics.
async function safeBodySnippet(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

interface QuotaSnapshotField {
  entitlement: number;
  unlimited: boolean;
  overage_count: number;
  overage_permitted: boolean;
  percent_remaining: number;
}

interface CopilotUserResponse {
  copilot_plan?: string;
  // Date-only (no time-of-day); prefer quota_reset_date_utc when present.
  quota_reset_date?: string;
  quota_reset_date_utc?: string;
  quota_snapshots?: {
    premium_interactions?: QuotaSnapshotField;
    chat?: QuotaSnapshotField;
  };
}

async function fetchQuotaSnapshot(githubAccessToken: string): Promise<QuotaSnapshot> {
  const res = await fetch(QUOTA_URL, {
    headers: {
      Authorization: `Bearer ${githubAccessToken}`,
      "User-Agent": USER_AGENT,
      "Editor-Version": `vscode/${vscode.version}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Copilot quota request failed: ${res.status} ${await safeBodySnippet(res)}`);
  }
  const body = (await res.json()) as CopilotUserResponse;
  // Free plans only report a "chat" window; paid plans report "premium_interactions".
  const field = body.quota_snapshots?.premium_interactions ?? body.quota_snapshots?.chat;
  if (!field) {
    throw new Error("Copilot quota response had no recognizable quota snapshot");
  }
  const resetDateRaw = body.quota_reset_date_utc ?? body.quota_reset_date;
  return {
    planName: body.copilot_plan ?? "unknown",
    entitlement: field.entitlement,
    unlimited: field.unlimited,
    percentRemaining: field.percent_remaining,
    overageEnabled: field.overage_permitted,
    overageUsed: field.overage_count,
    resetDate: resetDateRaw ? new Date(resetDateRaw) : null,
    resetDateHasTime: typeof body.quota_reset_date_utc === "string",
    capturedAt: new Date(),
  };
}

// Returns null only when signed out; throws on transient fetch failures so
// callers can distinguish "no session" from "temporary error" and keep stale data.
export async function readLatestQuota(): Promise<QuotaSnapshot | null> {
  const session = await getSilentGitHubSession();
  if (!session) return null;
  return fetchQuotaSnapshot(session.accessToken);
}
