import {
  PaletteButton,
  PaletteFeatureCard,
  PaletteHero,
  PaletteNavbar,
} from "@/components/palette";

const cards = [
  {
    title: "Portfolio Visibility",
    description:
      "Track occupancy, contracts, and revenue from a single streamlined dashboard.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M3 3h18v18H3z" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    ),
  },
  {
    title: "Smart Matching",
    description:
      "Recommend the right property with contextual ranking and preference-aware suggestions.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="m22 12-4-4-4 4" />
        <path d="m2 12 4 4 4-4" />
        <path d="M18 8V5a2 2 0 0 0-2-2h-3" />
        <path d="M6 16v3a2 2 0 0 0 2 2h3" />
      </svg>
    ),
  },
  {
    title: "Team Collaboration",
    description:
      "Coordinate owners, managers, and agents with transparent actions and clear responsibilities.",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
    ),
  },
];

export default function PaletteDemoPage() {
  return (
    <div className="min-h-screen bg-palette-background">
      <PaletteNavbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,197,112,0.32),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(84,119,146,0.18),transparent_38%)]" />

        <div className="relative">
          <PaletteHero />

          <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-palette-primary">
                  Built For Speed And Clarity
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-palette-secondary sm:text-base">
                  Modular components, clear hierarchy, and expressive states
                  made with utility-first Tailwind classes.
                </p>
              </div>
              <PaletteButton variant="accent" className="hidden sm:inline-flex">
                Start Free Trial
              </PaletteButton>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <PaletteFeatureCard
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  icon={card.icon}
                />
              ))}
            </div>

            <div className="mt-10 rounded-3xl border border-palette-secondary/30 bg-white/75 p-6 backdrop-blur-sm sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-palette-secondary">
                Button System
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <PaletteButton variant="primary">Primary Action</PaletteButton>
                <PaletteButton variant="secondary">
                  Secondary Action
                </PaletteButton>
                <PaletteButton variant="outline">Outline Button</PaletteButton>
                <PaletteButton variant="accent">Accent CTA</PaletteButton>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
