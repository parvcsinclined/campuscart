import "server-only";
import { db } from "../db";

export async function listTransactions(userId: string, as: "buyer" | "seller") {
  return db.transaction.findMany({
    where: as === "buyer" ? { buyerId: userId } : { sellerId: userId },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      finalPrice: true,
      completedAt: true,
      listing: { select: { id: true, title: true, priceInr: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } },
      buyer: { select: { name: true } },
      seller: { select: { name: true } },
    },
  });
}
