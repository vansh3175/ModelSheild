"use client";
/**
 * SuccessConfetti
 * ─────────────────────────────────────────────────────────────
 * A one-shot burst of coloured particles that fan outward from the
 * centre of the element it's placed inside.  Uses framer-motion —
 * no extra dependency needed.
 *
 * Usage (place inside a `position: relative` container):
 *   {isSuccess && <SuccessConfetti />}
 */

import { motion } from "framer-motion";

const PALETTE = ["#00d4ff", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#e2eaf4"];

const PARTICLES = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * 360 + (Math.random() - 0.5) * 20;
  const distance = 70 + Math.random() * 90;
  const rad = (angle * Math.PI) / 180;
  return {
    id: i,
    tx: Math.cos(rad) * distance,
    ty: Math.sin(rad) * distance,
    color: PALETTE[i % PALETTE.length],
    size: 4 + Math.random() * 5,
    delay: Math.random() * 0.12,
    rotate: Math.random() * 360,
  };
});

export default function SuccessConfetti() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden rounded-2xl"
      style={{ zIndex: 0 }}
    >
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.tx,
            y: p.ty,
            scale: [0, 1.3, 1, 0],
            opacity: [1, 1, 0.7, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: 1.1,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, background: p.color }}
        />
      ))}
    </div>
  );
}
