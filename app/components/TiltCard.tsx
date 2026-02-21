"use client";
/**
 * TiltCard
 * ─────────────────────────────────────────────────────────────
 * Wraps any card content with:
 *   – 3-D perspective tilt that follows the cursor (spring-damped)
 *   – A radial "spotlight" glow that tracks mouse position inside the card
 *   – Subtle scale-up on hover
 *
 * The parent needs no special styles.  perspective is applied
 * via the outer wrapper div so children keep normal stacking.
 *
 * Usage:
 *   <TiltCard className="rounded-2xl" style={{ background: "..." }}>
 *     ...children...
 *   </TiltCard>
 */

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
} from "framer-motion";

interface Props {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Max tilt degrees — default 2 */
  maxTilt?: number;
}

export default function TiltCard({
  children,
  className = "",
  style,
  maxTilt = 2,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState({ x: 50, y: 50, visible: false });

  /* Raw normalised mouse position: -0.5 → +0.5 */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  /* Spring-damped rotation — slow & gentle */
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 120,
    damping: 30,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 120,
    damping: 30,
  });
  const scale = useSpring(1, { stiffness: 120, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(nx);
    my.set(ny);
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
      visible: true,
    });
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
    scale.set(1);
    setSpot((s) => ({ ...s, visible: false }));
  };

  return (
    /* perspective wrapper – keeps children unaffected */
    <div style={{ perspective: 2000 }}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => scale.set(1)}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, scale, transformStyle: "preserve-3d", ...style }}
        className={`relative ${className}`}
      >
        {/* Spotlight layer */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
          style={{
            opacity: spot.visible ? 1 : 0,
            background: `radial-gradient(circle at ${spot.x}% ${spot.y}%, rgba(0,212,255,0.04) 0%, transparent 60%)`,
            zIndex: 1,
          }}
        />
        {/* Content */}
        <div className="relative" style={{ zIndex: 2 }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
