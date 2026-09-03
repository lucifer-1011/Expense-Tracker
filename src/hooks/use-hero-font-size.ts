"use client";

import { useLayoutEffect, useRef } from "react";

/** Largest size for a short amount (e.g. "₹1,993.00") -- the existing design ceiling, unchanged. */
const MAX_FONT_SIZE = 76;
/**
 * Smallest size a runaway-long amount is ever allowed to shrink to. Still
 * clearly bold and legible, and small enough that even the longest realistic
 * amount (crores, with paise) fits inside the narrowest supported viewport --
 * verified directly against the iPhone 16 (393px) content width.
 */
const MIN_FONT_SIZE = 22;
/** Arbitrary size used only to measure the text's natural (unconstrained) width; cancels out in the ratio below. */
const REFERENCE_FONT_SIZE = 100;

/**
 * Continuously scales the ref'd element's font-size so `text` always fits
 * inside its parent's width, down to MIN_FONT_SIZE -- no truncation, no
 * ellipsis, no horizontal overflow, however long the formatted amount gets.
 *
 * The previous implementation only ever tried three fixed sizes
 * ([76, 64, 56]) and silently kept the smallest of those even when it still
 * didn't fit, which is why a hero amount like ₹12,39,790.50 overflowed the
 * iPhone viewport instead of shrinking further.
 *
 * This measures the text once at REFERENCE_FONT_SIZE, then solves for the
 * exact font size whose width matches the space actually available to the
 * element itself: glyph width scales linearly with font-size for a fixed
 * font/weight/letter-spacing, so this is an exact single-shot computation
 * rather than an iterative search -- which is what makes the scaling
 * genuinely smooth (continuous) instead of stepped between a handful of
 * sizes.
 *
 * "Available width" is deliberately read from the element's own clientWidth
 * (while its font is briefly shrunk to 1px, so its content can't be the
 * thing constraining it) rather than the parent's clientWidth. The parent
 * has horizontal padding (px-[22px] here), and clientWidth includes an
 * element's own padding -- so the parent's clientWidth is the OUTER edge of
 * that padding, not the narrower content box a width:auto child is actually
 * confined to. Fitting text to the parent's clientWidth undercounts the
 * padding entirely and overflows by exactly that much either side.
 *
 * Sized off the final formatted string, not whatever's mid-animation, so
 * the count-up never triggers a size change partway through. A
 * ResizeObserver on the container (not the text element itself, so this
 * can't feed back into its own trigger) re-measures on any width change --
 * window resize, orientation change -- even when the text hasn't changed.
 * Mutates the DOM node directly (no React state), so there's no extra
 * render and no flash before paint.
 */
export function useHeroFontSize(text: string) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    // Must never wrap: at REFERENCE_FONT_SIZE the string is almost always
    // wider than the container, and without this the browser wraps it onto
    // multiple lines before scrollWidth is read below -- which reports the
    // wrapped (narrower) line's width, not the text's true natural width,
    // and silently under-corrects the resulting font size.
    el.style.whiteSpace = "nowrap";

    function fit() {
      // A width:auto block always fills its allotted content box regardless
      // of how little its own content needs, as long as that content isn't
      // forcing it wider -- so clientWidth at a trivially small font size is
      // exactly the space available to this element, already netted of the
      // parent's padding/border, with no need to inspect the parent at all.
      el!.style.fontSize = "1px";
      const availableWidth = el!.clientWidth;
      if (availableWidth <= 0) return;

      el!.style.fontSize = `${REFERENCE_FONT_SIZE}px`;
      const naturalWidth = el!.scrollWidth;

      const idealFontSize =
        naturalWidth > 0 ? (REFERENCE_FONT_SIZE * availableWidth) / naturalWidth : MAX_FONT_SIZE;
      const clampedFontSize = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, idealFontSize));
      el!.style.fontSize = `${clampedFontSize}px`;
    }

    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text]);

  return ref;
}
