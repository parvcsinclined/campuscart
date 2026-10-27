# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**CampusCart** is a buy-and-sell marketplace for students of one college, restricted to college email domains. Email-code verification is optional via `EMAIL_VERIFICATION` (`off` by default and in production); `getCurrentUser().isVerified` is the single source of truth, so use it rather than `emailVerified`. The full plan, Prisma schema, state machines, routes and progress checklist are in `docs/PLAN.md`; keep its checklist updated. The official requirements and rubric are in `GUIDELINES.md` (gitignored, local only), and every decision must satisfy them. The deadline is **27 Oct 2026, 11:59 PM IST**. Five working core workflows matter more than extra features.

Stack: Next.js App Router (TS, Node runtime), Prisma + Neon Postgres, Vercel Blob, Auth.js v5 Credentials (bcrypt, JWT in an httpOnly cookie), Zod, Tailwind and Vitest. It is deployed on Vercel.

## Commands

_(Fill in once scaffolded in Phase 1.)_

## Architecture rules

- Business rules live in `src/lib/domain` (pure, unit-tested state machines) and `src/lib/services` (DB work). Route handlers and pages stay thin.
- Mutations are Route Handlers under `/api` that return real status codes (400/401/403/404/409/429) through `withErrorHandling` and `AppError`. Reads happen in Server Components that call services.
- **Every** route and page runs a server-side authz helper (`requireUser`, `requireVerifiedUser`, `assertListingOwner`, `assertParticipant`). Never trust the client. Verified status is re-read from the DB, not the JWT.
- Listing status transitions (`AVAILABLE`, `RESERVED`, `SOLD`, `WITHDRAWN`) go only through `listing-state.ts` and `transitionListing()`:
  - Use a conditional atomic `updateMany` where the status is still the expected one. A count of 0 means 409 (or 404 if the listing is gone).
  - Write a `ListingEvent` for every change.
  - On reserve, sell or withdraw, set other pending offers to EXPIRED and post SYSTEM messages.
  - SOLD is final and sold listings can't be edited.
- Reservations last 48h and expire lazily (`expireStaleReservations`) on read or action. There is no background worker.
- Offers allow one PENDING offer per conversation, enforced by a partial unique index in the migration SQL. The recipient accepts, rejects or counters; the proposer withdraws. Accepting reserves the listing atomically at the offer amount. Offers can only be made on AVAILABLE listings.
- There is one conversation per (listing, buyer), enforced by a unique constraint, and sellers can't inquire on their own listings. Messages update by polling, not WebSockets.
- Photos are JPEG/PNG/WebP, at most 5 MB, 1–5 per listing. They are resized in the browser and uploaded as Blob client uploads. The token route checks session, verification, ownership, type and size. The client then calls the attach route, because webhooks don't reach localhost. Removing a photo or listing must also call `del()` on the blob.
- Search uses a Postgres FTS generated `tsvector` column with a GIN index, queried via `Prisma.sql`. Search state lives in the URL.
- Rate limits (login, signup, messages, offers) use the Postgres `RateLimit` table, not in-memory storage.
- Prices are integer INR. API responses never include password hashes or other users' emails. Never use `dangerouslySetInnerHTML` for user content.
- Use the `DATABASE_URL` (pooled) connection at runtime and `DATABASE_URL_UNPOOLED` for migrations.

## Workflow rules

- Work in phases (see PLAN.md). After each phase: lint, typecheck and test; run an end-to-end test in Chrome as both demo users and check the console; commit and push; redeploy and smoke-test the live URL; update the PLAN.md checklist; then report.
- Make small, frequent commits with conventional messages (`feat: …`, `fix: …`). Never commit `.env`, `node_modules` or `GUIDELINES.md`. The remote is `origin` = https://github.com/parvcsinclined/campuscart and the branch is `main`.
- Stop and ask for anything needing the user's login or a decision (GitHub, the Vercel dashboard, the email provider, anything ambiguous). Never ask for or store passwords; use `gh auth login` for push auth.
- Demo accounts are `seller@example.edu` and `buyer@example.edu`, pre-verified and seeded; their credentials go in the README.
