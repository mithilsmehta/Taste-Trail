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

### A. Create the Google Cloud project and service account

1. Open **Google Cloud Console → project selector → New project**.
2. Name it `Tastewise Google Play` and create it. Record its **Project ID**.
3. Open **APIs & Services → Library**.
4. Search for and enable **Google Play Android Developer API**.
5. Open **IAM & Admin → Service Accounts → Create service account**.
6. Use:
   - Name: `tastewise-play-billing`
   - ID: `tastewise-play-billing`
7. Finish creating the account. A broad Google Cloud project role is not required.
8. Open the new service account → **Keys → Add key → Create new key → JSON**.
9. Download the JSON once and keep it private. Never put it in the repository.

### B. Give the service account access in Play Console

1. Copy the service account email. It ends with `.iam.gserviceaccount.com`.
2. Open **Play Console → Users and permissions → Invite new users**.
3. Paste the service account email.
4. Give it access to the Tastewise app.
5. Grant:
   - **View app information (read-only)**
   - **View financial data**
   - **Manage orders and subscriptions**
6. Send/save the invitation. Service-account access does not require opening an email.

### C. Put the credentials in Render

1. Open **Render Dashboard → TasteWise backend service → Environment**.
2. Add each variable below separately.
3. For `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, paste the entire downloaded JSON as one environment-variable value. Render stores it as a secret.

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

Use the same Google Cloud project created in section 3.

### A. Generate and store the webhook secret

1. On your Mac, run:

```bash
openssl rand -hex 32
```

2. Copy the resulting 64-character value.
3. Open **Render → TasteWise backend → Environment**.
4. Set `GOOGLE_PLAY_RTDN_SECRET` to that value.
5. Save the changes. Do not put the value in GitHub or screenshots.

### B. Create the Pub/Sub topic

1. Open **Google Cloud Console → Pub/Sub → Topics**.
2. Confirm the `Tastewise Google Play` project is selected.
3. Click **Create topic**.
4. Topic ID: `tastewise-google-play-rtdn`.
5. Create the topic.
6. Open the topic → **Permissions → Add principal**.
7. Principal:

```text
google-play-developer-notifications@system.gserviceaccount.com
```

8. Role: **Pub/Sub Publisher**.
9. Save.

The resulting topic name will be:

```text
projects/YOUR_GOOGLE_CLOUD_PROJECT_ID/topics/tastewise-google-play-rtdn
```

### C. Connect the topic in Play Console

1. Open **Play Console → Tastewise → Monetize with Play → Monetization setup**.
2. Find **Real-time developer notifications**.
3. Enable notifications.
4. Paste the full topic name from the previous step.
5. Select notifications for subscriptions and voided purchases, or all available notification types.
6. Click **Send test message**.
7. Save the configuration.

### D. Create the push subscription

1. Return to **Google Cloud Console → Pub/Sub → Subscriptions**.
2. Click **Create subscription**.
3. Subscription ID: `tastewise-google-play-rtdn-push`.
4. Select the topic `tastewise-google-play-rtdn`.
5. Delivery type: **Push**.
6. Push endpoint:

```text
https://tastewise-842n.onrender.com/api/subscriptions/google-play-rtdn?token=YOUR_64_CHARACTER_SECRET
```

7. Leave authentication disabled because this endpoint authenticates using the private token.
8. Keep the default acknowledgement deadline and retry settings.
9. Create the subscription.
10. Return to Play Console and send another test message.
11. Open **Render → Logs** and confirm there is no `Google Play RTDN failed` message.

Use the same long secret in the URL and Render. Treat it like a password and rotate it if exposed.

Opening the webhook URL in a browser sends a GET request. The browser status response only confirms configuration presence. Google Cloud delivers real notifications using POST.

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
