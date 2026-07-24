const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const {
  addMonths,
  getPremiumPlan,
  getPremiumPlans,
  getSubscriptionSnapshot
} = require("../utils/subscriptionPlans");
const {
  acknowledgeGooglePlaySubscription,
  verifyGooglePlaySubscription
} = require("../utils/googlePlayVerifier");

const router = express.Router();

const canVerifyGooglePlay = () => Boolean(
  process.env.GOOGLE_PLAY_PACKAGE_NAME &&
  process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
);

const syncGooglePlaySubscription = async (user) => {
  const subscription = user.subscription || {};
  if (
    subscription.provider !== "google_play" ||
    !subscription.playPurchaseToken ||
    !subscription.playProductId ||
    !subscription.playBasePlanId ||
    !canVerifyGooglePlay()
  ) {
    return false;
  }

  const plan = getPremiumPlan(subscription.playBasePlanId || subscription.plan);
  if (!plan) return false;

  try {
    const verification = await verifyGooglePlaySubscription({
      purchaseToken: subscription.playPurchaseToken,
      expectedProductId: plan.productId,
      expectedBasePlanId: plan.basePlanId
    });

    user.subscription.isPremium = true;
    user.subscription.status = "active";
    user.subscription.plan = plan.id;
    user.subscription.premiumExpiresAt = verification.expiresAt;
    user.subscription.playProductId = plan.productId;
    user.subscription.playBasePlanId = plan.basePlanId;
    user.subscription.lastVerifiedAt = new Date();
    await user.save();
    return true;
  } catch {
    const expiresAt = subscription.premiumExpiresAt ? new Date(subscription.premiumExpiresAt) : null;
    if (!expiresAt || expiresAt.getTime() <= Date.now()) {
      user.subscription.isPremium = false;
      user.subscription.status = "expired";
      user.subscription.lastVerifiedAt = new Date();
      await user.save();
      return true;
    }
  }

  return false;
};

const getSafeUser = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) return null;

  await syncGooglePlaySubscription(user);

  const snapshot = getSubscriptionSnapshot(user.subscription);
  if (user.subscription?.isPremium && !snapshot.isPremium) {
    user.subscription.isPremium = false;
    user.subscription.status = "expired";
    await user.save();
  }

  return User.findById(userId).select("-password");
};

router.get("/plans", authMiddleware, (req, res) => {
  res.json({
    provider: "google_play",
    billingReady: canVerifyGooglePlay(),
    plans: getPremiumPlans()
  });
});

router.get("/status", authMiddleware, async (req, res) => {
  try {
    const user = await getSafeUser(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({
      subscription: getSubscriptionSnapshot(user.subscription),
      user
    });
  } catch (error) {
    res.status(500).json({ msg: "Failed to load subscription status" });
  }
});

router.post("/verify-google-play", authMiddleware, async (req, res) => {
  try {
    const { productId, basePlanId, purchaseToken } = req.body;
    const plan = getPremiumPlan(basePlanId || productId);

    if (!plan || !productId || !basePlanId || !purchaseToken) {
      return res.status(400).json({ msg: "Missing valid Google Play product, base plan, or purchase token" });
    }

    if (!canVerifyGooglePlay()) {
      return res.status(501).json({
        msg: "Google Play Billing verification is not connected yet. Add package name and service account credentials before enabling purchases."
      });
    }

    const verification = await verifyGooglePlaySubscription({
      purchaseToken,
      expectedProductId: plan.productId,
      expectedBasePlanId: plan.basePlanId
    });

    if (verification.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
      await acknowledgeGooglePlaySubscription({
        productId: plan.productId,
        purchaseToken
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.subscription = {
      isPremium: true,
      status: "active",
      plan: plan.id,
      provider: "google_play",
      premiumExpiresAt: verification.expiresAt,
      playProductId: plan.productId,
      playBasePlanId: plan.basePlanId,
      playPurchaseToken: purchaseToken,
      lastVerifiedAt: new Date()
    };

    await user.save();
    const safeUser = await User.findById(req.user.id).select("-password");

    res.json({
      msg: "Premium activated",
      subscription: getSubscriptionSnapshot(safeUser.subscription),
      user: safeUser,
      googlePlay: {
        orderId: verification.orderId,
        subscriptionState: verification.subscriptionState
      }
    });
  } catch (error) {
    res.status(500).json({ msg: error.message || "Failed to verify Google Play purchase" });
  }
});

router.post("/dev/activate", authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ msg: "Not found" });
  }

  try {
    const plan = getPremiumPlan(req.body.planId || "premium_1_month");
    if (!plan) return res.status(400).json({ msg: "Invalid premium plan" });

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    user.subscription = {
      isPremium: true,
      status: "active",
      plan: plan.id,
      provider: "dev",
      premiumExpiresAt: addMonths(new Date(), plan.durationMonths),
      playProductId: plan.productId,
      playBasePlanId: plan.basePlanId,
      playPurchaseToken: null,
      lastVerifiedAt: new Date()
    };

    await user.save();
    const safeUser = await User.findById(req.user.id).select("-password");

    res.json({
      msg: "Development premium access activated",
      subscription: getSubscriptionSnapshot(safeUser.subscription),
      user: safeUser
    });
  } catch (error) {
    res.status(500).json({ msg: "Failed to activate development premium access" });
  }
});

module.exports = router;
