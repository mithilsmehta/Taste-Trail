import { Link, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import "./LegalPage.css";

const lastUpdated = "July 22, 2026";

const pages = {
  "/privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Your data and choices",
    intro: "Tastewise helps you discover recipes, save meals, plan your week, and build grocery lists. This policy explains what information the app uses and how it is handled.",
    sections: [
      {
        title: "Information We Collect",
        body: [
          "Account details such as name, email address, phone number, and login credentials.",
          "Profile and onboarding details such as food preference, serving size, health goals, height, weight, BMI, and region/state when you provide them.",
          "Recipe activity such as searches, generated recipes, saved recipes, meal planner entries, grocery list items, and app settings.",
          "Technical information such as device type, browser, app version, approximate usage data, and error logs needed to keep the service reliable."
        ]
      },
      {
        title: "How We Use Information",
        body: [
          "To personalize recipe generation based on your selected food preference, including Jain, vegetarian, or vegan choices.",
          "To save your recipes, grocery lists, profile settings, and meal plans to your account.",
          "To improve speed, reliability, safety, and user experience.",
          "To show ads to free users and support future premium features when they are available."
        ]
      },
      {
        title: "Ads And Analytics",
        body: [
          "Tastewise may use Google AdSense, AdMob, or similar services to show ads to free users.",
          "Ad partners may use cookies, advertising identifiers, or similar technologies to measure ad performance and prevent abuse.",
          "Premium users may receive an ad-free experience once premium subscriptions are implemented."
        ]
      },
      {
        title: "Data Control",
        body: [
          "You can update profile and food preference information from your profile settings.",
          "You can remove saved recipes or meal planner entries from the app where those controls are available.",
          "If you need help with account data, use the Contact page."
        ]
      }
    ]
  },
  "/terms": {
    title: "Terms",
    eyebrow: "Using Tastewise",
    intro: "By using Tastewise, you agree to use the app responsibly and understand that recipe content is generated or organized for convenience.",
    sections: [
      {
        title: "Recipe And Nutrition Information",
        body: [
          "Recipes, grocery lists, nutrition details, and cooking suggestions are provided for informational and planning purposes.",
          "Always check ingredients for allergies, dietary restrictions, food safety, and personal health needs before cooking.",
          "Nutrition estimates, if shown, may not be exact and should not replace medical or dietitian advice."
        ]
      },
      {
        title: "User Accounts",
        body: [
          "You are responsible for keeping your login details secure.",
          "You should provide accurate information when setting food preferences or profile details, because those details may affect recipe recommendations.",
          "You should not misuse the app, attempt unauthorized access, or interfere with service operation."
        ]
      },
      {
        title: "Premium And Ads",
        body: [
          "Tastewise may offer free features supported by ads.",
          "Premium plans may be added to remove ads or unlock extra features such as more recipe generation, advanced nutrition, or enhanced meal planning.",
          "Any Android app subscription offered through Google Play will follow Google Play Billing policies."
        ]
      },
      {
        title: "Service Changes",
        body: [
          "Features may change over time as the app improves.",
          "We may update these terms when new features, ads, subscriptions, or policy requirements are added."
        ]
      }
    ]
  },
  "/about": {
    title: "About",
    eyebrow: "A smarter kitchen companion",
    intro: "Tastewise is a recipe and meal planning app built to make everyday cooking simpler, more personal, and easier to organize.",
    sections: [
      {
        title: "What Tastewise Does",
        body: [
          "Generate recipes from search ideas or ingredients.",
          "Respect food preferences such as Jain, vegetarian, and vegan cooking.",
          "Save recipes to your account so you can open them again quickly.",
          "Plan meals across the week and build grocery lists from planned recipes."
        ]
      },
      {
        title: "Our Goal",
        body: [
          "The goal is to help users decide what to cook, reduce repeated planning work, and keep saved recipes, meal plans, and grocery lists in one place.",
          "Tastewise is designed with a warm, clean interface that works well on web and mobile."
        ]
      }
    ]
  },
  "/contact": {
    title: "Contact",
    eyebrow: "Support and feedback",
    intro: "Use this page for support topics, feedback, policy questions, and account-related help.",
    sections: [
      {
        title: "Email Support",
        body: [
          "You can reach out directly via email at support453@gmail.com for any questions, assistance, or feedback.",
          "We aim to respond to user inquiries within 24 to 48 hours."
        ]
      },
      {
        title: "Contact Topics",
        body: [
          "Account, login, or profile support.",
          "Recipe generation issues or incorrect dietary preference results.",
          "Saved recipes, meal planner, or grocery list feedback.",
          "Privacy, terms, ads, or premium subscription questions."
        ]
      },
      {
        title: "What To Include",
        body: [
          "Your account email if the question is account-related.",
          "A short description of the issue.",
          "Screenshots or exact steps if something is not working."
        ]
      }
    ]
  }
};

export default function LegalPage() {
  const location = useLocation();
  const page = pages[location.pathname] || pages["/about"];

  const renderItemText = (text) => {
    if (text.includes("support453@gmail.com")) {
      const parts = text.split("support453@gmail.com");
      return (
        <>
          {parts[0]}
          <a href="mailto:support453@gmail.com" style={{ color: "#FF6A00", fontWeight: 700 }}>
            support453@gmail.com
          </a>
          {parts[1]}
        </>
      );
    }
    return text;
  };

  return (
    <>
      <Navbar />
      <main className="legal-shell">
        <section className="legal-hero">
          <p>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <span>Last updated: {lastUpdated}</span>
          <strong>{page.intro}</strong>
        </section>

        <section className="legal-content">
          {page.sections.map((section) => (
            <article key={section.title} className="legal-section">
              <h2>{section.title}</h2>
              <ul>
                {section.body.map((item) => (
                  <li key={item}>{renderItemText(item)}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <nav className="legal-links" aria-label="Legal pages">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/about">About</Link>
        </nav>
      </main>
    </>
  );
}
