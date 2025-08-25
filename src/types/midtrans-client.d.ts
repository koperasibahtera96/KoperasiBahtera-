declare module 'midtrans-client' {
  export interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export interface TransactionDetails {
    order_id: string;
    gross_amount: number;
  }

  export interface CustomerDetails {
    first_name: string;
    last_name?: string;
    email: string;
    phone: string;
    billing_address?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      country_code?: string;
    };
    shipping_address?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      postal_code?: string;
      country_code?: string;
    };
  }

  export interface ItemDetails {
    id: string;
    price: number;
    quantity: number;
    name: string;
    brand?: string;
    category?: string;
    merchant_name?: string;
  }

  export interface TransactionParameter {
    transaction_details: TransactionDetails;
    customer_details: CustomerDetails;
    item_details?: ItemDetails[];
    callbacks?: {
      finish?: string;
      error?: string;
      pending?: string;
    };
  }

  export interface TransactionResponse {
    token: string;
    redirect_url: string;
  }

  export interface TransactionStatus {
    status_code: string;
    status_message: string;
    transaction_id: string;
    order_id: string;
    merchant_id: string;
    gross_amount: string;
    currency: string;
    payment_type: string;
    transaction_time: string;
    transaction_status: string;
    fraud_status: string;
    masked_card?: string;
    bank?: string;
    va_numbers?: Array<{
      bank: string;
      va_number: string;
    }>;
  }

  export interface CaptureParameter {
    gross_amount: number;
  }

  export class Snap {
    constructor(config: MidtransConfig);
    createTransaction(parameter: TransactionParameter): Promise<TransactionResponse>;
  }

  export class CoreApi {
    constructor(config: MidtransConfig);
    transaction: {
      status(orderId: string): Promise<TransactionStatus>;
      cancel(orderId: string): Promise<TransactionStatus>;
      capture(orderId: string, parameter: CaptureParameter): Promise<TransactionStatus>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notification(notification: any): Promise<TransactionStatus>;
    };
  }

  const midtransClient: {
    Snap: typeof Snap;
    CoreApi: typeof CoreApi;
  };

  export default midtransClient;
}