import { useState } from "react"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { formatOrderDate } from "./calculations"

type OrderDatePickerProps = {
  id: string
  date: Date
  onChange: (date: Date) => void
  disabled?: boolean
}

export function OrderDatePicker({
  id,
  date,
  onChange,
  disabled = false,
}: OrderDatePickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-11 w-full justify-start gap-2 font-normal sm:h-9"
          />
        }
      >
        <CalendarIcon aria-hidden="true" className="text-muted-foreground" />
        <span>{formatOrderDate(date)}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          required
          selected={date}
          defaultMonth={date}
          locale={es}
          captionLayout="dropdown"
          className="[--cell-size:calc(var(--spacing)*11.25)] sm:[--cell-size:--spacing(7)]"
          onSelect={(selectedDate) => {
            if (!selectedDate) return
            onChange(selectedDate)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
