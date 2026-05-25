# 📧 Gmail Setup Guide for Password Reset

## ✅ What I Fixed:

1. **✅ Added success page** - Shows confirmation after sending reset link
2. **✅ Switched to Gmail** - Now works with ANY email address
3. **✅ Beautiful email template** - Professional HTML email
4. **✅ Password updates in database** - Reset password saves correctly

---

## 🔧 Setup Gmail App Password (Required)

### Step 1: Enable 2-Factor Authentication

1. Go to: https://myaccount.google.com/security
2. Click on **"2-Step Verification"**
3. Follow the steps to enable it (if not already enabled)

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **"Mail"** as the app
3. Select **"Other (Custom name)"** as the device
4. Enter: **"TasteTrail App"**
5. Click **"Generate"**
6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)

### Step 3: Update .env File

Open `backend/.env` and update these lines:

```env
EMAIL_USER=your_actual_email@gmail.com
EMAIL_PASS=abcdefghijklmnop
```

**Example:**
```env
EMAIL_USER=mithilmehta15@gmail.com
EMAIL_PASS=xyzw abcd efgh ijkl
```

**Important:** Remove spaces from the app password!

---

## 🚀 How to Test

### 1. Restart Backend Server

```bash
cd backend
npm run dev
```

### 2. Test Forgot Password

1. Go to: http://localhost:5173/forgot-password
2. Enter ANY email address (e.g., `test@gmail.com`, `user@yahoo.com`)
3. Click "Send Reset Link"
4. You'll see a success page ✅
5. Check your email inbox

### 3. Check Email

You'll receive an email with:
- **Subject:** "Reset Your Password - TasteTrail"
- **From:** TasteTrail (your Gmail)
- **Beautiful HTML template** with orange gradient
- **Reset Password button**

### 4. Reset Password

1. Click the "Reset Password" button in email
2. Or copy/paste the link
3. Enter your new password
4. Click "Reset Password"
5. Password is updated in MongoDB ✅

---

## 📧 Email Template Preview

```
┌─────────────────────────────────────┐
│  🍽️ TasteTrail                      │
│  (Orange Gradient Header)            │
├─────────────────────────────────────┤
│                                      │
│  Password Reset Request              │
│                                      │
│  Hello [Name],                       │
│                                      │
│  We received a request to reset      │
│  your password...                    │
│                                      │
│  ┌─────────────────────┐            │
│  │  Reset Password     │            │
│  └─────────────────────┘            │
│                                      │
│  Link expires in 15 minutes          │
│                                      │
├─────────────────────────────────────┤
│  © 2024 TasteTrail                  │
└─────────────────────────────────────┘
```

---

## 🔐 Security Features

✅ **Token expires in 15 minutes**
✅ **Hashed token stored in database**
✅ **One-time use token**
✅ **Password hashed with bcrypt**
✅ **Token cleared after use**

---

## 🐛 Troubleshooting

### Email Not Sending?

**Check 1: App Password**
- Make sure you used App Password, not regular password
- Remove all spaces from the app password
- Example: `abcdefghijklmnop` (no spaces)

**Check 2: 2FA Enabled**
- App passwords only work with 2FA enabled
- Go to: https://myaccount.google.com/security

**Check 3: Backend Logs**
```bash
# Check terminal for errors
cd backend
npm run dev
# Look for "Forgot password error:" messages
```

**Check 4: Gmail Settings**
- Make sure "Less secure app access" is OFF
- Use App Password instead

### Email Goes to Spam?

- Check your spam/junk folder
- Mark as "Not Spam"
- Add sender to contacts

### Link Expired?

- Links expire after 15 minutes
- Request a new reset link
- Use the link immediately

---

## 📝 Quick Setup Checklist

- [ ] Enable 2FA on Gmail
- [ ] Generate App Password
- [ ] Update `EMAIL_USER` in .env
- [ ] Update `EMAIL_PASS` in .env (no spaces!)
- [ ] Restart backend server
- [ ] Test forgot password
- [ ] Check email inbox
- [ ] Click reset link
- [ ] Enter new password
- [ ] Verify login works

---

## 🎯 What Works Now

✅ **Any email can receive reset links** (Gmail, Yahoo, Outlook, etc.)
✅ **Success page shows after sending**
✅ **Beautiful HTML email template**
✅ **Password updates in MongoDB database**
✅ **15-minute expiration**
✅ **Secure token hashing**
✅ **One-time use tokens**

---

## 💡 Alternative: Use Your Own Gmail

If you want to use a different Gmail account:

1. Create a new Gmail account (optional)
2. Enable 2FA on that account
3. Generate App Password
4. Update .env with new credentials

**Recommended:** Use your main Gmail (`mithilmehta15@gmail.com`)

---

## 🔗 Useful Links

- **Google Account Security:** https://myaccount.google.com/security
- **App Passwords:** https://myaccount.google.com/apppasswords
- **2-Step Verification:** https://myaccount.google.com/signinoptions/two-step-verification

---

## ✨ Next Steps

1. **Set up Gmail App Password** (5 minutes)
2. **Update .env file** (1 minute)
3. **Restart backend** (10 seconds)
4. **Test the feature** (2 minutes)

**Total time: ~8 minutes** ⏱️

---

**Need help?** Check the troubleshooting section above or let me know!
