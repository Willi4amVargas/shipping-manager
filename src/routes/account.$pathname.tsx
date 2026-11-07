import { AccountView } from "@neondatabase/neon-js/auth/react/ui";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/account/$pathname")({
  component: AccountPage,
});

function AccountPage() {
  const { pathname } = Route.useParams();

  return (
    <div className="mx-auto w-full max-w-4xl py-4">
      <AccountView pathname={pathname} />
    </div>
  );
}
