import {
  RedirectToSignIn,
  SignedIn,
} from "@neondatabase/neon-js/auth/react/ui"
import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { AppSidebar } from "../components/app-sidebar"

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
        <div className="flex min-h-dvh flex-col bg-background text-foreground">
          <div className="flex flex-1">
            <AppSidebar />
            <main className="flex-1 min-w-0 overflow-y-auto bg-background">
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
