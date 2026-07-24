const crypto = require("crypto");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const ACTIVE_SUBSCRIPTION_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_ON_HOLD"
]);

let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

const base64Url = (value) => Buffer
  .from(value)
  .toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

const parseServiceAccount = () => {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is missing");

  try {
    const json = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    return JSON.parse(json);
  } catch {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must be valid JSON or base64 encoded JSON");
  }
};

const createServiceAccountJwt = (serviceAccount) => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: serviceAccount.token_uri || TOKEN_URL,
    exp: now + 3600,
    iat: now
  };

  const signingInput = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(signingInput)
    .sign(serviceAccount.private_key);

  return `${signingInput}.${base64Url(signature)}`;
};

const getAccessToken = async () => {
  if (cachedAccessToken && cachedAccessTokenExpiresAt > Date.now() + 60_000) {
    return cachedAccessToken;
  }

  const serviceAccount = parseServiceAccount();
  const assertion = createServiceAccountJwt(serviceAccount);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });

  const response = await fetch(serviceAccount.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Failed to authenticate with Google Play");
  }

  cachedAccessToken = data.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedAccessToken;
};

const googlePlayRequest = async (path, options = {}) => {
  const accessToken = await getAccessToken();
  const response = await fetch(`https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Google Play API request failed");
  }

  return data;
};

const verifyGooglePlaySubscription = async ({ purchaseToken, expectedProductId, expectedBasePlanId }) => {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) throw new Error("GOOGLE_PLAY_PACKAGE_NAME is missing");

  const encodedPackageName = encodeURIComponent(packageName);
  const encodedToken = encodeURIComponent(purchaseToken);
  const purchase = await googlePlayRequest(
    `applications/${encodedPackageName}/purchases/subscriptionsv2/tokens/${encodedToken}`
  );

  const lineItems = Array.isArray(purchase.lineItems) ? purchase.lineItems : [];
  const matchedLineItem = lineItems.find((item) => {
    const basePlanId = item.offerDetails?.basePlanId;
    return item.productId === expectedProductId && (!expectedBasePlanId || basePlanId === expectedBasePlanId);
  });

  if (!matchedLineItem) {
    throw new Error("Purchase does not match the selected Premium plan");
  }

  const expiresAt = matchedLineItem.expiryTime ? new Date(matchedLineItem.expiryTime) : null;
  const hasFutureAccess = expiresAt ? expiresAt.getTime() > Date.now() : false;
  const isActiveState = ACTIVE_SUBSCRIPTION_STATES.has(purchase.subscriptionState);

  if (!hasFutureAccess || !isActiveState) {
    throw new Error("Google Play purchase is not active");
  }

  return {
    purchase,
    lineItem: matchedLineItem,
    expiresAt,
    subscriptionState: purchase.subscriptionState,
    acknowledgementState: purchase.acknowledgementState,
    orderId: purchase.latestOrderId || null
  };
};

const acknowledgeGooglePlaySubscription = async ({ productId, purchaseToken }) => {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  if (!packageName) throw new Error("GOOGLE_PLAY_PACKAGE_NAME is missing");

  await googlePlayRequest(
    `applications/${encodeURIComponent(packageName)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
    {
      method: "POST",
      body: JSON.stringify({})
    }
  );
};

module.exports = {
  acknowledgeGooglePlaySubscription,
  verifyGooglePlaySubscription
};
