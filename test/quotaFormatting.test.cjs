const assert = require("node:assert/strict");
const test = require("node:test");
const {
  formatDuration,
  percentUsed,
  resetText,
} = require("../out/quotaFormatting.js");

test("percentUsed converts remaining quota and clamps invalid ranges", () => {
  assert.equal(percentUsed(100), 0);
  assert.equal(percentUsed(25.4), 75);
  assert.equal(percentUsed(0), 100);
  assert.equal(percentUsed(120), 0);
  assert.equal(percentUsed(-20), 100);
  assert.equal(percentUsed(Number.NaN), 0);
});

test("formatDuration selects useful day, hour, and minute precision", () => {
  assert.equal(formatDuration(0), "0m");
  assert.equal(formatDuration(59), "0m");
  assert.equal(formatDuration(60), "1m");
  assert.equal(formatDuration(3_661), "1h 1m");
  assert.equal(formatDuration(90_061), "1d 1h");
  assert.equal(formatDuration(Number.POSITIVE_INFINITY), "0m");
});

test("resetText uses the exact time when the API supplies one", () => {
  const now = Date.parse("2026-08-26T12:00:00.000Z");
  const reset = new Date("2026-08-27T14:31:00.000Z");

  assert.equal(resetText(reset, true, now), "1d 2h");
  assert.equal(resetText(new Date(now - 1), true, now), "0m");
});

test("resetText counts date-only values through the end of their UTC day", () => {
  const now = Date.parse("2026-08-26T12:00:00.000Z");
  const resetDateOnly = new Date("2026-08-26");

  assert.equal(resetText(resetDateOnly, false, now), "12h 0m");
});

test("resetText handles missing and invalid dates", () => {
  assert.equal(resetText(null, true, 0), "unknown");
  assert.equal(resetText(new Date("invalid"), true, 0), "unknown");
});
