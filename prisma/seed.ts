// Seeds pre-verified demo accounts (and, from Phase 6, demo listings).
// Idempotent: safe to run repeatedly against dev or production.
import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env"], quiet: true });

// Public demo credentials for evaluators; also documented in README.md.
export const DEMO_PASSWORD = "CampusCart-demo-2026";
export const DEMO_USERS = [
  { email: "seller@example.edu", name: "Ananya Seller (demo)" },
  { email: "buyer@example.edu", name: "Rohan Buyer (demo)" },
  { email: "buyer2@example.edu", name: "Meera Buyer (demo)" },
];

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  for (const u of DEMO_USERS) {
    await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, emailVerified: new Date() },
      create: { email: u.email, name: u.name, passwordHash, emailVerified: new Date() },
    });
    console.log(`seeded user ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
