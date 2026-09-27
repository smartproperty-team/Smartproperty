// ===========================================
// SmartProperty - Scroll reveal wrapper
// ===========================================

import type { CSSProperties, ReactNode } from "react";

import { useReveal } from "../../hooks/useReveal";
import "../../styles/motion.css";

export type RevealVariant = "up" | "fade" | "scale";

type RevealTag = "div" | "section" | "header" | "ul" | "ol" | "article" | "p";

interface RevealProps {
  children: ReactNode;
  /** Element to render; keeps semantics (section, ul, header...) intact. */
  as?: RevealTag;
  variant?: RevealVariant;
  /** Reveal the direct children one after another instead of as a block. */
  stagger?: boolean;
  /** Extra delay before the reveal starts, in milliseconds. */
  delay?: number;
  className?: string;
  id?: string;
  role?: string;
  "aria-labelledby"?: string;
}

/**
 * Fades its content in once, when it scrolls into view. The hidden state
 * only applies after the app marks the document `motion-ready`, and
 * reduced-motion users get the content immediately (see motion.css).
 */
export function Reveal({
  children,
  as = "div",
  variant = "up",
  stagger = false,
  delay = 0,
  ...rest
}: RevealProps) {
  // Every allowed tag takes the same generic HTML attributes used here, so
  // typing the element as a div is safe and keeps JSX checking simple.
  const Tag = as as "div";
  const { ref, revealed } = useReveal<HTMLElement>();
  const style = delay
    ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties)
    : undefined;

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-reveal-stagger={stagger ? "" : undefined}
      data-revealed={revealed ? "" : undefined}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
