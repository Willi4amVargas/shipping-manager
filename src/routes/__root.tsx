import {
  SignedIn,
  SignedOut,
  UserButton,
} from "@neondatabase/neon-js/auth/react/ui";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Button } from "../components/ui/button";

const navLinkClassName =
  "text-muted-foreground transition-colors hover:text-foreground [&.active]:font-medium [&.active]:text-foreground";

const RootLayout = () => (
  <div className="flex min-h-dvh flex-col bg-background text-foreground">
    <header className="border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            Shipping Manager
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className={navLinkClassName} activeOptions={{ exact: true }}>
              Inicio
            </Link>
            <Link to="/about" className={navLinkClassName}>
              Acerca
            </Link>
          </div>
        </nav>
        <div className="flex items-center gap-2">
          <SignedOut>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/auth/$pathname" params={{ pathname: "sign-in" }} />}
            >
              Iniciar sesión
            </Button>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </header>
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <Outlet />
    </main>
    <TanStackRouterDevtools />
  </div>
);

export const Route = createRootRoute({ component: RootLayout });
