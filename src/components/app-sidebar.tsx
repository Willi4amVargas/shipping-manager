import * as React from "react"
import { useLocation } from "@tanstack/react-router"
import { Link } from "@tanstack/react-router"
import { neon } from "../lib/neon"
import { Badge } from "../components/ui/badge"
import { UserAvatar } from "@neondatabase/neon-js/auth/react/ui"
import {
  HelpCircle,
  LayoutGrid,
  LogOut,
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
  activeOptions?: Record<string, unknown>
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
  {
    to: "/pagos",
    label: "Pagos & Caja",
    icon: Wallet,
    trailing: <span className="w-2 h-2 rounded-full bg-destructive" />,
  },
  { to: "/tiendas", label: "Tiendas", icon: Store },
  { to: "/configuracion", label: "Configuración", icon: Settings },
]

const NavItem = ({ item, location }: { item: NavItem; location: ReturnType<typeof useLocation> }) => {
  const isActive = location.pathname === item.to

  return (
    <Link
      to={item.to}
      {...(item.activeOptions || {})}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
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

export const AppSidebar = () => {
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
    loadOrdersCount()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSignOut = () => {
    void neon.auth.signOut()
  }

  const user = session?.user
  const displayName =
    user?.name || user?.email || "Usuario"
  const displayEmail = user?.email

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-background p-4">
      {/* Sección 1: Header (Branding) */}
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-sidebar-accent p-2.5">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-base text-foreground">CrossBorder Hub</div>
          <div className="text-xs text-muted-foreground">Operaciones & Finanzas</div>
        </div>
      </div>

      {/* Sección 2: Menú de navegación principal */}
      <nav className="flex flex-col space-y-1">
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
            />
          )
        })}
      </nav>

      {/* Sección 3: Footer y módulos inferiores */}
      <div className="mt-auto space-y-4 pt-4 border-t border-border">

        {/* 3.2 Acciones de soporte y sesión */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 py-1">
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            role="button"
            tabIndex={0}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Soporte</span>
          </div>
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:text-destructive transition-colors"
            role="button"
            tabIndex={0}
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </div>
        </div>

        {/* 3.3 Perfil de usuario */}
        <div className="border border-border rounded-xl p-2.5 flex items-center justify-between bg-card shadow-sm">
          <div className="flex items-center gap-2.5">
            <UserAvatar
              className="w-8 h-8"
              user={user ?? undefined}
              isPending={session === undefined && user === undefined}
            />
            <div className="flex flex-col gap-0">
              <div className="font-semibold text-xs text-foreground leading-none">
                {displayName}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-none truncate max-w-[140px]">
                {displayEmail}
              </div>
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${session ? "bg-emerald-500" : "bg-muted"}`} />
        </div>
      </div>
    </aside>
  )
}
