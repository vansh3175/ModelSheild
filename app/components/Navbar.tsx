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

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Wallet, Loader2, ChevronRight, Zap, Copy, LogOut, Check } from "lucide-react";

type ConnectState = "idle" | "connecting" | "connected";

const NAV_LINKS = [
  { href: "/",          label: "Home",     icon: <Zap size={14} /> },
  { href: "/register",  label: "Register", icon: <Zap size={14} /> },
  { href: "/verify",    label: "Verify",   icon: <ShieldCheck size={14} /> },
];

export default function Navbar() {
  const pathname = usePathname();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [connectState, setConnectState]   = useState<ConnectState>("idle");
  const [scrolled, setScrolled]           = useState(false);
  const [dropdownOpen, setDropdownOpen]   = useState(false);
  const [copied, setCopied]               = useState(false);
  const [ensName, setEnsName]             = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Resolve ENS name on mainnet (silent — falls back to address on any failure) */
  useEffect(() => {
    if (!walletAddress) { setEnsName(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const mainnet = new ethers.JsonRpcProvider("https://cloudflare-eth.com");
        const name = await mainnet.lookupAddress(walletAddress);
        if (!cancelled) setEnsName(name ?? null);
      } catch {
        if (!cancelled) setEnsName(null);
      }
    })();
    return () => { cancelled = true; };
  }, [walletAddress]);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Darken navbar on scroll */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Auto-restore wallet if already authorised (no popup) */
  useEffect(() => {
    const restoreWallet = async () => {
      if (typeof window === "undefined" || !(window as any).ethereum) return;
      // Don't auto-reconnect if user explicitly disconnected this session
      if (sessionStorage.getItem("wallet_disconnected") === "1") return;
      try {
        const accounts: string[] = await (window as any).ethereum.request({
          method: "eth_accounts",
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setConnectState("connected");
        }
      } catch { /* ignore */ }
    };
    restoreWallet();

    // Also update if user switches accounts in MetaMask
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setWalletAddress("");
        setConnectState("idle");
      } else {
        setWalletAddress(accounts[0]);
        setConnectState("connected");
      }
    };
    (window as any).ethereum?.on?.("accountsChanged", handleAccountsChanged);
    return () => (window as any).ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
  }, []);

  const connectWallet = async () => {
    if (connectState === "connected") {
      setDropdownOpen((o) => !o);
      return;
    }
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask to use ModelShield!");
      return;
    }
    try {
      setConnectState("connecting");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer   = await provider.getSigner();
      const address  = await signer.getAddress();
      sessionStorage.removeItem("wallet_disconnected"); // clear disconnect flag
      setWalletAddress(address);
      setConnectState("connected");
    } catch (err) {
      console.error("Wallet connection failed:", err);
      setConnectState("idle");
    }
  };

  const disconnectWallet = () => {
    sessionStorage.setItem("wallet_disconnected", "1"); // persist across refresh
    setWalletAddress("");
    setConnectState("idle");
    setDropdownOpen(false);
  };

  const copyAddress = async () => {
    if (!walletAddress) return;
    await navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : "";

  /* What to show on the button: ENS name if resolved, otherwise short address */
  const displayName = ensName ?? shortAddress;

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

        {/* ── Wallet Button + Disconnect Dropdown ─────────────── */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            onClick={connectWallet}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
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
              cursor: connectState === "connecting" ? "not-allowed" : "pointer",
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
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  {displayName}
                  <ChevronRight
                    size={12}
                    style={{
                      opacity: 0.6,
                      transform: dropdownOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  />
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

          {/* ── Dropdown panel ── */}
          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0,  scale: 1 }}
                exit={{ opacity: 0,  y: -8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-64 rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(3,15,34,0.96)",
                  border: "1px solid rgba(0,212,255,0.18)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,255,0.06)",
                  zIndex: 100,
                }}
              >
                {/* Identity */}
                <div className="px-4 pt-4 pb-3 space-y-2">
                  {/* ENS name — shown only when resolved */}
                  {ensName && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{
                          background: "linear-gradient(135deg,rgba(0,212,255,0.2),rgba(139,92,246,0.2))",
                          border: "1px solid rgba(0,212,255,0.3)",
                          color: "#00d4ff",
                        }}
                      >
                        {ensName[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold" style={{ color: "#e2eaf4" }}>
                        {ensName}
                      </span>
                    </div>
                  )}

                  {/* Wallet address row */}
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                      {ensName ? "Address" : "Connected wallet"}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-xs font-mono truncate"
                        style={{ color: "#10b981", letterSpacing: "0.03em" }}
                      >
                        {walletAddress.slice(0, 10)}…{walletAddress.slice(-8)}
                      </span>
                      <button
                        onClick={copyAddress}
                        className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                        style={{
                          background: copied ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: copied ? "#10b981" : "var(--text-muted)",
                        }}
                        title="Copy full address"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ height: "1px", background: "rgba(0,212,255,0.1)" }} />

                {/* Disconnect */}
                <button
                  onClick={disconnectWallet}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-colors"
                  style={{ color: "#f87171" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(248,113,113,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={14} />
                  Disconnect wallet
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.nav>
  );
}
