import { useContext } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";
import { getSubscription } from "../utils/subscription";
import "./Premium.css";

const premiumPlans = [
  { id: "premium_1_month", label: "1 Month", price: "Coming soon", note: "Try premium monthly." },
  { id: "premium_3_month", label: "3 Months", price: "Coming soon", note: "Better value for regular cooking." },
  { id: "premium_6_month", label: "6 Months", price: "Coming soon", note: "Best for meal planning users." },
  { id: "premium_12_month", label: "12 Months", price: "Coming soon", note: "Lowest long-term price." }
];

const benefits = [
  "No ads across the app",
  "Higher recipe generation limits",
  "Advanced nutrition insights",
  "Unlimited saved recipes and meal planning",
  "Priority access to new cooking tools"
];

export default function Premium() {
  const { user } = useContext(AuthContext);
  const subscription = getSubscription(user);

  return (
    <>
      <Navbar />
      <main className="premium-shell">
        <section className="premium-hero">
          <p>Tastewise Premium</p>
          <h1>Cook with fewer limits.</h1>
          <span>
            {subscription.isPremium
              ? `Your premium plan is active${subscription.plan ? `: ${subscription.plan}` : ""}.`
              : "Premium plans are being prepared for Google Play Billing."}
          </span>
        </section>

        <section className="premium-benefits">
          {benefits.map((benefit) => (
            <article key={benefit}>
              <span>✓</span>
              <strong>{benefit}</strong>
            </article>
          ))}
        </section>

        <section className="premium-plans">
          {premiumPlans.map((plan) => (
            <article key={plan.id}>
              <h2>{plan.label}</h2>
              <strong>{plan.price}</strong>
              <p>{plan.note}</p>
              <button type="button" disabled>
                Billing setup pending
              </button>
            </article>
          ))}
        </section>

        <div className="premium-footer-action">
          <Link to="/profile">Back to Profile</Link>
        </div>
      </main>
    </>
  );
}
