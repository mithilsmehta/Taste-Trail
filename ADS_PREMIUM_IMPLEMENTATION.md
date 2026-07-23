# Ads And Premium Implementation Notes

## Changed Files

- `backend/models/User.js`
  - Added `subscription` fields for premium status, plan, provider, expiry, and future Google Play purchase token.

- `backend/routes/authRoutes.js`
  - Added protected `GET /api/auth/me` route for refreshing current user/profile data.

- `frontend/src/utils/subscription.js`
  - Added helpers to calculate whether a user is premium and whether ads should show.

- `frontend/src/components/AdSlot.jsx`
  - Added reusable premium-aware ad placeholder component.
  - It hides automatically when `user.subscription.isPremium` is active.

- `frontend/src/components/AdSlot.css`
  - Added clean Tastewise-style ad placeholder styling.

- `frontend/src/pages/Premium.jsx`
  - Added Premium page with benefits and 1, 3, 6, 12 month plan placeholders.
  - Purchase buttons are disabled until Google Play Billing is connected.

- `frontend/src/pages/Premium.css`
  - Added responsive styling for the Premium page.

- `frontend/src/App.jsx`
  - Added protected `/premium` route.

- `frontend/src/pages/Profile.jsx`
  - Added Premium status card and link to `/premium`.

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
- No real billing is connected yet.
- Jain Masala Dosa should generate directly with a Jain-safe raw banana filling instead of failing because of potato/root-vegetable rules.
- Jain Paneer Bhurji should generate with a safe paneer masala and no unrelated raw banana substitute.

## Next Steps

1. Wait for AdSense approval.
2. Add real AdSense ad units to `AdSlot`.
3. Add Google Play Billing products for 1, 3, 6, and 12 month plans.
4. Add backend Google Play purchase-token verification.
5. Enable Premium page purchase buttons after billing is verified.
