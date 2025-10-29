import Settings from "@/models/Settings";
import WhatsAppSession from "@/models/WhatsAppSession";
import { Boom } from "@hapi/boom";
import makeWASocket, {
  AuthenticationCreds,
  AuthenticationState,
  ConnectionState,
  DisconnectReason,
  initAuthCreds,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import dbConnect from "./mongodb";

// Store for WhatsApp socket instances with connection state
const whatsappSockets = new Map<string, any>();
const connectionStates = new Map<
  string,
  "connecting" | "connected" | "disconnected" | "qr"
>();
const connectionPromises = new Map<string, Promise<any>>();

// Helper function to convert objects with buffer data back to BufferJSON format
const fixBufferJSON = (obj: any): any => {
  if (obj && typeof obj === "object") {
    if (obj.type === "Buffer" && Array.isArray(obj.data)) {
      return Buffer.from(obj.data);
    }

    const result: any = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      result[key] = fixBufferJSON(obj[key]);
    }
    return result;
  }
  return obj;
};

// Custom MongoDB-based auth state implementation without temp files
const getMongoDBAuthState = async (
  whatsappNumber: string
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  hasExistingAuth: boolean;
}> => {
  await dbConnect();

  // Get existing session from MongoDB
  const session = await WhatsAppSession.findOne({ whatsappNumber });
  let creds: AuthenticationCreds;
  let keys: any = {};

  // Check if we have existing credentials
  const hasExistingAuth = !!(
    session &&
    session.authData &&
    session.authData.creds
  );

  if (hasExistingAuth) {
    console.log(
      `Loading existing auth data for ${whatsappNumber} from MongoDB`
    );

    try {
      // Parse credentials from base64 JSON and fix Buffer objects
      if (session.authData.creds) {
        const credsBuffer = Buffer.from(session.authData.creds, "base64");
        const parsedCreds = JSON.parse(credsBuffer.toString("utf8"));
        creds = fixBufferJSON(parsedCreds);
      } else {
        throw new Error("No credentials found");
      }

      // Parse all key files
      for (const [fileName, fileData] of Object.entries(session.authData)) {
        if (
          fileName !== "creds" &&
          fileName.startsWith("app-state-sync-key-")
        ) {
          try {
            const keyBuffer = Buffer.from(fileData as string, "base64");
            const keyId = fileName
              .replace("app-state-sync-key-", "")
              .replace(".json", "");
            const parsedKey = JSON.parse(keyBuffer.toString("utf8"));
            keys[keyId] = fixBufferJSON(parsedKey);
          } catch (error) {
            console.error(`Error parsing key file ${fileName}:`, error);
          }
        }
      }

      console.log(
        `Loaded credentials and ${Object.keys(keys).length} keys from MongoDB`
      );
    } catch (error) {
      console.error(
        "Error parsing auth data from MongoDB, initializing new credentials:",
        error
      );
      creds = initAuthCreds();
      keys = {};
    }
  } else {
    console.log(
      `No existing auth data found for ${whatsappNumber}, initializing new credentials`
    );
    creds = initAuthCreds();
    keys = {};
  }

  // Create the authentication state
  const state: AuthenticationState = {
    creds,
    keys: {
      get: (type: keyof SignalDataTypeMap, ids: string[]) => {
        const data: { [_: string]: any } = {};

        switch (type) {
          case "app-state-sync-key":
            for (const id of ids) {
              if (keys[id]) {
                data[id] = keys[id];
              }
            }
            break;
          default:
            break;
        }

        return data;
      },
      set: (data: any) => {
        for (const category in data) {
          if (category === "creds") {
            creds = { ...creds, ...data.creds };
          } else {
            const signalCategory = category as keyof SignalDataTypeMap;
            switch (signalCategory) {
              case "app-state-sync-key":
                for (const id in data[category]) {
                  keys[id] = data[category][id];
                }
                break;
              default:
                break;
            }
          }
        }
      },
    },
  };

  // Save credentials function
  const saveCreds = async () => {
    try {
      console.log(`Saving auth data for ${whatsappNumber} to MongoDB`);

      // Prepare auth data for MongoDB storage
      const authData: { [key: string]: string } = {};

      // Save credentials
      authData.creds = Buffer.from(JSON.stringify(creds), "utf8").toString(
        "base64"
      );

      // Save all keys
      for (const [keyId, keyData] of Object.entries(keys)) {
        authData[`app-state-sync-key-${keyId}.json`] = Buffer.from(
          JSON.stringify(keyData),
          "utf8"
        ).toString("base64");
      }

      // Update MongoDB with auth data
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
        `Saved credentials and ${
          Object.keys(keys).length
        } keys to MongoDB for ${whatsappNumber}`
      );
    } catch (error) {
      console.error("Error saving auth data to MongoDB:", error);
      throw error;
    }
  };

  return {
    state,
    saveCreds,
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
    const { state, saveCreds, hasExistingAuth } = await getMongoDBAuthState(
      whatsappNumber
    );

    console.log("MongoDB auth state retrieved, creating socket...");
    console.log(`Has existing auth: ${hasExistingAuth}`);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Disable terminal QR, send to frontend instead
      mobile: false,
      browser: ["Investasi Hijau", "Chrome", "10.0"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 2000,
      syncFullHistory: false, // Disable full history sync to prevent bad-request errors
      markOnlineOnConnect: false, // Don't mark online immediately
      generateHighQualityLinkPreview: false, // Disable link previews
      getMessage: async () => undefined, // Disable message history fetching
    });

    console.log("Socket created successfully, setting up event listeners...");

    // Handle connection updates
    socket.ev.on(
      "connection.update",
      async (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update;
        
        // Log connection update for debugging
        console.log(`Connection update for ${whatsappNumber}:`, {
          connection,
          isNewLogin,
          error: lastDisconnect?.error?.message
        });

        if (qr) {
          // Set QR state
          connectionStates.set(whatsappNumber, "qr");
          await updateWhatsAppStatus(whatsappNumber, "qr");

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

        if (
          connection === "close" &&
          (lastDisconnect?.error as Boom)?.output?.statusCode ===
            DisconnectReason.restartRequired
        ) {
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

          try {
            await createWhatsAppConnection(whatsappNumber);
          } catch (error) {
            console.error("Error creating new socket after restart:", error);
          }

          return;
        } else if (connection === "close") {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`Connection closed for ${whatsappNumber}, should reconnect: ${shouldReconnect}`);
          
          connectionStates.set(whatsappNumber, "disconnected");
          await updateWhatsAppStatus(whatsappNumber, "disconnected");
          
          // Only remove socket if logged out
          if (!shouldReconnect) {
            whatsappSockets.delete(whatsappNumber);
          }
        } else if (connection === "open") {
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
          console.log(`WhatsApp ${whatsappNumber} successfully connected`);
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
      const { state } = await getMongoDBAuthState(whatsappNumber);

      const socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        mobile: false,
        browser: ["Investasi Hijau", "Chrome", "10.0"],
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
      console.log(
        `Getting pairing code from MongoDB for ${whatsappNumber}: Found`
      );
      return session.pairingCode;
    }

    console.log(
      `Getting pairing code from MongoDB for ${whatsappNumber}: Not found`
    );
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

// Clean up auth data from MongoDB
const cleanupAuthData = async (whatsappNumber: string) => {
  try {
    await dbConnect();
    await WhatsAppSession.findOneAndDelete({ whatsappNumber });
    console.log(`Cleaned up auth data for ${whatsappNumber} from MongoDB`);
  } catch (error) {
    console.error(`Error cleaning up auth data:`, error);
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

    // Clean up auth data from MongoDB
    await cleanupAuthData(whatsappNumber);

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
${process.env.NEXTAUTH_URL}/payments

💡 *Sudah Bayar?*
Upload bukti pembayaran melalui dashboard pembayaran Anda.

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
