import { Link } from "@tanstack/react-router"
import {
  ArrowLeft,
  Mail,
  Pencil,
  Phone,
  RefreshCw,
  ShieldAlert,
} from "lucide-react"
import { Button } from "../../components/ui/button"
import { formatCurrency, roundMoney } from "./calculations"
import { OrderItemsView } from "./order-items-view"
import { OrderStatusBadge } from "./order-status-badge"
import {
  formatAmount,
  formatMoney,
  formatStoredDate,
  paymentMethodLabel,
  summarizePayments,
} from "./payments"
import type { OrderDetailData } from "./types"

type OrderDetailViewProps = {
  detail: OrderDetailData
  onEdit: () => void
  preparingEdit: boolean
  editError: string
  notice?: string
}

const formatExchangeRate = (value: number | null) => {
  if (value == null) return "Sin tasa"
  return new Intl.NumberFormat("es-VE", {
    maximumFractionDigits: 4,
  }).format(value)
}

export function OrderDetailView({
  detail,
  onEdit,
  preparingEdit,
  editError,
  notice = "",
}: OrderDetailViewProps) {
  const { order, customer, items, payments } = detail
  const paymentSummary = summarizePayments(payments, order.grand_total)
  const merchandiseTotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0),
  )
  const discountAmount = roundMoney(
    Math.max(
      0,
      merchandiseTotal +
        Number(order.total_commission || 0) -
        Number(order.grand_total || 0),
    ),
  )

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 lg:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              to="/ordenes"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:min-h-9"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver a órdenes
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                Orden #{order.order_id}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatStoredDate(order.order_date)}
              {customer ? ` · ${customer.name}` : ""}
            </p>
          </div>

          <Button
            type="button"
            className="h-11 gap-2 sm:h-9"
            onClick={onEdit}
            disabled={preparingEdit}
          >
            {preparingEdit ? (
              <RefreshCw
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
            ) : (
              <Pencil aria-hidden="true" />
            )}
            {preparingEdit ? "Preparando edición..." : "Editar orden"}
          </Button>
        </header>

        {notice && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive"
          >
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {notice}
          </p>
        )}

        {editError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive"
          >
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {editError}
          </p>
        )}

        <section
          aria-labelledby="order-data-title"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-3 lg:px-5">
            <h2 id="order-data-title" className="text-sm font-semibold">
              Datos de la orden
            </h2>
          </div>

          <dl className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-5">
            <div className="min-w-0">
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="mt-0.5 font-medium">
                {customer ? (
                  <Link
                    to="/clientes/$customerId"
                    params={{ customerId: String(customer.customer_id) }}
                    className="text-primary hover:underline"
                  >
                    {customer.name}
                  </Link>
                ) : (
                  "Sin cliente"
                )}
              </dd>
              {customer?.phone && (
                <dd className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone aria-hidden="true" className="size-3.5" />
                  {customer.phone}
                </dd>
              )}
              {customer?.email && (
                <dd className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail aria-hidden="true" className="size-3.5 shrink-0" />
                  <span className="truncate">{customer.email}</span>
                </dd>
              )}
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fecha</dt>
              <dd className="mt-0.5 font-medium">
                {formatStoredDate(order.order_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Estado</dt>
              <dd className="mt-0.5">
                <OrderStatusBadge status={order.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Descuento</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {Number(order.discount || 0)}%
              </dd>
            </div>
          </dl>

          <div className="border-t border-border">
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-5">
              <h2 className="text-sm font-semibold">Productos</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {order.products_total}{" "}
                {order.products_total === 1 ? "línea" : "líneas"}
              </p>
            </div>
            <div className="overflow-x-hidden border-t border-border">
              <OrderItemsView items={items} />
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section
            aria-labelledby="order-totals-title"
            className="rounded-xl border border-border bg-card p-4 lg:p-5"
          >
            <h2 id="order-totals-title" className="text-sm font-semibold">
              Totales de la orden
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Productos</dt>
                <dd className="font-medium tabular-nums">
                  {order.products_total}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Importe productos</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(merchandiseTotal)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Comisión</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(order.total_commission)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">
                  Descuento ({Number(order.discount || 0)}%)
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(discountAmount)}
                </dd>
              </div>
              <div className="flex items-end justify-between gap-4 border-t border-border pt-3">
                <dt className="text-sm font-medium">Total general</dt>
                <dd className="text-xl font-semibold tabular-nums">
                  {formatCurrency(order.grand_total)}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="order-payments-title"
            className="rounded-xl border border-border bg-card p-4 lg:p-5"
          >
            <h2 id="order-payments-title" className="text-sm font-semibold">
              Estado de cobro
            </h2>

            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Abonos por moneda</p>
                {paymentSummary.byCurrency.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sin abonos registrados.
                  </p>
                ) : (
                  <div className="mt-1 space-y-1">
                    {paymentSummary.byCurrency.map(({ currency, amount }) => (
                      <div
                        key={currency}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-muted-foreground">{currency}</span>
                        <span className="font-medium tabular-nums">
                          {formatAmount(amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-border pt-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    Abonado en moneda base
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(paymentSummary.paidBase)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">Saldo pendiente</span>
                  <span className="text-xl font-semibold tabular-nums">
                    {formatCurrency(paymentSummary.balanceDue)}
                  </span>
                </div>
                {paymentSummary.credit > 0 && (
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">A favor</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(paymentSummary.credit)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section
          aria-labelledby="order-payment-history-title"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 lg:px-5">
            <h2
              id="order-payment-history-title"
              className="text-sm font-semibold"
            >
              Pagos registrados
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {payments.length} {payments.length === 1 ? "pago" : "pagos"}
            </p>
          </div>

          {payments.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Todavía no hay pagos asociados a esta orden.
            </p>
          ) : (
            <>
              <table className="hidden w-full text-sm lg:table">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2.5 font-medium lg:px-5">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Método</th>
                    <th className="px-4 py-2.5 font-medium">Referencia</th>
                    <th className="px-4 py-2.5 text-right font-medium">
                      Monto original
                    </th>
                    <th className="px-4 py-2.5 text-right font-medium">Tasa</th>
                    <th className="px-4 py-2.5 text-right font-medium lg:px-5">
                      Base USD
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((payment) => (
                    <tr key={payment.payment_payment_id}>
                      <td className="px-4 py-3 lg:px-5">
                        {formatStoredDate(payment.payment_date)}
                      </td>
                      <td className="px-4 py-3">
                        {paymentMethodLabel(payment.payment_method)}
                      </td>
                      <td
                        className="max-w-56 truncate px-4 py-3 text-muted-foreground"
                        title={payment.reference_number ?? undefined}
                      >
                        {payment.reference_number || "Sin referencia"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {formatMoney(
                          payment.original_amount,
                          payment.currency,
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatExchangeRate(payment.exchange_rate)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums lg:px-5">
                        {formatCurrency(payment.base_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <ul className="divide-y divide-border lg:hidden">
                {payments.map((payment) => (
                  <li key={payment.payment_payment_id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {paymentMethodLabel(payment.payment_method)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatStoredDate(payment.payment_date)}
                        </p>
                      </div>
                      <p className="font-semibold tabular-nums">
                        {formatMoney(
                          payment.original_amount,
                          payment.currency,
                        )}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>{payment.reference_number || "Sin referencia"}</span>
                      <span className="tabular-nums">
                        Base: {formatCurrency(payment.base_amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
