import type { ReactNode } from "react"
import { ExternalLink, ImageIcon, Package } from "lucide-react"
import { formatCurrency } from "./calculations"
import { productHostname } from "./data"
import type { DbOrderItem } from "./types"

const ItemLink = ({
  url,
  label,
  icon,
}: {
  url: string
  label: string
  icon: ReactNode
}) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex min-w-0 items-center gap-1.5 text-sm text-primary hover:underline"
  >
    <span className="truncate">{label}</span>
    {icon}
  </a>
)

export function OrderItemsView({ items }: { items: DbOrderItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <Package aria-hidden="true" className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Esta orden no tiene productos registrados.
        </p>
      </div>
    )
  }

  return (
    <>
      <table className="hidden w-full text-sm lg:table">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-4 py-2.5 font-medium lg:px-6">Tienda</th>
            <th className="px-4 py-2.5 font-medium">Producto</th>
            <th className="px-3 py-2.5 text-right font-medium">Cantidad</th>
            <th className="px-3 py-2.5 text-right font-medium">Precio</th>
            <th className="px-4 py-2.5 text-right font-medium lg:px-6">
              Subtotal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr key={item.item_id}>
              <td className="whitespace-nowrap px-4 py-3 font-medium lg:px-6">
                {item.store || "Sin tienda"}
              </td>
              <td className="max-w-96 px-4 py-3">
                {item.product_url ? (
                  <ItemLink
                    url={item.product_url}
                    label={productHostname(item.product_url)}
                    icon={
                      <ExternalLink
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                    }
                  />
                ) : (
                  <span className="text-muted-foreground">Sin URL</span>
                )}
                {item.attachment_path && (
                  <ItemLink
                    url={item.attachment_path}
                    label="Imagen de referencia"
                    icon={
                      <ImageIcon
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                    }
                  />
                )}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {item.quantity}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatCurrency(item.unit_price)}
              </td>
              <td className="px-4 py-3 text-right font-medium tabular-nums lg:px-6">
                {formatCurrency(item.subtotal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border lg:hidden">
        {items.map((item) => (
          <li key={item.item_id} className="space-y-2 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium">{item.store || "Sin tienda"}</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(item.subtotal)}
              </span>
            </div>
            {item.product_url ? (
              <ItemLink
                url={item.product_url}
                label={productHostname(item.product_url)}
                icon={
                  <ExternalLink
                    aria-hidden="true"
                    className="size-3.5 shrink-0"
                  />
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Sin URL</p>
            )}
            {item.attachment_path && (
              <ItemLink
                url={item.attachment_path}
                label="Imagen de referencia"
                icon={
                  <ImageIcon aria-hidden="true" className="size-3.5 shrink-0" />
                }
              />
            )}
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {item.quantity} × {formatCurrency(item.unit_price)}
              </span>
              <span>
                {item.quantity === 1
                  ? "1 unidad"
                  : `${item.quantity} unidades`}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
