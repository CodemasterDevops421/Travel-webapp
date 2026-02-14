import { CalendarDays, Compass, ShieldCheck, Sparkles } from 'lucide-react';

const steps = [
  {
    title: 'Set the date range',
    description: 'Flexible search by month or exact nights with price alerts.',
    icon: CalendarDays
  },
  {
    title: 'Pick the vibe',
    description: 'Layer in mood filters to shortlist stays with the right energy.',
    icon: Sparkles
  },
  {
    title: 'Compare on trust',
    description: 'We surface deposit rules, taxes, and cancellation terms upfront.',
    icon: ShieldCheck
  },
  {
    title: 'Lock in the plan',
    description: 'Secure checkout with signed quotes and real-time confirmation.',
    icon: Compass
  }
];

export function PlanningGrid() {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-semibold">Plan the trip in four confident moves</h2>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Travel planning grid</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article
              key={step.title}
              className="rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-background/80">
                  <Icon className="h-5 w-5 text-primary" />
                </span>
                <h3 className="text-lg font-semibold">{step.title}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
