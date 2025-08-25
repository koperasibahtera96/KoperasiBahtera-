# Midtrans Setup Guide

## Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Midtrans Configuration
MIDTRANS_SERVER_KEY=your-midtrans-server-key-here
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your-midtrans-client-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Getting Midtrans Keys

1. **Create a Midtrans Account**
   - Go to [https://midtrans.com/](https://midtrans.com/)
   - Sign up for an account

2. **Get Sandbox Keys** (for development)
   - Login to Midtrans Dashboard
   - Go to Settings → Access Keys
   - Copy the **Sandbox Server Key** and **Sandbox Client Key**

3. **Get Production Keys** (for production)
   - Complete the verification process in Midtrans Dashboard
   - Copy the **Production Server Key** and **Production Client Key**

## Testing

For testing purposes, you can use Midtrans sandbox environment which provides test credit card numbers:

- **Test Card Numbers:**
  - `4811 1111 1111 1114` (Success)
  - `4911 1111 1111 1113` (Failure)
  - CVV: `123`
  - Expiry: Any future date

## Usage

The Midtrans integration is now part of the registration flow:

1. **Step 1:** Data Diri (Personal Information)
2. **Step 2:** Verifikasi KTP (ID Card Upload)
3. **Step 3:** Verifikasi Wajah (Face Verification)
4. **Step 4:** Pembayaran (Payment - Rp 1)
5. **Step 5:** Konfirmasi (Final Confirmation)

## API Endpoints

- `POST /api/payment/create` - Create payment transaction
- `GET /api/payment/status/[orderId]` - Get payment status
- `POST /api/payment/webhook` - Handle payment notifications

## Reusable Components

The Midtrans service (`/src/lib/midtrans.ts`) can be reused throughout the application for:

- Creating transactions
- Checking payment status
- Handling webhooks
- Transaction management

## TypeScript Support

This project includes TypeScript declarations for the `midtrans-client` library since it doesn't have official TypeScript support:

- **Type Declarations**: `/src/types/midtrans-client.d.ts`
- **Interfaces**: Complete type coverage for all Midtrans methods
- **Type Safety**: Full IntelliSense and compile-time type checking

## Security Notes

- Never expose your **Server Key** in client-side code
- Always validate payments on the server-side
- Use webhooks for reliable payment status updates
- Store sensitive data securely