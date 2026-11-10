import { formatCurrency } from "./calculations"
import type { OrderTotals } from "./types"

type OrderTotalsBreakdownProps = {
  totals: OrderTotals
  discountPercent: number
  commissionPerProduct: number
}

export function OrderTotalsBreakdown({
  totals,
  discountPercent,
  commissionPerProduct,
}: OrderTotalsBreakdownProps) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:flex sm:flex-wrap sm:gap-x-8">
      <div>
        <dt className="text-xs text-muted-foreground">Productos</dt>
        <dd className="font-medium tabular-nums">{totals.productsTotal}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Importe productos</dt>
        <dd className="font-medium tabular-nums">
          {formatCurrency(totals.merchandiseTotal)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">
          Comisión ({totals.productsTotal} ×{" "}
          {formatCurrency(commissionPerProduct)})
        </dt>
        <dd className="font-medium tabular-nums">
          {formatCurrency(totals.totalCommission)}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">
          Descuento ({discountPercent || 0}%)
        </dt>
        <dd className="font-medium tabular-nums">
          {formatCurrency(totals.discountAmount)}
        </dd>
      </div>
    </dl>
  )
}

export function OrderGrandTotal({ value }: { value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">Total general</p>
      <p className="text-xl font-semibold tabular-nums">
        {formatCurrency(value)}
      </p>
    </div>
  )
}
