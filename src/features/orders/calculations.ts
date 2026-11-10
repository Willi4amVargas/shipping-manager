import type { OrderItemDraft, OrderTotals } from "./types"

export const roundMoney = (value: number) => {
  const numeric = Number(value)
  const safeValue = Number.isFinite(numeric) ? numeric : 0
  return Math.round((safeValue + Number.EPSILON) * 100) / 100
}

export const itemSubtotal = (item: Pick<OrderItemDraft, "quantity" | "unit_price">) =>
  roundMoney(item.quantity * item.unit_price)

export const calculateOrderTotals = (
  items: OrderItemDraft[],
  discountPercent: number,
  commissionPerProduct: number,
): OrderTotals => {
  const productsTotal = items.length
  const merchandiseTotal = roundMoney(
    items.reduce((sum, item) => sum + itemSubtotal(item), 0),
  )
  const totalCommission = roundMoney(productsTotal * commissionPerProduct)
  const discountAmount = roundMoney(
    ((merchandiseTotal + totalCommission) * discountPercent) / 100,
  )
  const grandTotal = roundMoney(
    merchandiseTotal + totalCommission - discountAmount,
  )

  return {
    productsTotal,
    merchandiseTotal,
    totalCommission,
    discountAmount,
    grandTotal,
  }
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(roundMoney(value))

export const toDateInputValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const formatOrderDate = (date: Date) =>
  new Intl.DateTimeFormat("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)

export const parseDecimal = (value: string) => {
  const normalized = value.trim().replace(",", ".")
  if (!normalized) return Number.NaN
  return Number(normalized)
}

export const getDiscountState = (value: string) => {
  const discount = parseDecimal(value)
  const hasValue = value.trim() !== ""
  const valid =
    hasValue && Number.isFinite(discount) && discount >= 0 && discount <= 100
  return { discount, hasValue, valid, safeValue: valid ? discount : 0 }
}
