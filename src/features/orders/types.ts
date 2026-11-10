import type { Database } from "../../types/database"

export type CustomerOption = {
  customer_id: number
  name: string
  email: string | null
  phone: string | null
}

export type OrderStatus = Database["public"]["Enums"]["order_status"]

export type OrderItemDraft = {
  draftId: string
  item_id?: number
  store: string
  product_url: string
  attachment_path: string
  quantity: number
  unit_price: number
}

export type DbOrderItem = {
  item_id: number
  order_id: number | null
  store: string | null
  product_url: string | null
  attachment_path: string | null
  quantity: number
  unit_price: number
  subtotal: number
}

export type OrderRecord = {
  order_id: number
  customer_id: number | null
  order_date: string | null
  status: OrderStatus | null
  products_total: number
  total_commission: number
  discount: number | null
  grand_total: number
}

export type PaymentRecord = {
  payment_payment_id: number
  order_id: number | null
  payment_date: string | null
  currency: string
  original_amount: number
  exchange_rate: number | null
  base_amount: number
  payment_method: string
  reference_number: string | null
}

export type OrderSettings = {
  commissionPerProduct: number
  stores: string[]
}

export type OrderTotals = {
  productsTotal: number
  merchandiseTotal: number
  totalCommission: number
  discountAmount: number
  grandTotal: number
}

export type SavedOrder = {
  orderId: number
  grandTotal: number
}

export type OrderListItem = OrderRecord & {
  customer: CustomerOption | null
  payments: PaymentRecord[]
}

export type OrderDetailData = {
  order: OrderRecord
  customer: CustomerOption | null
  items: DbOrderItem[]
  payments: PaymentRecord[]
}
