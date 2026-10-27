import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Vercel-managed vars come from `vercel env pull` (.env.local); local-only vars live in .env.
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations must bypass the Neon pooler.
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  },
});
