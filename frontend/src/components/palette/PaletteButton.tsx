import { cn } from "@/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

const paletteButtonVariants = cva(
  "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-palette-primary disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-palette-primary text-white hover:bg-[#13264d] active:translate-y-px shadow-md shadow-palette-primary/20",
        secondary:
          "bg-palette-secondary text-white hover:bg-[#486a82] active:translate-y-px shadow-md shadow-palette-secondary/20",
        outline:
          "border border-palette-secondary/70 bg-white/70 text-palette-primary hover:bg-palette-secondary/10",
        accent:
          "bg-palette-accent text-palette-primary hover:bg-[#eeb45f] active:translate-y-px shadow-md shadow-palette-accent/25",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type PaletteButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof paletteButtonVariants>;

export function PaletteButton({
  className,
  variant,
  type = "button",
  ...props
}: PaletteButtonProps) {
  return (
    <button
      type={type}
      className={cn(paletteButtonVariants({ variant }), className)}
      {...props}
    />
  );
}
