import * as vscode from "vscode";
import { parseCopilotUserResponse } from "./quotaParser";
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
  return parseCopilotUserResponse(await res.json());
}

// Returns null only when signed out; throws on transient fetch failures so
// callers can distinguish "no session" from "temporary error" and keep stale data.
export async function readLatestQuota(): Promise<QuotaSnapshot | null> {
  const session = await getSilentGitHubSession();
  if (!session) return null;
  return fetchQuotaSnapshot(session.accessToken);
}
