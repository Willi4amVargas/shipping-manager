import { Badge } from "../../components/ui/badge"
import { STATUS_LABELS } from "./data"
import type { OrderStatus } from "./types"

type BadgeVariant = "outline" | "secondary"

const STATUS_STYLES: Record<
  OrderStatus,
  { variant: BadgeVariant; className: string }
> = {
  pending: {
    variant: "outline",
    className: "border-destructive/40 text-destructive",
  },
  partially_paid: { variant: "outline", className: "" },
  paid: { variant: "secondary", className: "" },
  cancelled: {
    variant: "outline",
    className: "text-muted-foreground",
  },
}

export function OrderStatusBadge({ status }: { status: OrderStatus | null }) {
  if (!status) {
    return <Badge variant="outline">Sin estado</Badge>
  }

  const style = STATUS_STYLES[status]
  return (
    <Badge variant={style.variant} className={style.className}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
