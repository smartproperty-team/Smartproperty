// ===========================================
// SmartProperty - Scroll reveal hook
// ===========================================

import { useCallback, useEffect, useState } from "react";

interface RevealOptions {
  /** Share of the element that must be visible before it reveals. */
  threshold?: number;
  rootMargin?: string;
}

/**
 * Reports once when an element scrolls into view, then stops observing.
 *
 * `ref` is a callback ref, so it also works for elements that mount later
 * (conditionally rendered sections). Without IntersectionObserver the
 * element counts as revealed from the start, so content is never hidden
 * where the API is missing.
 */
export function useReveal<T extends Element = HTMLDivElement>({
  threshold = 0.2,
  rootMargin = "0px 0px -8% 0px",
}: RevealOptions = {}) {
  const [element, setElement] = useState<T | null>(null);
  const [revealed, setRevealed] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const ref = useCallback((node: T | null) => setElement(node), []);

  useEffect(() => {
    if (!element || revealed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, threshold, rootMargin, revealed]);

  return { ref, revealed };
}
