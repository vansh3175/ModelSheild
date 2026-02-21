"use client";
/**
 * Navbar
 * ─────────────────────────────────────────────────────────────
 * Sticky glassmorphism navigation bar.
 * – Logo with animated shield icon + gradient text brand name
 * – Route links with active-state animated underline
 * – MetaMask connect button with live connection states:
 *     idle → connecting → connected (shows truncated address)
 * – Scroll shadow: becomes more opaque as user scrolls down
 */

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Wallet, Loader2, ChevronRight, Zap } from "lucide-react";

type ConnectState = "idle" | "connecting" | "connected";

const NAV_LINKS = [
  { href: "/",       label: "Register",       icon: <Zap size={14} /> },
  { href: "/verify", label: "Verify",          icon: <ShieldCheck size={14} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [connectState, setConnectState]   = useState<ConnectState>("idle");
  const [scrolled, setScrolled]           = useState(false);

  /* Darken navbar on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const connectWallet = async () => {
    if (connectState === "connected") return;
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask to use ModelShield!");
      return;
    }
    try {
      setConnectState("connecting");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer   = await provider.getSigner();
      const address  = await signer.getAddress();
      setWalletAddress(address);
      setConnectState("connected");
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setConnectState("idle");
    }
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : "";

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0,   opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50 w-full"
      style={{
        background: scrolled
          ? "rgba(3,15,34,0.92)"
          : "rgba(3,15,34,0.6)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(0,212,255,0.1)",
        boxShadow: scrolled
          ? "0 4px 40px rgba(0,0,0,0.6)"
          : "none",
        transition: "background 0.3s, box-shadow 0.3s",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-0 flex items-center justify-between h-16">

        {/* ── Brand ──────────────────────────────────────────── */}
        <Link href="/" className="flex items-center gap-2.5 group">
          {/* Animated glow icon */}
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div
              className="absolute inset-0 rounded-lg"
              style={{
                background: "rgba(0,212,255,0.25)",
                filter: "blur(8px)",
                transition: "opacity 0.3s",
              }}
            />
            <div
              className="relative flex items-center justify-center w-9 h-9 rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))",
                border: "1px solid rgba(0,212,255,0.4)",
              }}
            >
              <ShieldCheck size={18} style={{ color: "#00d4ff" }} />
            </div>
          </motion.div>

          <div className="flex flex-col leading-none">
            <span
              className="text-base font-bold tracking-tight"
              style={{
                background: "linear-gradient(90deg,#00d4ff,#8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              ModelShield
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              AI Integrity Registry
            </span>
          </div>
        </Link>

        {/* ── Nav Links ──────────────────────────────────────── */}
        <div className="hidden sm:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    color: active ? "#00d4ff" : "var(--text-secondary)",
                    background: active ? "rgba(0,212,255,0.08)" : "transparent",
                  }}
                >
                  <span style={{ color: active ? "#00d4ff" : "var(--text-muted)" }}>{icon}</span>
                  {label}
                  {/* Active underline pill */}
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                      style={{ background: "linear-gradient(90deg,#00d4ff,#8b5cf6)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>

        {/* ── Wallet Button ───────────────────────────────────── */}
        <motion.button
          onClick={connectWallet}
          whileHover={connectState !== "connected" ? { scale: 1.04 } : {}}
          whileTap={connectState !== "connected"   ? { scale: 0.97 } : {}}
          disabled={connectState === "connecting"}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{
            background:
              connectState === "connected"
                ? "rgba(16,185,129,0.15)"
                : "linear-gradient(135deg,rgba(0,212,255,0.15),rgba(139,92,246,0.15))",
            border:
              connectState === "connected"
                ? "1px solid rgba(16,185,129,0.5)"
                : "1px solid rgba(0,212,255,0.4)",
            color:
              connectState === "connected"
                ? "#10b981"
                : "#00d4ff",
            boxShadow:
              connectState === "connected"
                ? "0 0 16px rgba(16,185,129,0.2)"
                : "0 0 16px rgba(0,212,255,0.15)",
            cursor: connectState === "connected" ? "default" : "pointer",
          }}
        >
          <AnimatePresence mode="wait">
            {connectState === "connecting" ? (
              <motion.span
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Loader2 size={14} className="animate-spin" />
                Connecting…
              </motion.span>
            ) : connectState === "connected" ? (
              <motion.span
                key="connected"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2"
              >
                {/* Pulsing green dot */}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                {shortAddress}
              </motion.span>
            ) : (
              <motion.span
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Wallet size={14} />
                Connect Wallet
                <ChevronRight size={12} style={{ opacity: 0.6 }} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.nav>
  );
}
