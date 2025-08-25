# 🔗 Midtrans Webhook Setup with ngrok

## ✅ Current Configuration

- **ngrok URL**: `https://26b577585e78.ngrok-free.app`
- **Webhook Endpoint**: `https://26b577585e78.ngrok-free.app/api/payment/webhook`
- **Test Endpoint**: `https://26b577585e78.ngrok-free.app/api/test-webhook`

## 📋 Midtrans Dashboard Setup

### 1. Login to Midtrans Dashboard
Go to: https://dashboard.midtrans.com

### 2. Navigate to Settings
- Click **"Settings"** in the left sidebar
- Click **"Configuration"**

### 3. Set Webhook URL
In the **"Notification URL"** field, enter:
```
https://26b577585e78.ngrok-free.app/api/payment/webhook
```

### 4. Save Configuration
Click **"Save"** to apply the changes.

## 🧪 Test Your Setup

### Test 1: Basic Connectivity
```bash
curl "https://26b577585e78.ngrok-free.app/api/test-webhook"
```
**Expected**: Should return success message

### Test 2: Payment Creation
1. Go to your registration page
2. Complete the registration flow
3. Make a test payment
4. Check your server logs for webhook notifications

### Test 3: Manual Webhook Test
You can test the webhook endpoint directly:
```bash
curl -X POST "https://26b577585e78.ngrok-free.app/api/midtrans-test" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "TEST-123",
    "transaction_status": "settlement",
    "fraud_status": "accept",
    "payment_type": "credit_card",
    "gross_amount": "1",
    "transaction_id": "test-123",
    "transaction_time": "2024-01-01 00:00:00"
  }'
```

## 🔍 Debugging Steps

### Check Server Logs
Look for these messages in your development server:
- `🔔 Midtrans webhook received:` - Webhook is being called
- `Payment record not found` - Payment exists but webhook can't find it
- `User created successfully:` - Everything working!

### Common Issues

1. **ngrok URL expired**: ngrok URLs change on restart
2. **Webhook not configured**: Check Midtrans Dashboard settings
3. **Server not running**: Make sure `npm run dev` is running
4. **Firewall/Network**: ngrok should handle this

## ✅ Success Indicators

When everything works, you should see:
1. Payment created in database
2. Webhook notification received
3. User account created
4. Success page with redirect to login

## 🚨 Important Notes

- **ngrok URL expires**: When you restart ngrok, update the Midtrans webhook URL
- **Development only**: Use proper domain for production
- **Security**: ngrok exposes your local server to the internet

---

**Need help?** Check your server console logs for detailed error messages!