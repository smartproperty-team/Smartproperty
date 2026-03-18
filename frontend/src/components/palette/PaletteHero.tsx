import { PaletteButton } from "./PaletteButton";

export function PaletteHero() {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
      <div className="space-y-6">
        <span className="inline-flex items-center rounded-full border border-palette-secondary/35 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-palette-primary">
          Intelligent Real Estate Management
        </span>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight text-palette-primary sm:text-5xl">
            Find, manage, and grow your property portfolio with confidence.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-palette-secondary sm:text-lg">
            A modern workspace for owners and managers with clear workflows,
            smart insights, and delightful day-to-day operations.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <PaletteButton variant="primary">Explore Properties</PaletteButton>
          <PaletteButton variant="secondary">View Dashboard</PaletteButton>
          <PaletteButton variant="outline">Learn More</PaletteButton>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-palette-secondary/30 bg-white p-6 shadow-xl shadow-palette-primary/10">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-palette-accent/40 blur-2xl" />
        <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-palette-secondary/30 blur-2xl" />

        <div className="relative space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-palette-secondary">
            Monthly Snapshot
          </p>
          <p className="text-4xl font-bold text-palette-primary">+18.4%</p>
          <p className="text-sm text-palette-secondary">
            Portfolio occupancy growth compared to last quarter.
          </p>
          <div className="h-2 rounded-full bg-palette-secondary/20">
            <div className="h-2 w-4/5 rounded-full bg-palette-accent" />
          </div>
        </div>
      </div>
    </section>
  );
}
