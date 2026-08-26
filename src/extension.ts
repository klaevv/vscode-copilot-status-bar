import * as vscode from "vscode";
import { readLatestQuota, signIn } from "./quotaClient";
import { createUsageQuickPickItems, StatusBar } from "./statusBar";
import { QuotaSnapshot } from "./types";

let timer: NodeJS.Timeout | undefined;
let countdownTimer: NodeJS.Timeout | undefined;
let statusBar: StatusBar | undefined;
let lastSnapshot: QuotaSnapshot | null = null;
let lastStale = false;
const output = vscode.window.createOutputChannel("Copilot Status Bar");

function getConfig() {
  const c = vscode.workspace.getConfiguration("copilotStatusBar");
  return {
    refreshIntervalSeconds: c.get<number>("refreshIntervalSeconds", 300),
    countdownUpdateIntervalSeconds: c.get<number>("countdownUpdateIntervalSeconds", 60),
  };
}

async function refresh() {
  if (!statusBar) return;
  try {
    const snapshot = await readLatestQuota();
    if (snapshot === null) {
      lastSnapshot = null;
      lastStale = false;
      statusBar.update({ kind: "signedOut" });
      return;
    }
    lastSnapshot = snapshot;
    lastStale = false;
    statusBar.update({ kind: "ok", snapshot, stale: false });
  } catch (err) {
    output.appendLine(`[${new Date().toLocaleTimeString()}] refresh failed: ${err instanceof Error ? err.message : String(err)}`);
    if (lastSnapshot) {
      lastStale = true;
      statusBar.update({ kind: "ok", snapshot: lastSnapshot, stale: true });
    } else {
      statusBar.update({ kind: "unavailable" });
    }
  }
}

// Re-renders the countdown from the cached snapshot only; no network call.
function tickCountdown() {
  if (!statusBar || !lastSnapshot) return;
  statusBar.update({ kind: "ok", snapshot: lastSnapshot, stale: lastStale });
}

function restartTimer() {
  if (timer) clearInterval(timer);
  const cfg = getConfig();
  timer = setInterval(refresh, Math.max(60, cfg.refreshIntervalSeconds) * 1000);
}

function restartCountdownTimer() {
  if (countdownTimer) clearInterval(countdownTimer);
  const cfg = getConfig();
  countdownTimer = setInterval(tickCountdown, Math.max(15, cfg.countdownUpdateIntervalSeconds) * 1000);
}

async function showUsage() {
  if (!lastSnapshot) {
    await vscode.window.showInformationMessage(
      "No Copilot quota data yet. Sign in to GitHub and refresh to populate usage.",
    );
    return;
  }
  const picked = await vscode.window.showQuickPick(createUsageQuickPickItems(lastSnapshot), {
    title: "Copilot Usage",
    placeHolder: "Premium request quota",
  });
  if (picked?.action === "setRefreshInterval") {
    await setRefreshInterval();
  }
}

async function handleSignIn() {
  await signIn();
  await refresh();
}

const REFRESH_INTERVAL_PRESETS_SECONDS = [60, 300, 600, 900, 1800, 3600];

function formatIntervalLabel(seconds: number): string {
  if (seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

async function setRefreshInterval() {
  const cfg = getConfig();
  const picked = await vscode.window.showQuickPick(
    [
      ...REFRESH_INTERVAL_PRESETS_SECONDS.map((seconds) => ({
        label: formatIntervalLabel(seconds),
        description: seconds === cfg.refreshIntervalSeconds ? "current" : undefined,
        seconds,
      })),
      { label: "Custom…", description: undefined, seconds: undefined },
    ],
    { title: "Copilot Status Bar: Refresh Interval", placeHolder: "How often to re-fetch Copilot quota from GitHub" },
  );
  if (!picked) return;

  let seconds = picked.seconds;
  if (seconds === undefined) {
    const input = await vscode.window.showInputBox({
      title: "Refresh interval in seconds",
      value: String(cfg.refreshIntervalSeconds),
      validateInput: (v) => (Number.isFinite(Number(v)) && Number(v) >= 60 ? undefined : "Enter a number of seconds, minimum 60"),
    });
    if (!input) return;
    seconds = Number(input);
  }

  await vscode.workspace.getConfiguration("copilotStatusBar").update("refreshIntervalSeconds", seconds, vscode.ConfigurationTarget.Global);
}

export function activate(context: vscode.ExtensionContext) {
  statusBar = new StatusBar();
  context.subscriptions.push(statusBar, output);

  context.subscriptions.push(
    vscode.commands.registerCommand("copilotStatusBar.refresh", refresh),
    vscode.commands.registerCommand("copilotStatusBar.showUsage", showUsage),
    vscode.commands.registerCommand("copilotStatusBar.signIn", handleSignIn),
    vscode.commands.registerCommand("copilotStatusBar.showLog", () => output.show()),
    vscode.commands.registerCommand("copilotStatusBar.setRefreshInterval", setRefreshInterval),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration("copilotStatusBar")) return;
      restartTimer();
      restartCountdownTimer();
      void refresh();
    }),
  );

  context.subscriptions.push(
    vscode.authentication.onDidChangeSessions((e) => {
      if (e.provider.id === "github") void refresh();
    }),
  );

  restartTimer();
  restartCountdownTimer();
  void refresh();
}

export function deactivate() {
  if (timer) clearInterval(timer);
  if (countdownTimer) clearInterval(countdownTimer);
  statusBar?.dispose();
}
