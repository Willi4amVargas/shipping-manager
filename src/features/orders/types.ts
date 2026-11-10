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
  store: string
  product_url: string
  attachment_path: string
  quantity: number
  unit_price: number
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
