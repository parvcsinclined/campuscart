# CampusCart

A buy-and-sell marketplace for students of one college. Members verify with their college email, list second-hand items with photos, negotiate in threaded inquiries with offers, and reserve and complete sales through an enforced listing lifecycle.

- **Live app:** https://campuscart-mu-navy.vercel.app
- **Repository:** https://github.com/parvcsinclined/campuscart

## Problem statement

Students regularly need affordable second-hand textbooks, calculators, furniture and electronics, and the students who own them are often in the same building. General marketplaces are full of strangers and sellers who are far away. WhatsApp groups can't keep track of who reserved what, so items get promised twice, buyers keep asking "is this still available?", and the price someone agreed to is lost in the scroll.

## Target users

Students of a single college, verified by their college email address (e.g. `@sst.scaler.com`). Each student can act as a **buyer** and a **seller**.

## Solution

CampusCart makes the marketplace software rather than a chat thread:

- **Verified campus membership.** Only allow-listed college email domains can sign up, and an emailed code must be confirmed before a student can list, message or make offers.
- **A real listing lifecycle** (Available → Reserved → Sold, plus Withdrawn). The rules are enforced on the server, so an item can't be reserved by two buyers at once.
- **One conversation per buyer per listing.** Price offers sit inside the thread, so the whole negotiation history is visible.

## Key features

- **Campus-restricted accounts:** domain allowlist (exact match), bcrypt-hashed passwords, 6-digit email verification codes (hashed, 15-minute expiry, 5 attempts), and rate-limited sign-up and login.
- **Listings with photos:** title, description, category, condition, integer INR price and campus pickup point. Each listing has 1–5 photos, which are compressed in the browser and uploaded directly to Vercel Blob with per-photo progress, errors and retry. Drafts stay private until published.
- **Ownership rules:** only the seller can edit, publish or delete. Sold listings are locked. Listings that buyers have already messaged about can only be withdrawn, not deleted.
- **Search & filters:** prefix keyword search over title and description (Postgres full-text search on a generated, weighted `tsvector` column with a GIN index). Filter by category, condition, price range and status (Available by default, optionally Reserved). Sort by best match, newest or price, with pagination. All state lives in the URL, so searches can be shared and survive a refresh.
- **My listings,** grouped into Drafts, Available, Reserved, Sold and Withdrawn.
- _More sections are added as each phase ships: messaging & offers, reservations & lifecycle._

## Tech stack

| Piece | Why |
|-------|-----|
| **Next.js 16 (App Router, TypeScript)** | One codebase for the UI and the API (Route Handlers on the Node runtime), plus Server Components that read the database directly. |
| **PostgreSQL on Neon + Prisma 7** | Relational data with real constraints (unique conversation per buyer, one pending offer per conversation) and built-in full-text search. Prisma provides typed queries and migrations, and connects through `@prisma/adapter-pg`. |
| **Vercel Blob** | Photo storage with direct browser uploads, so large files never pass through the serverless functions. Authenticates with Vercel OIDC, so no long-lived token is needed. |
| **Auth.js (NextAuth v5)** | Credentials login with an encrypted JWT in an httpOnly cookie. |
| **Zod** | One schema per form, shared by the client (instant field errors) and the server (the source of truth). |
| **Tailwind CSS** | Fast, consistent styling with design tokens for light and dark mode. |
| **Vitest** | Unit tests for the pure business rules. |

## Architecture

_(Diagram added in Phase 6.)_

- `src/lib/domain`: pure rules (listing state machine, offer rules), unit-tested.
- `src/lib/services`: database work for each feature. All business rules live here, not in routes.
- `src/app/api/**`: thin Route Handlers. They validate with Zod, call a service, and map `AppError`s to real HTTP status codes (400/401/403/404/409/429).
- `src/lib/authz.ts`: `requireVerifiedUser`, `assertListingOwner` and the other guards. They re-read the user from the database on every request, so a stale session can't bypass verification.

## Local setup

Requirements: Node 20+ and a Postgres database (Neon recommended).

```bash
git clone https://github.com/parvcsinclined/campuscart.git
cd campuscart
npm install                      # also runs `prisma generate`
cp .env.example .env             # fill in values (see below)
# or, if you have access to the Vercel project:
vercel link && vercel env pull .env.local
npx prisma migrate deploy        # create tables, search index and constraints
npm run db:seed                  # demo accounts
npm run dev                      # http://localhost:3000
```

Useful scripts: `npm run lint`, `npm run typecheck`, `npm test` (Vitest), `npx vitest run src/lib/validation` (a single test folder).

Without SMTP configured, verification codes are printed in the dev server log.

## Environment variables

| Name | Description |
|------|-------------|
| `DATABASE_URL` | Neon **pooled** connection string, used by the app at runtime. |
| `DATABASE_URL_UNPOOLED` | Neon **direct** connection string, used by Prisma migrations. |
| `AUTH_SECRET` | Secret for encrypting session cookies (`npx auth secret`). |
| `ALLOWED_EMAIL_DOMAINS` | Comma-separated, exact-match email domains allowed to sign up. |
| `BLOB_STORE_ID` | Vercel Blob store ID (set automatically when the store is connected). |
| `VERCEL_OIDC_TOKEN` | Short-lived OIDC token used by Blob. Injected on Vercel; locally it comes from `vercel env pull`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | SMTP settings for verification emails (e.g. Gmail with an App Password). |

## Deployment

Deployed on Vercel from the `main` branch: every push builds and deploys. Neon Postgres and Vercel Blob are attached from the Vercel project's Storage tab. Migrations run with `npx prisma migrate deploy` against `DATABASE_URL_UNPOOLED`.

**Demo accounts** (pre-verified, on the demo domain `example.edu`):

| Role | Email | Password |
|------|-------|----------|
| Seller | `seller@example.edu` | `CampusCart-demo-2026` |
| Buyer | `buyer@example.edu` | `CampusCart-demo-2026` |

## Key engineering decisions

- **Direct-to-storage uploads with OIDC.** The server checks that you're logged in and own the listing, then issues a presigned upload URL scoped to one exact pathname, `put` only, JPEG/PNG/WebP, at most 5 MB, valid for 10 minutes. The browser resizes the photo to at most 1600 px WebP and uploads it straight to Blob. A separate attach call then re-checks ownership and asks Blob for the object's real type and size before saving it. Upload webhooks can't reach `localhost`, which is why attaching is an explicit step.
- **Search in Postgres, not a search service.** A `GENERATED ALWAYS … STORED` tsvector (title weighted above description) stays in sync automatically, and a GIN index serves the `@@` match. User text is reduced to letters and digits and turned into a prefix query (`casio:* & calc:*`), so input can't inject tsquery syntax. Filters, sort and `COUNT(*) OVER()` pagination run in one parameterised query.
- **Rate limits in Postgres.** One atomic `INSERT … ON CONFLICT DO UPDATE` per check. In-memory counters don't work across serverless instances, and this avoids adding Redis.

## Known limitations

- Pages under the app shell show a streaming loading skeleton. As a result, "not found" pages render the 404 UI with `noindex`, but the HTTP status is 200 rather than 404. API routes always return proper status codes.
