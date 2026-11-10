import { useEffect, useMemo, useState, type FormEvent } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  ExternalLink,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { neon } from "../lib/neon"
import { Button } from "../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select"
import { CustomerCombobox } from "../features/orders/customer-combobox"
import { OrderDatePicker } from "../features/orders/date-picker"
import { OrderItemDialog } from "../features/orders/order-item-dialog"
import {
  calculateOrderTotals,
  formatCurrency,
  itemSubtotal,
  parseDecimal,
  toDateInputValue,
} from "../features/orders/calculations"
import type {
  CustomerOption,
  OrderItemDraft,
  OrderSettings,
  OrderStatus,
  SavedOrder,
} from "../features/orders/types"

export const Route = createFileRoute("/ordenes")({
  component: Ordenes,
})

const statusOptions: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Pendiente" },
  { value: "partially_paid", label: "Parcialmente pagado" },
  { value: "paid", label: "Pagado" },
  { value: "cancelled", label: "Cancelado" },
]

type SettingRow = {
  setting_key: string
  setting_value: string
}

const rowsFrom = (response: unknown): unknown[] => {
  if (Array.isArray(response)) return response
  if (!response || typeof response !== "object") return []
  const value = response as { results?: unknown; data?: unknown }
  if (Array.isArray(value.results)) return value.results
  if (Array.isArray(value.data)) return value.data
  return []
}

const hasError = (response: unknown): boolean =>
  Boolean(
    response &&
      typeof response === "object" &&
      "error" in response &&
      (response as { error?: unknown }).error,
  )

const productHostname = (value: string) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "")
  } catch {
    return value
  }
}

type SettingsResult =
  | { ok: true; settings: OrderSettings }
  | { ok: false; message: string }

const loadOrderSettings = async (): Promise<SettingsResult> => {
  try {
    const response = await neon.from("settings").select("*")
    if (hasError(response)) throw response.error

    const rows = rowsFrom(response) as SettingRow[]
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

function Ordenes() {
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
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItemDraft | null>(null)
  const [itemToDelete, setItemToDelete] = useState<OrderItemDraft | null>(null)

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

  const discount = parseDecimal(discountInput)
  const hasDiscountValue = discountInput.trim() !== ""
  const isDiscountValid =
    hasDiscountValue &&
    Number.isFinite(discount) &&
    discount >= 0 &&
    discount <= 100
  const validDiscount = isDiscountValid ? discount : 0

  const totals = useMemo(
    () =>
      calculateOrderTotals(
        items,
        validDiscount,
        settings?.commissionPerProduct ?? 0,
      ),
    [items, validDiscount, settings],
  )

  const canSubmit =
    Boolean(settings) &&
    Boolean(customer) &&
    items.length > 0 &&
    isDiscountValid &&
    !saving

  const openNewItem = () => {
    setEditingItem(null)
    setItemDialogOpen(true)
  }

  const openEditItem = (item: OrderItemDraft) => {
    setEditingItem(item)
    setItemDialogOpen(true)
  }

  const saveItem = (item: OrderItemDraft) => {
    setSavedOrder(null)
    setItems((current) => {
      const exists = current.some(
        (currentItem) => currentItem.draftId === item.draftId,
      )
      if (!exists) return [...current, item]
      return current.map((currentItem) =>
        currentItem.draftId === item.draftId ? item : currentItem,
      )
    })
  }

  const removeItem = () => {
    if (!itemToDelete) return
    setItems((current) =>
      current.filter((item) => item.draftId !== itemToDelete.draftId),
    )
    setItemToDelete(null)
    setSavedOrder(null)
  }

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
    if (!isDiscountValid) {
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
          discount: validDiscount,
          grand_total: totals.grandTotal,
        })
        .select("order_id")

      if (hasError(orderResponse)) throw orderResponse.error

      const orderRows = rowsFrom(orderResponse)
      const orderId = Number(
        (orderRows[0] as { order_id?: number } | undefined)?.order_id,
      )
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
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(15rem,2fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(7rem,0.7fr)]">
            <div className="col-span-2 min-w-0 space-y-1.5 lg:col-span-1">
              <Label htmlFor="order-customer">Cliente</Label>
              <CustomerCombobox
                key={customerPickerKey}
                selected={customer}
                onSelect={(selected) => {
                  setCustomer(selected)
                  setSavedOrder(null)
                }}
                disabled={saving}
              />
              <p id="order-customer-help" className="sr-only">
                Escribe para buscar un cliente por nombre.
              </p>
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="order-date">Fecha</Label>
              <OrderDatePicker
                id="order-date"
                date={orderDate}
                onChange={setOrderDate}
                disabled={saving}
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="order-status">Estado</Label>
              <Select
                items={statusOptions}
                value={status}
                onValueChange={(value) => {
                  const nextStatus = statusOptions.find(
                    (option) => option.value === value,
                  )?.value
                  if (nextStatus) setStatus(nextStatus)
                }}
                disabled={saving}
              >
                <SelectTrigger
                  id="order-status"
                  className="h-11 w-full sm:h-9"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
              <Label htmlFor="order-discount">Descuento</Label>
              <div className="relative">
                <Input
                  id="order-discount"
                  inputMode="decimal"
                  value={discountInput}
                  onChange={(event) => {
                    setDiscountInput(event.target.value)
                    setSavedOrder(null)
                  }}
                  disabled={saving}
                  aria-invalid={discountInput.trim() !== "" && !isDiscountValid}
                  aria-describedby="order-discount-help"
                  className="h-11 pr-8 sm:h-9"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                >
                  %
                </span>
              </div>
              <p id="order-discount-help" className="sr-only">
                Porcentaje de descuento sobre productos más comisión.
              </p>
            </div>
          </div>
        </header>

        <section
          aria-labelledby="order-products-title"
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
            <div>
              <h2 id="order-products-title" className="text-sm font-semibold">
                Productos
              </h2>
              <p className="text-xs text-muted-foreground">
                {items.length === 0
                  ? "Agrega al menos una línea para crear la orden."
                  : `${items.length} ${items.length === 1 ? "línea" : "líneas"} en esta orden`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 gap-2 sm:h-9"
              onClick={openNewItem}
              disabled={saving}
            >
              <Plus aria-hidden="true" />
              Agregar producto
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
            {items.length === 0 ? (
              <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
                <Package
                  aria-hidden="true"
                  className="size-7 text-muted-foreground"
                />
                <div>
                  <p className="text-sm font-medium">Todavía no hay productos</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Una orden debe tener al menos un producto.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 sm:h-9"
                  onClick={openNewItem}
                  disabled={saving}
                >
                  Agregar el primer producto
                </Button>
              </div>
            ) : (
              <>
                <table className="hidden w-full text-sm lg:table">
                  <thead className="sticky top-0 z-10 bg-background text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 font-medium lg:px-6">Tienda</th>
                      <th className="px-4 py-2.5 font-medium">Producto</th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Cantidad
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Precio
                      </th>
                      <th className="px-3 py-2.5 text-right font-medium">
                        Subtotal
                      </th>
                      <th className="px-4 py-2.5 text-right font-medium lg:px-6">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.draftId}>
                        <td className="whitespace-nowrap px-4 py-2.5 font-medium lg:px-6">
                          {item.store}
                        </td>
                        <td className="max-w-80 px-4 py-2.5">
                          <a
                            href={item.product_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={item.product_url}
                            className="flex min-w-0 items-center gap-1.5 text-primary hover:underline"
                          >
                            <span className="truncate">
                              {productHostname(item.product_url)}
                            </span>
                            <ExternalLink
                              aria-hidden="true"
                              className="size-3.5 shrink-0"
                            />
                          </a>
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                          {formatCurrency(itemSubtotal(item))}
                        </td>
                        <td className="px-4 py-2.5 lg:px-6">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar producto de ${item.store}`}
                              title="Editar producto"
                              onClick={() => openEditItem(item)}
                              disabled={saving}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Eliminar producto de ${item.store}`}
                              title="Eliminar producto"
                              onClick={() => setItemToDelete(item)}
                              disabled={saving}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <ul className="divide-y divide-border lg:hidden">
                  {items.map((item) => (
                    <li key={item.draftId} className="space-y-2 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-medium">{item.store}</span>
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(itemSubtotal(item))}
                        </span>
                      </div>
                      <a
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <span className="truncate">
                          {productHostname(item.product_url)}
                        </span>
                        <ExternalLink
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                      </a>
                      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                        <span>
                          {item.quantity} ×{" "}
                          {formatCurrency(item.unit_price)}
                        </span>
                        <span>
                          {item.quantity === 1 ? "1 unidad" : `${item.quantity} unidades`}
                        </span>
                      </div>
                      <div className="flex gap-2 pt-0.5">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 flex-1 gap-2"
                          onClick={() => openEditItem(item)}
                          disabled={saving}
                        >
                          <Pencil aria-hidden="true" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 flex-1 gap-2 text-destructive"
                          onClick={() => setItemToDelete(item)}
                          disabled={saving}
                        >
                          <Trash2 aria-hidden="true" />
                          Eliminar
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <footer className="shrink-0 border-t border-border bg-card px-4 py-3 lg:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:flex-wrap sm:gap-x-8">
              <div>
                <dt className="text-xs text-muted-foreground">Productos</dt>
                <dd className="font-medium tabular-nums">
                  {totals.productsTotal}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Importe productos
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(totals.merchandiseTotal)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Comisión ({totals.productsTotal} ×{" "}
                  {formatCurrency(settings.commissionPerProduct)})
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(totals.totalCommission)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Descuento ({validDiscount || 0}%)
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(totals.discountAmount)}
                </dd>
              </div>
            </dl>

            <div className="flex items-end justify-between gap-4 sm:shrink-0">
              <div>
                <p className="text-xs text-muted-foreground">Total general</p>
                <p className="text-xl font-semibold tabular-nums">
                  {formatCurrency(totals.grandTotal)}
                </p>
              </div>
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
                    : !isDiscountValid
                      ? "El descuento debe estar entre 0 y 100."
                      : "Los totales se guardarán junto con la orden."}
              </p>
            )}
          </div>
        </footer>
      </form>

      {itemDialogOpen && (
        <OrderItemDialog
          key={editingItem?.draftId ?? "new-item"}
          open
          onOpenChange={setItemDialogOpen}
          stores={settings.stores}
          item={editingItem}
          onSave={saveItem}
        />
      )}

      <Dialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar producto</DialogTitle>
            <DialogDescription>
              {itemToDelete
                ? `Se quitará el producto de ${itemToDelete.store} de esta orden. Los totales se actualizarán.`
                : "Se quitará este producto de la orden."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-9"
              onClick={() => setItemToDelete(null)}
            >
              Conservar producto
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11 bg-destructive text-white hover:bg-[color-mix(in_oklch,var(--destructive),black_12%)] sm:h-9"
              onClick={removeItem}
            >
              Eliminar producto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
