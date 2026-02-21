"use client";
/**
 * AnimatedBackground
 * ──────────────────────────────────────────────────────────
 * Fixed full-viewport layer rendered behind all page content.
 * Layers (bottom → top):
 *   1. Deep gradient base
 *   2. Moving grid overlay
 *   3. Three large soft radial "orbs" animated with framer-motion
 *   4. Floating micro-particles (small drifting dots)
 *   5. Subtle vignette
 *
 * GPU-accelerated only: uses transform / opacity — no layout thrash.
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const orbs = [
  // [x%, y%, size, color, duration, delay]
  ["10%",  "20%", 700, "rgba(0,212,255,0.07)",   22, 0],
  ["80%",  "15%", 500, "rgba(139,92,246,0.09)",  28, 3],
  ["55%",  "75%", 600, "rgba(0,212,255,0.05)",   32, 6],
] as const;

/* Deterministic pseudo-random so SSR matches client */
const seededRand = (seed: number) => {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
};

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left:     `${(seededRand(i * 3)     * 100).toFixed(4)}%`,
  top:      `${(seededRand(i * 3 + 1) * 100).toFixed(4)}%`,
  size:     `${(1.5 + seededRand(i * 3 + 2) * 2.5).toFixed(4)}px`,
  duration: 14 + seededRand(i * 7) * 18,
  delay:    seededRand(i * 11) * 10,
  dx:       (seededRand(i * 13) - 0.5) * 60,
  dy:       (seededRand(i * 17) - 0.5) * 60,
  color:    i % 3 === 0 ? "rgba(0,212,255,0.5)" : i % 3 === 1 ? "rgba(139,92,246,0.45)" : "rgba(255,255,255,0.25)",
}));

export default function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ── 1. Moving grid ─────────────────────────────────── */}
      <div className="absolute inset-0 animated-grid opacity-100" />

      {/* ── 2. Ambient radial orbs ─────────────────────────── */}
      {orbs.map(([x, y, size, color, duration, delay], i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            left: x,
            top:  y,
            width:  size,
            height: size,
            marginLeft: -(size / 2),
            marginTop:  -(size / 2),
            borderRadius: "50%",
            background: color,
            filter: "blur(80px)",
          }}
          animate={{
            x:     [0,  40, -20,  0],
            y:     [0, -30,  20,  0],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ── 3. Faint vignette to focus light at center ─────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, rgba(1,10,24,0.85) 100%)",
        }}
      />

      {/* ── 4. Floating micro-particles (client-only to avoid hydration mismatch) */}
      {mounted && PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: p.color,
          }}
          animate={{
            x: [0, p.dx, 0],
            y: [0, p.dy, 0],
            opacity: [0, 0.7, 0.4, 0.7, 0],
            scale:   [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: p.duration,
            delay:    p.delay,
            repeat:   Infinity,
            ease:     "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
