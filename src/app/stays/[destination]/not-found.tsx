import Link from 'next/link';

export default function DestinationNotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Destination unavailable</p>
      <h1 className="text-3xl font-semibold tracking-tight">We could not find stays for that destination</h1>
      <p className="max-w-prose text-muted-foreground">
        Try one of our supported destinations from the search page to view live rates and availability.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        Back to search
      </Link>
    </main>
  );
}
