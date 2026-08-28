"use client";

import { useLayoutEffect, useRef } from "react";

const SIZES = [76, 64, 56];

/**
 * Sets the ref'd element's font-size to the largest of SIZES that fits
 * `text` inside its parent without overflowing. Sized off the final
 * formatted string, not whatever's mid-animation, so the count-up never
 * triggers a size change partway through. Mutates the DOM node directly
 * (no React state) so there's no extra render and no flash before paint.
 */
export function useHeroFontSize(text: string) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    let finalSize = SIZES[SIZES.length - 1];
    for (const candidate of SIZES) {
      el.style.fontSize = `${candidate}px`;
      if (el.scrollWidth <= container.clientWidth) {
        finalSize = candidate;
        break;
      }
    }
    el.style.fontSize = `${finalSize}px`;
  }, [text]);

  return ref;
}
