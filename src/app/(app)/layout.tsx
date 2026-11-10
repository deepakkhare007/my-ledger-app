import Link from "next/link";
import { getDefaultBook } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const book = getDefaultBook();

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border bg-bg px-4">
        <Link href="/customers" className="font-bold text-ink">
          {book.businessName}
        </Link>
        <Link href="/more" className="text-sm font-medium text-accent">
          More
        </Link>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
