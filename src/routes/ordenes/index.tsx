import { useEffect, useMemo, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { Package, Plus, RefreshCw, ShieldAlert } from "lucide-react"
import { cn } from "cn"
import { Button, buttonVariants } from "../../components/ui/button"
import { Label } from "../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { formatCurrency } from "../../features/orders/calculations"
import {
  ACTIVE_STATUSES,
  STATUS_FILTER_OPTIONS,
  loadOrderList,
  type StatusFilter,
} from "../../features/orders/data"
import {
  PaymentAmounts,
  PaymentBalance,
} from "../../features/orders/payment-display"
import { OrderStatusBadge } from "../../features/orders/order-status-badge"
import { formatStoredDate, summarizePayments } from "../../features/orders/payments"
import type { OrderListItem } from "../../features/orders/types"

export const Route = createFileRoute("/ordenes/")({
  component: Ordenes,
})

const matchesFilter = (order: OrderListItem, filter: StatusFilter) => {
  if (filter === "all") return true
  if (filter === "active") {
    return order.status != null && ACTIVE_STATUSES.includes(order.status)
  }
  return order.status === filter
}

function Ordenes() {
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [requestKey, setRequestKey] = useState(0)
  const [filter, setFilter] = useState<StatusFilter>("all")

  useEffect(() => {
    let cancelled = false

    void loadOrderList()
      .then((result) => {
        if (cancelled) return
        setOrders(result)
        setError(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requestKey])

  const retry = () => {
    setLoading(true)
    setError(false)
    setRequestKey((value) => value + 1)
  }

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [orders, filter],
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border px-4 py-3 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Órdenes</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Consulta el estado de cobro y el detalle de cada pedido.
            </p>
          </div>
          <Link
            to="/nueva-orden"
            className={cn(
              buttonVariants({ className: "h-11 gap-2 sm:h-9" }),
            )}
          >
            <Plus aria-hidden="true" />
            Nueva orden
          </Link>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full space-y-1.5 sm:w-56">
            <Label
              htmlFor="orders-status-filter"
              className="text-xs text-muted-foreground"
            >
              Estado
            </Label>
            <Select
              items={STATUS_FILTER_OPTIONS}
              value={filter}
              onValueChange={(value) => {
                const next = STATUS_FILTER_OPTIONS.find(
                  (option) => option.value === value,
                )?.value
                if (next) setFilter(next)
              }}
              disabled={loading}
            >
              <SelectTrigger
                id="orders-status-filter"
                className="h-11 w-full sm:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="min-h-11 sm:min-h-0"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!loading && !error && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filteredOrders.length}{" "}
              {filteredOrders.length === 1 ? "orden" : "órdenes"}
            </p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
            <RefreshCw
              aria-hidden="true"
              className="size-6 animate-spin text-primary motion-reduce:animate-none"
            />
            <p className="text-sm text-muted-foreground">Cargando órdenes...</p>
          </div>
        ) : error ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
            <ShieldAlert aria-hidden="true" className="size-7 text-destructive" />
            <div>
              <p className="font-medium">No se pudieron cargar las órdenes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Revisa la conexión e inténtalo de nuevo.
              </p>
            </div>
            <Button variant="outline" className="h-11 sm:h-9" onClick={retry}>
              Reintentar
            </Button>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
            <Package aria-hidden="true" className="size-7 text-muted-foreground" />
            <div>
              <p className="font-medium">Todavía no hay órdenes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Crea la primera orden para ver aquí su estado de cobro.
              </p>
            </div>
            <Link
              to="/nueva-orden"
              className={cn(
                buttonVariants({
                  variant: "outline",
                  className: "h-11 sm:h-9",
                }),
              )}
            >
              Crear la primera orden
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex h-full min-h-52 flex-col items-center justify-center gap-3 p-6 text-center">
            <Package aria-hidden="true" className="size-7 text-muted-foreground" />
            <div>
              <p className="font-medium">No hay órdenes con ese estado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cambia el filtro para ver otras órdenes.
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 sm:h-9"
              onClick={() => setFilter("all")}
            >
              Ver todas las órdenes
            </Button>
          </div>
        ) : (
          <>
            <table className="hidden w-full text-sm xl:table">
              <thead className="sticky top-0 z-10 bg-muted/50 text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 font-medium lg:px-6">Orden</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Abonado</th>
                  <th className="px-4 py-3 text-right font-medium">Saldo</th>
                  <th className="px-4 py-3 text-right font-medium lg:px-6">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map((order) => {
                  const summary = summarizePayments(
                    order.payments,
                    order.grand_total,
                  )

                  return (
                    <tr key={order.order_id}>
                      <td className="px-4 py-3 lg:px-6">
                        <div className="font-medium">#{order.order_id}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatStoredDate(order.order_date)}
                        </div>
                      </td>
                      <td
                        className="max-w-48 truncate px-4 py-3"
                        title={order.customer?.name ?? "Sin cliente"}
                      >
                        {order.customer?.name ?? "Sin cliente"}
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatCurrency(order.grand_total)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentAmounts summary={summary} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PaymentBalance summary={summary} />
                      </td>
                      <td className="px-4 py-3 text-right lg:px-6">
                        <Link
                          to="/ordenes/$orderId"
                          params={{ orderId: String(order.order_id) }}
                          aria-label={`Ver detalle de la orden #${order.order_id}`}
                          className={cn(
                            buttonVariants({
                              variant: "outline",
                              size: "sm",
                            }),
                          )}
                        >
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <ul className="divide-y divide-border xl:hidden">
              {filteredOrders.map((order) => {
                const summary = summarizePayments(
                  order.payments,
                  order.grand_total,
                )

                return (
                  <li key={order.order_id} className="space-y-3 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">#{order.order_id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatStoredDate(order.order_date)}
                        </p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Cliente</p>
                        <p className="font-medium">
                          {order.customer?.name ?? "Sin cliente"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-medium tabular-nums">
                          {formatCurrency(order.grand_total)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Abonado</p>
                        <PaymentAmounts summary={summary} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Saldo</p>
                        <PaymentBalance summary={summary} />
                      </div>
                    </div>

                    <Link
                      to="/ordenes/$orderId"
                      params={{ orderId: String(order.order_id) }}
                      className={cn(
                        buttonVariants({
                          variant: "outline",
                          className: "h-11 w-full",
                        }),
                      )}
                    >
                      Ver detalle de la orden #{order.order_id}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
