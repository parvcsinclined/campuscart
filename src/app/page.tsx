import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";

const STEPS = [
  { n: "1", title: "Sign up with your college email", body: "Only campus email addresses can join, so there are no random strangers and no long trips." },
  { n: "2", title: "List or find what you need", body: "Textbooks, calculators, furniture and electronics, searchable and filterable, with real photos." },
  { n: "3", title: "Negotiate, reserve, meet on campus", body: "Make offers in chat. Once a price is agreed the item is reserved for you, so nobody else can grab it." },
];

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) redirect(user.isVerified ? "/browse" : "/verify");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost">Log in</ButtonLink>
          <ButtonLink href="/signup" className="hidden sm:inline-flex">Sign up</ButtonLink>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pt-10 pb-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-20">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-brand">
              For students only · college email required
            </p>
            <h1 className="font-display text-5xl leading-[1.05] font-bold tracking-tight sm:text-6xl">
              Your campus,
              <br />
              <span className="text-brand">second-hand.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Buy and sell textbooks, calculators, furniture and electronics with students from your own college. Reservations
              are tracked, so there&apos;s no &ldquo;is this still available?&rdquo; chaos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" className="h-12 px-6 text-base">Get started, it&apos;s free</ButtonLink>
              <ButtonLink href="/login" variant="secondary" className="h-12 px-6 text-base">I have an account</ButtonLink>
            </div>
          </div>

          <div aria-hidden className="relative mx-auto mb-12 w-full max-w-sm">
            <div className="rotate-2 rounded-3xl border border-line bg-surface p-4 shadow-xl">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-brand-soft to-amber-soft" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold">Engineering Maths, 2nd ed.</p>
                  <p className="text-sm text-muted">Like new · Library steps</p>
                </div>
                <p className="font-display text-xl font-bold">₹350</p>
              </div>
              <span className="mt-3 inline-flex rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber">Reserved for you · 47h left</span>
            </div>
            <div className="absolute -bottom-14 -left-4 -rotate-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm shadow-lg">
              <p className="font-semibold">Offer accepted: ₹350</p>
              <p className="text-muted">Item reserved for 48 hours</p>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="font-display text-3xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n} className="rounded-2xl border border-line bg-bg p-5">
                  <span className="grid size-9 place-items-center rounded-full bg-brand font-display font-bold text-brand-ink">{s.n}</span>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
          <span>CampusCart: buy and sell within your college.</span>
          <span>Built as an end-term software project.</span>
        </div>
      </footer>
    </div>
  );
}
