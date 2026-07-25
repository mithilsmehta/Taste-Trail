import { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import {
  fetchPremiumPlans,
  fetchSubscriptionStatus,
  formatPremiumDate,
  getGooglePlaySubscriptionManagementUrl,
  getSubscription,
  isGooglePlayCheckoutAvailable,
  startGooglePlayCheckout,
  verifyGooglePlayPurchase
} from "../utils/subscription";
import "./Premium.css";

const fallbackPlans = [
  { id: "premium_1_month", productId: "tastewise_premium", basePlanId: "monthly", label: "1 Month", price: "₹99", badge: "Starter", note: "Renews monthly unless cancelled." },
  { id: "premium_3_month", productId: "tastewise_premium", basePlanId: "quarterly", label: "3 Months", price: "₹249", badge: "Flexible", note: "Renews every 3 months unless cancelled." },
  { id: "premium_6_month", productId: "tastewise_premium", basePlanId: "half-yearly", label: "6 Months", price: "₹449", badge: "Popular", note: "Renews every 6 months unless cancelled." },
  { id: "premium_12_month", productId: "tastewise_premium", basePlanId: "yearly", label: "12 Months", price: "₹799", badge: "Best Value", note: "Renews yearly unless cancelled." }
];

const benefits = [
  { title: "Ad-free cooking", copy: "Premium hides every Tastewise ad slot for your account." },
  { title: "More room to plan", copy: "Built for heavier saved recipe, meal planner, and grocery list use." },
  { title: "Nutrition focus", copy: "Prepared for deeper nutrition tools as the app grows." },
  { title: "Priority features", copy: "Premium users can receive new cooking tools first." }
];

export default function Premium() {
  const { user, token, setUser, refreshUser } = useContext(AuthContext);
  const [plans, setPlans] = useState(fallbackPlans);
  const [billingReady, setBillingReady] = useState(false);
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [purchaseLoading, setPurchaseLoading] = useState("");
  const [loading, setLoading] = useState(true);
  const subscription = getSubscription(user);
  const manageSubscriptionUrl = getGooglePlaySubscriptionManagementUrl(subscription);

  const activePlan = useMemo(() => {
    return plans.find((plan) => (
      plan.id === subscription.plan ||
      (plan.productId === subscription.playProductId && plan.basePlanId === subscription.playBasePlanId)
    ));
  }, [plans, subscription.plan, subscription.playProductId, subscription.playBasePlanId]);

  useEffect(() => {
    let isMounted = true;

    const loadPremiumState = async () => {
      if (!token) return;

      setLoading(true);
      setStatusMessage("");

      try {
        const [plansResponse, statusResponse] = await Promise.all([
          fetchPremiumPlans(token),
          fetchSubscriptionStatus(token)
        ]);

        if (!isMounted) return;

        setPlans(Array.isArray(plansResponse.plans) && plansResponse.plans.length ? plansResponse.plans : fallbackPlans);
        setBillingReady(Boolean(plansResponse.billingReady));
        setCheckoutAvailable(isGooglePlayCheckoutAvailable());

        if (statusResponse.user) {
          setUser(statusResponse.user);
        }
      } catch (error) {
        if (isMounted) {
          setStatusMessage(error.message || "Premium details could not load right now.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPremiumState();

    return () => {
      isMounted = false;
    };
  }, [token, setUser]);

  const handleChoosePlan = async (plan) => {
    if (!billingReady) {
      setStatusMessage("Google Play Billing is not connected yet. Create the subscription product and base plans in Play Console, then we will enable checkout.");
      return;
    }

    if (!checkoutAvailable) {
      setStatusMessage("Open Tastewise from the installed Android app to buy Premium. Browser checkout is not available for Google Play subscriptions.");
      return;
    }

    setPurchaseLoading(plan.id);
    setStatusMessage("");

    try {
      const purchase = await startGooglePlayCheckout(plan);
      const result = await verifyGooglePlayPurchase(token, purchase);

      if (result.user) setUser(result.user);
      await refreshUser?.();
      setStatusMessage("Premium is active for your account.");
    } catch (error) {
      setStatusMessage(error.message || "Premium purchase could not be completed.");
    } finally {
      setPurchaseLoading("");
    }
  };

  return (
    <>
      <Navbar />
      <main className="premium-shell">
        <section className="premium-hero">
          <p>Tastewise Premium</p>
          <h1>Cook with fewer limits.</h1>
          <span>
            {subscription.isPremium
              ? `Premium is active${activePlan ? ` on ${activePlan.label}` : ""}${subscription.premiumExpiresAt ? ` until ${formatPremiumDate(subscription.premiumExpiresAt)}` : ""}.`
              : "Premium is prepared for Google Play subscriptions and will remove ads when active."}
          </span>
        </section>

        <section className="premium-status-panel" aria-live="polite">
          <div>
            <strong>{subscription.isPremium ? "Premium account" : "Free account"}</strong>
            <p>
              {subscription.isPremium
                ? subscription.status === "grace_period"
                  ? "Premium remains active during the Google Play payment grace period."
                  : subscription.status === "canceled"
                    ? "Renewal is cancelled, but Premium remains active until the displayed expiry date."
                    : "Ads are hidden for this account while Premium is active."
                : "Checkout is locked until Google Play Billing products and verification are connected."}
            </p>
          </div>
          <span className={billingReady ? "ready" : "pending"}>
            {billingReady ? (checkoutAvailable ? "Checkout ready" : "Open Android app") : "Billing setup pending"}
          </span>
        </section>

        {statusMessage && <div className="premium-message">{statusMessage}</div>}

        <section className="premium-benefits">
          {benefits.map((benefit) => (
            <article key={benefit.title}>
              <span>✓</span>
              <strong>{benefit.title}</strong>
              <p>{benefit.copy}</p>
            </article>
          ))}
        </section>

        <section className="premium-plans">
          {plans.map((plan) => {
            const isCurrent = subscription.isPremium && (
              subscription.plan === plan.id ||
              (subscription.playProductId === plan.productId && subscription.playBasePlanId === plan.basePlanId)
            );

            return (
              <article key={plan.id} className={isCurrent ? "current" : ""}>
                <span>{plan.badge || "Premium"}</span>
                <h2>{plan.label}</h2>
                <strong>{plan.price || "Price set in Play Console"}</strong>
                <p>{plan.note}</p>
                <small>Product ID: {plan.productId}</small>
                <small>Base plan: {plan.basePlanId}</small>
                <button type="button" onClick={() => handleChoosePlan(plan)} disabled={loading || Boolean(purchaseLoading) || isCurrent}>
                  {isCurrent ? "Current plan" : purchaseLoading === plan.id ? "Opening Play..." : billingReady ? "Choose plan" : "Setup pending"}
                </button>
              </article>
            );
          })}
        </section>

        <section className="premium-setup">
          <h2>What is ready now</h2>
          <ul>
            <li>Premium status is stored in the database.</li>
            <li>Free and Premium users can be separated for ad display.</li>
            <li>One Google Play subscription product is defined with 1, 3, 6, and 12 month base plans.</li>
            <li>Purchase tokens are verified with the Google Play Developer API before Premium is activated.</li>
          </ul>
        </section>

        <div className="premium-footer-action">
          {subscription.provider === "google_play" && (
            <a href={manageSubscriptionUrl} target="_blank" rel="noreferrer">
              Manage subscription in Google Play
            </a>
          )}
          <Link to="/profile">Back to Profile</Link>
        </div>
      </main>
    </>
  );
}
