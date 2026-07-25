const express = require("express");
const crypto = require("crypto");
const User = require("../models/User");
const GooglePlayNotification = require("../models/GooglePlayNotification");
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

const hasValidRtdnSecret = (req) => {
  const expected = String(process.env.GOOGLE_PLAY_RTDN_SECRET || "");
  const received = String(req.query.token || req.get("x-rtdn-secret") || "");
  if (!expected || !received || expected.length !== received.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};

const parsePubSubNotification = (body = {}) => {
  const message = body.message || {};
  if (!message.messageId || !message.data) {
    throw new Error("Invalid Pub/Sub message");
  }

  const payload = JSON.parse(Buffer.from(message.data, "base64").toString("utf8"));
  return { message, payload };
};

const applyGooglePlayVerification = (user, plan, purchaseToken, verification) => {
  user.subscription = {
    ...user.subscription?.toObject?.(),
    isPremium: verification.hasEntitlement,
    status: verification.status,
    plan: plan.id,
    provider: "google_play",
    premiumExpiresAt: verification.expiresAt,
    playProductId: plan.productId,
    playBasePlanId: plan.basePlanId,
    playPurchaseToken: purchaseToken,
    googlePlayState: verification.subscriptionState,
    autoRenewing: verification.autoRenewing,
    cancelReason: verification.cancelReason,
    lastVerifiedAt: new Date()
  };
};

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
      expectedBasePlanId: plan.basePlanId,
      requireEntitlement: false
    });

    applyGooglePlayVerification(
      user,
      plan,
      subscription.playPurchaseToken,
      verification
    );
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

router.get("/google-play-rtdn", (req, res) => {
  res.json({
    ok: true,
    endpoint: "Google Play real-time developer notifications",
    accepts: "POST requests from Google Cloud Pub/Sub",
    configured: {
      packageName: Boolean(process.env.GOOGLE_PLAY_PACKAGE_NAME),
      serviceAccount: Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON),
      notificationSecret: Boolean(process.env.GOOGLE_PLAY_RTDN_SECRET)
    }
  });
});

router.post("/google-play-rtdn", async (req, res) => {
  if (!hasValidRtdnSecret(req)) {
    return res.status(401).json({ msg: "Invalid notification secret" });
  }

  let notificationRecord;

  try {
    const { message, payload } = parsePubSubNotification(req.body);
    const subscriptionNotification = payload.subscriptionNotification;

    if (payload.packageName !== process.env.GOOGLE_PLAY_PACKAGE_NAME) {
      return res.status(400).json({ msg: "Unexpected Android package" });
    }

    if (!subscriptionNotification?.purchaseToken || !subscriptionNotification?.subscriptionId) {
      return res.status(204).end();
    }

    try {
      notificationRecord = await GooglePlayNotification.create({
        messageId: message.messageId,
        notificationType: subscriptionNotification.notificationType,
        purchaseToken: subscriptionNotification.purchaseToken,
        subscriptionId: subscriptionNotification.subscriptionId,
        status: "ignored"
      });
    } catch (error) {
      if (error?.code === 11000) return res.status(204).end();
      throw error;
    }

    const user = await User.findOne({
      "subscription.playPurchaseToken": subscriptionNotification.purchaseToken
    });

    if (!user) {
      return res.status(204).end();
    }

    const verification = await verifyGooglePlaySubscription({
      purchaseToken: subscriptionNotification.purchaseToken,
      expectedProductId: subscriptionNotification.subscriptionId,
      requireEntitlement: false
    });
    const basePlanId = verification.lineItem?.offerDetails?.basePlanId;
    const plan = getPremiumPlan(basePlanId);

    if (!plan || plan.productId !== subscriptionNotification.subscriptionId) {
      throw new Error("Notification does not match a configured Premium plan");
    }

    applyGooglePlayVerification(
      user,
      plan,
      subscriptionNotification.purchaseToken,
      verification
    );
    await user.save();

    notificationRecord.status = "processed";
    notificationRecord.processedAt = new Date();
    await notificationRecord.save();

    return res.status(204).end();
  } catch (error) {
    if (notificationRecord?._id) {
      await GooglePlayNotification.deleteOne({ _id: notificationRecord._id }).catch(() => {});
    }
    console.error("Google Play RTDN failed:", error.message);
    return res.status(500).json({ msg: "Notification processing failed" });
  }
});

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

    const tokenOwner = await User.findOne({
      "subscription.playPurchaseToken": purchaseToken,
      _id: { $ne: req.user.id }
    }).select("_id");

    if (tokenOwner) {
      return res.status(409).json({
        msg: "This Google Play purchase is already linked to another Tastewise account."
      });
    }

    if (verification.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED") {
      await acknowledgeGooglePlaySubscription({
        productId: plan.productId,
        purchaseToken
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    applyGooglePlayVerification(user, plan, purchaseToken, verification);

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
    if (error?.code === 11000) {
      return res.status(409).json({
        msg: "This Google Play purchase is already linked to another Tastewise account."
      });
    }

    const isPurchaseRejected = /not active|does not match/i.test(error.message || "");
    return res.status(isPurchaseRejected ? 422 : 500).json({
      msg: error.message || "Failed to verify Google Play purchase"
    });
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
      googlePlayState: null,
      autoRenewing: false,
      cancelReason: null,
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
