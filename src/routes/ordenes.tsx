import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/ordenes")({
  component: Ordenes,
})

function Ordenes() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Órdenes & Pedidos</h1>
      <p className="text-muted-foreground">Módulo en construcción.</p>
    </div>
  )
}
