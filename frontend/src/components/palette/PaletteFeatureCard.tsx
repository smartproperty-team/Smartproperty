import type { ReactNode } from "react";

interface PaletteFeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export function PaletteFeatureCard({
  title,
  description,
  icon,
}: PaletteFeatureCardProps) {
  return (
    <article className="group rounded-2xl border border-palette-secondary/25 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-palette-secondary/45 hover:shadow-lg hover:shadow-palette-secondary/20">
      <div className="mb-4 inline-flex rounded-xl bg-palette-secondary/15 p-3 text-palette-primary transition-colors group-hover:bg-palette-accent/35">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold text-palette-primary">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-palette-secondary">
        {description}
      </p>
      <a
        href="#"
        className="mt-4 inline-flex text-sm font-semibold text-palette-accent transition-colors hover:text-[#e8ad55]"
      >
        Learn more
      </a>
    </article>
  );
}
