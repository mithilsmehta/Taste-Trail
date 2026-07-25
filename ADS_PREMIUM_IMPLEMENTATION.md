# Ads And Premium Implementation Notes

## Changed Files

- `backend/models/User.js`
  - Added `subscription` fields for premium status, plan, provider, expiry, and Google Play purchase token.
  - Added Google Play product ID and last verification timestamp fields.

- `backend/utils/subscriptionPlans.js`
  - Added the four Premium plan definitions for 1, 3, 6, and 12 months.
  - Changed billing setup to one Google Play subscription product with four auto-renewing base plans.
  - Added helpers for subscription snapshots and expiry handling.

- `backend/utils/googlePlayVerifier.js`
  - Added Google service-account authentication for the Android Publisher API.
  - Added live Google Play subscription-token verification.
  - Added Google Play subscription acknowledgement after successful verification.

- `backend/routes/subscriptionRoutes.js`
  - Added protected `GET /api/subscriptions/plans`.
  - Added protected `GET /api/subscriptions/status`.
  - Added protected `POST /api/subscriptions/verify-google-play` to verify real Google Play purchase tokens before Premium is activated.
  - Added subscription refresh during status checks so auto-renewed Google Play subscriptions update `premiumExpiresAt`.
  - Added non-production-only `POST /api/subscriptions/dev/activate` for local testing without real payments.

- `backend/app.js`
  - Registered `/api/subscriptions` routes.

- `backend/.env.example`
  - Added Google Play package, service account, and product ID placeholders.

- `backend/routes/authRoutes.js`
  - Added protected `GET /api/auth/me` route for refreshing current user/profile data.

- `frontend/src/utils/subscription.js`
  - Added helpers to calculate whether a user is premium and whether ads should show.
  - Added helpers to fetch Premium plans/status and verify Google Play purchases.
  - Added installed-Android-app checkout helper using Digital Goods API + Payment Request API.

- `frontend/src/context/AuthContext.jsx`
  - Added `refreshUser()` so the app can reload subscription/profile data from the backend.

- `frontend/src/components/AdSlot.jsx`
  - Added reusable premium-aware ad placeholder component.
  - It hides automatically when `user.subscription.isPremium` is active.

- `frontend/src/components/AdSlot.css`
  - Added clean Tastewise-style ad placeholder styling.

- `frontend/src/pages/Premium.jsx`
  - Rebuilt Premium page to load plan/status data from the backend.
  - Added setup-aware plan cards for 1, 3, 6, and 12 month plans.
  - Premium buttons now start Google Play checkout when opened inside the installed Android app.
  - Browser users see a clear message that Google Play checkout is available only inside the Android app.

- `frontend/src/pages/Premium.css`
  - Added responsive styling for the Premium page.

- `frontend/src/App.jsx`
  - Added protected `/premium` route.

- `frontend/src/pages/Profile.jsx`
  - Added Premium status card and link to `/premium`.
  - Shows active Premium plan/expiry when the subscription is active.

- `frontend/src/pages/Home.jsx`
  - Added free-user ad placeholder near the bottom.

- `frontend/src/pages/SearchResults.jsx`
  - Added free-user ad placeholder below recipe actions.

- `frontend/src/pages/GroceryList.jsx`
  - Added free-user ad placeholder near the grocery list bottom.

- `backend/routes/recipeRoutes.js`
  - Added a dedicated Jain Masala Dosa fallback that uses raw banana masala instead of potato.
  - Added a dedicated Jain Paneer Bhurji fallback with paneer, tomato, capsicum, curd, cashew paste, and Jain-safe spices.
  - Updated Jain prompt rules so raw banana is used only when replacing blocked potato/root fillings, not randomly in every Jain recipe.

- `frontend/src/pages/SearchResults.jsx`
  - Clarified the Jain blocked-ingredient message to explain potato dishes should use Jain-safe substitutes like raw banana.
  - Added client-side Jain fallback recovery for Paneer Bhurji and Masala Dosa so users do not see a blocked-ingredient error for these common searches.

## Current Behavior

- Free users see tasteful ad placeholder slots.
- Premium users will not see ad slots once `subscription.isPremium` is true and not expired.
- No real ad units are inserted yet, so this is safe while AdSense review is pending.
- The AdSense ownership meta tag stays public, while the ad script loads only for authenticated free users.
- Real billing verification is implemented on the backend, but live checkout still needs the Android/TWA Play Billing setup below.
- Auto-renewal is handled by Google Play. The backend refreshes the stored purchase token on subscription status checks and updates expiry when Play renews the plan.
- Google Play RTDN is accepted at `/api/subscriptions/google-play-rtdn` when the configured webhook secret is supplied.
- Purchase tokens cannot be linked to more than one Tastewise account.
- Jain Masala Dosa should generate directly with a Jain-safe raw banana filling instead of failing because of potato/root-vegetable rules.
- Jain Paneer Bhurji should generate with a safe paneer masala and no unrelated raw banana substitute.

## Premium Setup Needed From Play Console

Create one Google Play subscription product:

- Product ID: `tastewise_premium`

Inside that product, create these auto-renewing base plans:

- `monthly` - 1 month - ₹99
- `quarterly` - 3 months - ₹249
- `half-yearly` - 6 months - ₹449
- `yearly` - 12 months - ₹799

Backend environment variables needed before live purchases:

- `GOOGLE_PLAY_PACKAGE_NAME=app.vercel.taste_trail_eight.twa`
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<service account JSON or secure secret value>`
- `PLAY_SUBSCRIPTION_PRODUCT_ID=tastewise_premium`
- `PLAY_BASE_PLAN_PREMIUM_MONTHLY=monthly`
- `PLAY_BASE_PLAN_PREMIUM_QUARTERLY=quarterly`
   - `PLAY_BASE_PLAN_PREMIUM_HALF_YEARLY=half-yearly`
- `PLAY_BASE_PLAN_PREMIUM_YEARLY=yearly`

## Android/TWA Billing Setup Needed

The web repo now has the Digital Goods + Payment Request bridge. The Android Studio TWA project still needs Play Billing support because it lives outside this repo.

1. In Google Play Console, create and activate the subscription product/base plans listed above.
2. In Play Console, go to API access and connect a Google Cloud service account with Android Publisher access.
3. Put these backend env vars in production:
   - `GOOGLE_PLAY_PACKAGE_NAME=app.vercel.taste_trail_eight.twa`
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<service account JSON or base64 encoded JSON>`
4. In the Android Studio TWA project, add the Android Browser Helper Billing dependency/module for Digital Goods API support.
5. Rebuild a new signed `.aab` with a higher `versionCode`.
6. Upload that `.aab` to internal testing and install from the internal testing link.
7. Open `/premium` inside the installed Android app and press a plan button.
8. After purchase, the app sends the purchase token to `/api/subscriptions/verify-google-play`; backend verifies with Google Play and stores Premium in MongoDB.

Use a license tester account first. Do not test paid subscriptions with your owner account.

## Next Steps

1. Create and activate the Google Play subscription product/base plans.
2. Add Google Play service account credentials to backend production env.
3. Add the Android Browser Helper Billing setup in the Android Studio TWA package.
4. Build/upload a new signed `.aab` with higher `versionCode`.
5. Test with a Google Play license tester from the internal testing link.
6. Wait for AdSense approval before inserting real web ad units.
7. Add real AdSense/AdMob ad units to `AdSlot`.
