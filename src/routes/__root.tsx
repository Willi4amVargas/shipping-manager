import {
  RedirectToSignIn,
  SignedIn,
} from "@neondatabase/neon-js/auth/react/ui"
import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { AppSidebar, MobileAppHeader } from "../components/app-sidebar"

const RootLayout = () => {
  const location = useLocation()
  const isAuthRoute =
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/account")

  // Páginas de Neon Auth / Account: renderizan a pantalla completa sin sidebar.
  if (isAuthRoute) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        <Outlet />
        <TanStackRouterDevtools />
      </div>
    )
  }

  return (
    <>
      <SignedIn>
        <div className="flex h-dvh overflow-hidden bg-background text-foreground">
          <AppSidebar />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <MobileAppHeader />
            <main className="min-h-0 flex-1 overflow-y-auto bg-background">
              <Outlet />
            </main>
          </div>
        </div>
      </SignedIn>
      <RedirectToSignIn />
      <TanStackRouterDevtools position="bottom-right"/>
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })
