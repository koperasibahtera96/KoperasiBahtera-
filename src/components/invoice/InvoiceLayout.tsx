"use client"

import { FinanceSidebar } from "@/components/finance/FinanceSidebar"
import React from "react"

interface InvoiceLayoutProps {
  children: React.ReactNode
}

export function InvoiceLayout({ children }: InvoiceLayoutProps) {
  return (
    <FinanceSidebar>
      {children}
    </FinanceSidebar>
  )
}