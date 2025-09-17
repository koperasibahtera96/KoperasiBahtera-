import midtransClient, {
  CustomerDetails,
  ItemDetails,
  TransactionParameter,
  TransactionResponse,
  TransactionStatus,
} from "midtrans-client";

// Check for required environment variables
if (!process.env.MIDTRANS_SERVER_KEY) {
  console.error("❌ MIDTRANS_SERVER_KEY is not set in environment variables");
}
if (!process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY) {
  console.error(
    "❌ NEXT_PUBLIC_MIDTRANS_CLIENT_KEY is not set in environment variables"
  );
}

// TODO: Change this to true when ready for production
const shouldBeProd = false;

// Initialize Midtrans Snap
const snap = new midtransClient.Snap({
  isProduction: shouldBeProd,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
});

// Initialize Midtrans Core API
const coreApi = new midtransClient.CoreApi({
  isProduction: shouldBeProd,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!,
});

export interface PaymentRequest {
  orderId: string;
  amount: number;
  customerDetails: CustomerDetails;
  itemDetails?: ItemDetails[];
  callbacks?: {
    finish: string;
    error: string;
    pending: string;
  };
}

export type PaymentResponse = TransactionResponse;

class MidtransService {
  async createTransaction(
    paymentData: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const parameter: TransactionParameter = {
        transaction_details: {
          order_id: paymentData.orderId,
          gross_amount: paymentData.amount,
        },
        customer_details: paymentData.customerDetails,
        item_details: paymentData.itemDetails || [
          {
            id: paymentData.orderId,
            price: paymentData.amount,
            quantity: 1,
            name: "Registration Fee",
          },
        ],
        callbacks: paymentData.callbacks || {
          finish: `${process.env.NEXT_PUBLIC_BASE_URL}/payments`,
          error: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/error`,
          pending: `${process.env.NEXT_PUBLIC_BASE_URL}/payment/pending`,
        },
      };

      const transaction = await snap.createTransaction(parameter);
      return transaction;
    } catch (error: any) {
      console.error("Midtrans transaction creation error:", error);

      // Provide more specific error messages based on the error type
      if (error.httpStatusCode === 401) {
        throw new Error(
          "❌ Invalid Midtrans API keys. Please check your MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY in .env.local"
        );
      } else if (error.httpStatusCode === 400) {
        throw new Error(
          "❌ Invalid payment parameters. Please check the transaction details."
        );
      } else if (error.ApiResponse?.error_messages) {
        throw new Error(
          `❌ Midtrans API Error: ${error.ApiResponse.error_messages.join(
            ", "
          )}`
        );
      } else {
        throw new Error(
          `❌ Failed to create payment transaction: ${
            error.message || "Unknown error"
          }`
        );
      }
    }
  }

  async getTransactionStatus(orderId: string): Promise<TransactionStatus> {
    try {
      const response = await coreApi.transaction.status(orderId);
      return response;
    } catch (error) {
      console.error("Error getting transaction status:", error);
      throw new Error("Failed to get transaction status");
    }
  }

  async cancelTransaction(orderId: string): Promise<TransactionStatus> {
    try {
      const response = await coreApi.transaction.cancel(orderId);
      return response;
    } catch (error) {
      console.error("Error cancelling transaction:", error);
      throw new Error("Failed to cancel transaction");
    }
  }

  async captureTransaction(
    orderId: string,
    amount: number
  ): Promise<TransactionStatus> {
    try {
      const response = await coreApi.transaction.capture(orderId, {
        gross_amount: amount,
      });
      return response;
    } catch (error) {
      console.error("Error capturing transaction:", error);
      throw new Error("Failed to capture transaction");
    }
  }

  verifyNotification(notification: any): Promise<TransactionStatus> {
    try {
      return coreApi.transaction.notification(notification);
    } catch (error) {
      console.error("Error verifying notification:", error);
      throw new Error("Failed to verify notification");
    }
  }
}

export const midtransService = new MidtransService();
export { coreApi, snap };
