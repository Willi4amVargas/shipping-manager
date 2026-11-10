import { useEffect, useState } from "react"
import { Link, createFileRoute } from "@tanstack/react-router"
import { ArrowLeft, PackageSearch, RefreshCw, ShieldAlert } from "lucide-react"
import { cn } from "cn"
import { Button, buttonVariants } from "../../components/ui/button"
import {
  loadOrderDetail,
  loadOrderSettings,
} from "../../features/orders/data"
import { OrderDetailView } from "../../features/orders/order-detail-view"
import { OrderEditForm } from "../../features/orders/order-edit-form"
import type {
  OrderDetailData,
  OrderSettings,
} from "../../features/orders/types"

export const Route = createFileRoute("/ordenes/$orderId")({
  component: OrderDetailRoute,
})

function OrderDetailRoute() {
  const { orderId } = Route.useParams()
  return <OrderDetailLoader key={orderId} rawOrderId={orderId} />
}

function OrderDetailLoader({ rawOrderId }: { rawOrderId: string }) {
  const orderId = Number(rawOrderId)
  const validId = Number.isInteger(orderId) && orderId > 0

  const [detail, setDetail] = useState<OrderDetailData | null>(null)
  const [loading, setLoading] = useState(validId)
  const [errorMessage, setErrorMessage] = useState("")
  const [notFound, setNotFound] = useState(!validId)
  const [requestKey, setRequestKey] = useState(0)

  const [editing, setEditing] = useState(false)
  const [settings, setSettings] = useState<OrderSettings | null>(null)
  const [preparingEdit, setPreparingEdit] = useState(false)
  const [editError, setEditError] = useState("")
  const [detailNotice, setDetailNotice] = useState("")

  useEffect(() => {
    if (!validId) return
    let cancelled = false

    void loadOrderDetail(orderId).then((result) => {
      if (cancelled) return
      if (result.ok) {
        setDetail(result.detail)
        setNotFound(false)
        setErrorMessage("")
      } else if (result.message === "La orden no existe.") {
        setDetail(null)
        setNotFound(true)
        setErrorMessage("")
      } else {
        setDetail(null)
        setErrorMessage(result.message)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [orderId, validId, requestKey])

  const retry = () => {
    setLoading(true)
    setErrorMessage("")
    setRequestKey((value) => value + 1)
  }

  const startEditing = async () => {
    setEditError("")
    setDetailNotice("")
    if (settings) {
      setEditing(true)
      return
    }

    setPreparingEdit(true)
    const result = await loadOrderSettings()
    setPreparingEdit(false)

    if (result.ok) {
      setSettings(result.settings)
      setEditing(true)
      return
    }

    setEditError(result.message)
  }

  const reloadDetail = (notice = "") => {
    setEditing(false)
    setDetailNotice(notice)
    setLoading(true)
    setRequestKey((value) => value + 1)
  }

  const handleSaved = () => {
    reloadDetail()
  }

  const handleSaveFailed = (message: string) => {
    reloadDetail(message)
  }

  if (notFound) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <PackageSearch
          aria-hidden="true"
          className="size-8 text-muted-foreground"
        />
        <div>
          <h1 className="text-lg font-semibold">Orden no encontrada</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            El identificador no corresponde a una orden disponible.
          </p>
        </div>
        <Link
          to="/ordenes"
          className={cn(
            buttonVariants({
              variant: "outline",
              className: "h-11 gap-2 sm:h-9",
            }),
          )}
        >
          <ArrowLeft aria-hidden="true" />
          Volver a órdenes
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <RefreshCw
          aria-hidden="true"
          className="size-6 animate-spin text-primary motion-reduce:animate-none"
        />
        <p className="text-sm text-muted-foreground">Cargando la orden...</p>
      </div>
    )
  }

  if (errorMessage || !detail) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert aria-hidden="true" className="size-7 text-destructive" />
        <div>
          <h1 className="text-lg font-semibold">No se pudo abrir la orden</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {errorMessage || "La orden no está disponible."}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link
            to="/ordenes"
            className={cn(
              buttonVariants({
                variant: "outline",
                className: "h-11 gap-2 sm:h-9",
              }),
            )}
          >
            <ArrowLeft aria-hidden="true" />
            Volver a órdenes
          </Link>
          <Button variant="outline" className="h-11 sm:h-9" onClick={retry}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (editing && settings) {
    return (
      <OrderEditForm
        key={detail.order.order_id}
        detail={detail}
        settings={settings}
        onCancel={() => setEditing(false)}
        onSaved={handleSaved}
        onSaveFailed={handleSaveFailed}
      />
    )
  }

  return (
    <OrderDetailView
      detail={detail}
      onEdit={() => void startEditing()}
      preparingEdit={preparingEdit}
      editError={editError}
      notice={detailNotice}
    />
  )
}
