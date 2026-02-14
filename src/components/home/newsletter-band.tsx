import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewsletterBand() {
  return (
    <section className="rounded-2xl border border-border/80 bg-gradient-to-r from-primary/10 via-background/80 to-card/70 p-6 shadow-sm">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            Travel memo
          </div>
          <h2 className="text-2xl font-semibold">Get the weekly shortlist of premium rates</h2>
          <p className="text-sm text-muted-foreground">
            We send one email every Friday with deal drops, editorial picks, and travel playbooks.
          </p>
        </div>
        <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center">
          <Input type="email" placeholder="you@example.com" aria-label="Email address" required />
          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Join the list
          </Button>
        </form>
      </div>
    </section>
  );
}
