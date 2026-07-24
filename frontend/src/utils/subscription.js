import { apiUrl } from "./api";

export const getSubscription = (user = {}) => {
  const subscription = user?.subscription || {};
  const expiresAt = subscription.premiumExpiresAt ? new Date(subscription.premiumExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt.getTime() <= Date.now() : false;
  const isPremium = Boolean(subscription.isPremium) && !isExpired;

  return {
    isPremium,
    status: isPremium ? subscription.status || "active" : subscription.status || "free",
    plan: subscription.plan || null,
    provider: subscription.provider || null,
    playProductId: subscription.playProductId || null,
    playBasePlanId: subscription.playBasePlanId || null,
    premiumExpiresAt: subscription.premiumExpiresAt || null
  };
};

export const shouldShowAds = (user = {}) => !getSubscription(user).isPremium;

export const formatPremiumDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
};

export const fetchPremiumPlans = async (token) => {
  const res = await fetch(apiUrl("/api/subscriptions/plans"), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error("Failed to load premium plans");
  return res.json();
};

export const fetchSubscriptionStatus = async (token) => {
  const res = await fetch(apiUrl("/api/subscriptions/status"), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) throw new Error("Failed to load subscription status");
  return res.json();
};

export const verifyGooglePlayPurchase = async (token, purchase) => {
  const res = await fetch(apiUrl("/api/subscriptions/verify-google-play"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(purchase)
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || "Failed to verify purchase");
  return data;
};

const getGooglePlayBillingService = async () => {
  if (!("getDigitalGoodsService" in window)) {
    throw new Error("Google Play checkout is available only inside the installed Android app.");
  }

  const service = await window.getDigitalGoodsService("https://play.google.com/billing");
  if (!service) {
    throw new Error("Google Play Billing service is not available on this device.");
  }

  return service;
};

export const isGooglePlayCheckoutAvailable = () => (
  typeof window !== "undefined" &&
  "PaymentRequest" in window &&
  "getDigitalGoodsService" in window
);

export const startGooglePlayCheckout = async (plan) => {
  if (!plan?.productId || !plan?.basePlanId) {
    throw new Error("Premium plan is missing Google Play product details.");
  }

  await getGooglePlayBillingService();

  const paymentRequest = new PaymentRequest(
    [{
      supportedMethods: "https://play.google.com/billing",
      data: {
        sku: plan.productId,
        productId: plan.productId,
        basePlanId: plan.basePlanId
      }
    }],
    {
      total: {
        label: `Tastewise Premium - ${plan.label}`,
        amount: { currency: "INR", value: String(plan.priceValue || plan.price || "0").replace(/[^\d.]/g, "") || "0" }
      }
    }
  );

  const paymentResponse = await paymentRequest.show();
  const purchaseToken = paymentResponse.details?.purchaseToken || paymentResponse.details?.token;

  if (!purchaseToken) {
    await paymentResponse.complete("fail");
    throw new Error("Google Play did not return a purchase token.");
  }

  await paymentResponse.complete("success");

  return {
    productId: plan.productId,
    basePlanId: plan.basePlanId,
    purchaseToken
  };
};
