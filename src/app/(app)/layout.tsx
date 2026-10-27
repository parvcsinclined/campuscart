import { AppShell } from "@/components/app-shell";
import { pageVerifiedUser } from "@/lib/authz";

// Guard here for a fast redirect; every page and API route also checks on its own,
// because layouts aren't re-rendered on every client navigation.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  await pageVerifiedUser();
  return <AppShell>{children}</AppShell>;
}
