import * as React from "react"
import { useLocation } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { neon } from "../lib/neon"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet"
import { UserAvatar } from "@neondatabase/neon-js/auth/react/ui"
import {
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react"
import { cn } from "cn"

type NavItem = {
  to: string
  label: string
  icon: React.ElementType
  trailing?: React.ReactNode
  activeOptions?: { exact?: boolean; includeSearch?: boolean; includeHash?: boolean }
}

const navItems: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, activeOptions: { exact: true } },
  {
    to: "/ordenes",
    label: "Órdenes & Pedidos",
    icon: Truck,
    trailing: undefined as React.ReactNode | undefined,
  },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/pagos", label: "Pagos & Caja", icon: Wallet },
  { to: "/configuracion", label: "Configuración", icon: Settings },
]

const NavItem = ({
  item,
  location,
  onNavigate,
}: {
  item: NavItem
  location: ReturnType<typeof useLocation>
  onNavigate?: () => void
}) => {
  const isActive =
    item.to === "/"
      ? location.pathname === item.to
      : location.pathname.startsWith(item.to)

  return (
    <Link
      to={item.to}
      activeOptions={item.activeOptions}
      onClick={onNavigate}
      className={cn(
        "w-full flex min-h-11 items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <div className={cn("flex items-center gap-3", isActive ? "text-primary" : "")}>
        <item.icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
        <span className="whitespace-nowrap">{item.label}</span>
      </div>
      <div className="shrink-0">{item.trailing}</div>
    </Link>
  )
}

type AppSidebarProps = {
  mobile?: boolean
  onNavigate?: () => void
}

export const AppSidebar = ({ mobile = false, onNavigate }: AppSidebarProps) => {
  const location = useLocation()
  const { data: session } = neon.auth.useSession()
  const [ordersCount, setOrdersCount] = React.useState<number | null>(null)
  const [ordersLoading, setOrdersLoading] = React.useState(false)
  const [ordersError, setOrdersError] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    const loadOrdersCount = async () => {
      setOrdersLoading(true)
      setOrdersError(false)
      try {
        const { count } = await neon
          .from("orders")
          .select("order_id", { count: "exact", head: true })
        if (!cancelled) setOrdersCount(count ?? 0)
      } catch {
        if (!cancelled) setOrdersError(true)
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    }

    const handleOrdersChanged = () => {
      void loadOrdersCount()
    }

    loadOrdersCount()
    window.addEventListener("orders:changed", handleOrdersChanged)
    return () => {
      cancelled = true
      window.removeEventListener("orders:changed", handleOrdersChanged)
    }
  }, [])

  const handleSignOut = () => {
    void neon.auth.signOut()
  }

  const user = session?.user
  const displayName = user?.name || user?.email || "Usuario"
  const displayEmail = user?.email

  return (
    <aside
      className={cn(
        "w-full shrink-0 flex-col justify-between border-border bg-background p-4",
        mobile ? "flex h-full" : "hidden h-dvh w-64 border-r md:flex",
      )}
    >
      <div>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-sidebar-accent p-2.5">
            <Store className="h-5 w-5 text-sidebar-accent-foreground" aria-hidden="true" />
          </div>
          <div>
            <div className="text-base font-bold text-foreground">CrossBorder Hub</div>
            <div className="text-xs text-muted-foreground">Operaciones & Finanzas</div>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="flex flex-col space-y-1">
          {navItems.map((item) => {
            const isOrdenes = item.to === "/ordenes"
            const trailing =
              isOrdenes &&
              ordersCount != null &&
              !ordersLoading &&
              !ordersError &&
              ordersCount > 0
                ? <Badge variant="secondary">{ordersCount}</Badge>
                : item.trailing
            return (
              <NavItem
                key={item.to}
                item={{ ...item, trailing }}
                location={location}
                onNavigate={onNavigate}
              />
            )
          })}
        </nav>
      </div>

      <div className="mt-auto space-y-4 border-t border-border pt-4">
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>

        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <UserAvatar
              className="h-8 w-8"
              user={user ?? undefined}
              isPending={session === undefined && user === undefined}
            />
            <div className="flex flex-col gap-0">
              <div className="text-xs font-semibold leading-none text-foreground">
                {displayName}
              </div>
              <div className="mt-0.5 max-w-[140px] truncate text-[11px] leading-none text-muted-foreground">
                {displayEmail}
              </div>
            </div>
          </div>
          <div
            className={`h-2 w-2 rounded-full ${session ? "bg-emerald-500" : "bg-muted"}`}
            aria-hidden="true"
          />
        </div>
      </div>
    </aside>
  )
}

export const MobileAppHeader = () => {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:hidden">
      <Link to="/" className="flex min-h-11 items-center gap-2.5">
        <span className="rounded-lg bg-sidebar-accent p-2">
          <Store className="size-4 text-sidebar-accent-foreground" aria-hidden="true" />
        </span>
        <span className="text-sm font-bold text-foreground">CrossBorder Hub</span>
      </Link>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="size-11"
              aria-label="Abrir menú de navegación"
            />
          }
        >
          <Menu aria-hidden="true" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
            <SheetDescription>
              Accesos a las secciones de CrossBorder Hub.
            </SheetDescription>
          </SheetHeader>
          <AppSidebar mobile onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
