import Link from "next/link";
import { getDefaultBook } from "@/lib/store";
import { signOutAction } from "@/lib/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const book = await getDefaultBook();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-4">
        <Link href="/customers" className="font-bold text-ink">
          {book.businessName}
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/more" className="text-sm font-medium text-accent">
            More
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-sm font-medium text-muted">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
