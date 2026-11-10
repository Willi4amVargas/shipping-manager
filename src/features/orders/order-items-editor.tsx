import { useState } from "react"
import {
  ExternalLink,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { Button } from "../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { formatCurrency, itemSubtotal } from "./calculations"
import { productHostname } from "./data"
import { OrderItemDialog } from "./order-item-dialog"
import type { OrderItemDraft } from "./types"

type OrderItemsEditorProps = {
  items: OrderItemDraft[]
  onChange: (items: OrderItemDraft[]) => void
  stores: string[]
  disabled?: boolean
  emptyDescription?: string
}

export function OrderItemsEditor({
  items,
  onChange,
  stores,
  disabled = false,
  emptyDescription = "Una orden debe tener al menos un producto.",
}: OrderItemsEditorProps) {
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OrderItemDraft | null>(null)
  const [itemToDelete, setItemToDelete] = useState<OrderItemDraft | null>(null)

  const openNewItem = () => {
    setEditingItem(null)
    setItemDialogOpen(true)
  }

  const openEditItem = (item: OrderItemDraft) => {
    setEditingItem(item)
    setItemDialogOpen(true)
  }

  const saveItem = (item: OrderItemDraft) => {
    const exists = items.some(
      (currentItem) => currentItem.draftId === item.draftId,
    )
    onChange(
      exists
        ? items.map((currentItem) =>
            currentItem.draftId === item.draftId ? item : currentItem,
          )
        : [...items, item],
    )
  }

  const removeItem = () => {
    if (!itemToDelete) return
    onChange(items.filter((item) => item.draftId !== itemToDelete.draftId))
    setItemToDelete(null)
  }

  return (
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
          disabled={disabled}
        >
          <Plus aria-hidden="true" />
          Agregar producto
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-border">
        {items.length === 0 ? (
          <div className="flex h-full min-h-36 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
            <Package aria-hidden="true" className="size-7 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Todavía no hay productos</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {emptyDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-9"
              onClick={openNewItem}
              disabled={disabled}
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
                  <th className="px-3 py-2.5 text-right font-medium">Precio</th>
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
                          disabled={disabled}
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
                          disabled={disabled}
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
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </span>
                    <span>
                      {item.quantity === 1
                        ? "1 unidad"
                        : `${item.quantity} unidades`}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-0.5">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 gap-2"
                      onClick={() => openEditItem(item)}
                      disabled={disabled}
                    >
                      <Pencil aria-hidden="true" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 flex-1 gap-2 text-destructive"
                      onClick={() => setItemToDelete(item)}
                      disabled={disabled}
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

      {itemDialogOpen && (
        <OrderItemDialog
          key={editingItem?.draftId ?? "new-item"}
          open
          onOpenChange={setItemDialogOpen}
          stores={stores}
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
    </section>
  )
}
