import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./Landing.css";

const features = [
  {
    title: "AI recipe ideas",
    text: "Describe the ingredients you already have and TasteWise helps you turn them into practical recipe ideas for everyday cooking.",
  },
  {
    title: "Meal planning",
    text: "Plan breakfasts, lunches, dinners, and snacks for the week so you can cook with less stress and fewer last-minute decisions.",
  },
  {
    title: "Grocery lists",
    text: "Convert planned meals into organized grocery lists that are easier to review before you shop.",
  },
  {
    title: "Dietary preferences",
    text: "Save preferences such as vegetarian meals, high-protein choices, lighter dinners, or ingredients you want to avoid.",
  },
];

const recipeIdeas = [
  {
    title: "Quick weekday dinners",
    text: "Find simple meals built around pantry staples, fresh vegetables, rice, pasta, lentils, paneer, eggs, or other common ingredients.",
  },
  {
    title: "Balanced Indian meals",
    text: "Create meal ideas that feel familiar for Indian kitchens while still giving room for global flavors and seasonal produce.",
  },
  {
    title: "Leftover-friendly cooking",
    text: "Use leftover rice, dal, vegetables, or cooked grains in new dishes so food is not wasted.",
  },
];

const steps = [
  "Create a free account and save your cooking preferences.",
  "Search for recipe ideas or enter ingredients from your kitchen.",
  "Add meals to your planner and build your grocery list.",
];

const faqs = [
  {
    question: "Is TasteWise only for Indian food?",
    answer:
      "No. TasteWise is useful for Indian meals and for many other everyday dishes. You can adjust ideas around your ingredients, schedule, and taste.",
  },
  {
    question: "Can I use TasteWise without signing in?",
    answer:
      "You can read public information on this page, but recipe saving, meal planning, grocery lists, and personalized settings work after you create an account.",
  },
  {
    question: "Does TasteWise replace medical nutrition advice?",
    answer:
      "No. TasteWise is a cooking and planning assistant. If you have a medical condition, allergy, or strict nutrition requirement, follow advice from a qualified professional.",
  },
];

export default function Landing() {
  return (
    <>
      <Navbar />
      <main className="landing-page">
        <section className="landing-hero">
          <div className="landing-hero-content">
            <p className="landing-eyebrow">TasteWise recipe and meal planner</p>
            <h1>Cook smarter with recipes, meal planning, and grocery lists.</h1>
            <p className="landing-intro">
              TasteWise helps home cooks discover recipe ideas, plan meals, manage grocery lists,
              and organize dietary preferences in one place. It is built for people who want
              practical food inspiration without making cooking feel complicated.
            </p>
            <div className="landing-actions">
              <Link to="/register" className="landing-primary">Create free account</Link>
              <Link to="/login" className="landing-secondary">Login</Link>
            </div>
          </div>

          <div className="landing-card" aria-label="TasteWise app summary">
            <span className="landing-card-icon">🍲</span>
            <h2>From ingredients to a plan</h2>
            <p>
              Start with what you have, choose what you like, and build a simple plan for the week.
              TasteWise keeps recipes, saved ideas, grocery tasks, and preferences connected.
            </p>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Features</p>
            <h2>Useful tools for everyday cooking</h2>
            <p>
              The site is designed around real kitchen decisions: what to cook, what to buy,
              what to save for later, and how to adjust meals around your preferences.
            </p>
          </div>
          <div className="landing-grid">
            {features.map((feature) => (
              <article className="landing-feature" key={feature.title}>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="recipe-ideas" className="landing-section landing-section-alt">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Recipe ideas</p>
            <h2>Food inspiration that feels practical</h2>
          </div>
          <div className="landing-grid landing-grid-three">
            {recipeIdeas.map((idea) => (
              <article className="landing-feature" key={idea.title}>
                <h3>{idea.title}</h3>
                <p>{idea.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">How it works</p>
            <h2>A simple flow from idea to grocery list</h2>
          </div>
          <ol className="landing-steps">
            {steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </section>

        <section className="landing-section landing-section-alt">
          <div className="landing-section-heading">
            <p className="landing-eyebrow">Questions</p>
            <h2>Before you start</h2>
          </div>
          <div className="landing-faq">
            {faqs.map((item) => (
              <article key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <h2>Ready to plan your next meal?</h2>
          <p>Create an account to save recipes, preferences, meal plans, and grocery lists.</p>
          <Link to="/register" className="landing-primary">Get started</Link>
        </section>

        <footer className="landing-footer">
          <span>© 2026 TasteWise</span>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms</Link>
        </footer>
      </main>
    </>
  );
}
