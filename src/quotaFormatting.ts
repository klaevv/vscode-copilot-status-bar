export function percentUsed(percentRemaining: number): number {
  if (!Number.isFinite(percentRemaining)) return 0;
  return Math.round(Math.min(100, Math.max(0, 100 - percentRemaining)));
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0m";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function resetText(
  resetDate: Date | null,
  resetDateHasTime: boolean,
  nowMs = Date.now(),
): string {
  if (!resetDate || !Number.isFinite(resetDate.getTime())) return "unknown";
  if (!resetDateHasTime) {
    // Date-only values have no real time-of-day. Count down to the end of the
    // named UTC day rather than fabricating a reset at its start.
    const endOfDayUtc = Date.UTC(
      resetDate.getUTCFullYear(),
      resetDate.getUTCMonth(),
      resetDate.getUTCDate() + 1,
    );
    return formatDuration(Math.max(0, Math.floor((endOfDayUtc - nowMs) / 1000)));
  }
  const seconds = Math.max(0, Math.floor((resetDate.getTime() - nowMs) / 1000));
  return formatDuration(seconds);
}

export function formatResetDate(resetDate: Date, resetDateHasTime: boolean): string {
  return resetDateHasTime
    ? resetDate.toLocaleString()
    : resetDate.toLocaleDateString(undefined, { timeZone: "UTC" });
}
