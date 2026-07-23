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
    premiumExpiresAt: subscription.premiumExpiresAt || null
  };
};

export const shouldShowAds = (user = {}) => !getSubscription(user).isPremium;
