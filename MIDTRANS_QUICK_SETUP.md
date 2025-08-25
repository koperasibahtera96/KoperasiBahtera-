# 🚀 Midtrans Quick Setup Guide

## ❌ Current Issue: 401 Unauthorized Error

The error you're seeing means the Midtrans API keys are invalid or not set. Follow these steps to fix it:

## 📋 Step-by-Step Setup

### 1. Create Midtrans Account
1. Go to [https://midtrans.com/](https://midtrans.com/)
2. Click "Sign Up" and create an account
3. Verify your email address

### 2. Access Dashboard
1. Login to [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
2. You should see the Midtrans dashboard

### 3. Get Sandbox Keys (Development)
1. In the dashboard, click on **"Settings"** in the left sidebar
2. Click on **"Access Keys"** 
3. You'll see two tabs: **"Sandbox"** and **"Production"**
4. Click on the **"Sandbox"** tab
5. Copy both keys:
   - **Server Key** (starts with `SB-Mid-server-`)
   - **Client Key** (starts with `SB-Mid-client-`)

### 4. Update Environment Variables
1. Open your `.env.local` file
2. Replace the placeholder values:

```env
# Replace YOUR_SERVER_KEY_HERE with your actual server key
MIDTRANS_SERVER_KEY=SB-Mid-server-YOUR_ACTUAL_SERVER_KEY_HERE

# Replace YOUR_CLIENT_KEY_HERE with your actual client key
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-YOUR_ACTUAL_CLIENT_KEY_HERE
```

### 5. Restart Your Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev
```

### 6. Test the Integration
1. Go to the registration page
2. Complete steps 1-3
3. Try the payment step
4. You should now see a valid payment link

## 🔍 Troubleshooting

### Common Issues:

**1. Still getting 401 error?**
- Make sure you copied the FULL keys (they are quite long)
- Check there are no extra spaces before/after the keys
- Make sure you're using SANDBOX keys (not production keys)

**2. Keys don't start with `SB-Mid-`?**
- You might be looking at production keys instead of sandbox keys
- Switch to the "Sandbox" tab in Access Keys

**3. Can't find Access Keys?**
- Make sure you're logged in to dashboard.midtrans.com
- Look for "Settings" in the left sidebar, then "Access Keys"

### Example of Correct Keys Format:
```env
# Server Key Example (yours will be different)
MIDTRANS_SERVER_KEY=SB-Mid-server-abc123def456ghi789

# Client Key Example (yours will be different)  
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xyz789uvw456rst123
```

## 🎯 Quick Test

Once you've updated the keys, you should see this in your server logs:
```
✅ Midtrans initialized successfully
```

Instead of:
```
❌ MIDTRANS_SERVER_KEY is not set in environment variables
```

## 💳 Testing Payment

Use these test card numbers in the Midtrans payment page:
- **Success**: `4811 1111 1111 1114`
- **Failure**: `4911 1111 1111 1113` 
- **CVV**: `123`
- **Expiry**: Any future date (e.g., `12/25`)

## ✅ Success!

After setup, your registration flow will work with:
1. ✅ Personal data form
2. ✅ KTP upload  
3. ✅ Face verification
4. ✅ Payment (Rp 1)
5. ✅ Registration complete

---

**Need Help?** Check the [Midtrans Documentation](https://docs.midtrans.com/reference/getting-started)