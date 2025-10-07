// src/lib/invoiceImage.ts
// UI export gambar invoice (tidak mengubah logic data) + fallback ambil No.Anggota bila kosong.
import { toPng } from "html-to-image";

/* ---------- Helpers ---------- */
const fmtDate = (v?: any) => {
  const d = v ? new Date(v) : new Date();
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const fmtTime = (v?: any) => {
  const d = v ? new Date(v) : new Date();
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const s = (x: any, fb = "—") =>
  x === null || x === undefined || x === "" ? fb : String(x);

function td(text: string, style = "") {
  return `<td style="padding:10px 12px; ${style}">${text}</td>`;
}

function loadImage(url: string) {
  return new Promise<void>((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve();
    im.onerror = (e) =>
      reject(new Error("Gagal memuat gambar: " + url + " | " + e));
    im.src = url;
  });
}

/** Fallback ambil No.Anggota dari DB hanya jika kosong.
 *  Tidak mengubah logic utama: tetap pakai payment.userCode/memberCode dulu.
 */
async function resolveMemberCode(
  payment: Record<string, any>
): Promise<string> {
  const fromPayment = payment?.userCode ?? payment?.memberCode;
  if (fromPayment) return String(fromPayment);

  try {
    const uid = String(payment?.userId || "");
    if (!uid) return "—";
    const res = await fetch(`/api/users/${encodeURIComponent(uid)}`, {
      cache: "no-store",
    });
    if (!res.ok) return "—";
    const data = await res.json();
    // adaptif: bisa {user:{userCode}} atau langsung {userCode}
    const code =
      data?.user?.userCode ?? data?.userCode ?? data?.data?.userCode ?? "—";
    return code ? String(code) : "—";
  } catch {
    return "—";
  }
}

/** Ambil data PlantInstance berdasarkan orderId untuk mendapatkan kavling dan blok */
async function resolvePlantInstanceData(
  payment: Record<string, any>
): Promise<{ kavling: string; blok: string }> {
  try {
    const orderId = String(payment?.orderId || "");
    if (!orderId) return { kavling: "—", blok: "—" };

    const plantId = `PLANT-${orderId}-${orderId.slice(-8)}`;

    const res = await fetch(`/api/plants/${plantId}`);

    if (!res.ok) return { kavling: "—", blok: "—" };

    const data = await res.json();
    return {
      kavling: data?.kavling || "—",
      blok: data?.blok || "—",
    };
  } catch {
    return { kavling: "—", blok: "—" };
  }
}

/* ---------- Export Gambar ---------- */
export async function downloadInvoiceImage(
  payment: Record<string, any>,
  opts?: {
    logoUrl?: string;
    watermarkUrl?: string;
    fileName?: string;
  }
) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // --- sumber data (TETAP) ---
  const name = s(payment?.userName, s(payment?.buyerName, "—"));
  // logic asli: userCode ?? memberCode; jika kosong baru fallback fetch
  const memberCode = s(
    payment?.userCode ??
      payment?.memberCode ??
      (await resolveMemberCode(payment)),
    "—"
  );

  const orderId = s(payment?.orderId, "—");
  const plantData = await resolvePlantInstanceData(payment);
  const kavBlok = `<b>Blok / Kav</b> : ${plantData.blok} / ${plantData.kavling}`;
  const dateRight = fmtDate(payment?.updatedAt || payment?.createdAt);

  // REG → deskripsi "Pendaftaran"
  let tableDesc = s(
    payment?.itemName,
    s(payment?.description, s(payment?.productName, "—"))
  );
  const isRegistration = orderId.startsWith("REG");
  if (isRegistration) tableDesc = "Pendaftaran";

  const amount =
    payment?.amount ?? payment?.totalAmount ?? payment?.gross_amount ?? 0;
  const status = s(payment?.transactionStatus ?? payment?.adminStatus, "—");
  const refNo = s(payment?.ref ?? payment?._id, "—");
  const tenorInfo = `${s(payment?.installmentNumber, "1")} / ${s(
    payment?.totalInstallments,
    "-"
  )}`;
  const period = s(payment?.billingPeriod, "Bulanan");

  const pt = String(payment?.paymentType || "").toLowerCase();
  const isFullInvestment =
    pt.includes("full") || pt === "full-investment" || pt === "fullpayment";

  // Full & REG sama-sama tanpa "Pembayaran" & "Jangka Wkt"
  const hideTenorAndPeriod = isFullInvestment || isRegistration;

  const INVOICE_BG = "/invoice.jpg";
  const WATERMARK = opts?.watermarkUrl ?? "/assets/watermark-bg.png";

  const W = 720;
  const H = 520;

  let wrapper: HTMLDivElement | null = null;

  try {
    await Promise.all([loadImage(INVOICE_BG), loadImage(WATERMARK)]);

    wrapper = document.createElement("div");
    wrapper.style.position = "fixed";
    wrapper.style.left = "-10000px";
    wrapper.style.top = "0";
    wrapper.style.zIndex = "-1";

    const el = document.createElement("div");
    el.style.width = `${W}px`;
    el.style.height = `${H}px`;
    el.style.backgroundImage = `url(${INVOICE_BG})`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.backgroundRepeat = "no-repeat";
    el.style.boxSizing = "border-box";
    el.style.padding = "160px 50px 34px";
    el.style.fontFamily = `Arial, Helvetica, sans-serif`;
    el.style.color = "#111";
    el.style.position = "relative";
    el.style.overflow = "hidden";
    wrapper.appendChild(el);

    // watermark
    const wm = document.createElement("img");
    wm.src = WATERMARK;
    wm.crossOrigin = "anonymous";
    Object.assign(wm.style, {
      position: "absolute",
      right: "14px",
      bottom: "14px",
      width: "280px",
      height: "280px",
      opacity: "0.12",
      objectFit: "contain",
      pointerEvents: "none",
    } as CSSStyleDeclaration);
    el.appendChild(wm);

    /* META */
    const meta = document.createElement("div");
    meta.style.display = "grid";
    meta.style.gridTemplateColumns = "1fr 1fr";
    meta.style.columnGap = "10px";
    meta.style.marginBottom = "8px";
    el.appendChild(meta);

    // kiri – sejajar bawah
    const leftMeta = document.createElement("div");
    leftMeta.style.display = "flex";
    leftMeta.style.flexDirection = "column";
    leftMeta.style.justifyContent = "flex-end";
    leftMeta.style.fontSize = "13px";
    leftMeta.style.lineHeight = "1.8";
    leftMeta.innerHTML = `
      <div><b>Nama</b> : ${name}</div>
      <div><b>No. Anggota</b> : ${memberCode}</div>
    `;
    meta.appendChild(leftMeta);

    // kanan – sejajar bawah
    const rightMeta = document.createElement("div");
    rightMeta.style.textAlign = "right";
    rightMeta.style.fontSize = "13px";
    rightMeta.style.lineHeight = "1.8";
    rightMeta.style.display = "flex";
    rightMeta.style.flexDirection = "column";
    rightMeta.style.justifyContent = "flex-end";
    rightMeta.innerHTML = `
      <div><b>INV-CONTRACT</b>: ${orderId}</div>
      <div>${kavBlok}</div>
      <div>${dateRight}</div>
    `;
    meta.appendChild(rightMeta);

    /* TABLE */
    const tbl = document.createElement("table");
    tbl.cellPadding = "0";
    tbl.cellSpacing = "0";
    tbl.style.width = "100%";
    tbl.style.borderCollapse = "collapse";
    tbl.style.marginBottom = "8px";

    // Different styling for registration vs product invoices
    if (isRegistration) {
      tbl.innerHTML = `
        <thead>
          <tr style="background:transparent; color:#fff; font-weight:700; font-size:14px; transform:translateY(25px);">
            ${td(
              "No",
              "width:52px; text-align:center; background:transparent; color:#fff;"
            )}
            ${td("Pembayaran", "background:transparent; color:#fff;")}
            ${td(
              "Nominal",
              "width:170px; text-align:center; background:transparent; color:#fff;"
            )}
          </tr>
        </thead>
        <tbody>
          <tr style="background:transparent; transform:translateY(18px);">
            ${td("1", "text-align:center; background:transparent; color:#000;")}
            ${td(tableDesc, "background:transparent; color:#000;")}
            ${td(
              fmtIDR(Number(amount)),
              "text-align:right; background:transparent; color:#000;"
            )}
          </tr>
        </tbody>
      `;
    } else {
      tbl.innerHTML = `
        <thead>
          <tr style="background:transparent; color:#fff; font-weight:700; font-size:14px; transform:translateY(3px);">
            ${td(
              "No",
              "width:52px; text-align:center; background:transparent; color:#fff;"
            )}
            ${td("Pembayaran", "background:transparent; color:#fff;")}
            ${td(
              "Nominal",
              "width:170px; text-align:center; background:transparent; color:#fff;"
            )}
          </tr>
        </thead>
        <tbody>
          <tr style="background:transparent; transform:translateY(-5px);">
            ${td("1", "text-align:center; background:transparent; color:#000;")}
            ${td(tableDesc, "background:transparent; color:#000;")}
            ${td(
              fmtIDR(Number(amount)),
              "text-align:right; background:transparent; color:#000;"
            )}
          </tr>
        </tbody>
      `;
    }
    el.appendChild(tbl);

    /* DETAIL */
    const detail = document.createElement("div");
    detail.style.margin = "8px 2px 0";
    detail.style.fontSize = "13px";
    detail.style.lineHeight = "1.7";

    if (hideTenorAndPeriod) {
      // Full Investment & Registration
      detail.innerHTML = `
        <div><b>Status</b> : ${status}</div>
        <div><b>Ref No</b> : ${refNo}</div>
      `;
    } else {
      detail.innerHTML = `
        <div><b>Pembayaran</b> : ${tenorInfo}</div>
        <div><b>Jangka Wkt</b> : ${period}</div>
        <div><b>Status</b> : ${status}</div>
        <div><b>Ref No</b> : ${refNo}</div>
      `;
    }
    el.appendChild(detail);

    /* FOOTER */
    const footer = document.createElement("div");
    footer.textContent = `Diunduh pada tanggal ${fmtDate()} pukul ${fmtTime()}`;
    footer.style.position = "absolute";
    footer.style.left = "45px";
    footer.style.bottom = "10px";
    footer.style.fontSize = "12px";
    footer.style.color = "#444";
    el.appendChild(footer);

    document.body.appendChild(wrapper);
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      quality: 1,
      cacheBust: true,
      backgroundColor: "#ffffff",
      skipFonts: true,
      fontEmbedCSS: "",
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = opts?.fileName ?? `INV-CONTRACT-${orderId || "INVOICE"}.png`;
    a.click();
  } catch (err: any) {
    console.error("[invoiceImage] export error:", err);
    alert(`Gagal membuat gambar invoice.\n${err?.message || err}`);
  } finally {
    if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  }
}
