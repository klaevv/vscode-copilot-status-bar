const assert = require("node:assert/strict");
const test = require("node:test");
const { parseCopilotUserResponse } = require("../out/quotaParser.js");

const paidQuota = {
  entitlement: 300,
  unlimited: false,
  overage_count: 2,
  overage_permitted: true,
  percent_remaining: 42.5,
};

test("parses paid quota and prefers the timestamped reset date", () => {
  const capturedAt = new Date("2026-08-26T12:00:00.000Z");
  const result = parseCopilotUserResponse(
    {
      copilot_plan: "  business  ",
      quota_reset_date: "2026-09-01",
      quota_reset_date_utc: "2026-09-01T08:30:00.000Z",
      quota_snapshots: {
        premium_interactions: paidQuota,
        chat: { ...paidQuota, entitlement: 50 },
      },
    },
    capturedAt,
  );

  assert.equal(result.planName, "business");
  assert.equal(result.entitlement, 300);
  assert.equal(result.percentRemaining, 42.5);
  assert.equal(result.overageEnabled, true);
  assert.equal(result.overageUsed, 2);
  assert.equal(result.resetDate?.toISOString(), "2026-09-01T08:30:00.000Z");
  assert.equal(result.resetDateHasTime, true);
  assert.equal(result.capturedAt, capturedAt);
});

test("falls back to the chat quota and a date-only reset", () => {
  const result = parseCopilotUserResponse({
    quota_reset_date: "2026-09-01",
    quota_snapshots: { chat: { ...paidQuota, unlimited: true } },
  });

  assert.equal(result.planName, "unknown");
  assert.equal(result.unlimited, true);
  assert.equal(result.resetDate?.toISOString(), "2026-09-01T00:00:00.000Z");
  assert.equal(result.resetDateHasTime, false);
});

test("keeps usable quota data when the reset date is invalid", () => {
  const result = parseCopilotUserResponse({
    quota_reset_date_utc: "not-a-date",
    quota_snapshots: { premium_interactions: paidQuota },
  });

  assert.equal(result.resetDate, null);
  assert.equal(result.resetDateHasTime, false);
});

test("rejects missing or malformed quota data", () => {
  assert.throws(
    () => parseCopilotUserResponse(null),
    /response was not an object/,
  );
  assert.throws(
    () => parseCopilotUserResponse({ quota_snapshots: {} }),
    /no recognizable quota snapshot/,
  );
  assert.throws(
    () =>
      parseCopilotUserResponse({
        quota_snapshots: {
          premium_interactions: { ...paidQuota, percent_remaining: "42" },
        },
      }),
    /invalid percent_remaining/,
  );
});
