# Tastewise Google Play Billing Launch Guide

Use this checklist after BillDesk confirms that the merchant verification is approved.

## 1. Confirm account approval

In Play Console, confirm:

- The payments profile no longer shows **Issue with account**.
- Merchant verification is approved.
- The payout bank account is verified.
- Developer identity and contact details are verified.

Do not create another payments profile if the current one is still under review.

## 2. Create the subscription catalog

Open **Play Console → Tastewise → Monetize with Play → Products → Subscriptions**.

Create one subscription:

- Product ID: `tastewise_premium`
- Name: `Tastewise Premium`
- Benefits: ad-free cooking, premium planning tools, nutrition tools, priority features

Create and activate these auto-renewing base plans:

| Base plan ID | Billing period | India price |
|---|---:|---:|
| `monthly` | 1 month | ₹99 |
| `quarterly` | 3 months | ₹249 |
| `half-yearly` | 6 months | ₹449 |
| `yearly` | 1 year | ₹799 |

For every plan:

1. Select India and any other supported countries.
2. Set the price.
3. Configure a grace period.
4. Keep account hold enabled.
5. Enable resubscribe if desired.
6. Save and activate the base plan.

Do not use `half_yearly`; Google Play base-plan IDs allow hyphens, not underscores.

## 3. Connect Google Play Developer API

1. Open or create the Google Cloud project linked to the Play Console account.
2. Enable **Google Play Android Developer API**.
3. Create a service account dedicated to Tastewise billing.
4. In Play Console API access/users and permissions, grant that service account the minimum permissions needed to view purchases and manage subscriptions/orders.
5. Create a JSON key only if the current integration requires one.
6. Store the JSON as a Render secret. Never add it to GitHub.

Set these Render environment variables:

```text
GOOGLE_PLAY_PACKAGE_NAME=app.vercel.taste_trail_eight.twa
GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<full JSON or base64-encoded JSON>
PLAY_SUBSCRIPTION_PRODUCT_ID=tastewise_premium
PLAY_BASE_PLAN_PREMIUM_MONTHLY=monthly
PLAY_BASE_PLAN_PREMIUM_QUARTERLY=quarterly
PLAY_BASE_PLAN_PREMIUM_HALF_YEARLY=half-yearly
PLAY_BASE_PLAN_PREMIUM_YEARLY=yearly
GOOGLE_PLAY_RTDN_SECRET=<long random secret>
```

After saving variables, redeploy the Render backend.

## 4. Configure Real-time Developer Notifications

1. In Google Cloud Pub/Sub, create a topic for Tastewise Google Play billing.
2. Grant the Google Play notification service permission to publish to the topic.
3. Configure that topic in Play Console under Real-time developer notifications.
4. Create a Pub/Sub push subscription.
5. Set the push URL to:

```text
https://<your-render-api>/api/subscriptions/google-play-rtdn?token=<GOOGLE_PLAY_RTDN_SECRET>
```

6. Send a test notification from Play Console.
7. Confirm the endpoint returns a successful 2xx response.

Use the same long secret in the URL and Render. Treat it like a password and rotate it if exposed.

## 5. Prepare the Android TWA

The Android Studio project is separate from this web repository.

1. Add Android Browser Helper billing/Digital Goods support.
2. Confirm package name `app.vercel.taste_trail_eight.twa`.
3. Confirm Digital Asset Links still match the Play signing certificate.
4. Increase `versionCode`.
5. Build a signed Android App Bundle (`.aab`).
6. Upload it to Internal testing.

## 6. Configure testers

1. Add a separate Gmail account under Play Console license testing.
2. Add the same account to the Internal testing tester list.
3. Accept the testing invitation.
4. Install Tastewise from the Play testing link.
5. Do not use the Play Console owner account for the first purchase tests.

## 7. Test the complete purchase lifecycle

Test all four plans and verify:

- The Play purchase screen shows the correct product, period, and price.
- A successful purchase activates Premium in Tastewise.
- Premium remains active after logout/login and reinstall.
- Ads are not loaded for Premium accounts.
- Cancellation keeps access until the paid expiry date.
- Grace period keeps access.
- Account hold removes access.
- Expiration removes access.
- Refund/revocation removes access after an RTDN update.
- The same purchase token cannot activate two Tastewise accounts.
- The Google Play **Manage subscription** link opens the correct subscription.

## 8. Production release

Only proceed after internal testing passes:

1. Complete Data safety, content rating, app access, ads declaration, target audience, privacy policy, and store listing.
2. Confirm subscription terms, renewal frequency, price, and cancellation method are clearly shown.
3. If the account is subject to Google's closed-test requirement, complete it before applying for production access.
4. Roll out gradually and monitor Render logs, Play Console orders, crashes, and RTDN failures.

## 9. AdSense

AdSense approval is separate from Google Play merchant approval.

- The public HTML retains the AdSense ownership meta tag.
- The AdSense script is loaded only for authenticated free users.
- Premium users do not load the script.
- Real ad units still require AdSense approval and ad-slot IDs.
- Keep Auto ads disabled if you want strict control over Premium ad-free behavior; manual ad units are easier to gate by subscription.
