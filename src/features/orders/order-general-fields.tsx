import { Input } from "../../components/ui/input"
import { Label } from "../../components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select"
import { CustomerCombobox } from "./customer-combobox"
import { OrderDatePicker } from "./date-picker"
import { getDiscountState } from "./calculations"
import { ORDER_STATUS_OPTIONS } from "./data"
import type { CustomerOption, OrderStatus } from "./types"

type OrderGeneralFieldsProps = {
  customer: CustomerOption | null
  onCustomerChange: (customer: CustomerOption | null) => void
  customerPickerKey: number
  orderDate: Date
  onOrderDateChange: (date: Date) => void
  status: OrderStatus
  onStatusChange: (status: OrderStatus) => void
  discountInput: string
  onDiscountChange: (value: string) => void
  disabled?: boolean
}

export function OrderGeneralFields({
  customer,
  onCustomerChange,
  customerPickerKey,
  orderDate,
  onOrderDateChange,
  status,
  onStatusChange,
  discountInput,
  onDiscountChange,
  disabled = false,
}: OrderGeneralFieldsProps) {
  const discount = getDiscountState(discountInput)

  return (
    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-[minmax(15rem,2fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(7rem,0.7fr)]">
      <div className="col-span-2 min-w-0 space-y-1.5 lg:col-span-1">
        <Label htmlFor="order-customer">Cliente</Label>
        <CustomerCombobox
          key={customerPickerKey}
          selected={customer}
          onSelect={onCustomerChange}
          disabled={disabled}
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
          onChange={onOrderDateChange}
          disabled={disabled}
        />
      </div>

      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="order-status">Estado</Label>
        <Select
          items={ORDER_STATUS_OPTIONS}
          value={status}
          onValueChange={(value) => {
            const nextStatus = ORDER_STATUS_OPTIONS.find(
              (option) => option.value === value,
            )?.value
            if (nextStatus) onStatusChange(nextStatus)
          }}
          disabled={disabled}
        >
          <SelectTrigger id="order-status" className="h-11 w-full sm:h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUS_OPTIONS.map((option) => (
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

      <div className="col-span-2 min-w-0 space-y-1.5 sm:col-span-1">
        <Label htmlFor="order-discount">Descuento</Label>
        <div className="relative">
          <Input
            id="order-discount"
            inputMode="decimal"
            value={discountInput}
            onChange={(event) => onDiscountChange(event.target.value)}
            disabled={disabled}
            aria-invalid={discount.hasValue && !discount.valid}
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
  )
}
