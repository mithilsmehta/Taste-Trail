const PREMIUM_PLANS = [
  {
    id: "premium_1_month",
    productId: process.env.PLAY_SUBSCRIPTION_PRODUCT_ID || "tastewise_premium",
    basePlanId: process.env.PLAY_BASE_PLAN_PREMIUM_MONTHLY || "monthly",
    label: "1 Month",
    durationMonths: 1,
    price: "₹99",
    badge: "Starter",
    note: "Renews monthly unless cancelled."
  },
  {
    id: "premium_3_month",
    productId: process.env.PLAY_SUBSCRIPTION_PRODUCT_ID || "tastewise_premium",
    basePlanId: process.env.PLAY_BASE_PLAN_PREMIUM_QUARTERLY || "quarterly",
    label: "3 Months",
    durationMonths: 3,
    price: "₹249",
    badge: "Flexible",
    note: "Renews every 3 months unless cancelled."
  },
  {
    id: "premium_6_month",
    productId: process.env.PLAY_SUBSCRIPTION_PRODUCT_ID || "tastewise_premium",
    basePlanId: process.env.PLAY_BASE_PLAN_PREMIUM_HALF_YEARLY || "half-yearly",
    label: "6 Months",
    durationMonths: 6,
    price: "₹449",
    badge: "Popular",
    note: "Renews every 6 months unless cancelled."
  },
  {
    id: "premium_12_month",
    productId: process.env.PLAY_SUBSCRIPTION_PRODUCT_ID || "tastewise_premium",
    basePlanId: process.env.PLAY_BASE_PLAN_PREMIUM_YEARLY || "yearly",
    label: "12 Months",
    durationMonths: 12,
    price: "₹799",
    badge: "Best Value",
    note: "Renews yearly unless cancelled."
  }
];

const getPremiumPlans = () => PREMIUM_PLANS.map((plan) => ({
  ...plan,
  billingProvider: "google_play",
  billingReady: Boolean(process.env.GOOGLE_PLAY_PACKAGE_NAME && process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON)
}));

const getPremiumPlan = (planIdOrProductId) => {
  const value = String(planIdOrProductId || "").trim();
  return PREMIUM_PLANS.find((plan) => (
    plan.id === value ||
    plan.productId === value ||
    plan.basePlanId === value
  )) || null;
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + Number(months || 0));
  return next;
};

const getSubscriptionSnapshot = (subscription = {}) => {
  const expiresAt = subscription.premiumExpiresAt ? new Date(subscription.premiumExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;
  const isPremium = Boolean(subscription.isPremium) && !isExpired;

  return {
    isPremium,
    status: isPremium ? subscription.status || "active" : subscription.status || "free",
    plan: isPremium ? subscription.plan || null : null,
    provider: isPremium ? subscription.provider || null : null,
    playProductId: isPremium ? subscription.playProductId || null : null,
    playBasePlanId: isPremium ? subscription.playBasePlanId || null : null,
    premiumExpiresAt: subscription.premiumExpiresAt || null,
    autoRenewing: Boolean(subscription.autoRenewing),
    cancelReason: subscription.cancelReason || null,
    googlePlayState: subscription.googlePlayState || null,
    lastVerifiedAt: subscription.lastVerifiedAt || null
  };
};

module.exports = {
  addMonths,
  getPremiumPlan,
  getPremiumPlans,
  getSubscriptionSnapshot
};
