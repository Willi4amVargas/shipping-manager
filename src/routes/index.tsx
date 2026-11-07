import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          ¡Bienvenido!
        </h1>
        <p className="text-muted-foreground">
          Has iniciado sesión correctamente.
        </p>
      </div>
    </div>
  )
}
