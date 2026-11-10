import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { RefreshCw, UserRound } from "lucide-react"
import { neon } from "../../lib/neon"
import { Button } from "../../components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "../../components/ui/combobox"
import type { CustomerOption } from "./types"

type CustomerComboboxProps = {
  selected: CustomerOption | null
  onSelect: (customer: CustomerOption | null) => void
  disabled?: boolean
}

const rowsFrom = (response: unknown): CustomerOption[] => {
  if (Array.isArray(response)) return response as CustomerOption[]
  if (!response || typeof response !== "object") return []
  const value = response as { results?: unknown; data?: unknown }
  if (Array.isArray(value.results)) return value.results as CustomerOption[]
  if (Array.isArray(value.data)) return value.data as CustomerOption[]
  return []
}

const hasError = (response: unknown): boolean =>
  Boolean(
    response &&
      typeof response === "object" &&
      "error" in response &&
      (response as { error?: unknown }).error,
  )

function useCustomerSearch(query: string) {
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const requestId = useRef(0)

  useEffect(() => {
    const trimmedQuery = query.trim()
    const currentRequest = ++requestId.current
    const delay = trimmedQuery ? 300 : 0

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(false)

      try {
        let request = neon
          .from("customers")
          .select("customer_id, name, email, phone")

        if (trimmedQuery) {
          request = request.ilike("name", `%${trimmedQuery}%`)
        }

        const response = await request.order("name").limit(8)
        if (hasError(response)) throw response.error
        if (requestId.current !== currentRequest) return
        setCustomers(rowsFrom(response))
      } catch {
        if (requestId.current !== currentRequest) return
        setCustomers([])
        setError(true)
      } finally {
        if (requestId.current === currentRequest) setLoading(false)
      }
    }, delay)

    return () => {
      window.clearTimeout(timer)
      requestId.current += 1
    }
  }, [query, retryKey])

  return {
    customers,
    loading,
    error,
    retry: () => setRetryKey((value) => value + 1),
  }
}

export function CustomerCombobox({
  selected,
  onSelect,
  disabled = false,
}: CustomerComboboxProps) {
  const [query, setQuery] = useState("")
  const { customers, loading, error, retry } = useCustomerSearch(query)

  return (
    <Combobox<CustomerOption>
      items={customers}
      value={selected}
      onValueChange={(customer) => onSelect(customer ?? null)}
      onInputValueChange={(value, details) => {
        setQuery(value)
        if (
          selected &&
          (details.reason === "input-change" ||
            details.reason === "input-clear") &&
          value !== selected.name
        ) {
          onSelect(null)
        }
      }}
      itemToStringLabel={(customer) => customer.name}
      itemToStringValue={(customer) => String(customer.customer_id)}
      isItemEqualToValue={(item, value) =>
        item.customer_id === value?.customer_id
      }
      filter={null}
      autoComplete="off"
      disabled={disabled}
    >
      <ComboboxInput
        id="order-customer"
        placeholder="Buscar por nombre"
        showClear={Boolean(selected)}
        disabled={disabled}
        className="h-11 sm:h-9"
        aria-describedby="order-customer-help"
      />
      <ComboboxContent>
        {loading ? (
          <div
            role="status"
            className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground"
          >
            <RefreshCw aria-hidden="true" className="size-4 animate-spin" />
            Buscando clientes...
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 px-3 py-3 text-sm">
            <p className="text-destructive">
              No se pudieron buscar los clientes.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <ComboboxList>
              {customers.map((customer) => (
                <ComboboxItem
                  key={customer.customer_id}
                  value={customer}
                  className="cursor-pointer py-2"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound
                      aria-hidden="true"
                      className="size-4 text-muted-foreground"
                    />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{customer.name}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {customer.phone || customer.email || "Sin contacto"}
                    </span>
                  </span>
                </ComboboxItem>
              ))}
            </ComboboxList>
            <ComboboxEmpty>
              <span className="block px-3 py-2">
                No encontramos clientes con ese nombre.
              </span>
              <Link
                to="/clientes"
                className="mx-3 mb-2 inline-flex min-h-9 items-center font-medium text-primary underline-offset-4 hover:underline"
              >
                Registrar un cliente
              </Link>
            </ComboboxEmpty>
          </>
        )}
      </ComboboxContent>
    </Combobox>
  )
}
