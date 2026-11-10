import { neon } from "../../lib/neon"
import { itemSubtotal, toDateInputValue } from "./calculations"
import { hasError, rowsFrom } from "./data"
import type {
  CustomerOption,
  DbOrderItem,
  OrderItemDraft,
  OrderRecord,
  OrderStatus,
  OrderTotals,
} from "./types"

type UpdateOrderInput = {
  order: OrderRecord
  originalItems: DbOrderItem[]
  customer: CustomerOption
  orderDate: Date
  status: OrderStatus
  discount: number
  items: OrderItemDraft[]
  totals: OrderTotals
}

const draftToRow = (item: OrderItemDraft, orderId: number) => ({
  order_id: orderId,
  store: item.store,
  product_url: item.product_url,
  attachment_path: item.attachment_path || null,
  quantity: item.quantity,
  unit_price: item.unit_price,
  subtotal: itemSubtotal(item),
})

const orderValues = ({
  customer,
  orderDate,
  status,
  discount,
  totals,
}: Pick<
  UpdateOrderInput,
  "customer" | "orderDate" | "status" | "discount" | "totals"
>) => ({
  customer_id: customer.customer_id,
  order_date: toDateInputValue(orderDate),
  status,
  products_total: totals.productsTotal,
  total_commission: totals.totalCommission,
  discount,
  grand_total: totals.grandTotal,
})

const restoreSnapshot = async ({
  order,
  originalItems,
}: Pick<UpdateOrderInput, "order" | "originalItems">) => {
  try {
    const deleteResponse = await neon
      .from("order_items")
      .delete()
      .eq("order_id", order.order_id)
    if (hasError(deleteResponse)) throw deleteResponse.error

    if (originalItems.length > 0) {
      const insertResponse = await neon.from("order_items").insert(
        originalItems.map((item) => ({
          order_id: order.order_id,
          store: item.store,
          product_url: item.product_url,
          attachment_path: item.attachment_path,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        })),
      )
      if (
        hasError(insertResponse) ||
        rowsFrom(insertResponse).length !== originalItems.length
      ) {
        throw new Error("No se pudieron restaurar los productos.")
      }
    }

    const orderResponse = await neon
      .from("orders")
      .update({
        customer_id: order.customer_id,
        order_date: order.order_date,
        status: order.status,
        products_total: order.products_total,
        total_commission: order.total_commission,
        discount: order.discount,
        grand_total: order.grand_total,
      })
      .eq("order_id", order.order_id)
      .select("order_id")
    if (
      hasError(orderResponse) ||
      rowsFrom(orderResponse).length !== 1
    ) {
      throw new Error("No se pudo restaurar la orden.")
    }

    return true
  } catch {
    return false
  }
}

export const updateOrderWithItems = async ({
  order,
  originalItems,
  customer,
  orderDate,
  status,
  discount,
  items,
  totals,
}: UpdateOrderInput): Promise<{ ok: true } | { ok: false; rollbackFailed: boolean }> => {
  const originalIds = new Set(originalItems.map((item) => item.item_id))
  const currentIds = new Set(
    items
      .map((item) => item.item_id)
      .filter((itemId): itemId is number => itemId != null),
  )

  const removedIds = [...originalIds].filter((itemId) => !currentIds.has(itemId))
  const updatedItems = items.filter((item) => item.item_id != null)
  const newItems = items.filter((item) => item.item_id == null)

  try {
    if (removedIds.length > 0) {
      const deleteResponse = await neon
        .from("order_items")
        .delete()
        .in("item_id", removedIds)
      if (hasError(deleteResponse)) throw deleteResponse.error
    }

    for (const item of updatedItems) {
      const response = await neon
        .from("order_items")
        .update(draftToRow(item, order.order_id))
        .eq("item_id", item.item_id!)
        .select("item_id")
      if (hasError(response) || rowsFrom(response).length !== 1) {
        throw new Error("No se pudo actualizar un producto.")
      }
    }

    if (newItems.length > 0) {
      const insertResponse = await neon
        .from("order_items")
        .insert(newItems.map((item) => draftToRow(item, order.order_id)))
        .select("item_id")
      if (
        hasError(insertResponse) ||
        rowsFrom(insertResponse).length !== newItems.length
      ) {
        throw new Error("No se pudieron insertar los productos nuevos.")
      }
    }

    const orderResponse = await neon
      .from("orders")
      .update(
        orderValues({ customer, orderDate, status, discount, totals }),
      )
      .eq("order_id", order.order_id)
      .select("order_id")
    if (hasError(orderResponse) || rowsFrom(orderResponse).length !== 1) {
      throw new Error("No se pudo actualizar la orden.")
    }

    return { ok: true }
  } catch {
    const restored = await restoreSnapshot({ order, originalItems })
    return { ok: false, rollbackFailed: !restored }
  }
}
