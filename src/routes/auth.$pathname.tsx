import { AuthView } from "@neondatabase/neon-js/auth/react/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/$pathname")({
  component: AuthPage,
});

function AuthPage() {
  const { pathname } = Route.useParams();

  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <AuthView pathname={pathname} className="w-full max-w-sm" />
    </div>
  );
}
