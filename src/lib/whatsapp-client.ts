// Configuration
const WHATSAPP_SERVICE_URL =
  process.env.WHATSAPP_SERVICE_URL || "http://localhost:3001";
const WHATSAPP_SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;

if (!WHATSAPP_SERVICE_SECRET) {
  console.warn(
    "WHATSAPP_SERVICE_SECRET not set, WhatsApp functionality will not work"
  );
}

// Types for API responses
interface WhatsAppMessageResult {
  success: boolean;
  messageId?: string;
  senderNumber?: string;
  error?: string;
}

interface WhatsAppStatus {
  success: boolean;
  status?: {
    state: "connected" | "disconnected" | "connecting" | "qr";
    hasSocket: boolean;
    hasQRCode: boolean;
    isConnecting: boolean;
    isActive: boolean;
    lastConnected: string | null;
  };
  error?: string;
}

interface QRCodeResponse {
  success: boolean;
  qrCode?: string;
  message?: string;
  error?: string;
}

// Helper function to make API calls
const makeApiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${WHATSAPP_SERVICE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${WHATSAPP_SERVICE_SECRET}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Send WhatsApp message via API
export const sendWhatsAppMessage = async (
  to: string,
  message: string
): Promise<WhatsAppMessageResult> => {
  try {
    const data = await makeApiCall("/whatsapp/send-message", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    });

    return data;
  } catch (error: any) {
    console.error(
      "Error calling WhatsApp service for send message:",
      error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

// Generate QR code for WhatsApp connection
export const generateWhatsAppQR = async (
  whatsappNumber: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const data = await makeApiCall("/whatsapp/generate-qr", {
      method: "POST",
      body: JSON.stringify({ whatsappNumber }),
    });

    return data;
  } catch (error: any) {
    console.error(
      "Error calling WhatsApp service for QR generation:",
      error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get QR code for WhatsApp connection
export const getWhatsAppQR = async (
  whatsappNumber: string
): Promise<QRCodeResponse> => {
  try {
    const params = new URLSearchParams({ whatsappNumber });
    const data = await makeApiCall(`/whatsapp/qr?${params}`);

    return data;
  } catch (error: any) {
    console.error(
      "Error calling WhatsApp service for QR retrieval:",
      error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get WhatsApp connection status
export const getWhatsAppConnectionStatus = async (
  whatsappNumber: string
): Promise<WhatsAppStatus> => {
  try {
    const params = new URLSearchParams({ whatsappNumber });
    const data = await makeApiCall(`/whatsapp/status?${params}`);

    return data;
  } catch (error: any) {
    console.error("Error calling WhatsApp service for status:", error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Remove WhatsApp authentication
export const removeWhatsAppAuth = async (
  whatsappNumber: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const data = await makeApiCall("/whatsapp/remove-auth", {
      method: "POST",
      body: JSON.stringify({ whatsappNumber }),
    });

    return data;
  } catch (error: any) {
    console.error(
      "Error calling WhatsApp service for auth removal:",
      error.message
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

// WhatsApp message template (same as before)
export const whatsappTemplate = (
  investorName: string,
  productName: string,
  dueDate: string,
  amount: number,
  paymentType?: string
) => {
  // Different template for full-investment vs cicilan-installment
  if (paymentType === "full-investment") {
    return `🌱 *PENGINGAT PEMBAYARAN*
Koperasi Bintang Merah Sejahtera

Yth. *${investorName}*,

*DETAIL PEMBAYARAN:*
• Produk: ${productName}
• Tanggal Pembayaran: *${dueDate}*
• Jumlah: *Rp ${amount.toLocaleString("id-ID")}*

Mohon segera lakukan pembayaran untuk menyelesaikan investasi Anda.

🔗 *AKSES DASHBOARD:*
${process.env.NEXTAUTH_URL}/payments

Jika Anda sudah melakukan pembayaran, abaikan pesan ini.

Terima kasih atas kerjasama Anda.

_Pesan otomatis - Koperasi Bintang Merah Sejahtera_`;
  }

  return `🌱 *PENGINGAT CICILAN*
Koperasi Bintang Merah Sejahtera

Yth. *${investorName}*,

*DETAIL CICILAN:*
• Produk: ${productName}
• Tanggal Jatuh Tempo: *${dueDate}*
• Jumlah: *Rp ${amount.toLocaleString("id-ID")}*

Mohon segera lakukan pembayaran sesuai jadwal.

🔗 *AKSES DASHBOARD:*
${process.env.NEXTAUTH_URL}/payments

💡 *Sudah Bayar?*
Upload bukti pembayaran melalui dashboard pembayaran Anda.

Terima kasih atas kerjasama Anda.

_Pesan otomatis - Koperasi Bintang Merah Sejahtera_`;
};

// Utility function to check if WhatsApp service is available
export const isWhatsAppServiceAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${WHATSAPP_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error("WhatsApp service is not available:", error);
    return false;
  }
};
