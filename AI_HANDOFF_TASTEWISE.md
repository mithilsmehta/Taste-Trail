# TasteWise / Taste-Trail AI Handoff Summary

Use this file as the handoff prompt/context for continuing the TasteWise project from another AI account.

Current workspace:

```text
/Users/mithilmehta/Desktop/Taste-Trail
```

Main live website:

```text
https://tastewise.in
```

Old Vercel website/domain:

```text
https://taste-trail-eight.vercel.app/
```

Backend Render URL:

```text
https://tastewise-842n.onrender.com
```

Android package name:

```text
app.vercel.taste_trail_eight.twa
```

Important: do not change the Android package name unless the user intentionally wants to create a new Play Console app. The current Google Play setup, subscriptions, backend env, and asset links are tied to `app.vercel.taste_trail_eight.twa`.

---

## 1. What this project is

TasteWise is a recipe / meal planning web app with:

- AI recipe generation
- meal planner
- grocery list
- ingredient detection
- dietary preference tools
- premium subscription support
- AdSense setup for web monetization
- Android TWA app for Google Play

The codebase has a frontend and backend:

```text
frontend/   React + Vite website
backend/    Node/Express API
```

Important existing guide files:

```text
/Users/mithilmehta/Desktop/Taste-Trail/ADS_PREMIUM_IMPLEMENTATION.md
/Users/mithilmehta/Desktop/Taste-Trail/GOOGLE_PLAY_LAUNCH_GUIDE.md
```

---

## 2. Current git/workspace status when this handoff was created

There are uncommitted frontend changes:

```text
 M frontend/src/App.jsx
?? frontend/src/pages/Landing.css
?? frontend/src/pages/Landing.jsx
```

Meaning:

- `frontend/src/App.jsx` was changed.
- `frontend/src/pages/Landing.jsx` was newly created.
- `frontend/src/pages/Landing.css` was newly created.

Do not overwrite these without checking them first.

The purpose of those changes is to make the website homepage public for AdSense review instead of showing only a login page.

---

## 3. AdSense status and what happened

AdSense publisher ID:

```text
pub-4660903158720316
```

AdSense script snippet used:

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4660903158720316" crossorigin="anonymous"></script>
```

`ads.txt` content:

```text
google.com, pub-4660903158720316, DIRECT, f08c47fec0942fa0
```

The file is placed here:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/public/ads.txt
```

Expected live URL:

```text
https://tastewise.in/ads.txt
```

AdSense currently shows:

- “Your account wasn’t approved”
- “Meet AdSense program policies”
- “Resubmit”

Google help page shown by user included common problems:

- duplicate AdSense account
- insufficient content
- content quality issues
- content policy violations
- site navigation issues
- traffic source issues
- unsupported language

Important recommendation:

Do not resubmit blindly if AdSense specifically mentions duplicate account. If there is a duplicate account warning, the user must resolve/close the duplicate AdSense account first.

If the problem is mainly content/navigation, fix the public website first, deploy it, wait for live pages to be available, then resubmit.

---

## 4. Why AdSense likely failed

Before the latest frontend change, the website’s root page was mostly login-focused. For AdSense review, Google needs to see useful public content without logging in.

So we started implementing a public homepage:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/pages/Landing.jsx
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/pages/Landing.css
```

And updated:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/App.jsx
```

Current intended route behavior:

- `/` shows public landing page if user is logged out.
- `/` redirects to `/home` if user is logged in.
- `/login`, `/register`, `/about`, `/contact`, `/privacy-policy`, `/terms` remain public.
- App feature pages remain protected.

Important route currently in `frontend/src/App.jsx`:

```jsx
<Route
  path="/"
  element={user && token ? <Navigate to="/home" replace /> : <Landing />}
/>
```

---

## 5. Next frontend implementation still needed

The next AI should inspect and finish:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/components/Navbar.jsx
```

Reason:

The navbar currently mainly renders useful navigation only for logged-in users. For AdSense review, public users/reviewers should easily access:

- Home
- Features
- Recipe Ideas or content section
- About
- Contact
- Privacy Policy
- Terms
- Login
- Create Account

Suggested intent:

- If user is logged in, keep the current app navbar behavior.
- If user is logged out, show public navigation links.
- Brand logo should go to `/` for logged-out users and `/home` for logged-in users.

Suggested Navbar pattern:

```jsx
<Link className="navbar-brand fw-bold fs-3" to={user ? "/home" : "/"} onClick={closeMenu}>
  ...
</Link>

{user ? (
  <div className="navbar-actions">
    {/* existing logged-in actions */}
  </div>
) : (
  <div className="navbar-actions navbar-actions-public">
    <a href="/#features" className="btn btn-outline-success" onClick={closeMenu}>Features</a>
    <a href="/#recipe-ideas" className="btn btn-outline-info" onClick={closeMenu}>Recipe Ideas</a>
    <Link to="/about" className="btn btn-outline-dark" onClick={closeMenu}>About</Link>
    <Link to="/contact" className="btn btn-outline-dark" onClick={closeMenu}>Contact</Link>
    <Link to="/login" className="btn btn-outline-success" onClick={closeMenu}>Login</Link>
    <Link to="/register" className="btn btn-warning fw-semibold px-4" onClick={closeMenu}>Create Account</Link>
  </div>
)}
```

Also consider adding:

```text
frontend/public/robots.txt
frontend/public/sitemap.xml
```

This helps AdSense and Google crawl the public pages.

Recommended public URLs to verify before AdSense resubmit:

```text
https://tastewise.in/
https://tastewise.in/about
https://tastewise.in/contact
https://tastewise.in/privacy-policy
https://tastewise.in/terms
https://tastewise.in/ads.txt
```

---

## 6. Domain / Vercel status

Current canonical site is:

```text
https://tastewise.in
```

The old Vercel URL is:

```text
https://taste-trail-eight.vercel.app/
```

The user wants all old-domain users redirected to the new domain.

Important:

If both `tastewise.in` and `taste-trail-eight.vercel.app` show the same content, AdSense may consider it duplicate content. The old Vercel domain should redirect to the canonical domain.

Current `vercel.json`:

```json
{
  "routes": [
    {
      "src": "/\\.well-known/assetlinks\\.json",
      "headers": { "Content-Type": "application/json" },
      "dest": "/assetlinks.json"
    },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

Vercel dashboard screenshots showed:

- `tastewise.in` valid
- `www.tastewise.in` valid after certificate loaded
- old `taste-trail-eight.vercel.app` connected
- redirect configuration was being adjusted

Next AI should verify:

```text
https://taste-trail-eight.vercel.app/
```

It should redirect with 308/301 to the canonical TasteWise domain.

Pick one canonical domain and be consistent:

```text
https://tastewise.in
```

or

```text
https://www.tastewise.in
```

The user has used both in Vercel screenshots. Make sure AdSense, Android launch URL, asset links, redirects, and meta tags use the same final canonical domain.

---

## 7. Android TWA status

The Android app is a Trusted Web Activity / Bubblewrap-style app.

Package name:

```text
app.vercel.taste_trail_eight.twa
```

Do not rename it unless creating a new Play Console app.

The app had these problems during testing:

- address bar was showing
- splash screen text/logo was not positioned nicely
- app appeared to close/reopen after splash
- direct Android Studio/debug install behaved differently than Play-signed install

Later status:

- app started loading properly
- address bar appeared for around 1 second and then disappeared
- likely due to TWA verification / Chrome transition / Digital Asset Links propagation

Important files in Android Studio project:

```text
AndroidManifest.xml
LauncherActivity.java
SplashActivity.java
DelegationService.java
styles.xml
activity_splash.xml
splash_theme_bg.xml
zoom_in.xml
build.gradle (:app)
```

Current Android version shown earlier:

```text
versionCode 2
versionName "1.0.0.1"
```

Before uploading the next Play release, bump version code:

```text
versionCode 3
versionName "1.0.2"
```

or any higher version code than the last uploaded release.

Important Android guidance:

- The app address bar disappears only if Digital Asset Links verification succeeds.
- For Play-distributed app, use the Play App Signing SHA-256 in assetlinks.
- For direct Android Studio/debug install, debug/upload SHA may also be needed if testing locally.
- The exact domain in launch URL must match the assetlinks domain.

---

## 8. Digital Asset Links / SHA-256 details

Required live URL:

```text
https://tastewise.in/.well-known/assetlinks.json
```

Current local file:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/public/.well-known/assetlinks.json
```

There may also be:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/public/assetlinks.json
```

The `.well-known` file is the important one for Android. Do not delete either file without checking Vercel routing, because `vercel.json` currently maps `/.well-known/assetlinks.json` to `/assetlinks.json`.

Known SHA-256 fingerprints:

Google Play App Signing SHA-256:

```text
DB:45:7A:53:FF:28:B9:96:9F:1F:24:C0:C8:EB:1F:DA:BF:2A:40:1C:50:CB:B3:E0:7F:9A:DF:86:65:09:A2:7B
```

Upload key SHA-256:

```text
F8:7C:89:2B:4C:19:55:F0:C5:78:A6:5D:88:48:80:5F:1A:DA:8F:F0:88:FA:CA:82:ED:68:3F:94:66:26:E7:A1
```

Another local/debug SHA-256 used during testing:

```text
E4:FA:0C:8F:76:4E:36:03:42:72:C9:9E:BF:20:A6:FF:C0:F1:7A:0A:E0:4A:DF:D8:53:59:8E:B8:56:15:75:A8
```

Current desired `assetlinks.json` shape:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "app.vercel.taste_trail_eight.twa",
      "sha256_cert_fingerprints": [
        "DB:45:7A:53:FF:28:B9:96:9F:1F:24:C0:C8:EB:1F:DA:BF:2A:40:1C:50:CB:B3:E0:7F:9A:DF:86:65:09:A2:7B",
        "F8:7C:89:2B:4C:19:55:F0:C5:78:A6:5D:88:48:80:5F:1A:DA:8F:F0:88:FA:CA:82:ED:68:3F:94:66:26:E7:A1",
        "E4:FA:0C:8F:76:4E:36:03:42:72:C9:9E:BF:20:A6:FF:C0:F1:7A:0A:E0:4A:DF:D8:53:59:8E:B8:56:15:75:A8"
      ]
    }
  }
]
```

After deploying frontend, verify in browser:

```text
https://tastewise.in/.well-known/assetlinks.json
```

It must show valid JSON and the correct SHA-256 values.

---

## 9. Google Play Billing / Subscriptions status

Google Play product ID:

```text
tastewise_premium
```

Base plan IDs:

```text
monthly
quarterly
half-yearly
yearly
```

Subscription benefits shown in Play Console:

```text
Unlimited AI recipe generation
Personalized meal planning
Advanced dietary preference tools
Ad-free premium experience
```

Prices user configured:

India:

```text
monthly: 99
quarterly: 249
half-yearly: 449
yearly: 799
```

Other countries:

```text
monthly: 199
quarterly: 399
half-yearly: 799
yearly: 1199
```

All four base plans were activated in Play Console.

There may still be a Google Play payments profile issue until BillDesk/KYC verification finishes.

---

## 10. BillDesk / Play payments status

BillDesk is not the same as AdMob.

- BillDesk: payment/disbursement/KYC provider used by Google Play for Indian merchant account verification.
- AdMob: mobile ad network.
- AdSense: web ad network.

The user completed BillDesk KYC and received/waited for review.

Play Console showed:

```text
Merchant account verification is required to meet Payment Aggregator Cross Border (PA-CB) regulations
Status: In progress
```

Until BillDesk/Google approves the payment profile, the user may not be able to fully sell Google Play subscriptions.

Next action:

- wait for approval email
- once approved, test subscriptions in internal testing

---

## 11. Backend Google Play integration status

Backend Render service:

```text
https://tastewise-842n.onrender.com
```

RTDN endpoint:

```text
https://tastewise-842n.onrender.com/api/subscriptions/google-play-rtdn
```

GET test result previously showed:

```json
{
  "ok": true,
  "endpoint": "Google Play real-time developer notifications",
  "accepts": "POST requests from Google Cloud Pub/Sub",
  "configured": {
    "packageName": true,
    "serviceAccount": true,
    "notificationSecret": false
  }
}
```

`notificationSecret: false` means a notification secret was not configured. This may be okay depending on the backend code, but for production hardening it is better to add a secret if the backend supports it.

Important Render env variables:

```env
GOOGLE_PLAY_PACKAGE_NAME=app.vercel.taste_trail_eight.twa
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<full service account JSON or base64 encoded JSON>
PLAY_SUBSCRIPTION_PRODUCT_ID=tastewise_premium
PLAY_BASE_PLAN_PREMIUM_MONTHLY=monthly
PLAY_BASE_PLAN_PREMIUM_QUARTERLY=quarterly
PLAY_BASE_PLAN_PREMIUM_HALF_YEARLY=half-yearly
PLAY_BASE_PLAN_PREMIUM_YEARLY=yearly
```

Other Render env variables already present:

```env
MONGO_URI=...
NODE_ENV=...
OPENROUTER_API_KEY=...
OPENROUTER_APP_NAME=...
OPENROUTER_MODEL=...
OPENROUTER_SITE_URL=...
RESEND_API_KEY=...
```

Never commit service account JSON or private keys to git.

Google Cloud Pub/Sub:

```text
Topic: tastewise-google-play-rtdn
Subscription: tastewise-google-play-rtdn-push
```

Subscription was created and active.

---

## 12. Recommended next steps for the next AI

### Step A: Finish AdSense public-site readiness

1. Inspect:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/App.jsx
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/pages/Landing.jsx
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/pages/Landing.css
/Users/mithilmehta/Desktop/Taste-Trail/frontend/src/components/Navbar.jsx
```

2. Finish public navbar links for logged-out users.

3. Add or verify:

```text
/Users/mithilmehta/Desktop/Taste-Trail/frontend/public/robots.txt
/Users/mithilmehta/Desktop/Taste-Trail/frontend/public/sitemap.xml
```

4. Run frontend build:

```bash
cd /Users/mithilmehta/Desktop/Taste-Trail/frontend
npm run build
```

5. Commit and deploy frontend to Vercel.

6. Verify public pages live:

```text
https://tastewise.in/
https://tastewise.in/about
https://tastewise.in/contact
https://tastewise.in/privacy-policy
https://tastewise.in/terms
https://tastewise.in/ads.txt
```

7. Verify old domain redirects:

```text
https://taste-trail-eight.vercel.app/
```

8. Only after public pages are good, resubmit AdSense.

### Step B: Verify Android TWA

1. Deploy updated `assetlinks.json`.

2. Check:

```text
https://tastewise.in/.well-known/assetlinks.json
```

3. Confirm it includes the Play App Signing SHA-256:

```text
DB:45:7A:53:FF:28:B9:96:9F:1F:24:C0:C8:EB:1F:DA:BF:2A:40:1C:50:CB:B3:E0:7F:9A:DF:86:65:09:A2:7B
```

4. Build a new Android release with higher `versionCode`.

5. Upload AAB to internal testing in Play Console.

6. Install through Play/internal testing, not only Android Studio debug.

7. Check if address bar disappears fully.

### Step C: Finish Play subscription testing

After BillDesk/merchant account approval:

1. Make sure product `tastewise_premium` and all base plans are active.
2. Add license testers/internal testers.
3. Upload app release to internal testing.
4. Test subscription purchase.
5. Confirm backend verifies purchase token.
6. Confirm premium unlocks in app.
7. Confirm Render logs receive RTDN events for subscription changes.

### Step D: AdMob later

AdMob was rejected. It is separate from AdSense/BillDesk.

For now:

- focus on AdSense for web monetization
- focus on Google Play Billing for Android premium
- only return to AdMob after the app is stable, published/tested, and policy-ready

---

## 13. Suggested prompt to paste into the next AI account

```text
I am continuing my TasteWise/Taste-Trail project. Please read /Users/mithilmehta/Desktop/Taste-Trail/AI_HANDOFF_TASTEWISE.md first.

Current goal:
Finish AdSense readiness and Android/Google Play subscription setup without breaking existing work.

Important context:
- Main site is https://tastewise.in
- Old Vercel URL is https://taste-trail-eight.vercel.app/ and should redirect to the new domain.
- Android package must stay app.vercel.taste_trail_eight.twa.
- AdSense publisher ID is pub-4660903158720316.
- Google Play subscription product ID is tastewise_premium.
- Base plan IDs are monthly, quarterly, half-yearly, yearly.
- BillDesk/KYC may still be pending approval.
- There are uncommitted frontend changes for a public landing page:
  - frontend/src/App.jsx modified
  - frontend/src/pages/Landing.jsx new
  - frontend/src/pages/Landing.css new

Please first inspect the repo, preserve existing changes, then continue from the checklist in the handoff file.
```

---

## 14. Quick “do not forget” checklist

- Do not change Android package name.
- Do not commit secrets.
- Do not resubmit AdSense before public content/navigation is fixed.
- Do not serve duplicate content on old Vercel domain.
- Make old Vercel domain redirect to canonical TasteWise domain.
- Keep `ads.txt` live.
- Keep `assetlinks.json` live at `/.well-known/assetlinks.json`.
- Use Play App Signing SHA-256 for real Play install.
- Bump Android `versionCode` before each Play upload.
- Wait for BillDesk approval before expecting subscriptions to fully work.

