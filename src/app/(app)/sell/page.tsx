import type { Metadata } from "next";
import { pageVerifiedUser } from "@/lib/authz";
import { Card, PageHeader } from "@/components/ui";
import { ListingForm } from "@/components/listing-form";

export const metadata: Metadata = { title: "Sell an item" };

export default async function SellPage() {
  await pageVerifiedUser();
  return (
    <>
      <PageHeader eyebrow="Step 1 of 2 · Details" title="Sell an item" subtitle="Describe it honestly. You'll add photos next, then publish." />
      <Card className="max-w-2xl p-5 sm:p-6">
        <ListingForm mode="create" />
      </Card>
    </>
  );
}
