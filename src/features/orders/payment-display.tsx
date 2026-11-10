import { formatCurrency } from "./calculations"
import { formatAmount, type PaymentSummary } from "./payments"

export function PaymentAmounts({ summary }: { summary: PaymentSummary }) {
  if (summary.byCurrency.length === 0) {
    return <span className="text-sm text-muted-foreground">Sin abonos</span>
  }

  return (
    <div className="space-y-0.5 text-sm tabular-nums">
      {summary.byCurrency.map(({ currency, amount }) => (
        <div key={currency}>
          <span className="text-xs text-muted-foreground">{currency}: </span>
          <span className="font-medium">{formatAmount(amount)}</span>
        </div>
      ))}
    </div>
  )
}

export function PaymentBalance({ summary }: { summary: PaymentSummary }) {
  return (
    <div className="space-y-0.5">
      <p className="font-medium tabular-nums">
        {formatCurrency(summary.balanceDue)}
      </p>
      {summary.credit > 0 && (
        <p className="text-xs text-muted-foreground tabular-nums">
          A favor: {formatCurrency(summary.credit)}
        </p>
      )}
    </div>
  )
}
