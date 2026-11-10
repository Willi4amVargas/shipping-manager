import { useState, type FormEvent } from "react"
import { Button } from "../../components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import {
  formatCurrency,
  itemSubtotal,
  parseDecimal,
  roundMoney,
} from "./calculations"
import type { OrderItemDraft } from "./types"

type OrderItemDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  stores: string[]
  item: OrderItemDraft | null
  onSave: (item: OrderItemDraft) => void
}

type ItemForm = {
  store: string
  productUrl: string
  attachmentPath: string
  quantity: string
  unitPrice: string
}

const normalizeUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

export function OrderItemDialog({
  open,
  onOpenChange,
  stores,
  item,
  onSave,
}: OrderItemDialogProps) {
  const [form, setForm] = useState<ItemForm>(() => ({
    store: item?.store ?? stores[0] ?? "",
    productUrl: item?.product_url ?? "",
    attachmentPath: item?.attachment_path ?? "",
    quantity: String(item?.quantity ?? 1),
    unitPrice: item ? String(item.unit_price) : "",
  }))
  const [formError, setFormError] = useState("")

  const updateForm = (patch: Partial<ItemForm>) => {
    setForm((current) => ({ ...current, ...patch }))
    setFormError("")
  }

  const quantity = Number(form.quantity)
  const unitPrice = parseDecimal(form.unitPrice)
  const previewSubtotal =
    Number.isInteger(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice > 0
      ? itemSubtotal({ quantity, unit_price: unitPrice })
      : 0

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setFormError("")

    if (!form.store || !stores.includes(form.store)) {
      setFormError("Selecciona una tienda válida.")
      return
    }
    if (!normalizeUrl(form.productUrl.trim())) {
      setFormError("Escribe una URL de producto válida que empiece por http:// o https://.")
      return
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFormError("La cantidad debe ser un número entero mayor que cero.")
      return
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setFormError("El precio unitario debe ser mayor que cero.")
      return
    }

    onSave({
      draftId: item?.draftId ?? crypto.randomUUID(),
      item_id: item?.item_id,
      store: form.store,
      product_url: form.productUrl.trim(),
      attachment_path: form.attachmentPath.trim(),
      quantity,
      unit_price: roundMoney(unitPrice),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item ? "Editar producto" : "Agregar producto"}
          </DialogTitle>
          <DialogDescription>
            La URL identifica el producto en la tienda. La imagen de referencia
            es opcional.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-store">Tienda</Label>
            <Select
              value={form.store}
              onValueChange={(value) => updateForm({ store: value ?? "" })}
            >
              <SelectTrigger id="item-store" className="h-11 w-full sm:h-9">
                <SelectValue placeholder="Selecciona una tienda" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => (
                  <SelectItem
                    key={store}
                    value={store}
                    className="min-h-11 sm:min-h-0"
                  >
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-url">URL del producto</Label>
            <Input
              id="item-url"
              type="url"
              inputMode="url"
              required
              value={form.productUrl}
              onChange={(event) => updateForm({ productUrl: event.target.value })}
              placeholder="https://"
              className="h-11 sm:h-9"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-attachment">
              Imagen de referencia
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="item-attachment"
              value={form.attachmentPath}
              onChange={(event) =>
                updateForm({ attachmentPath: event.target.value })
              }
              placeholder="https:// o ruta del archivo"
              className="h-11 sm:h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-quantity">Cantidad</Label>
              <Input
                id="item-quantity"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                required
                value={form.quantity}
                onChange={(event) => updateForm({ quantity: event.target.value })}
                className="h-11 sm:h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Precio unitario</Label>
              <Input
                id="item-price"
                inputMode="decimal"
                required
                value={form.unitPrice}
                onChange={(event) => updateForm({ unitPrice: event.target.value })}
                placeholder="0,00"
                className="h-11 sm:h-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="font-medium" aria-live="polite">
              {formatCurrency(previewSubtotal)}
            </span>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </p>
          )}

          <DialogFooter className="-mx-4 -mb-4 mt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-9"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="h-11 sm:h-9">
              {item ? "Guardar cambios" : "Agregar producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
