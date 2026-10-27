import { ButtonLink, Card } from "./ui";
import { LogoutButton } from "./logout-button";

/** Shown on /login and /signup when a session already exists, instead of silently redirecting. */
export function SignedInNotice({ name, email, isVerified }: { name: string; email: string; isVerified: boolean }) {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-3xl font-bold tracking-tight">You&apos;re already logged in</h1>
      <p className="mt-2 text-sm text-muted">
        Signed in as <span className="font-semibold text-ink">{name}</span> ({email}).
      </p>
      <p className="mt-1 text-sm text-muted">To use a different account, log out first.</p>
      <div className="mt-6 flex flex-col gap-2">
        <ButtonLink href={isVerified ? "/browse" : "/verify"} className="w-full">
          Continue as {name.split(" ")[0]}
        </ButtonLink>
        <LogoutButton label="Log out and use another account" className="w-full" />
      </div>
    </Card>
  );
}
