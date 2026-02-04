interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: SectionHeaderProps) {
  const alignment = align === "center" ? "text-center" : "text-left";

  return (
    <div className={`space-y-2 ${alignment}`}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
          {eyebrow}
        </p>
      )}
      <h2 className="bg-gradient-to-r from-white via-slate-100 to-blue-300 bg-clip-text text-3xl font-semibold text-transparent md:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="text-sm text-slate-400 md:text-base">{subtitle}</p>
      )}
    </div>
  );
}
