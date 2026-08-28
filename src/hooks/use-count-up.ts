"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates an integer value from 0 up to `target` over ~900ms whenever
 * `target` changes (covers both mount and a future month change, since
 * both simply produce a new target). Skips straight to the final value
 * under prefers-reduced-motion.
 */
export function useCountUp(target: number): number {
  const [value, setValue] = useState(target);
  const prevTarget = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;

    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const tick = (now: number) => {
      if (reduceMotion) {
        setValue(target);
        return;
      }
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / DURATION_MS);
      setValue(Math.round(target * easeOutCubic(progress)));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  return value;
}
