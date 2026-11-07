import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/tiendas")({
  component: Tiendas,
})

function Tiendas() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Tiendas</h1>
      <p className="text-muted-foreground">Módulo en construcción.</p>
    </div>
  )
}
