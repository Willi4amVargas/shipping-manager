import { neon } from "../../lib/neon"
import { parseDecimal } from "./calculations"
import type {
  CustomerOption,
  DbOrderItem,
  OrderDetailData,
  OrderListItem,
  OrderRecord,
  OrderSettings,
  OrderStatus,
  PaymentRecord,
} from "./types"

export const ORDER_STATUS_OPTIONS: Array<{
  value: OrderStatus
  label: string
}> = [
  { value: "pending", label: "Pendiente" },
  { value: "partially_paid", label: "Parcialmente pagado" },
  { value: "paid", label: "Pagado" },
  { value: "cancelled", label: "Cancelado" },
]

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  partially_paid: "Parcialmente pagado",
  paid: "Pagado",
  cancelled: "Cancelado",
}

export const ACTIVE_STATUSES: OrderStatus[] = ["pending", "partially_paid"]

export type StatusFilter = "all" | "active" | OrderStatus

export const STATUS_FILTER_OPTIONS: Array<{
  value: StatusFilter
  label: string
}> = [
  { value: "all", label: "Todos los estados" },
  { value: "active", label: "Solo activos" },
  ...ORDER_STATUS_OPTIONS,
]

export const rowsFrom = <T,>(response: unknown): T[] => {
  if (Array.isArray(response)) return response as T[]
  if (!response || typeof response !== "object") return []
  const value = response as { results?: unknown; data?: unknown }
  if (Array.isArray(value.results)) return value.results as T[]
  if (Array.isArray(value.data)) return value.data as T[]
  return []
}

export const hasError = (response: unknown): boolean =>
  Boolean(
    response &&
      typeof response === "object" &&
      "error" in response &&
      (response as { error?: unknown }).error,
  )

const numeric = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeOrder = (order: OrderRecord): OrderRecord => ({
  ...order,
  products_total: numeric(order.products_total),
  total_commission: numeric(order.total_commission),
  discount:
    order.discount == null ? null : numeric(order.discount),
  grand_total: numeric(order.grand_total),
})

const normalizeItem = (item: DbOrderItem): DbOrderItem => ({
  ...item,
  quantity: numeric(item.quantity),
  unit_price: numeric(item.unit_price),
  subtotal: numeric(item.subtotal),
})

const normalizePayment = (payment: PaymentRecord): PaymentRecord => ({
  ...payment,
  original_amount: numeric(payment.original_amount),
  exchange_rate:
    payment.exchange_rate == null ? null : numeric(payment.exchange_rate),
  base_amount: numeric(payment.base_amount),
})

export type SettingsResult =
  | { ok: true; settings: OrderSettings }
  | { ok: false; message: string }

type SettingRow = {
  setting_key: string
  setting_value: string
}

export const loadOrderSettings = async (): Promise<SettingsResult> => {
  try {
    const response = await neon.from("settings").select("*")
    if (hasError(response)) throw response.error

    const rows = rowsFrom<SettingRow>(response)
    const commissionRow = rows.find(
      (row) => row.setting_key === "product_commission",
    )
    const storesRow = rows.find((row) => row.setting_key === "stores")

    if (!commissionRow || !storesRow) {
      return {
        ok: false,
        message:
          "Faltan product_commission o stores en la configuración de la tienda.",
      }
    }

    const commissionPerProduct = parseDecimal(commissionRow.setting_value)
    const stores = storesRow.setting_value
      .split(",")
      .map((store) => store.trim())
      .filter(Boolean)
      .filter((store, index, all) => all.indexOf(store) === index)

    if (!Number.isFinite(commissionPerProduct) || commissionPerProduct < 0) {
      return {
        ok: false,
        message:
          "La comisión por producto debe ser un número igual o mayor que cero.",
      }
    }

    if (stores.length === 0) {
      return {
        ok: false,
        message: "La configuración no contiene tiendas disponibles.",
      }
    }

    return { ok: true, settings: { commissionPerProduct, stores } }
  } catch {
    return {
      ok: false,
      message:
        "No se pudieron cargar la comisión y las tiendas. Revisa la conexión.",
    }
  }
}

const loadCustomers = async (): Promise<CustomerOption[]> => {
  const response = await neon
    .from("customers")
    .select("customer_id, name, email, phone")
  if (hasError(response)) throw response.error
  return rowsFrom<CustomerOption>(response)
}

const loadPayments = async (): Promise<PaymentRecord[]> => {
  const response = await neon.from("payments").select("*")
  if (hasError(response)) throw response.error
  return rowsFrom<PaymentRecord>(response)
}

export const loadOrderList = async (): Promise<OrderListItem[]> => {
  const [ordersResponse, customers, payments] = await Promise.all([
    neon.from("orders").select("*").order("order_date", { ascending: false }),
    loadCustomers(),
    loadPayments(),
  ])

  if (hasError(ordersResponse)) throw ordersResponse.error

  const normalizedPayments = payments.map(normalizePayment)

  const customersById = new Map(
    customers.map((customer) => [customer.customer_id, customer]),
  )
  const paymentsByOrder = new Map<number, PaymentRecord[]>()

  for (const payment of normalizedPayments) {
    if (payment.order_id == null) continue
    const current = paymentsByOrder.get(payment.order_id) ?? []
    current.push(payment)
    paymentsByOrder.set(payment.order_id, current)
  }

  return rowsFrom<OrderRecord>(ordersResponse)
    .map(normalizeOrder)
    .sort((a, b) => {
      const dateOrder = (b.order_date ?? "").localeCompare(a.order_date ?? "")
      return dateOrder !== 0 ? dateOrder : b.order_id - a.order_id
    })
    .map((order) => ({
      ...order,
      customer:
        order.customer_id == null
          ? null
          : (customersById.get(order.customer_id) ?? null),
      payments: paymentsByOrder.get(order.order_id) ?? [],
    }))
}

export type OrderDetailResult =
  | { ok: true; detail: OrderDetailData }
  | { ok: false; message: string }

export const loadOrderDetail = async (
  orderId: number,
): Promise<OrderDetailResult> => {
  try {
    const [orderResponse, itemsResponse, paymentsResponse] = await Promise.all([
      neon.from("orders").select("*").eq("order_id", orderId),
      neon.from("order_items").select("*").eq("order_id", orderId),
      neon.from("payments").select("*").eq("order_id", orderId),
    ])

    if (
      hasError(orderResponse) ||
      hasError(itemsResponse) ||
      hasError(paymentsResponse)
    ) {
      throw new Error("No se pudo leer la orden.")
    }

    const [order] = rowsFrom<OrderRecord>(orderResponse)
    if (!order) {
      return { ok: false, message: "La orden no existe." }
    }

    let customer: CustomerOption | null = null
    if (order.customer_id != null) {
      const customerResponse = await neon
        .from("customers")
        .select("customer_id, name, email, phone")
        .eq("customer_id", order.customer_id)
      if (hasError(customerResponse)) throw customerResponse.error
      customer = rowsFrom<CustomerOption>(customerResponse)[0] ?? null
    }

    return {
      ok: true,
      detail: {
        order: normalizeOrder(order),
        customer,
        items: rowsFrom<DbOrderItem>(itemsResponse)
          .map(normalizeItem)
          .sort((a, b) => a.item_id - b.item_id),
        payments: rowsFrom<PaymentRecord>(paymentsResponse)
          .map(normalizePayment)
          .sort((a, b) =>
            (b.payment_date ?? "").localeCompare(a.payment_date ?? ""),
          ),
      },
    }
  } catch {
    return {
      ok: false,
      message: "No se pudo cargar la orden. Revisa la conexión.",
    }
  }
}

export const productHostname = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "")
  } catch {
    return value
  }
}
