interface InvoiceNumberParams {
  productName: string;
  installmentNumber?: number; // Optional for full payment
  paymentType: 'full-investment' | 'cicilan-installment';
}

// Product code mapping based on plant types
const PRODUCT_CODES: Record<string, string> = {
  'alpukat': 'ALP',
  'aren': 'ARN',
  'jengkol': 'JGL',
  'gaharu': 'GHR',
  // Add more as needed
};

// Get product code from product name
function getProductCode(productName: string): string {
  const normalizedName = productName.toLowerCase();

  // Try exact match first
  for (const [key, code] of Object.entries(PRODUCT_CODES)) {
    if (normalizedName.includes(key)) {
      return code;
    }
  }

  // Default fallback - use first 3 letters of product name
  return productName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
}

// Format date as YYMMDD
function formatDateCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

// Get next payment sequence number for today with better uniqueness
async function getNextPaymentSequence(): Promise<string> {
  // Use timestamp + random for uniqueness instead of database lookup
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  // Use time-based sequence: HHMM + last 2 digits of milliseconds + random 2 digits
  const timeBase = `${hours}${minutes}`;
  const uniqueSuffix = `${milliseconds.slice(-2)}${random.slice(0, 2)}`;

  // Return 4-digit sequence
  return `${timeBase.slice(-2)}${uniqueSuffix.slice(0, 2)}`;
}

// Generate complete invoice number
export async function generateInvoiceNumber(params: InvoiceNumberParams): Promise<string> {
  const {
    productName,
    installmentNumber = 1,
    paymentType
  } = params;

  // 1. Invoice prefix (different for installments vs full payments)
  const prefix = paymentType === 'cicilan-installment' ? 'CIC-INV' : 'INV';

  // 2. Company code
  const company = 'BMS';

  // 3. Date code (YYMMDD)
  const dateCode = formatDateCode();

  // 4. Product code
  const productCode = getProductCode(productName);

  // 5. Legal team (always FIN for Finance)
  const legalTeam = 'FIN';

  // 6. Installment number (01 for full payment, actual number for cicilan)
  const cicilanNumber = paymentType === 'full-investment'
    ? '01'
    : installmentNumber.toString().padStart(2, '0');

  // 7. Payment sequence number for today
  const paymentSequence = await getNextPaymentSequence();

  return `${prefix}-${company}-${dateCode}-${productCode}-${legalTeam}-${cicilanNumber}-${paymentSequence}`;
}

// Helper function for legacy order ID conversion (if needed)
export function isLegacyOrderId(orderId: string): boolean {
  return !orderId.startsWith('INV-BMS-');
}

// Validate invoice number format
export function validateInvoiceNumber(invoiceNumber: string): boolean {
  const fullPaymentPattern = /^INV-BMS-\d{6}-[A-Z]{3}-FIN-\d{2}-\d{4}$/;
  const installmentPattern = /^CIC-INV-BMS-\d{6}-[A-Z]{3}-FIN-\d{2}-\d{4}$/;
  return fullPaymentPattern.test(invoiceNumber) || installmentPattern.test(invoiceNumber);
}