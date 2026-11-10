import { useMemo, useState, type FormEvent } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowLeft } from "lucide-react"
import { Button } from "../../components/ui/button"
import {
  calculateOrderTotals,
  formatCurrency,
  getDiscountState,
} from "./calculations"
import { OrderGeneralFields } from "./order-general-fields"
import { OrderItemsEditor } from "./order-items-editor"
import { OrderStatusBadge } from "./order-status-badge"
import {
  summarizePayments,
  storedDateToDate,
} from "./payments"
import {
  OrderGrandTotal,
  OrderTotalsBreakdown,
} from "./order-totals"
import { updateOrderWithItems } from "./update-order"
import type {
  CustomerOption,
  OrderDetailData,
  OrderItemDraft,
  OrderSettings,
  OrderStatus,
} from "./types"

type OrderEditFormProps = {
  detail: OrderDetailData
  settings: OrderSettings
  onCancel: () => void
  onSaved: () => void
  onSaveFailed: (message: string) => void
}

export function OrderEditForm({
  detail,
  settings,
  onCancel,
  onSaved,
  onSaveFailed,
}: OrderEditFormProps) {
  const { order, customer: initialCustomer, items: storedItems } = detail
  const [customer, setCustomer] = useState<CustomerOption | null>(
    initialCustomer,
  )
  const [orderDate, setOrderDate] = useState(() =>
    storedDateToDate(order.order_date),
  )
  const [status, setStatus] = useState<OrderStatus>(order.status ?? "pending")
  const [discountInput, setDiscountInput] = useState(
    String(Number(order.discount ?? 0)),
  )
  const [items, setItems] = useState<OrderItemDraft[]>(() =>
    storedItems.map((item) => ({
      draftId: `item-${item.item_id}`,
      item_id: item.item_id,
      store: item.store ?? settings.stores[0] ?? "",
      product_url: item.product_url ?? "",
      attachment_path: item.attachment_path ?? "",
      quantity: item.quantity,
      unit_price: item.unit_price,
    })),
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const stores = useMemo(() => {
    const values = new Set(settings.stores)
    for (const item of storedItems) {
      if (item.store) values.add(item.store)
    }
    return [...values]
  }, [settings.stores, storedItems])

  const discount = getDiscountState(discountInput)
  const totals = useMemo(
    () =>
      calculateOrderTotals(
        items,
        discount.safeValue,
        settings.commissionPerProduct,
      ),
    [items, discount.safeValue, settings.commissionPerProduct],
  )
  const paymentSummary = summarizePayments(detail.payments, totals.grandTotal)

  const canSave =
    Boolean(customer) && items.length > 0 && discount.valid && !saving

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveError("")

    if (!customer) {
      setSaveError("Selecciona un cliente antes de guardar.")
      return
    }
    if (items.length === 0) {
      setSaveError("La orden debe conservar al menos un producto.")
      return
    }
    if (!discount.valid) {
      setSaveError("El descuento debe ser un número entre 0 y 100.")
      return
    }

    setSaving(true)
    const result = await updateOrderWithItems({
      order,
      originalItems: storedItems,
      customer,
      orderDate,
      status,
      discount: discount.safeValue,
      items,
      totals,
    })

    if (result.ok) {
      window.dispatchEvent(new Event("orders:changed"))
      onSaved()
      return
    }

    onSaveFailed(
      result.rollbackFailed
        ? `No se pudieron guardar los cambios y la orden #${order.order_id} pudo quedar parcialmente modificada. Revisa los datos antes de continuar.`
        : "No se pudieron guardar los cambios. La orden original fue restaurada y tus cambios de edición se descartaron.",
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <form onSubmit={handleSubmit} noValidate className="contents">
        <header className="shrink-0 border-b border-border px-4 py-3 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link
                to="/ordenes"
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft aria-hidden="true" className="size-3.5" />
                Volver a órdenes
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">
                  Editar orden #{order.order_id}
                </h1>
                <OrderStatusBadge status={status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Los totales se recalculan con la comisión actual.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-9"
              onClick={onCancel}
              disabled={saving}
            >
              Cancelar edición
            </Button>
          </div>

          <OrderGeneralFields
            customer={customer}
            onCustomerChange={(selected) => {
              setCustomer(selected)
              setSaveError("")
            }}
            customerPickerKey={0}
            orderDate={orderDate}
            onOrderDateChange={setOrderDate}
            status={status}
            onStatusChange={setStatus}
            discountInput={discountInput}
            onDiscountChange={(value) => {
              setDiscountInput(value)
              setSaveError("")
            }}
            disabled={saving}
          />
        </header>

        <OrderItemsEditor
          items={items}
          onChange={(nextItems) => {
            setItems(nextItems)
            setSaveError("")
          }}
          stores={stores}
          disabled={saving}
          emptyDescription="La orden debe conservar al menos un producto."
        />

        <footer className="shrink-0 border-t border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div className="space-y-1">
              <OrderTotalsBreakdown
                totals={totals}
                discountPercent={discount.safeValue}
                commissionPerProduct={settings.commissionPerProduct}
              />
              {paymentSummary.byCurrency.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Abonado actual en moneda base:{" "}
                  {formatCurrency(paymentSummary.paidBase)}
                </p>
              )}
            </div>
            <div className="flex items-end justify-between gap-4 sm:shrink-0">
              <div>
                <OrderGrandTotal value={totals.grandTotal} />
                {paymentSummary.credit > 0 && (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    A favor del cliente:{" "}
                    {formatCurrency(paymentSummary.credit)}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="h-11 min-w-36 px-4"
                disabled={!canSave}
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </div>

          <div className="mt-2 min-h-5 text-xs">
            {saveError ? (
              <p role="alert" className="text-destructive">
                {saveError}
              </p>
            ) : (
              <p className="text-muted-foreground" aria-live="polite">
                {items.length === 0
                  ? "Agrega al menos un producto para guardar."
                  : !customer
                    ? "Selecciona un cliente para guardar."
                    : "Los productos y totales se actualizarán en esta orden."}
              </p>
            )}
          </div>
        </footer>
      </form>
    </div>
  )
}
