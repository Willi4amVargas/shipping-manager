import { roundMoney } from "./calculations"
import type { PaymentRecord } from "./types"

export type CurrencyTotal = {
  currency: string
  amount: number
}

export type PaymentSummary = {
  byCurrency: CurrencyTotal[]
  paidBase: number
  balanceDue: number
  credit: number
}

export const summarizePayments = (
  payments: PaymentRecord[],
  grandTotal: number,
): PaymentSummary => {
  const currencyTotals = new Map<string, number>()
  let paidBase = 0

  for (const payment of payments) {
    const currency = payment.currency?.trim().toUpperCase() || "USD"
    const originalAmount = Number(payment.original_amount) || 0
    const baseAmount = Number(payment.base_amount) || 0

    currencyTotals.set(
      currency,
      roundMoney((currencyTotals.get(currency) ?? 0) + originalAmount),
    )
    paidBase += baseAmount
  }

  paidBase = roundMoney(paidBase)

  return {
    byCurrency: [...currencyTotals.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => {
        if (a.currency === "USD") return -1
        if (b.currency === "USD") return 1
        return a.currency.localeCompare(b.currency)
      }),
    paidBase,
    balanceDue: roundMoney(Math.max(0, grandTotal - paidBase)),
    credit: roundMoney(Math.max(0, paidBase - grandTotal)),
  }
}

export const formatAmount = (value: number) =>
  new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(roundMoney(value))

export const formatMoney = (value: number, currency: string) => {
  const normalized = currency.trim().toUpperCase() || "USD"
  try {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency: normalized,
      minimumFractionDigits: 2,
    }).format(roundMoney(value))
  } catch {
    return `${normalized} ${roundMoney(value).toFixed(2)}`
  }
}

export const storedDateToDate = (value: string | null) => {
  if (!value) return new Date()
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) return new Date()
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export const formatStoredDate = (value: string | null) => {
  if (!value) return "Sin fecha"
  const datePart = value.slice(0, 10)
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  zelle: "Zelle",
  card: "Tarjeta",
  pago_movil: "Pago móvil",
  mobile_payment: "Pago móvil",
}

export const paymentMethodLabel = (value: string) => {
  const normalized = value.trim().toLowerCase()
  return (
    PAYMENT_METHOD_LABELS[normalized] ??
    normalized
      .replaceAll("_", " ")
      .replace(/^\w/, (character) => character.toUpperCase())
  )
}
