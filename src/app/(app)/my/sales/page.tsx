import type { Metadata } from "next";
import { pageVerifiedUser } from "@/lib/authz";
import { listTransactions } from "@/lib/services/transactions";
import { TransactionsView } from "@/components/transactions-view";

export const metadata: Metadata = { title: "My sales" };

export default async function Page() {
  const user = await pageVerifiedUser();
  return <TransactionsView as="seller" rows={await listTransactions(user.id, "seller")} />;
}
