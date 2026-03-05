/**
 * E-Materai Service
 * Service for stamping contracts with electronic stamp (e-materai) using MeteraIku API
 */
import { createHash } from "crypto";

const EMATERAI_CONFIG = {
  staging: {
    stampUrl:
      process.env.STAMP_URL || "",
    baseUrl: process.env.STAMP_BASE_URL || "",
    apiKey:
      process.env.STAMP_API_KEY || "",
  },
  production: {
    stampUrl: process.env.PROD_STAMP_URL || "",
    baseUrl: process.env.PROD_STAMP_BASE_URL || "",
    apiKey:
      process.env.PROD_STAMP_API_KEY || "",
  },
};

const ENV = process.env.IS_EMATERAI_PRODUCTION === "true" ? "production" : "staging";
export const CONFIG = EMATERAI_CONFIG[ENV];

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

function toSingleLineSnippet(input: string, maxLength = 180): string {
  const compact = input.replace(/\s+/g, " ").trim();
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength)}...`
    : compact;
}

function buildNonJsonDiagnostics(params: {
  body: string;
  contentType: string;
  status: number;
  statusText: string;
  url: string;
  redirected: boolean;
  contentLength: string;
}) {
  const {
    body,
    contentType,
    status,
    statusText,
    url,
    redirected,
    contentLength,
  } = params;

  const lowered = contentType.toLowerCase();
  const isHtml = lowered.includes("text/html");
  const titleMatch = isHtml ? body.match(/<title[^>]*>([^<]+)<\/title>/i) : null;
  const htmlTitle = titleMatch?.[1]?.trim() || null;
  const snippet = toSingleLineSnippet(body, 320);
  const hasPasswordField = /type=["']password["']/i.test(body);
  const hasLoginKeywords = /(login|masuk|sign in)/i.test(body);
  const firstFormActionMatch = isHtml
    ? body.match(/<form[^>]*action=["']([^"']+)["']/i)
    : null;
  const formAction = firstFormActionMatch?.[1] || null;

  let reason = "Response is not JSON.";
  if (isHtml && (hasPasswordField || hasLoginKeywords)) {
    reason =
      "Received HTML login/auth page instead of JSON API response (possible wrong endpoint, expired session, or API key issue).";
  } else if (isHtml) {
    reason = "Received HTML page instead of JSON API response.";
  } else if (redirected) {
    reason = "Request was redirected and returned non-JSON content.";
  }

  return {
    status,
    statusText,
    url,
    redirected,
    contentType,
    contentLength,
    htmlTitle,
    formAction,
    reason,
    snippet,
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
    const keyHash = createHash("sha256")
      .update(CONFIG.apiKey || "")
      .digest("hex")
      .slice(0, 12);
    console.log(
      `[E-Materai] Stamping contract: ${filename} (${ENV} environment)`
    );
    console.log(
      `[E-Materai] Runtime config: stampUrl="${CONFIG.stampUrl}" keyLen=${CONFIG.apiKey?.length || 0} keyHash=${keyHash}`
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
        Accept: "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      redirect: "manual",
      body: formData,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") || "unknown";
      console.error(
        `[E-Materai] Redirect response: status=${response.status} location="${location}" endpoint="${CONFIG.stampUrl}"`
      );
      throw new Error(
        `E-Materai stamp endpoint redirected (${response.status}) to ${location}. This usually means auth/scope failed for this endpoint.`
      );
    }

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    const contentType = response.headers.get("content-type") || "unknown";
    const diagnostics = buildNonJsonDiagnostics({
      body: responseText,
      contentType,
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      redirected: response.redirected,
      contentLength: response.headers.get("content-length") || "unknown",
    });

    if (!response.ok) {
      let providerErrorDetail = "";
      try {
        const parsed = JSON.parse(responseText) as {
          message?: string;
          errors?: Record<string, string[] | string>;
        };
        const messagePart = parsed?.message
          ? `message="${parsed.message}"`
          : "";
        const errorsPart = parsed?.errors
          ? `errors=${JSON.stringify(parsed.errors)}`
          : "";
        providerErrorDetail = [messagePart, errorsPart]
          .filter(Boolean)
          .join(" ");
      } catch {
        // Keep diagnostics-only logging for non-JSON error bodies.
      }

      console.error(
        `[E-Materai] API error diagnostics: ${JSON.stringify(diagnostics)}${providerErrorDetail ? ` providerError=${providerErrorDetail}` : ""}`
      );

      throw new Error(
        `E-Materai API failed: ${response.status} ${response.statusText} (${contentType})${providerErrorDetail ? ` - ${providerErrorDetail}` : ""}`
      );
    }

    // Try to parse as JSON
    let result: StampDocumentResponse;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      const parseMessage =
        parseError instanceof Error ? parseError.message : String(parseError);
      console.error(
        `[E-Materai] Non-JSON response: parseError="${parseMessage}" diagnostics=${JSON.stringify(diagnostics)}`
      );
      throw new Error(
        `E-Materai API returned non-JSON response: ${response.status} ${response.statusText} (${contentType}); reason=${diagnostics.reason}; url=${diagnostics.url}; title=${diagnostics.htmlTitle || "n/a"}`
      );
    }

    console.log(
      `[E-Materai] Success! UUID: ${result.data.uuid}, status=${result.data.status_text}, file=${result.data.file_stamp}`
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[E-Materai] Error stamping contract: ${message}`);
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

    // Log response headers for debugging
    console.log('[E-Materai] getStampedDocument Response Headers:', {
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      status: response.status
    });

    const arrayBuffer = await response.arrayBuffer();
    console.log(`[E-Materai] Downloaded stamped document, size: ${arrayBuffer.byteLength} bytes`);
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
    
    // Log the full API response
    console.log('[E-Materai] Full retryStamp API Response:', JSON.stringify(result, null, 2));
    
    console.log(`[E-Materai] Retry success! UUID: ${result.data.uuid}`);

    return result;
  } catch (error) {
    console.error("[E-Materai] Error retrying stamp:", error);
    throw error;
  }
}
