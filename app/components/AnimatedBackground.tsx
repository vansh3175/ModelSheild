"use client";
/**
 * AnimatedBackground
 * ──────────────────────────────────────────────────────────
 * Fixed full-viewport layer rendered behind all page content.
 * Layers (bottom → top):
 *   1. Deep gradient base
 *   2. Moving grid overlay
 *   3. Three large soft radial "orbs" animated with framer-motion
 *   4. Subtle noise texture via SVG feTurbulence for depth
 *
 * GPU-accelerated only: uses transform / opacity — no layout thrash.
 */

import { motion } from "framer-motion";

const orbs = [
  // [x%, y%, size, color, duration, delay]
  ["10%",  "20%", 700, "rgba(0,212,255,0.07)",   22, 0],
  ["80%",  "15%", 500, "rgba(139,92,246,0.09)",  28, 3],
  ["55%",  "75%", 600, "rgba(0,212,255,0.05)",   32, 6],
] as const;

export default function AnimatedBackground() {
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
    </div>
  );
}
