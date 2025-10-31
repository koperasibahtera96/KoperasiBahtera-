/**
 * E-Materai Service
 * Service for stamping contracts with electronic stamp (e-materai) using MeteraIku API
 */

const EMATERAI_CONFIG = {
  staging: {
    stampUrl:
      "https://staging-event.meteraiku.co.id/api/document-upload/file-stamp",
    baseUrl: "https://staging-event.meteraiku.co.id/api/document-upload",
    apiKey:
      "t803k0iIhsv0KV3Vrp0HbKIUCOIIuNBRifpXVNciVjGyMjZkV4wFaGuC6reTOl2XDgk0gyWLWNC8FCrwUDl2sMl3xHQMfsCWmFkgdJCaAACFxw0Sx3HNyCsdqAKL1tCp",
  },
  production: {
    stampUrl: "https://event.meteraiku.co.id/api/document-upload/file-stamp",
    baseUrl: "https://event.meteraiku.co.id/api/document-upload",
    apiKey:
      "p8z0A3OZze1vgFKdUExCavuqppUPoWDX6qLs7fh52sHsNn2YCNR8f3MjAOn2SdEEpReCNXdww8YE7z0r6Whd21cFtPjC2m9dltseNC4gw8Z8k1COnygQK60IIUZ1FUfD",
  },
};

// Use staging for development, production for production
// const ENV = process.env.NODE_ENV === "production" ? "production" : "staging";
const ENV = "staging";
const CONFIG = EMATERAI_CONFIG[ENV];

interface StampCoordinates {
  x: number; // x1 coordinate
  xr: number; // x2 coordinate
  y: number; // y1 coordinate
  yr: number; // y2 coordinate
  page: number; // Page number to place the stamp
}

interface StampDocumentResponse {
  message: string;
  data: {
    id: number;
    uuid: string;
    name: string;
    email: string;
    status: number;
    status_text: string;
    file_ori: string;
    file_stamp: string; // URL to download the stamped document
    created_at: string;
    approved_at: string;
  };
}

/**
 * Stamp a PDF document with e-materai
 * @param pdfBuffer - PDF file as Buffer
 * @param filename - Original filename
 * @param coordinates - Stamp coordinates (optional, uses default if not provided)
 * @returns Stamped document info including file_stamp URL
 */
export async function stampContract(
  pdfBuffer: Buffer,
  filename: string,
  coordinates?: StampCoordinates
): Promise<StampDocumentResponse> {
  try {
    console.log(
      `[E-Materai] Stamping contract: ${filename} (${ENV} environment)`
    );

    const stampCoords = coordinates;

    // Create FormData
    const formData = new FormData();

    // Convert Buffer to Blob (properly handle Node.js Buffer)
    const uint8Array = new Uint8Array(pdfBuffer);
    const blob = new Blob([uint8Array], { type: "application/pdf" });
    formData.append("file", blob, filename);

    // Add stamp coordinates (FormData requires strings, but API interprets as integers)
    formData.append("custom_stamp[x]", String(stampCoords?.x));
    formData.append("custom_stamp[xr]", String(stampCoords?.xr));
    formData.append("custom_stamp[y]", String(stampCoords?.y));
    formData.append("custom_stamp[yr]", String(stampCoords?.yr));
    formData.append("custom_stamp[page]", String(stampCoords?.page));

    // Make API request
    const response = await fetch(CONFIG.stampUrl, {
      method: "POST",
      headers: {
        "X-API-KEY": CONFIG.apiKey,
      },
      body: formData,
    });

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();

    if (!response.ok) {
      console.error(`[E-Materai] API error (${response.status}):`, responseText);
      throw new Error(
        `E-Materai API failed: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`
      );
    }

    // Try to parse as JSON
    let result: StampDocumentResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[E-Materai] API response parsing error:`, parseError);
      console.error(`[E-Materai] Failed to parse response as JSON:`, responseText.substring(0, 500));
      throw new Error(
        `E-Materai API returned non-JSON response: ${responseText.substring(0, 200)}`
      );
    }

    console.log(
      `[E-Materai] Success! UUID: ${result.data.uuid}, File: ${result.data.file_stamp}`
    );

    return result;
  } catch (error) {
    console.error("[E-Materai] Error stamping contract:", error);
    throw error;
  }
}

/**
 * Get a stamped document by UUID
 * @param uuid - Document UUID from stamp response
 * @returns PDF file as Buffer
 */
export async function getStampedDocument(uuid: string): Promise<Buffer> {
  try {
    const url = `${CONFIG.baseUrl}/${uuid}`;

    console.log(`[E-Materai] Fetching stamped document: ${uuid}`);

    const response = await fetch(url, {
      headers: {
        "X-API-KEY": CONFIG.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch stamped document: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[E-Materai] Error fetching stamped document:", error);
    throw error;
  }
}

/**
 * Retry stamping a document if it failed
 * @param uuid - Document UUID
 * @returns Stamped document info
 */
export async function retryStamp(uuid: string): Promise<StampDocumentResponse> {
  try {
    const url = `${CONFIG.baseUrl}/${uuid}/retry`;

    console.log(`[E-Materai] Retrying stamp for UUID: ${uuid}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": CONFIG.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to retry stamp: ${response.status} ${response.statusText}`
      );
    }

    const result: StampDocumentResponse = await response.json();
    console.log(`[E-Materai] Retry success! UUID: ${result.data.uuid}`);

    return result;
  } catch (error) {
    console.error("[E-Materai] Error retrying stamp:", error);
    throw error;
  }
}
