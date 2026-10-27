import type { Metadata } from "next";
import { pageVerifiedUser } from "@/lib/authz";
import { signOut } from "@/lib/auth";
import { Button, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await pageVerifiedUser();

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile" />
      <Card className="max-w-lg divide-y divide-line">
        <Row label="Name" value={user.name} />
        <Row label="College email" value={user.email} />
        <Row
          label="Status"
          value={
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
              ✓ Campus member
            </span>
          }
        />
        <form action={logout} className="p-4">
          <Button variant="secondary" type="submit" className="w-full sm:w-auto">
            Log out
          </Button>
        </form>
      </Card>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 text-sm">
      <span className="text-muted">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
