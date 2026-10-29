import * as vscode from "vscode";
import { formatResetDate, percentUsed, resetText } from "./quotaFormatting";
import { QuotaSnapshot } from "./types";
import { ConfigurationHelper } from "./helpers";

const STATUS_BAR_PRIORITY = 100;
const WARNING_THRESHOLD = 75;
const ERROR_THRESHOLD = 90;


export type QuotaViewState =
  | { kind: "signedOut" }
  | { kind: "unavailable" }
  | { kind: "ok"; snapshot: QuotaSnapshot; stale: boolean };

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
    const config = ConfigurationHelper.CurrentConfig;
    const label = snapshot.unlimited ? "Unlimited" : (config.showRemaining ? `${(snapshot.percentRemaining ?? 0)}%` : `${(snapshot.percentUsed ?? 0)}%`);
    const staleSuffix = stale ? " (stale)" : "";
    this.item.text = `$(github) Premium ${label}${staleSuffix} · resets ${resetText(snapshot.resetDate ?? null, snapshot.resetDateHasTime)}`;
    this.item.tooltip = renderTooltip(snapshot, stale);
    this.item.command = "copilotStatusBar.showUsage";

    if (!snapshot.unlimited) {
      const used = (snapshot.percentUsed ?? 0);
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
  const config = ConfigurationHelper.CurrentConfig;
  md.appendMarkdown("**Copilot premium request quota**\n\n");
  md.appendMarkdown(`Plan: ${snapshot.planName}\n\n`);
  if (snapshot.unlimited) {
    md.appendMarkdown("Unlimited entitlement\n\n");
  } else if (config.showRemaining) {
    md.appendMarkdown(`Remaining: ${(snapshot.percentRemaining ?? 0)}% of ${snapshot.quotaTotal}\n\n`);
  }
  else {
    md.appendMarkdown(`Used: ${(snapshot.percentUsed ?? 0)}% of ${snapshot.quotaTotal}\n\n`);
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
  const config = ConfigurationHelper.CurrentConfig;
  const usedText = snapshot.unlimited ? "Unlimited" : (config.showRemaining ? `${(snapshot.percentRemaining ?? 0)}% remaining` : `${(snapshot.percentUsed ?? 0)}% used`);
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
