// Demo marketplace data for evaluators: realistic listings with photos plus a few
// in-progress negotiations. Run AFTER `prisma db seed` (which creates the demo users):
//   npm run db:seed:demo
// It removes previous demo listings (and their blobs) first, so it is safe to re-run.
// Photos are generated illustrations rendered with sharp and uploaded to Vercel Blob.
import { config } from "dotenv";
import sharp from "sharp";
import { put, del } from "@vercel/blob";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Category, type Condition } from "../src/generated/prisma/client";

config({ path: [".env.local", ".env"], quiet: true });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const DEMO_EMAILS = ["seller@example.edu", "buyer@example.edu", "buyer2@example.edu"];
// Accounts created during local testing; removed so the demo starts clean.
const TEST_ACCOUNTS = ["cc.localtest@sst.scaler.com"];

type Item = {
  seller: "seller" | "buyer2";
  title: string;
  description: string;
  category: Category;
  condition: Condition;
  priceInr: number;
  pickupLocation: string;
  hue: number;
  ageHours: number;
};

const ITEMS: Item[] = [
  { seller: "seller", title: "Engineering Mathematics by B.S. Grewal (44th ed.)", description: "Standard reference for M1/M2. A few pencil notes in the integration chapters, otherwise clean. No torn pages.", category: "TEXTBOOKS", condition: "GOOD", priceInr: 450, pickupLocation: "Library entrance", hue: 210, ageHours: 2 },
  { seller: "seller", title: "Casio fx-991EX ClassWiz scientific calculator", description: "Allowed in exams. Works perfectly, with the original hard cover. Battery replaced last month.", category: "CALCULATORS", condition: "LIKE_NEW", priceInr: 900, pickupLocation: "Academic block A, ground floor", hue: 160, ageHours: 5 },
  { seller: "seller", title: "Study table lamp with USB charging port", description: "LED lamp with 3 brightness levels and a flexible neck. Includes the adapter.", category: "ELECTRONICS", condition: "GOOD", priceInr: 550, pickupLocation: "Hostel B lobby", hue: 45, ageHours: 30 },
  { seller: "seller", title: "Foldable study chair (cushioned)", description: "Sturdy metal frame with a cushioned seat. Folds flat, so it's perfect for small hostel rooms. Minor scratches on the legs.", category: "FURNITURE", condition: "FAIR", priceInr: 700, pickupLocation: "Hostel B lobby", hue: 25, ageHours: 8 },
  { seller: "seller", title: "Introduction to Algorithms (CLRS), 3rd edition", description: "Paperback, Indian edition. Highlighting in chapters 15–16 (DP and greedy) only. Great for DSA prep.", category: "TEXTBOOKS", condition: "GOOD", priceInr: 650, pickupLocation: "Library entrance", hue: 260, ageHours: 12 },
  { seller: "seller", title: "boAt Rockerz wireless headphones", description: "About 20h battery, both sides work fine. Ear cushions slightly worn. Charging cable included.", category: "ELECTRONICS", condition: "GOOD", priceInr: 800, pickupLocation: "Cafeteria", hue: 340, ageHours: 20 },
  { seller: "seller", title: "Engineering drawing kit (mini drafter + set squares)", description: "Complete kit used for one semester: mini drafter, set squares, protractor, compass and clips.", category: "OTHER", condition: "LIKE_NEW", priceInr: 400, pickupLocation: "Workshop block", hue: 190, ageHours: 26 },
  { seller: "seller", title: "Bedside bookshelf (3 tiers)", description: "Engineered wood, 3 tiers, easy to carry. No wobble. Moving out, so it has to go this week.", category: "FURNITURE", condition: "GOOD", priceInr: 1200, pickupLocation: "Hostel B, room 214", hue: 30, ageHours: 40 },
  { seller: "seller", title: "Logitech wireless mouse M235", description: "Nano receiver included. Smooth scroll, no double-click issues.", category: "ELECTRONICS", condition: "LIKE_NEW", priceInr: 350, pickupLocation: "Academic block A, ground floor", hue: 0, ageHours: 50 },
  { seller: "buyer2", title: "Physics for Scientists & Engineers (Serway)", description: "Hardcover, clean copy. Ideal for first-year physics labs and assignments.", category: "TEXTBOOKS", condition: "LIKE_NEW", priceInr: 600, pickupLocation: "Girls' hostel gate", hue: 230, ageHours: 4 },
  { seller: "buyer2", title: "Casio fx-82MS basic scientific calculator", description: "Good backup calculator. A few scratches on the screen cover, works perfectly.", category: "CALCULATORS", condition: "FAIR", priceInr: 250, pickupLocation: "Girls' hostel gate", hue: 140, ageHours: 15 },
  { seller: "buyer2", title: "Electric kettle 1.5L (Prestige)", description: "Auto shut-off works. Descaled and cleaned. Great for late-night Maggi.", category: "ELECTRONICS", condition: "GOOD", priceInr: 500, pickupLocation: "Girls' hostel gate", hue: 280, ageHours: 60 },
];

// ---------- generated illustrations ----------
function icon(category: Category): string {
  const s = 'stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  switch (category) {
    case "TEXTBOOKS":
      return `<g ${s}><rect x="430" y="300" width="340" height="80" rx="10"/><rect x="460" y="380" width="300" height="80" rx="10"/><rect x="420" y="460" width="360" height="90" rx="10"/><line x1="470" y1="340" x2="720" y2="340"/><line x1="500" y1="420" x2="710" y2="420"/></g>`;
    case "CALCULATORS":
      return `<g ${s}><rect x="480" y="230" width="240" height="340" rx="28"/><rect x="515" y="270" width="170" height="70" rx="10"/>${[0, 1, 2]
        .flatMap((c) => [0, 1, 2].map((r) => `<circle cx="${535 + c * 65}" cy="${395 + r * 55}" r="14" fill="#fff"/>`))
        .join("")}</g>`;
    case "FURNITURE":
      return `<g ${s}><path d="M500 240v190h200V240"/><rect x="470" y="430" width="260" height="40" rx="10"/><line x1="490" y1="470" x2="480" y2="570"/><line x1="710" y1="470" x2="720" y2="570"/></g>`;
    case "ELECTRONICS":
      return `<g ${s}><rect x="430" y="260" width="340" height="220" rx="16"/><path d="M380 520h440l-30 40H410z"/><line x1="560" y1="370" x2="640" y2="370"/></g>`;
    default:
      return `<g ${s}><path d="M600 230l170 90v190l-170 90-170-90V320z"/><path d="M430 320l170 90 170-90M600 410v190"/></g>`;
  }
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
}

async function renderPhoto(item: Item, variant: number): Promise<Buffer> {
  const h = (item.hue + variant * 18) % 360;
  const title = item.title.length > 42 ? item.title.slice(0, 40) + "…" : item.title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${h},55%,46%)"/><stop offset="1" stop-color="hsl(${(h + 40) % 360},60%,32%)"/>
    </linearGradient></defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    <circle cx="${variant ? 980 : 200}" cy="${variant ? 160 : 760}" r="260" fill="#fff" opacity="0.06"/>
    <g transform="translate(0 ${variant ? -20 : 0}) scale(${variant ? 1.05 : 1})">${icon(item.category)}</g>
    <text x="600" y="720" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#fff">${escapeXml(title)}</text>
    <text x="600" y="780" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="28" fill="#fff" opacity="0.8">CampusCart demo listing · photo ${variant + 1}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}

// ---------- seeding ----------
async function main() {
  const users = await db.user.findMany({ where: { email: { in: DEMO_EMAILS } }, select: { id: true, email: true, name: true } });
  if (users.length !== DEMO_EMAILS.length) throw new Error("Run `npm run db:seed` first to create the demo users.");
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
  const seller = byEmail["seller@example.edu"];
  const buyer = byEmail["buyer@example.edu"];
  const buyer2 = byEmail["buyer2@example.edu"];

  // 1. Clean up test accounts and previous demo listings (+ their blobs).
  const removedTest = await db.user.deleteMany({ where: { email: { in: TEST_ACCOUNTS } } });
  const old = await db.listingImage.findMany({ where: { listing: { sellerId: { in: users.map((u) => u.id) } } }, select: { url: true } });
  await db.transaction.deleteMany({ where: { listing: { sellerId: { in: users.map((u) => u.id) } } } });
  const removed = await db.listing.deleteMany({ where: { sellerId: { in: users.map((u) => u.id) } } });
  if (old.length) await del(old.map((i) => i.url));
  await db.rateLimit.deleteMany({});
  console.log(`removed ${removedTest.count} test account(s), ${removed.count} listing(s), ${old.length} blob(s)`);

  // 2. Listings with photos.
  const created: Record<string, string> = {};
  for (const item of ITEMS) {
    const owner = item.seller === "seller" ? seller : buyer2;
    const publishedAt = new Date(Date.now() - item.ageHours * 3600_000);
    const listing = await db.listing.create({
      data: {
        sellerId: owner.id,
        title: item.title,
        description: item.description,
        category: item.category,
        condition: item.condition,
        priceInr: item.priceInr,
        pickupLocation: item.pickupLocation,
        publishedAt,
        createdAt: publishedAt,
        events: { create: { actorId: owner.id, fromStatus: null, toStatus: "AVAILABLE", reason: "published", createdAt: publishedAt } },
      },
      select: { id: true },
    });
    const photoCount = item.ageHours % 2 === 0 ? 2 : 1;
    for (let v = 0; v < photoCount; v++) {
      const pathname = `listings/${listing.id}/demo-${v + 1}-${crypto.randomUUID()}.webp`;
      const blob = await put(pathname, await renderPhoto(item, v), { access: "public", contentType: "image/webp" });
      await db.listingImage.create({ data: { listingId: listing.id, url: blob.url, pathname, position: v } });
    }
    created[item.title] = listing.id;
    console.log(`listed: ${item.title}`);
  }

  const at = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600_000);

  // 3a. Pending offer waiting for the seller (demo: accept / counter / decline live).
  {
    const listingId = created["Introduction to Algorithms (CLRS), 3rd edition"];
    const c = await db.conversation.create({
      data: { listingId, buyerId: buyer.id, sellerId: seller.id, lastMessageAt: at(1), buyerLastReadAt: at(1), sellerLastReadAt: at(3) },
    });
    await db.message.create({ data: { conversationId: c.id, senderId: buyer.id, body: "Hi! Is the highlighting only in chapters 15–16?", createdAt: at(1.5) } });
    const offer = await db.offer.create({ data: { conversationId: c.id, listingId, proposerId: buyer.id, amountInr: 550, createdAt: at(1) } });
    await db.message.create({ data: { conversationId: c.id, senderId: buyer.id, type: "OFFER", offerId: offer.id, body: "Offered ₹550", createdAt: at(1) } });
  }

  // 3b. Reserved for the buyer via an accepted offer.
  {
    const listingId = created["Engineering drawing kit (mini drafter + set squares)"];
    const c = await db.conversation.create({ data: { listingId, buyerId: buyer.id, sellerId: seller.id, lastMessageAt: at(5), buyerLastReadAt: at(5), sellerLastReadAt: at(5) } });
    const offer = await db.offer.create({ data: { conversationId: c.id, listingId, proposerId: buyer.id, amountInr: 350, status: "ACCEPTED", respondedAt: at(5), createdAt: at(6) } });
    await db.message.createMany({
      data: [
        { conversationId: c.id, senderId: buyer.id, body: "Does it include the compass?", createdAt: at(6.5) },
        { conversationId: c.id, senderId: seller.id, body: "Yes, everything in the photo is included.", createdAt: at(6.2) },
        { conversationId: c.id, senderId: buyer.id, type: "OFFER", offerId: offer.id, body: "Offered ₹350", createdAt: at(6) },
        { conversationId: c.id, type: "SYSTEM", body: "Ananya accepted the ₹350 offer.", createdAt: at(5) },
        { conversationId: c.id, type: "SYSTEM", body: "Reserved for Rohan at ₹350 for 48 hours. Meet on campus to complete the sale.", createdAt: at(5) },
      ],
    });
    await db.listing.update({ where: { id: listingId }, data: { status: "RESERVED", reservedForId: buyer.id, reservedPrice: 350, reservedUntil: new Date(at(5).getTime() + 48 * 3600_000) } });
    await db.listingEvent.create({ data: { listingId, actorId: seller.id, fromStatus: "AVAILABLE", toStatus: "RESERVED", reason: "offer_accepted", createdAt: at(5) } });
  }

  // 3c. Completed sale to the buyer (shows in My purchases / My sales).
  {
    const listingId = created["Logitech wireless mouse M235"];
    const c = await db.conversation.create({ data: { listingId, buyerId: buyer.id, sellerId: seller.id, lastMessageAt: at(30), buyerLastReadAt: at(30), sellerLastReadAt: at(30) } });
    await db.message.createMany({
      data: [
        { conversationId: c.id, senderId: buyer.id, body: "Can I pick it up after class today?", createdAt: at(46) },
        { conversationId: c.id, senderId: seller.id, body: "Sure, 5pm at the academic block.", createdAt: at(45.5) },
        { conversationId: c.id, type: "SYSTEM", body: "Reserved for Rohan at ₹350 for 48 hours. Meet on campus to complete the sale.", createdAt: at(45) },
        { conversationId: c.id, type: "SYSTEM", body: "Sale completed at ₹350. Enjoy!", createdAt: at(30) },
      ],
    });
    await db.listing.update({ where: { id: listingId }, data: { status: "SOLD", reservedForId: buyer.id, reservedPrice: 350 } });
    await db.listingEvent.createMany({
      data: [
        { listingId, actorId: seller.id, fromStatus: "AVAILABLE", toStatus: "RESERVED", reason: "reserved", createdAt: at(45) },
        { listingId, actorId: seller.id, fromStatus: "RESERVED", toStatus: "SOLD", reason: "sold", createdAt: at(30) },
      ],
    });
    await db.transaction.create({ data: { listingId, buyerId: buyer.id, sellerId: seller.id, finalPrice: 350, completedAt: at(30) } });
  }

  console.log(`seeded ${ITEMS.length} listings with demo negotiations`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
