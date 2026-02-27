import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewsletterBand() {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-blue-700 p-8 md:p-12">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/5" />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/70">
            <Mail className="h-4 w-4" />
            Travel memo
          </div>
          <h2 className="text-2xl font-bold text-white md:text-3xl">Get the weekly shortlist of premium rates</h2>
          <p className="max-w-lg text-sm leading-relaxed text-white/75">
            We send one email every Friday with deal drops, editorial picks, and travel playbooks.
          </p>
        </div>
        <form className="flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="email"
            placeholder="you@example.com"
            aria-label="Email address"
            required
            className="border-white/20 bg-white/15 text-white placeholder:text-white/50 focus-visible:border-white/40 focus-visible:ring-white/30"
          />
          <Button type="submit" size="lg" className="w-full bg-white text-primary font-bold hover:bg-white/90 sm:w-auto">
            Join the list
          </Button>
        </form>
      </div>
    </section>
  );
}
