"use client";

import { toJpeg } from "html-to-image";
import { downloadInvoiceImage } from "@/lib/invoiceImage";
import {
  BadgeCheck,
  CalendarClock,
  ChevronDown,
  CreditCard,
  Download,
  Hash,
  ReceiptText,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type JSONish =
  | string
  | number
  | boolean
  | null
  | JSONish[]
  | { [k: string]: JSONish };
type Props = { payment: { [k: string]: JSONish } };

// Finance theme (matching the finance layout colors)
const THEMES = {
  emerald: {
    bg: "#ffffff",
    border: "#324D3E",
    gradFrom: "#f0fdf4",
    gradTo: "#ffffff",
    text: "#324D3E",
    chipBorder: "#324D3E",
    chipText: "#324D3E",
    icon: (s = 16) => <Wallet size={s} style={{ color: "#324D3E" }} />,
  },
  sky: {
    bg: "#ffffff",
    border: "#324D3E",
    gradFrom: "#ecfdf5",
    gradTo: "#ffffff",
    text: "#324D3E",
    chipBorder: "#324D3E",
    chipText: "#324D3E",
    icon: (s = 16) => <CreditCard size={s} style={{ color: "#4C3D19" }} />,
  },
  amber: {
    bg: "#ffffff",
    border: "#324D3E",
    gradFrom: "#fef3c7",
    gradTo: "#ffffff",
    text: "#324D3E",
    chipBorder: "#324D3E",
    chipText: "#324D3E",
    icon: (s = 16) => <CalendarClock size={s} style={{ color: "#059669" }} />,
  },
  slate: {
    bg: "#ffffff",
    border: "#324D3E",
    gradFrom: "#f8fafc",
    gradTo: "#ffffff",
    text: "#324D3E",
    chipBorder: "#324D3E",
    chipText: "#324D3E",
    icon: (s = 16) => <ReceiptText size={s} style={{ color: "#324D3E" }} />,
  },
} as const;

const themeOf = (t?: string) => {
  const x = (t || "").toLowerCase();
  if (x === "registration" || x === "payment") return THEMES.emerald;
  if (x === "full-investment" || x === "fullpayment") return THEMES.sky;
  if (x === "cicilan-installment" || x === "installment") return THEMES.amber;
  return THEMES.slate;
};

const fmtDate = (v: any) => {
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime())
    ? undefined
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
};
const fmtIDR = (n?: number) =>
  typeof n === "number"
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(n)
    : undefined;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <dt className="text-[#889063] dark:text-gray-200 transition-colors duration-300 flex-shrink-0">
        {label}
      </dt>
      <dd className="flex-1 text-right break-all font-medium text-[#324D3E] dark:text-white transition-colors duration-300">
        {value}
      </dd>
    </div>
  );
}

export default function InvoiceCard({ payment }: Props) {
  const tone = useMemo(
    () => themeOf(String(payment?.paymentType ?? "")),
    [payment?.paymentType]
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); // detail default tertutup

  const created = fmtDate(payment?.createdAt);
  const updated = fmtDate(payment?.updatedAt);
  const amount =
    (payment?.amount as number) ??
    (payment?.totalAmount as number) ??
    (payment?.gross_amount as number);

  const refCode = String((payment as any)?.ref ?? (payment as any)?._id ?? "");
  const userImage = (payment as any)?.userImage as string | undefined;

  // Saat download: buka sementara panel Detail, capture, lalu kembalikan  Tolong check pada bagian ini !! 
  async function handleDownload() {
    if (!cardRef.current) return;
    const wasOpen = open;
    if (!wasOpen) {
      setOpen(true);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      );
    }

    // Detect current theme at export time (safe: runs only on client event)
    const dark =
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark");

    const dataUrl = await toJpeg(cardRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: dark ? "#111827" : "#FFFFFF",
      filter: (node) =>
        !(
          node instanceof HTMLElement && node.dataset.hideOnPrint !== undefined
        ),
      style: {
        color: dark ? "#F9FAFB" : "#0F172A",
        backgroundColor: dark ? "#111827" : tone.bg,
      },
      skipFonts: true,
    });

    if (!wasOpen) setOpen(false);

    const a = document.createElement("a");
    const name = `Invoice_${String(payment?.paymentType || "payment")}_${String(
      payment?.orderId || refCode
    )}.jpg`;
    a.href = dataUrl;
    a.download = name;
    a.click();
  }

  return (
    <div
      ref={cardRef}
      className="rounded-3xl overflow-hidden group hover:scale-105 transition-all duration-300 w-full border border-[#324D3E]/10 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 shadow-[0_10px_40px_rgba(50,77,62,0.08)]"
    >
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 bg-gradient-to-b from-[#f8fafc] to-white dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm flex-shrink-0 transition-colors duration-300">
              {tone.icon(16)}
            </div>
            <span className="text-xs sm:text-sm font-bold truncate text-[#324D3E] dark:text-white transition-colors duration-300">
              {String(payment?.paymentType || "Payment")
                .replace("-", " ")
                .toUpperCase()}
            </span>
          </div>
          {/* Kode REF (warna mengikuti tema) */}
          <span
            className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm flex-shrink-0 max-w-[120px] truncate text-[#324D3E] dark:text-white transition-colors duration-300"
            title={refCode}
          >
            #{refCode}
          </span>
        </div>
        <div className="mt-2 sm:mt-3 text-xs text-[#889063] dark:text-gray-200 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            {created && (
              <span className="truncate">
                Dibuat:{" "}
                <b className="text-[#324D3E] dark:text-white transition-colors duration-300">
                  {created}
                </b>
              </span>
            )}
            {updated && (
              <span className="truncate">
                Diupdate:{" "}
                <b className="text-[#324D3E] dark:text-white transition-colors duration-300">
                  {updated}
                </b>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-6">
        {/* Status + orderId */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs mb-4 sm:mb-6">
          <span className="px-2 sm:px-3 py-2 rounded-2xl bg-white/90 dark:bg-gray-700/80 backdrop-blur-sm shadow-sm text-xs border border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white transition-colors duration-300">
            <BadgeCheck size={12} className="inline mr-1" />
            Status:{" "}
            <b>
              {String(payment?.transactionStatus || payment?.adminStatus) ??
                "—"}
            </b>
          </span>
          {payment?.orderId && (
            <span className="px-2 sm:px-3 py-2 rounded-2xl bg-white/90 dark:bg-gray-700/80 backdrop-blur-sm shadow-sm text-xs truncate max-w-[200px] border border-[#324D3E]/20 dark:border-gray-600 text-[#324D3E] dark:text-white transition-colors duration-300">
              <Hash size={12} className="inline mr-1" />
              <span className="truncate">{String(payment.orderId)}</span>
            </span>
          )}
        </div>

        {/* Nominal */}
        {typeof amount !== "undefined" && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#324D3E]/5 to-[#4C3D19]/5 dark:from-gray-800 dark:to-gray-700 border border-[#324D3E]/10 dark:border-gray-700 transition-colors duration-300">
            <div className="text-xs font-medium text-[#889063] dark:text-gray-200 transition-colors duration-300">
              Nominal
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight mt-1 break-words text-[#324D3E] dark:text-white transition-colors duration-300">
              {fmtIDR(Number(amount)) ?? String(amount)}
            </div>
          </div>
        )}

        {/* User */}
        <div className="mb-4 sm:mb-6">
          <div className="text-xs font-medium mb-2 text-[#889063] dark:text-gray-200 transition-colors duration-300">
            User
          </div>
          <div className="flex items-center gap-2 sm:gap-3 p-3 rounded-2xl bg-white/60 dark:bg-gray-700/60 backdrop-blur-sm border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
            <div className="p-0 rounded-xl bg-[#324D3E]/10 dark:bg-gray-600/60 flex-shrink-0 transition-colors duration-300 overflow-hidden">
              {userImage ? (
                <Image
                  width={96}
                  height={96}
                  src={userImage}
                  alt="User profile"
                  className="h-8 w-8 sm:h-9 sm:w-9 object-cover rounded-lg"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="p-2">
                  <UserIcon size={16} style={{ color: tone.text }} />
                </div>
              )}
            </div>
            <span className="font-semibold text-sm truncate min-w-0 text-[#324D3E] dark:text-white transition-colors duration-300">
              {String((payment as any).userName ?? "—")}
            </span>
          </div>
        </div>

        {/* Tombol & Toggle Detail */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
<button
  // sebelumnya mungkin ada handler lain, cukup ganti 1 baris ini:
  onClick={() => downloadInvoiceImage(payment)}
  className="inline-flex items-center gap-2 rounded-xl bg-[#2f3e33] text-white px-3 py-2"
>
  Download Invoice
</button>

          <button
            data-hide-on-print
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-[#324D3E]/5 dark:hover:bg-gray-700 transition-all duration-300 text-[#324D3E] dark:text-white"
            aria-expanded={open}
          >
            Detail
            <ChevronDown
              size={14}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* PANEL DETAIL (tampil saat diklik; ikut otomatis saat download) */}
        {open && (
          <div className="mt-4 sm:mt-6 rounded-2xl p-3 sm:p-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-[#324D3E]/10 dark:border-gray-600 transition-colors duration-300">
            <dl className="grid grid-cols-1 gap-2 sm:gap-3 text-xs sm:text-sm">
              <Row label="REF" value={refCode || "—"} />
              <Row label="orderId" value={String(payment?.orderId ?? "—")} />
              <Row label="userId" value={String(payment?.userId ?? "—")} />
              <Row label="currency" value={String(payment?.currency ?? "—")} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
