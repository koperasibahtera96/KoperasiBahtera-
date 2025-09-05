import Settings from "@/models/Settings";
import WhatsAppSession from "@/models/WhatsAppSession";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  AuthenticationState,
  ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import QRCode from "qrcode";
import dbConnect from "./mongodb";

// Store for WhatsApp socket instances with connection state
const whatsappSockets = new Map<string, any>();
const connectionStates = new Map<
  string,
  "connecting" | "connected" | "disconnected" | "qr"
>();
const connectionPromises = new Map<string, Promise<any>>();

// Interface for our MongoDB auth state
interface MongoAuthState extends AuthenticationState {
  saveCreds: () => Promise<void>;
  hasExistingAuth: boolean;
}

// Database-backed implementation using real useMultiFileAuthState
const useMongoDBAuthState = async (
  whatsappNumber: string
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  hasExistingAuth: boolean;
}> => {
  await dbConnect();

  // Create a temporary directory for this WhatsApp session
  const sessionDir = path.join(os.tmpdir(), `wa_session_${whatsappNumber}`);

  // Ensure directory exists
  try {
    await fs.mkdir(sessionDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Check if we have existing auth data in MongoDB and restore it to temp files
  const session = await WhatsAppSession.findOne({ whatsappNumber });
  let hasExistingAuth = false;

  if (session && session.authData && Object.keys(session.authData).length > 0) {
    hasExistingAuth = true;
    console.log(
      `Restoring ${
        Object.keys(session.authData).length
      } auth files from MongoDB`
    );

    // Restore all files from MongoDB to temp directory
    for (const [fileName, fileData] of Object.entries(session.authData)) {
      try {
        const filePath = path.join(sessionDir, fileName);
        const buffer = Buffer.from(fileData as string, "base64");
        await fs.writeFile(filePath, buffer);
      } catch (error) {
        console.error(`Error restoring file ${fileName}:`, error);
      }
    }
  }

  console.log(`MongoDB Auth State - hasExistingAuth: ${hasExistingAuth}`);

  // Use the real useMultiFileAuthState with the temp directory
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  // Override saveCreds to also save to MongoDB
  const originalSaveCreds = saveCreds;
  const enhancedSaveCreds = async () => {
    // First save using the original method (to temp files)
    await originalSaveCreds();

    // Then backup all files to MongoDB
    try {
      const files = await fs.readdir(sessionDir);
      const authData: { [key: string]: string } = {};

      for (const fileName of files) {
        try {
          const filePath = path.join(sessionDir, fileName);
          const fileBuffer = await fs.readFile(filePath);
          authData[fileName] = fileBuffer.toString("base64");
        } catch (error) {
          console.error(`Error reading file ${fileName}:`, error);
        }
      }

      // Update MongoDB with all auth files
      await WhatsAppSession.findOneAndUpdate(
        { whatsappNumber },
        {
          $set: {
            authData,
            lastConnected: new Date(),
            isActive: true,
          },
        },
        { upsert: true }
      );

      console.log(
        `Backed up ${Object.keys(authData).length} auth files to MongoDB`
      );
    } catch (error) {
      console.error("Error backing up auth files to MongoDB:", error);
    }
  };

  return {
    state,
    saveCreds: enhancedSaveCreds,
    hasExistingAuth,
  };
};

// Check if WhatsApp auth exists in MongoDB
export const hasWhatsAppAuth = async (whatsappNumber: string) => {
  try {
    await dbConnect();
    const session = await WhatsAppSession.findOne({ whatsappNumber });
    return !!(session && session.authData && session.authData.creds);
  } catch (error) {
    console.error("Error checking WhatsApp auth:", error);
    return false;
  }
};

// Get WhatsApp configuration from database
export const getWhatsAppConfig = async (whatsappNumber?: string) => {
  await dbConnect();
  let settings = await Settings.findOne({ type: "whatsapp", isActive: true });

  // If no WhatsApp settings exist and a whatsappNumber is provided, create default config
  if (!settings && whatsappNumber) {
    console.log("Creating default WhatsApp configuration for", whatsappNumber);
    settings = await Settings.create({
      type: "whatsapp",
      config: {
        whatsappNumber: whatsappNumber,
        status: "disconnected",
      },
      isActive: true,
    });
  }

  if (!settings || !settings.config.whatsappNumber) {
    throw new Error(
      "WhatsApp configuration not found. Please configure WhatsApp settings in admin panel."
    );
  }

  return settings.config;
};

// Create WhatsApp socket connection
export const createWhatsAppConnection = async (whatsappNumber: string) => {
  try {
    console.log("Getting auth state for WhatsApp number:", whatsappNumber);

    // Check if already connecting/connected
    const currentState = connectionStates.get(whatsappNumber);
    if (currentState === "connecting" || currentState === "connected") {
      console.log(
        `WhatsApp ${whatsappNumber} is already ${currentState}, returning existing socket`
      );
      const existingSocket = whatsappSockets.get(whatsappNumber);
      if (existingSocket) {
        return existingSocket;
      }
    }

    // Set connecting state
    connectionStates.set(whatsappNumber, "connecting");
    await updateWhatsAppStatus(whatsappNumber, "connecting");

    // Clear any existing socket and QR code for this number
    const existingSocket = whatsappSockets.get(whatsappNumber);
    if (existingSocket) {
      console.log("Closing existing socket for", whatsappNumber);
      existingSocket.end();
      whatsappSockets.delete(whatsappNumber);
    }
    // Clear QR code from database
    try {
      await WhatsAppSession.findOneAndUpdate(
        { whatsappNumber },
        { $unset: { qrCode: "", qrGeneratedAt: "" } }
      );
    } catch (error) {
      console.error("Error clearing QR code:", error);
    }

    // Use MongoDB auth state
    const { state, saveCreds, hasExistingAuth } = await useMongoDBAuthState(
      whatsappNumber
    );

    console.log("MongoDB auth state retrieved, creating socket...");
    console.log(`Has existing auth: ${hasExistingAuth}`);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: true, // Enable terminal for debugging
      mobile: false,
      browser: ["Widi Salon", "Chrome", "10.0"], // Exact same as working implementation
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 2000,
    });

    console.log("Socket created successfully, setting up event listeners...");

    // Handle connection updates
    socket.ev.on(
      "connection.update",
      async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;

        console.log(`Connection update for ${whatsappNumber}:`, {
          connection,
          hasQr: !!qr,
          qrLength: qr ? qr.length : 0,
          hasLastDisconnect: !!lastDisconnect,
          statusCode: (lastDisconnect?.error as any)?.output?.statusCode,
        });

        // Debug: Log raw QR data when received
        if (qr) {
          console.log(`RAW QR CODE RECEIVED:`, qr.substring(0, 100) + "...");
        }

        if (qr) {
          // Set QR state
          connectionStates.set(whatsappNumber, "qr");
          await updateWhatsAppStatus(whatsappNumber, "qr");

          // Generate QR code as base64 string and store in memory for browser display
          console.log(
            `Received QR code data for ${whatsappNumber}, generating data URL...`
          );

          const qrString = await QRCode.toDataURL(qr, {
            errorCorrectionLevel: "M",
            margin: 1,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
            width: 256,
          });

          // Store QR code in MongoDB instead of memory
          try {
            await WhatsAppSession.findOneAndUpdate(
              { whatsappNumber },
              {
                $set: {
                  qrCode: qrString,
                  qrGeneratedAt: new Date(),
                },
              },
              { upsert: true }
            );
            console.log(
              `QR Code generated and stored in MongoDB for ${whatsappNumber}`
            );
          } catch (error) {
            console.error("Error saving QR code to MongoDB:", error);
          }
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output
            ?.statusCode;
          const errorMessage = (lastDisconnect?.error as any)?.message || "";

          console.log(
            "Connection closed due to ",
            lastDisconnect?.error,
            ", status code:",
            statusCode,
            ", error message:",
            errorMessage
          );

          // Handle the restartRequired case as per Baileys documentation
          if (statusCode === DisconnectReason.restartRequired) {
            console.log(
              "WhatsApp requires restart after QR scan - this is normal behavior"
            );
            console.log("Creating new socket with saved credentials...");

            // Clear the old socket as per documentation (it's now useless)
            whatsappSockets.delete(whatsappNumber);
            // Clear QR code from database
            try {
              await WhatsAppSession.findOneAndUpdate(
                { whatsappNumber },
                { $unset: { qrCode: "", qrGeneratedAt: "" } }
              );
            } catch (error) {
              console.error("Error clearing QR code:", error);
            }

            // Create new connection with saved auth
            setTimeout(async () => {
              try {
                await createWhatsAppConnection(whatsappNumber);
              } catch (error) {
                console.error(
                  "Error creating new socket after restart:",
                  error
                );
              }
            }, 1000);

            return;
          }

          // Set disconnected state for other cases
          connectionStates.set(whatsappNumber, "disconnected");
          await updateWhatsAppStatus(whatsappNumber, "disconnected");

          // Check if the error is related to corrupted auth state
          if (errorMessage.includes("Cannot read properties of undefined")) {
            console.log("Detected auth corruption error, clearing auth...");
            await WhatsAppSession.findOneAndDelete({ whatsappNumber });
            await cleanupTempAuthFiles(whatsappNumber);
            whatsappSockets.delete(whatsappNumber);
            connectionStates.delete(whatsappNumber);
            connectionPromises.delete(whatsappNumber);
            // Clear QR code from database
            try {
              await WhatsAppSession.findOneAndUpdate(
                { whatsappNumber },
                { $unset: { qrCode: "", qrGeneratedAt: "" } }
              );
            } catch (error) {
              console.error("Error clearing QR code:", error);
            }
            return;
          }

          // Handle other disconnect reasons
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (
            errorMessage.includes("Connection Failure") &&
            statusCode === 405
          ) {
            console.log(
              "Connection Failure (405) - temporary failure, not retrying immediately"
            );
            // Don't retry immediately for 405 errors to avoid being blocked
            // Let the frontend polling handle the retry
          } else if (
            errorMessage.includes("Connection Terminated") &&
            statusCode === 428
          ) {
            console.log("Connection Terminated (428) - will retry with delay");
            setTimeout(() => {
              connectionStates.delete(whatsappNumber);
              createWhatsAppConnection(whatsappNumber);
            }, 8000); // Wait longer for 428 errors
          } else if (shouldReconnect) {
            console.log("Reconnecting after recoverable disconnect...");
            setTimeout(() => {
              connectionStates.delete(whatsappNumber);
              createWhatsAppConnection(whatsappNumber);
            }, 5000);
          } else {
            console.log("Clearing socket due to logout or unrecoverable error");
            whatsappSockets.delete(whatsappNumber);
            connectionStates.delete(whatsappNumber);
            connectionPromises.delete(whatsappNumber);
            // Clear QR code from database
            try {
              await WhatsAppSession.findOneAndUpdate(
                { whatsappNumber },
                { $unset: { qrCode: "", qrGeneratedAt: "" } }
              );
            } catch (error) {
              console.error("Error clearing QR code:", error);
            }
          }
        } else if (connection === "open") {
          console.log(`WhatsApp connected for ${whatsappNumber}`);
          connectionStates.set(whatsappNumber, "connected");
          // Clear QR code from database
          try {
            await WhatsAppSession.findOneAndUpdate(
              { whatsappNumber },
              { $unset: { qrCode: "", qrGeneratedAt: "" } }
            );
          } catch (error) {
            console.error("Error clearing QR code:", error);
          }

          await updateWhatsAppStatus(whatsappNumber, "connected");
        }
      }
    );

    // Handle credentials update
    socket.ev.on("creds.update", async () => {
      try {
        await saveCreds();
        console.log(
          `Auth credentials updated and saved to MongoDB for ${whatsappNumber}`
        );
      } catch (error) {
        console.error("Error saving updated credentials:", error);
      }
    });

    // Store socket instance
    whatsappSockets.set(whatsappNumber, socket);

    return socket;
  } catch (error) {
    console.error(
      `Error creating WhatsApp connection for ${whatsappNumber}:`,
      error
    );
    throw error;
  }
};

// Get or create WhatsApp socket
export const getWhatsAppSocket = async (whatsappNumber: string) => {
  const existingSocket = whatsappSockets.get(whatsappNumber);
  const currentState = connectionStates.get(whatsappNumber);

  if (existingSocket && currentState === "connected") {
    return existingSocket;
  }

  // If we have auth but no socket, create a simple socket for messaging
  const hasAuth = await hasWhatsAppAuth(whatsappNumber);
  if (hasAuth && currentState === "connected" && !existingSocket) {
    console.log(
      `Creating messaging socket for authenticated ${whatsappNumber}`
    );
    try {
      const { state } = await useMongoDBAuthState(whatsappNumber);

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ["Ubuntu", "Chrome", "22.04.4"],
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        retryRequestDelayMs: 2000,
      });

      whatsappSockets.set(whatsappNumber, socket);
      return socket;
    } catch (error) {
      console.error("Error creating messaging socket:", error);
    }
  }

  // Check if there's already a connection promise in progress
  const existingPromise = connectionPromises.get(whatsappNumber);
  if (existingPromise) {
    console.log(
      `Waiting for existing connection promise for ${whatsappNumber}`
    );
    return await existingPromise;
  }

  // Create new connection promise
  const connectionPromise = createWhatsAppConnection(whatsappNumber);
  connectionPromises.set(whatsappNumber, connectionPromise);

  try {
    const socket = await connectionPromise;
    return socket;
  } finally {
    connectionPromises.delete(whatsappNumber);
  }
};

// Get pairing code for WhatsApp number
export const getPairingCode = async (whatsappNumber: string) => {
  try {
    await dbConnect();
    const session = await WhatsAppSession.findOne({ whatsappNumber });
    
    if (session && session.pairingCode) {
      console.log(`Getting pairing code from MongoDB for ${whatsappNumber}: Found`);
      return session.pairingCode;
    }
    
    console.log(`Getting pairing code from MongoDB for ${whatsappNumber}: Not found`);
    return null;
  } catch (error) {
    console.error("Error getting pairing code from MongoDB:", error);
    return null;
  }
};

// Get QR Code for WhatsApp number from MongoDB
export const getQRCode = async (whatsappNumber: string) => {
  try {
    await dbConnect();
    const session = await WhatsAppSession.findOne({ whatsappNumber });

    if (session && session.qrCode) {
      // Check if QR code is not too old (5 minutes max)
      const qrAge = Date.now() - (session.qrGeneratedAt?.getTime() || 0);
      if (qrAge > 5 * 60 * 1000) {
        // 5 minutes
        console.log(`QR code for ${whatsappNumber} is too old, clearing it`);
        await WhatsAppSession.findOneAndUpdate(
          { whatsappNumber },
          { $unset: { qrCode: "", qrGeneratedAt: "" } }
        );
        return null;
      }

      console.log(`Getting QR code from MongoDB for ${whatsappNumber}: Found`);
      return session.qrCode;
    }

    console.log(
      `Getting QR code from MongoDB for ${whatsappNumber}: Not found`
    );
    return null;
  } catch (error) {
    console.error("Error getting QR code from MongoDB:", error);
    return null;
  }
};

// Get connection status from database
export const getWhatsAppConnectionStatus = async (whatsappNumber: string) => {
  try {
    await dbConnect();
    const session = await WhatsAppSession.findOne({ whatsappNumber });

    return {
      state: session?.connectionStatus || "disconnected",
      hasSocket: whatsappSockets.has(whatsappNumber),
      hasQRCode: !!session?.qrCode,
      isConnecting: connectionPromises.has(whatsappNumber),
      isActive: session?.isActive || false,
      lastConnected: session?.lastConnected || null,
    };
  } catch (error) {
    console.error("Error getting WhatsApp connection status:", error);
    return {
      state: "disconnected" as const,
      hasSocket: false,
      hasQRCode: false,
      isConnecting: false,
      isActive: false,
      lastConnected: null,
    };
  }
};

// Update WhatsApp status in database
const updateWhatsAppStatus = async (
  whatsappNumber: string,
  status: "connected" | "disconnected" | "connecting" | "qr"
) => {
  try {
    await dbConnect();

    // Update Settings table (for general config)
    await Settings.findOneAndUpdate(
      { type: "whatsapp" },
      {
        $set: {
          "config.status": status,
          "config.lastConnected": new Date(),
        },
      }
    );

    // Update WhatsAppSession table (for session state)
    await WhatsAppSession.findOneAndUpdate(
      { whatsappNumber: whatsappNumber },
      {
        $set: {
          connectionStatus: status,
          lastConnected: new Date(),
        },
      },
      { upsert: true }
    );

    console.log(`Updated WhatsApp status to ${status} for ${whatsappNumber}`);
  } catch (error) {
    console.error("Error updating WhatsApp status:", error);
  }
};

// Clean up temporary auth files
const cleanupTempAuthFiles = async (whatsappNumber: string) => {
  try {
    // Using imported modules from top of file

    const sessionDir = path.join(os.tmpdir(), `wa_session_${whatsappNumber}`);

    try {
      const files = await fs.readdir(sessionDir);
      for (const file of files) {
        await fs.unlink(path.join(sessionDir, file));
      }
      await fs.rmdir(sessionDir);
      console.log(`Cleaned up temp auth files for ${whatsappNumber}`);
    } catch (error) {
      // Directory might not exist or already cleaned up
    }
  } catch (error) {
    console.error(`Error cleaning up temp auth files:`, error);
  }
};

// Remove WhatsApp auth and disconnect
export const removeWhatsAppAuth = async (whatsappNumber: string) => {
  try {
    await dbConnect();

    // Disconnect socket if exists
    const socket = whatsappSockets.get(whatsappNumber);
    if (socket) {
      await socket.logout();
      whatsappSockets.delete(whatsappNumber);
    }

    // Clear all state tracking
    connectionStates.delete(whatsappNumber);
    connectionPromises.delete(whatsappNumber);

    // Clear QR code from database
    try {
      await WhatsAppSession.findOneAndUpdate(
        { whatsappNumber },
        { $unset: { qrCode: "", qrGeneratedAt: "" } }
      );
    } catch (error) {
      console.error("Error clearing QR code:", error);
    }

    // Remove auth state from database
    await WhatsAppSession.findOneAndDelete({ whatsappNumber });
    console.log(`Removed auth state from MongoDB for ${whatsappNumber}`);

    // Clean up temporary files
    await cleanupTempAuthFiles(whatsappNumber);

    // Update status in database
    await updateWhatsAppStatus(whatsappNumber, "disconnected");

    console.log(`WhatsApp auth removed for ${whatsappNumber}`);
    return true;
  } catch (error) {
    console.error(`Error removing WhatsApp auth for ${whatsappNumber}:`, error);
    return false;
  }
};

// WhatsApp message template
export const whatsappTemplate = (
  investorName: string,
  productName: string,
  dueDate: string,
  amount: number
) => {
  return `🌱 *PENGINGAT CICILAN*
Koperasi Bintang Merah Sejahtera

Yth. *${investorName}*,

*DETAIL CICILAN:*
• Produk: ${productName}
• Tanggal Jatuh Tempo: *${dueDate}*
• Jumlah: *Rp ${amount.toLocaleString("id-ID")}*

Mohon segera lakukan pembayaran sesuai jadwal.

🔗 *AKSES DASHBOARD:*
${process.env.NEXTAUTH_URL}/cicilan

💡 *Sudah Bayar?*
Upload bukti pembayaran melalui dashboard cicilan Anda.

Terima kasih atas kerjasama Anda.

_Pesan otomatis - Koperasi Bintang Merah Sejahtera_`;
};

// Send WhatsApp message
export const sendWhatsAppMessage = async (to: string, message: string) => {
  try {
    const config = await getWhatsAppConfig();
    const socket = await getWhatsAppSocket(config.whatsappNumber);

    // Log the actual sender info from socket
    const actualSender = socket.user?.id || "unknown";
    const senderNumber = actualSender.split(":")[0];
    console.log(`Configured WhatsApp number: ${config.whatsappNumber}`);
    console.log(`Actual connected WhatsApp account: ${actualSender}`);
    console.log(`Sender number extracted: ${senderNumber}`);

    // Format phone number (ensure it has country code)
    let phoneNumber = to.replace(/[^\d]/g, ""); // Remove non-digits
    if (!phoneNumber.startsWith("62")) {
      // Assume Indonesian number, convert 08xx to 628xx
      if (phoneNumber.startsWith("0")) {
        phoneNumber = "62" + phoneNumber.substring(1);
      }
    }

    const jid = phoneNumber + "@s.whatsapp.net";

    // Send message
    const result = await socket.sendMessage(jid, { text: message });

    console.log(`WhatsApp message sent to ${to}:`, result.key.id);
    console.log(`Message sent from: ${senderNumber}`);
    console.log(`Full socket user info:`, JSON.stringify(socket.user, null, 2));
    console.log(`Message result key:`, JSON.stringify(result.key, null, 2));
    return {
      success: true,
      messageId: result.key.id,
      senderNumber: senderNumber,
    };
  } catch (error) {
    console.error(`Failed to send WhatsApp message to ${to}:`, error);
    return { success: false, error: (error as any).message };
  }
};
