const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getPremiumPlan,
  getPremiumPlans,
  getSubscriptionSnapshot
} = require("../utils/subscriptionPlans");
const { getSubscriptionStatus } = require("../utils/googlePlayVerifier");

test("all Google Play base-plan IDs use valid characters", () => {
  const validBasePlanId = /^[a-z0-9][a-z0-9-]*$/;

  for (const plan of getPremiumPlans()) {
    assert.match(plan.basePlanId, validBasePlanId);
  }

  assert.equal(getPremiumPlan("half-yearly")?.id, "premium_6_month");
});

test("subscription snapshot removes Premium after expiry", () => {
  const snapshot = getSubscriptionSnapshot({
    isPremium: true,
    status: "active",
    plan: "premium_1_month",
    premiumExpiresAt: new Date(Date.now() - 60_000)
  });

  assert.equal(snapshot.isPremium, false);
  assert.equal(snapshot.plan, null);
});

test("Google Play lifecycle states map to app statuses", () => {
  assert.equal(getSubscriptionStatus("SUBSCRIPTION_STATE_ACTIVE"), "active");
  assert.equal(getSubscriptionStatus("SUBSCRIPTION_STATE_IN_GRACE_PERIOD"), "grace_period");
  assert.equal(getSubscriptionStatus("SUBSCRIPTION_STATE_ON_HOLD"), "account_hold");
  assert.equal(getSubscriptionStatus("SUBSCRIPTION_STATE_CANCELED"), "canceled");
  assert.equal(getSubscriptionStatus("SUBSCRIPTION_STATE_EXPIRED"), "expired");
});
