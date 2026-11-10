import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, RefreshCw, ShieldAlert } from "lucide-react"
import { neon } from "../lib/neon"
import { Button } from "../components/ui/button"
import {
  calculateOrderTotals,
  formatCurrency,
  getDiscountState,
  itemSubtotal,
  toDateInputValue,
} from "../features/orders/calculations"
import {
  hasError,
  loadOrderSettings,
  rowsFrom,
} from "../features/orders/data"
import { OrderGeneralFields } from "../features/orders/order-general-fields"
import { OrderItemsEditor } from "../features/orders/order-items-editor"
import {
  OrderGrandTotal,
  OrderTotalsBreakdown,
} from "../features/orders/order-totals"
import type {
  CustomerOption,
  OrderItemDraft,
  OrderSettings,
  OrderStatus,
  SavedOrder,
} from "../features/orders/types"

export const Route = createFileRoute("/nueva-orden")({
  component: NuevaOrden,
})

function NuevaOrden() {
  const [settings, setSettings] = useState<OrderSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState("")
  const [settingsRequest, setSettingsRequest] = useState(0)

  const [customer, setCustomer] = useState<CustomerOption | null>(null)
  const [customerPickerKey, setCustomerPickerKey] = useState(0)
  const [orderDate, setOrderDate] = useState(() => new Date())
  const [status, setStatus] = useState<OrderStatus>("pending")
  const [discountInput, setDiscountInput] = useState("0")
  const [items, setItems] = useState<OrderItemDraft[]>([])

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [savedOrder, setSavedOrder] = useState<SavedOrder | null>(null)

  useEffect(() => {
    let cancelled = false

    void loadOrderSettings().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setSettings(result.settings)
        setSettingsError("")
      } else {
        setSettings(null)
        setSettingsError(result.message)
      }
      setSettingsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [settingsRequest])

  const retrySettings = () => {
    setSettingsError("")
    setSettingsLoading(true)
    setSettingsRequest((value) => value + 1)
  }

  const discount = getDiscountState(discountInput)
  const totals = useMemo(
    () =>
      calculateOrderTotals(
        items,
        discount.safeValue,
        settings?.commissionPerProduct ?? 0,
      ),
    [items, discount.safeValue, settings],
  )

  const canSubmit =
    Boolean(settings) &&
    Boolean(customer) &&
    items.length > 0 &&
    discount.valid &&
    !saving

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveError("")
    setSavedOrder(null)

    if (!settings) {
      setSaveError("No se pudo cargar la configuración de la tienda.")
      return
    }
    if (!customer) {
      setSaveError("Selecciona un cliente antes de crear la orden.")
      return
    }
    if (items.length === 0) {
      setSaveError("Agrega al menos un producto antes de crear la orden.")
      return
    }
    if (!discount.valid) {
      setSaveError("El descuento debe ser un número entre 0 y 100.")
      return
    }

    setSaving(true)
    let createdOrderId: number | null = null
    let rollbackFailed = false

    try {
      const orderResponse = await neon
        .from("orders")
        .insert({
          customer_id: customer.customer_id,
          order_date: toDateInputValue(orderDate),
          status,
          products_total: totals.productsTotal,
          total_commission: totals.totalCommission,
          discount: discount.safeValue,
          grand_total: totals.grandTotal,
        })
        .select("order_id")

      if (hasError(orderResponse)) throw orderResponse.error

      const orderRows = rowsFrom<{ order_id: number }>(orderResponse)
      const orderId = Number(orderRows[0]?.order_id)
      if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new Error("La orden se insertó sin devolver un identificador.")
      }
      createdOrderId = orderId

      const itemResponse = await neon
        .from("order_items")
        .insert(
          items.map((item) => ({
            order_id: orderId,
            store: item.store,
            product_url: item.product_url,
            attachment_path: item.attachment_path || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: itemSubtotal(item),
          })),
        )
        .select("item_id")

      if (hasError(itemResponse)) throw itemResponse.error
      if (rowsFrom(itemResponse).length !== items.length) {
        throw new Error("No se guardaron todos los productos de la orden.")
      }

      setSavedOrder({ orderId, grandTotal: totals.grandTotal })
      window.dispatchEvent(new Event("orders:changed"))
      setCustomer(null)
      setCustomerPickerKey((value) => value + 1)
      setOrderDate(new Date())
      setStatus("pending")
      setDiscountInput("0")
      setItems([])
    } catch {
      if (createdOrderId !== null) {
        try {
          const rollbackResponse = await neon
            .from("orders")
            .delete()
            .eq("order_id", createdOrderId)
            .select("order_id")
          if (hasError(rollbackResponse)) rollbackFailed = true
        } catch {
          rollbackFailed = true
        }
      }

      setSaveError(
        rollbackFailed && createdOrderId !== null
          ? `No se guardaron los productos. La orden #${createdOrderId} pudo quedar incompleta; revísala antes de continuar.`
          : "No se pudo crear la orden. Tus datos siguen aquí para intentarlo de nuevo.",
      )
    } finally {
      setSaving(false)
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <RefreshCw
          aria-hidden="true"
          className="size-6 animate-spin text-primary motion-reduce:animate-none"
        />
        <p className="text-sm text-muted-foreground">
          Cargando tiendas y comisión...
        </p>
      </div>
    )
  }

  if (settingsError || !settings) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert aria-hidden="true" className="size-7 text-destructive" />
        <div>
          <h1 className="text-lg font-semibold">No se puede crear una orden</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {settingsError ||
              "La configuración de tiendas y comisión no está disponible."}
          </p>
        </div>
        <Button
          variant="outline"
          className="h-11 sm:h-9"
          onClick={retrySettings}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <form onSubmit={handleSubmit} noValidate className="contents">
        <header className="shrink-0 border-b border-border px-4 py-3 lg:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Nueva orden
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Elige el cliente y agrega los productos del pedido.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {savedOrder && (
                <p
                  role="status"
                  className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground"
                >
                  Orden #{savedOrder.orderId} creada por{" "}
                  <strong className="font-semibold">
                    {formatCurrency(savedOrder.grandTotal)}
                  </strong>
                  .
                </p>
              )}
              <Link
                to="/ordenes"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:min-h-9"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Volver a órdenes
              </Link>
            </div>
          </div>

          <OrderGeneralFields
            customer={customer}
            onCustomerChange={(selected) => {
              setCustomer(selected)
              setSavedOrder(null)
            }}
            customerPickerKey={customerPickerKey}
            orderDate={orderDate}
            onOrderDateChange={setOrderDate}
            status={status}
            onStatusChange={setStatus}
            discountInput={discountInput}
            onDiscountChange={(value) => {
              setDiscountInput(value)
              setSavedOrder(null)
            }}
            disabled={saving}
          />
        </header>

        <OrderItemsEditor
          items={items}
          onChange={(nextItems) => {
            setItems(nextItems)
            setSavedOrder(null)
          }}
          stores={settings.stores}
          disabled={saving}
        />

        <footer className="shrink-0 border-t border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <OrderTotalsBreakdown
              totals={totals}
              discountPercent={discount.safeValue}
              commissionPerProduct={settings.commissionPerProduct}
            />
            <div className="flex items-end justify-between gap-4 sm:shrink-0">
              <OrderGrandTotal value={totals.grandTotal} />
              <Button
                type="submit"
                className="h-11 min-w-36 px-4"
                disabled={!canSubmit}
              >
                {saving ? "Creando orden..." : "Crear orden"}
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
                  ? "Agrega al menos un producto para continuar."
                  : !customer
                    ? "Selecciona un cliente para continuar."
                    : !discount.valid
                      ? "El descuento debe estar entre 0 y 100."
                      : "Los totales se guardarán junto con la orden."}
              </p>
            )}
          </div>
        </footer>
      </form>
    </div>
  )
}
