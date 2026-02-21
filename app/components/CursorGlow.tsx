"use client";
/**
 * CursorGlow — subtle radial gradient that follows the cursor
 * Adds depth and life to the dark background without being distracting.
 */
import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const move = (e: MouseEvent) => {
      el.style.left = `${e.clientX}px`;
      el.style.top  = `${e.clientY}px`;
    };
    window.addEventListener("mousemove", move, { passive: true });
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return <div ref={ref} className="cursor-glow" aria-hidden="true" />;
}
