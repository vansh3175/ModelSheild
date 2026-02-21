"use client";
/**
 * ModelShield — Landing Page
 * Unique, interactive, high-quality landing page with:
 * – Full-viewport hero with 3D shield visualization
 * – Animated stats counter
 * – Three-step how-it-works
 * – Feature cards with noise grain texture
 * – Terminal demo + CTA section
 */

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView, useScroll, useTransform, useSpring } from "framer-motion";
import {
  ShieldCheck, Fingerprint, Lock, Zap,
  ExternalLink, ArrowRight, ChevronDown, Cpu,
  Globe, Eye, GitBranch, Layers, Terminal,
} from "lucide-react";

/* ── Count-up hook ──────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ── Shield visualization ───────────────────────────── */
// Precompute all trig at module level with fixed precision so SSR and client
// produce identical strings and avoid React hydration mismatches.
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const ORBIT_R  = 200;
const LINE_R   = 182;
const VIZ_NODES = [
  { a: 0,   l: "SHA-256",    c: "#00d4ff" },
  { a: 60,  l: "Blockchain", c: "#8b5cf6" },
  { a: 120, l: "NFT Token",  c: "#00d4ff" },
  { a: 180, l: "Sepolia",    c: "#8b5cf6" },
  { a: 240, l: "TensorFlow", c: "#00d4ff" },
  { a: 300, l: "PyTorch",    c: "#8b5cf6" },
].map((n) => {
  const rad = (n.a * Math.PI) / 180;
  return {
    ...n,
    nx:  r4(Math.cos(rad) * ORBIT_R),
    ny:  r4(Math.sin(rad) * ORBIT_R),
    lx2: r4(Math.cos(rad) * LINE_R),
    ly2: r4(Math.sin(rad) * LINE_R),
  };
});

function ShieldViz() {
  const nodes = VIZ_NODES;
  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      {/* Rings */}
      {[400, 300, 200].map((size, i) => (
        <motion.div
          key={size}
          className="absolute rounded-full"
          style={{
            width: size, height: size,
            border: i === 1 ? "1px dashed rgba(139,92,246,0.18)" : "1px solid rgba(0,212,255,0.12)",
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: [60, 40, 25][i], repeat: Infinity, ease: "linear" }}
        />
      ))}

      {/* Center shield */}
      <motion.div
        className="absolute flex items-center justify-center rounded-2xl"
        style={{
          width: 90, height: 90,
          background: "linear-gradient(135deg,rgba(0,212,255,0.15),rgba(139,92,246,0.15))",
          border: "1px solid rgba(0,212,255,0.4)",
        }}
        animate={{
          boxShadow: [
            "0 0 40px rgba(0,212,255,0.25),0 0 80px rgba(139,92,246,0.1)",
            "0 0 60px rgba(0,212,255,0.45),0 0 120px rgba(139,92,246,0.2)",
            "0 0 40px rgba(0,212,255,0.25),0 0 80px rgba(139,92,246,0.1)",
          ],
          scale: [1, 1.04, 1],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <ShieldCheck size={44} style={{ color: "#00d4ff" }} strokeWidth={1.5} />
      </motion.div>

      {/* Orbiting nodes */}
      {nodes.map((n, i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center"
          style={{ left: "50%", top: "50%", x: n.nx - 32, y: n.ny - 16 }}
          animate={{ x: [n.nx - 32, n.nx - 28, n.nx - 32], y: [n.ny - 16, n.ny - 20, n.ny - 16] }}
          transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
        >
          <div className="w-3 h-3 rounded-full mb-1" style={{ background: n.c, boxShadow: `0 0 8px ${n.c},0 0 20px ${n.c}40` }} />
          <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: "rgba(255,255,255,0.5)" }}>{n.l}</span>
        </motion.div>
      ))}

      {/* SVG lines */}
      <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%" viewBox="-250 -250 500 500" style={{ overflow: "visible" }}>
        {nodes.map((n, i) => (
          <motion.line key={i}
            x1={0} y1={0} x2={n.lx2} y2={n.ly2}
            stroke={n.c} strokeWidth={0.5} strokeDasharray="4 4"
            animate={{ strokeOpacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.35 }}
          />
        ))}
      </svg>
    </div>
  );
}

/* ── Glow CTA Button ────────────────────────────────── */
function GlowButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary"|"outline" }) {
  return (
    <Link href={href}>
      <motion.div
        className="relative inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-sm overflow-hidden cursor-pointer"
        style={variant === "primary" ? {
          background: "linear-gradient(135deg,#00d4ff,#8b5cf6)",
          boxShadow: "0 8px 32px rgba(0,212,255,0.35),0 2px 0 rgba(255,255,255,0.1) inset",
          color: "#fff",
        } : {
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "rgba(255,255,255,0.8)",
        }}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        {variant === "primary" && (
          <motion.div
            className="absolute inset-0"
            style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)", backgroundSize: "200% 100%" }}
            animate={{ backgroundPosition: ["-200% center", "200% center"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        )}
        <span className="relative flex items-center gap-2">{children}</span>
      </motion.div>
    </Link>
  );
}

/* ── Scroll-triggered reveal ─────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >{children}</motion.div>
  );
}

/* ── Stats ──────────────────────────────────────────── */
const STATS = [
  { value: 3,   suffix: "",  label: "Hash Layers",       desc: "File · Structural · Behavioral" },
  { value: 100, suffix: "%", label: "On-Chain",          desc: "Fully decentralised registry" },
  { value: 0,   suffix: "",  label: "Custody Required",  desc: "Non-custodial, permissionless" },
  { value: 256, suffix: "b", label: "Fingerprint Depth", desc: "SHA-256 cryptographic hash" },
];

function StatCard({ value, suffix, label, desc, start }: typeof STATS[0] & { start: boolean }) {
  const count = useCountUp(value, 1800, start);
  return (
    <div className="flex-1 min-w-[150px] px-6 py-5 rounded-2xl flex flex-col gap-1"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="text-3xl font-black tabular-nums" style={{
        background: "linear-gradient(135deg,#e2eaf4,#00d4ff)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>{count}{suffix}</span>
      <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{desc}</span>
    </div>
  );
}

/* ── How-it-works steps ─────────────────────────────── */
const STEPS = [
  { num: "01", icon: <Fingerprint size={28} strokeWidth={1.5} />, title: "Upload your model", desc: "Drop any Scikit-Learn (.pkl) or TensorFlow (.h5/.keras) file. We never store it — only cryptographic fingerprints are computed.", color: "#00d4ff" },
  { num: "02", icon: <Cpu size={28} strokeWidth={1.5} />, title: "Generate fingerprints", desc: "Our backend derives three orthogonal hash values: a file hash, structural hash of the architecture, and a behavioral hash from inference patterns.", color: "#8b5cf6" },
  { num: "03", icon: <ShieldCheck size={28} strokeWidth={1.5} />, title: "Anchor to blockchain", desc: "MetaMask signs a transaction minting an NFT representing your model's identity on Sepolia. Immutable. Timestamped. Publicly verifiable.", color: "#00d4ff" },
];

/* ── Feature cards ───────────────────────────────────── */
const FEATURES = [
  { size: "lg", icon: <Lock size={32} strokeWidth={1.5} />, title: "Tamper-proof identity", desc: "Every registered model receives a unique on-chain token. Even a single changed weight produces a completely different fingerprint — making silent modification instantly detectable.", tag: "Core", color: "#00d4ff", accent: "rgba(0,212,255,0.06)" },
  { size: "sm", icon: <Eye size={24} strokeWidth={1.5} />, title: "Plagiarism detection", desc: "Structural + behavioral hashes catch copied architectures even when weights are retrained from scratch.", tag: "Protection", color: "#8b5cf6", accent: "rgba(139,92,246,0.06)" },
  { size: "sm", icon: <Globe size={24} strokeWidth={1.5} />, title: "Public verification", desc: "Anyone can verify a model's authenticity without trusting a central authority.", tag: "Open", color: "#00d4ff", accent: "rgba(0,212,255,0.05)" },
  { size: "sm", icon: <GitBranch size={24} strokeWidth={1.5} />, title: "Version provenance", desc: "Register model variants and track provenance across fine-tuning iterations.", tag: "Provenance", color: "#8b5cf6", accent: "rgba(139,92,246,0.05)" },
  { size: "lg", icon: <Layers size={32} strokeWidth={1.5} />, title: "Three-layer fingerprinting", desc: "File Hash captures raw bytes. Structural Hash maps the architecture graph. Behavioral Hash samples inference outputs — giving you redundant, multi-dimensional proof of identity.", tag: "Forensics", color: "#8b5cf6", accent: "rgba(139,92,246,0.06)" },
];

function FeatureCard({ icon, title, desc, tag, color, accent }: typeof FEATURES[0]) {
  return (
    <motion.div
      className="rounded-2xl p-7 h-full flex flex-col gap-4 group relative overflow-hidden cursor-default"
      style={{ background: accent, border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(16px)", minHeight: 200 }}
      whileHover={{ borderColor: `${color}35`, background: accent.replace(/0\.(0[56])/, (_, m) => `0.${parseInt(m)+4 < 10 ? '0'+(parseInt(m)+4) : parseInt(m)+4}`) }}
      transition={{ duration: 0.3 }}
    >
      {/* Noise grain */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
        backgroundSize: "200px 200px", mixBlendMode: "overlay", borderRadius: "inherit", opacity: 0.4,
      }} />

      <div className="flex items-start justify-between">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}12`, border: `1px solid ${color}22`, color }}>
          {icon}
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
          style={{ background: `${color}0f`, border: `1px solid ${color}20`, color: `${color}bb` }}>
          {tag}
        </span>
      </div>

      <div>
        <h3 className="text-base font-bold mb-2" style={{ color: "rgba(226,234,244,0.92)" }}>{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{desc}</p>
      </div>

      <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at bottom right,${color}20,transparent 70%)` }} />
    </motion.div>
  );
}

/* ── Terminal demo ───────────────────────────────────── */
const LINES = [
  { t: "$ model-shield fingerprint ./gpt_finetune.h5",   c: "#00d4ff" },
  { t: "  ✓ File loaded: 842 MB",                        c: "#10b981" },
  { t: "  → Computing file hash…",                       c: "rgba(255,255,255,0.4)" },
  { t: "  file_hash   = 0x8f3a9c2d1e…b7f4",             c: "#e2eaf4" },
  { t: "  → Extracting structural graph…",               c: "rgba(255,255,255,0.4)" },
  { t: "  struct_hash = 0x2b7d1f8e4a…c930",             c: "#e2eaf4" },
  { t: "  → Running behavioral probe…",                  c: "rgba(255,255,255,0.4)" },
  { t: "  behav_hash  = 0xa4e7f2c816…4509",             c: "#e2eaf4" },
  { t: "  ✓ No duplicates found on-chain",               c: "#10b981" },
  { t: "  → Minting NFT token on Sepolia…",              c: "rgba(255,255,255,0.4)" },
  { t: "  ✓ Token ID: 42  |  tx: 0x1d9a…f3c2",         c: "#00d4ff" },
];

function TerminalDemo() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let n = 0;
    const id = setInterval(() => { n++; setCount(n); if (n >= LINES.length) clearInterval(id); }, 240);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="rounded-2xl overflow-hidden font-mono text-sm"
      style={{ background: "rgba(5,12,30,0.9)", border: "1px solid rgba(0,212,255,0.15)", boxShadow: "0 0 60px rgba(0,212,255,0.08)" }}>
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)" }}>
        {["#ef4444","#f59e0b","#10b981"].map((c) => (
          <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
        ))}
        <span className="ml-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>model-shield — bash</span>
        <Terminal size={12} className="ml-auto" style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
      {/* Lines */}
      <div className="p-5 space-y-1.5 min-h-[260px]">
        {LINES.slice(0, count).map((l, i) => (
          <motion.p key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }} style={{ color: l.c, lineHeight: 1.65 }}>{l.t}</motion.p>
        ))}
        {count < LINES.length && (
          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity }} style={{ color: "#00d4ff" }}>█</motion.span>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════ */
export default function LandingPage() {
  const heroRef   = useRef(null);
  const statsRef  = useRef(null);
  const statsInView = useInView(statsRef, { once: true });

  // Page-level scroll in raw pixels — so transforms play out over a full
  // viewport height instead of snapping within the section's own scroll range.
  const { scrollY } = useScroll();

  // Smooth (spring-damped) versions keep motion silky on fast scrolls.
  const smoothScrollY = useSpring(scrollY, { stiffness: 60, damping: 20, mass: 0.3 });

  // Parallax: only shifts 60 px over the first 800 px of page scroll.
  const heroY = useTransform(smoothScrollY, [0, 800], [0, -60]);

  // Opacity: stays fully visible until 300 px, then gently fades to 0 at 750 px.
  const heroOpacity = useTransform(smoothScrollY, [0, 300, 750], [1, 1, 0]);

  return (
    <div className="overflow-x-hidden">

      {/* ═══════ HERO ═══════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center pt-20 pb-16">
        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="w-full max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-6 items-center">

          {/* LEFT: copy */}
          <div className="flex flex-col gap-7">
            {/* Live badge */}
            <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2.5 self-start px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
              style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.22)", color: "#00d4ff" }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              Live on Sepolia Testnet
            </motion.div>

            {/* Big headline — outline + filled mix */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
              <p className="text-[clamp(3.5rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.03em] select-none"
                style={{ WebkitTextStroke: "1.5px rgba(0,212,255,0.18)", color: "transparent" }}>
                MODEL
              </p>
              <p className="text-[clamp(3.5rem,8vw,7rem)] font-black leading-[0.9] tracking-[-0.03em] -mt-2"
                style={{ background: "linear-gradient(135deg,#e2eaf4 0%,#00d4ff 45%,#8b5cf6 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                SHIELD
              </p>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="text-lg max-w-md leading-relaxed" style={{ color: "rgba(226,234,244,0.55)" }}>
              Cryptographic fingerprinting and{" "}
              <span style={{ color: "#00d4ff" }}>immutable on-chain registration</span>{" "}
              for AI models. Prove ownership. Detect plagiarism. Protect your work.
            </motion.p>

            {/* CTAs */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }} className="flex flex-wrap gap-4">
              <GlowButton href="/register" variant="primary">
                <Zap size={16} /> Register a Model
              </GlowButton>
              <GlowButton href="/verify" variant="outline">
                <ShieldCheck size={16} /> Verify Ownership <ArrowRight size={14} />
              </GlowButton>
            </motion.div>

            {/* Micro-badges */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
              className="flex flex-wrap gap-3">
              {["ERC-721 NFT","Sepolia Chain","MetaMask","Non-custodial"].map((t) => (
                <span key={t} className="text-[11px] px-3 py-1 rounded-full font-medium"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          {/* RIGHT: 3-D visualization */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="relative h-[460px] hidden lg:block">
            <ShieldViz />
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-xs tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.2)" }}>scroll</span>
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown size={16} style={{ color: "rgba(255,255,255,0.2)" }} />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════ STATS ══════════════════════════════════ */}
      <section ref={statsRef} className="py-6 px-4">
        <Reveal>
          <div className="max-w-7xl mx-auto rounded-2xl px-6 py-4 flex flex-wrap gap-4"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {STATS.map((s, i) => <StatCard key={i} {...s} start={statsInView} />)}
          </div>
        </Reveal>
      </section>

      {/* ═══════ HOW IT WORKS ═══════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16">
              <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: "rgba(0,212,255,0.7)" }}>How it works</p>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: "rgba(226,234,244,0.92)" }}>
                From file to{" "}
                <span style={{ background: "linear-gradient(135deg,#00d4ff,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  blockchain proof
                </span>
                <br />in three steps.
              </h2>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-[1px]"
              style={{ background: "linear-gradient(90deg,transparent,rgba(0,212,255,0.2),transparent)" }} />

            {STEPS.map((s, i) => (
              <Reveal key={i} delay={i * 0.12}>
                <motion.div
                  className="relative rounded-2xl p-7 h-full flex flex-col gap-5 group cursor-default"
                  style={{ background: "rgba(5,15,40,0.6)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}
                  whileHover={{ borderColor: `${s.color}40`, boxShadow: `0 0 40px ${s.color}15` }}
                  transition={{ duration: 0.3 }}>
                  <span className="absolute top-5 right-6 text-6xl font-black leading-none select-none"
                    style={{ WebkitTextStroke: `1px ${s.color}20`, color: "transparent" }}>{s.num}</span>
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: `${s.color}0f`, border: `1px solid ${s.color}25`, color: s.color }}>{s.icon}</div>
                  <div>
                    <h3 className="text-lg font-bold mb-2" style={{ color: "rgba(226,234,244,0.92)" }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{s.desc}</p>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════════════════════════════ */}
      <section className="py-24 px-4" style={{ background: "rgba(0,0,0,0.18)" }}>
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <div className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-3" style={{ color: "rgba(139,92,246,0.7)" }}>Features</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: "rgba(226,234,244,0.92)" }}>
                  Everything you need<br />to protect your AI.
                </h2>
              </div>
              <p className="text-sm max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                Built for researchers, startups, and enterprises who need tamper-evident provenance for their models.
              </p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-5">
            <Reveal delay={0}     className="md:col-span-2"><FeatureCard {...FEATURES[0]} /></Reveal>
            <Reveal delay={0.1}                            ><FeatureCard {...FEATURES[1]} /></Reveal>
            <Reveal delay={0.05}                           ><FeatureCard {...FEATURES[2]} /></Reveal>
            <Reveal delay={0.1}                            ><FeatureCard {...FEATURES[3]} /></Reveal>
            <Reveal delay={0.15}                           ><FeatureCard {...FEATURES[4]} /></Reveal>
          </div>
        </div>
      </section>

      {/* ═══════ TERMINAL + CTA ═════════════════════════ */}
      <section className="py-28 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal><TerminalDemo /></Reveal>

          <Reveal delay={0.15}>
            <div className="flex flex-col gap-7">
              <div>
                <p className="text-xs font-semibold tracking-[0.3em] uppercase mb-4" style={{ color: "rgba(0,212,255,0.6)" }}>Ready to use</p>
                <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight" style={{ color: "rgba(226,234,244,0.92)" }}>
                  Protect your model<br />
                  <span style={{ background: "linear-gradient(135deg,#00d4ff,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    in under a minute.
                  </span>
                </h2>
              </div>
              <p className="text-base leading-relaxed" style={{ color: "rgba(226,234,244,0.4)" }}>
                No account needed. No servers storing your model. Just your wallet, your file, and the blockchain.
              </p>

              <div className="space-y-3">
                {["Connect MetaMask — one click","Upload your .pkl or .h5 model file","Approve the transaction — pay only gas","Your model is permanently registered"].map((item, i) => (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-sm" style={{ color: "rgba(226,234,244,0.6)" }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    {item}
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <GlowButton href="/register" variant="primary"><Zap size={16} /> Get Started Free</GlowButton>
                <GlowButton href="/verify"   variant="outline"><Eye size={16} /> Verify a Model</GlowButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════ FOOTER ═════════════════════════════════ */}
      <footer className="py-10 px-6 mt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={20} style={{ color: "#00d4ff" }} />
            <span className="font-bold text-sm" style={{ color: "rgba(226,234,244,0.8)" }}>ModelShield</span>
          </div>
          <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
            Decentralised AI model registry on Ethereum Sepolia.
          </p>
          <div className="flex items-center gap-5">
            {[{ href: "/register", label: "Register" }, { href: "/verify", label: "Verify" }].map((l) => (
              <Link key={l.href} href={l.href} className="text-xs hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>{l.label}</Link>
            ))}
            <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer"
              className="text-xs flex items-center gap-1 hover:text-white transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
              Etherscan <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
