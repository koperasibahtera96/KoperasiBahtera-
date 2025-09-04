"use client";

import React, { useMemo, useRef, useState } from "react";
import { toJpeg } from "html-to-image";
import {
  ReceiptText, BadgeCheck, CreditCard, Wallet, CalendarClock, Hash,
  Download, ChevronDown, User as UserIcon,
} from "lucide-react";

type JSONish = string | number | boolean | null | JSONish[] | { [k: string]: JSONish };
type Props = { payment: { [k: string]: JSONish } };

// HEX themes (aman untuk capture)
const THEMES = {
  emerald: { bg:"#ECFDF5", border:"#A7F3D0", gradFrom:"#D1FAE5", gradTo:"#ECFDF5", text:"#065F46", chipBorder:"#A7F3D0", chipText:"#065F46", icon:(s=16)=><Wallet size={s} style={{color:"#059669"}}/> },
  sky:     { bg:"#F0F9FF", border:"#BAE6FD", gradFrom:"#E0F2FE", gradTo:"#F0F9FF", text:"#075985", chipBorder:"#BAE6FD", chipText:"#075985", icon:(s=16)=><CreditCard size={s} style={{color:"#0284C7"}}/> },
  amber:   { bg:"#FFFBEB", border:"#FDE68A", gradFrom:"#FEF3C7", gradTo:"#FFFBEB", text:"#92400E", chipBorder:"#FDE68A", chipText:"#92400E", icon:(s=16)=><CalendarClock size={s} style={{color:"#D97706"}}/> },
  slate:   { bg:"#F8FAFC", border:"#E2E8F0", gradFrom:"#F1F5F9", gradTo:"#F8FAFC", text:"#334155", chipBorder:"#E2E8F0", chipText:"#334155", icon:(s=16)=><ReceiptText size={s} style={{color:"#475569"}}/> },
} as const;

const themeOf = (t?: string) => {
  const x = (t||"").toLowerCase();
  if (x==="registration"||x==="payment") return THEMES.emerald;
  if (x==="full-investment"||x==="fullpayment") return THEMES.sky;
  if (x==="cicilan-installment"||x==="installment") return THEMES.amber;
  return THEMES.slate;
};

const fmtDate = (v:any)=> {
  const d = v instanceof Date ? v : new Date(v as any);
  return isNaN(d.getTime()) ? undefined :
    new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(d);
};
const fmtIDR = (n?: number)=> typeof n==="number"
  ? new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n)
  : undefined;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt style={{color:"#64748B"}}>{label}</dt>
      <dd className="text-right break-words" style={{color:"#0F172A"}}>{value}</dd>
    </div>
  );
}

export default function InvoiceCard({ payment }: Props) {
  const tone = useMemo(()=> themeOf(String(payment?.paymentType ?? "")), [payment?.paymentType]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false); // detail default tertutup

  const created = fmtDate(payment?.createdAt);
  const updated = fmtDate(payment?.updatedAt);
  const amount =
    (payment?.amount as number) ??
    (payment?.totalAmount as number) ??
    (payment?.gross_amount as number);

  const refCode = String((payment as any)?.ref ?? (payment as any)?._id ?? "");

  // Saat download: buka sementara panel Detail, capture, lalu kembalikan
  async function handleDownload() {
    if (!cardRef.current) return;
    const wasOpen = open;
    if (!wasOpen) {
      setOpen(true);
      await new Promise<void>(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
    }

    const dataUrl = await toJpeg(cardRef.current, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#FFFFFF",
      filter: (node) => !(node instanceof HTMLElement && node.dataset.hideOnPrint !== undefined),
      style: { color:"#0F172A", backgroundColor: tone.bg },
    });

    if (!wasOpen) setOpen(false);

    const a = document.createElement("a");
    const name = `Invoice_${String(payment?.paymentType || "payment")}_${String(payment?.orderId || refCode)}.jpg`;
    a.href = dataUrl; a.download = name; a.click();
  }

  return (
    <div
      ref={cardRef}
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: tone.bg, border:`1px solid ${tone.border}`, boxShadow:"0 8px 30px rgba(0,0,0,.06)" }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3" style={{ backgroundImage:`linear-gradient(180deg, ${tone.gradFrom} 0%, ${tone.gradTo} 100%)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {tone.icon(16)}
            <span className="text-sm font-semibold" style={{color:tone.text}}>
              {String(payment?.paymentType || "Payment").replace("-", " ")}
            </span>
          </div>
          {/* Kode REF (warna mengikuti tema) */}
          <span className="text-[11px] font-mono font-semibold break-all" style={{ color: tone.text }} title={refCode}>
            #{refCode}
          </span>
        </div>
        <div className="mt-2 text-xs" style={{color:"#64748B"}}>
          {created && <span className="mr-3">Dibuat: <b style={{color:"#334155"}}>{created}</b></span>}
          {updated && <span>Diupdate: <b style={{color:"#334155"}}>{updated}</b></span>}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        {/* Status + orderId */}
        <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
          <span className="px-2.5 py-1 rounded-full" style={{ background:"#FFFFFF", border:`1px solid ${tone.chipBorder}`, color:tone.chipText }}>
            <BadgeCheck size={12} className="inline mr-1" />
            Status: <b>{(payment?.transactionStatus as string) ?? "—"}</b>
          </span>
          {payment?.orderId && (
            <span className="px-2.5 py-1 rounded-full" style={{ background:"#FFFFFF", border:`1px solid ${tone.chipBorder}`, color:tone.chipText }}>
              <Hash size={12} className="inline mr-1" />
              {String(payment.orderId)}
            </span>
          )}
        </div>

        {/* Nominal */}
        {typeof amount !== "undefined" && (
          <div className="mb-3">
            <div className="text-[11px]" style={{color:"#64748B"}}>Nominal</div>
            <div className="text-xl font-extrabold tracking-tight" style={{color:"#0F172A"}}>
              {fmtIDR(Number(amount)) ?? String(amount)}
            </div>
          </div>
        )}

        {/* User */}
        <div className="mb-3">
          <div className="text-[11px]" style={{color:"#64748B"}}>User</div>
          <div className="flex items-center gap-2 font-medium" style={{color:"#0F172A"}}>
            <UserIcon size={14} style={{ color: tone.text }} />
            {String((payment as any).userName ?? "—")}
          </div>
        </div>

        {/* Tombol & Toggle Detail */}
        <div className="mt-3 flex items-center justify-between">
          <button
            data-hide-on-print
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold"
            style={{ backgroundColor:"#0F172A", color:"#FFFFFF" }}
          >
            <Download size={14} />
            Download Invoice
          </button>

          <button
            data-hide-on-print
            onClick={() => setOpen(v=>!v)}
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color:"#475569" }}
            aria-expanded={open}
          >
            Detail
            <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* PANEL DETAIL (tampil saat diklik; ikut otomatis saat download) */}
        {open && (
          <div className="mt-3 rounded-xl p-3" style={{ background:"#FFFFFF", border:`1px solid ${tone.border}` }}>
            <dl className="grid grid-cols-1 gap-2 text-[13px]">
              <Row label="REF"      value={refCode || "—"} />
              <Row label="orderId"  value={String(payment?.orderId ?? "—")} />
              <Row label="userId"   value={String(payment?.userId ?? "—")} />
              <Row label="currency" value={String(payment?.currency ?? "—")} />
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
