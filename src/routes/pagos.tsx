import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/pagos")({
  component: Pagos,
})

function Pagos() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Pagos & Caja</h1>
      <p className="text-muted-foreground">Módulo en construcción.</p>
    </div>
  )
}
