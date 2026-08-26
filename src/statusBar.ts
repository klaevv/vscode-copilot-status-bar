import * as vscode from "vscode";
import { QuotaSnapshot } from "./types";

const STATUS_BAR_PRIORITY = 100;
const WARNING_THRESHOLD = 75;
const ERROR_THRESHOLD = 90;

export type QuotaViewState =
  | { kind: "signedOut" }
  | { kind: "unavailable" }
  | { kind: "ok"; snapshot: QuotaSnapshot; stale: boolean };

function percentUsed(percentRemaining: number): number {
  if (!Number.isFinite(percentRemaining)) return 0;
  return Math.round(Math.min(100, Math.max(0, 100 - percentRemaining)));
}

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0m";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function resetText(resetDate: Date | null, resetDateHasTime: boolean): string {
  if (!resetDate || !Number.isFinite(resetDate.getTime())) return "unknown";
  if (!resetDateHasTime) {
    // Date-only value: round up to the end of that UTC day so the countdown doesn't
    // undercount by showing a fabricated (and often misleading) time-of-day.
    const endOfDayUtc = Date.UTC(
      resetDate.getUTCFullYear(),
      resetDate.getUTCMonth(),
      resetDate.getUTCDate() + 1,
    );
    return formatDuration(Math.max(0, Math.floor((endOfDayUtc - Date.now()) / 1000)));
  }
  const seconds = Math.max(0, Math.floor((resetDate.getTime() - Date.now()) / 1000));
  return formatDuration(seconds);
}

// Date-only values carry no real time-of-day, so show just the date to avoid implying precision that isn't there.
function formatResetDate(resetDate: Date, resetDateHasTime: boolean): string {
  return resetDateHasTime ? resetDate.toLocaleString() : resetDate.toLocaleDateString(undefined, { timeZone: "UTC" });
}

export class StatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, STATUS_BAR_PRIORITY);
  }

  dispose() {
    this.item.dispose();
  }

  update(state: QuotaViewState) {
    switch (state.kind) {
      case "signedOut":
        this.item.text = "$(github) Sign in";
        this.item.tooltip = "Sign in to GitHub to show Copilot premium request quota.";
        this.item.command = "copilotStatusBar.signIn";
        this.item.backgroundColor = undefined;
        break;
      case "unavailable":
        this.item.text = "$(github) Copilot —";
        this.item.tooltip = "Copilot quota unavailable. Run 'Copilot Status Bar: Show Log' for details, or click to retry.";
        this.item.command = "copilotStatusBar.refresh";
        this.item.backgroundColor = undefined;
        break;
      case "ok":
        this.renderSnapshot(state.snapshot, state.stale);
        break;
    }
    this.item.show();
  }

  private renderSnapshot(snapshot: QuotaSnapshot, stale: boolean) {
    const label = snapshot.unlimited ? "Unlimited" : `${percentUsed(snapshot.percentRemaining)}%`;
    const staleSuffix = stale ? " (stale)" : "";
    this.item.text = `$(github) Premium ${label}${staleSuffix} · resets ${resetText(snapshot.resetDate, snapshot.resetDateHasTime)}`;
    this.item.tooltip = renderTooltip(snapshot, stale);
    this.item.command = "copilotStatusBar.showUsage";

    if (!snapshot.unlimited) {
      const used = percentUsed(snapshot.percentRemaining);
      if (used >= ERROR_THRESHOLD) {
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.errorBackground");
      } else if (used >= WARNING_THRESHOLD) {
        this.item.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      } else {
        this.item.backgroundColor = undefined;
      }
    } else {
      this.item.backgroundColor = undefined;
    }
  }
}

function renderTooltip(snapshot: QuotaSnapshot, stale: boolean): vscode.MarkdownString {
  const md = new vscode.MarkdownString(undefined, true);
  md.appendMarkdown("**Copilot premium request quota**\n\n");
  md.appendMarkdown(`Plan: ${snapshot.planName}\n\n`);
  if (snapshot.unlimited) {
    md.appendMarkdown("Unlimited entitlement\n\n");
  } else {
    md.appendMarkdown(`Used: ${percentUsed(snapshot.percentRemaining)}% of ${snapshot.entitlement}\n\n`);
  }
  if (snapshot.overageUsed > 0) {
    md.appendMarkdown(`Overage used: ${snapshot.overageUsed} (${snapshot.overageEnabled ? "enabled" : "disabled"})\n\n`);
  }
  md.appendMarkdown(
    snapshot.resetDate ? `Resets: ${formatResetDate(snapshot.resetDate, snapshot.resetDateHasTime)}\n\n` : "Reset date unknown\n\n",
  );
  if (stale) {
    md.appendMarkdown("_Last refresh failed — showing most recently known values._\n\n");
  }
  md.appendMarkdown(`*Updated: ${snapshot.capturedAt.toLocaleString()}*`);
  return md;
}

export interface UsageQuickPickItem extends vscode.QuickPickItem {
  action?: "setRefreshInterval";
}

export function createUsageQuickPickItems(snapshot: QuotaSnapshot): UsageQuickPickItem[] {
  const usedText = snapshot.unlimited ? "Unlimited" : `${percentUsed(snapshot.percentRemaining)}% used`;
  const reset = snapshot.resetDate ? formatResetDate(snapshot.resetDate, snapshot.resetDateHasTime) : "unknown";
  return [
    {
      label: `$(github) Premium requests — ${usedText}`,
      detail: `Plan: ${snapshot.planName} · Resets ${reset} · updated ${snapshot.capturedAt.toLocaleString()}`,
    },
    {
      label: "$(gear) Change refresh interval…",
      action: "setRefreshInterval",
    },
  ];
}
