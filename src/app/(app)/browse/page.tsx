import type { Metadata } from "next";
import { pageVerifiedUser } from "@/lib/authz";
import { ButtonLink, EmptyState, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Browse" };

export default async function BrowsePage() {
  const user = await pageVerifiedUser();
  return (
    <>
      <PageHeader eyebrow="Marketplace" title={`Hi ${user.name.split(" ")[0]} 👋`} subtitle="Find textbooks, calculators, furniture and more from students on your campus." />
      <EmptyState
        title="No listings yet"
        body="Be the first to list something. Buyers on campus will see it here."
        action={<ButtonLink href="/sell">List an item</ButtonLink>}
      />
    </>
  );
}
