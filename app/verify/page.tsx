"use client";
/**
 * Verify Page — /verify
 * ─────────────────────────────────────────────────────────────
 * Plagiarism detection page: uploads a model file, generates its
 * fingerprints via the Python backend, then cross-checks them
 * against the on-chain registry using a two-level scan:
 *
 *  L1 — Exact Match:  registeredModels(fileHash)
 *  L2 — Deep Scan:    checkPlagiarism(structuralHash, behavioralHash)
 *
 * Result states:
 *  "EXACT"    → red card   — direct binary copy
 *  "DEEP"     → amber card — architecture/behavior clone (file tampered)
 *  "CLEAN"    → green card — original, not found on registry
 *
 * Design: dark themed, Framer Motion reveal animations, scan-line
 * loader, pixel-level indicator badges, glassmorphism panels.
 */

import { useState, useRef, useCallback } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud, ScanLine, ShieldCheck, ShieldAlert,
  AlertOctagon, User, Calendar, FileCode2, Cpu, Layers,
  CheckCircle2, XCircle, MinusCircle, Hash
} from "lucide-react";
import ScrambleText from "@/app/components/ScrambleText";
import TiltCard    from "@/app/components/TiltCard";

/* ── Sepolia network enforcer ────────────────────────────── */
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

async function ensureSepolia() {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask is not installed!");
  const currentChain: string = await eth.request({ method: "eth_chainId" });
  if (currentChain.toLowerCase() === SEPOLIA_CHAIN_ID) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchErr: any) {
    if (switchErr?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: SEPOLIA_CHAIN_ID,
          chainName: "Sepolia Testnet",
          nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        }],
      });
    } else {
      throw switchErr;
    }
  }
}

/* ── Contract ──────────────────────────────────────────────── */
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xB33696938e5b161b337d58C03b98f7C28b065c0f";

const contractABI = [
  "function hashToTokenId(string memory) public view returns (uint256)",
  "function registeredModels(uint256) public view returns (string fileHash, string structuralHash, string behavioralHash, uint256 timestamp, address owner, uint256 licenseFee)",
  "function checkPlagiarism(string memory _s, string memory _b) public view returns (bool found, string memory matchedFileHash)",
  "function buyLicense(uint256 _tokenId) public payable",
];

/* ── Types ─────────────────────────────────────────────────── */
type MatchKind = "EXACT" | "DEEP" | "CLEAN";
interface Report {
  kind: MatchKind;
  local: Record<string, string>;
  original?: {
    fileHash: string;
    structuralHash: string;
    behavioralHash: string;
    owner: string;
    date: string;
  };
}

/* ── Evidence badge helper ─────────────────────────────────── */
function EvidenceBadge({ match, label }: { match: boolean | null; label: string }) {
  const icon  = match === true  ? <XCircle    size={13} />
              : match === false ? <CheckCircle2 size={13} />
              : <MinusCircle size={13} />;
  const color = match === true  ? { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",   text: "#ef4444" }
              : match === false ? { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)", text: "#10b981" }
              : { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)", text: "#64748b" };

  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl"
         style={{ background: color.bg, border: `1px solid ${color.border}` }}>
      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
        {icon}
        {match === true ? "MATCH" : match === false ? "CLEAN" : "N/A"}
      </span>
    </div>
  );
}
/* ── License Panel component ───────────────────────────────── */
function LicensePanel({
  fileHash, status, txHash, onBuy
}: {
  fileHash: string;
  status: LicenseStatus;
  txHash: string;
  onBuy: (hash: string) => void;
}) {
  return (
    <div
      className="mx-6 mb-6 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(0,212,255,0.05))",
        border: "1px solid rgba(139,92,246,0.3)",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.08)" }}
      >
        <span className="text-sm font-bold" style={{ color: "#8b5cf6" }}>
          Use This Model Legally
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.3)" }}
        >
          NFT License
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Purchase a permanent on-chain license for <strong style={{ color: "var(--text-primary)" }}>0.01 ETH</strong>.
          Your wallet address will be recorded as a licensed user — verifiable by anyone on Etherscan.
        </p>

        {/* Buy button */}
        {status !== "bought" && (
          <motion.button
            onClick={() => onBuy(fileHash)}
            disabled={status === "buying"}
            whileHover={status !== "buying" ? { scale: 1.02, y: -1 } : {}}
            whileTap={status !== "buying"   ? { scale: 0.98 }        : {}}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: status === "buying"
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg, #8b5cf6, #00d4ff)",
              color: status === "buying" ? "var(--text-muted)" : "#fff",
              cursor: status === "buying" ? "not-allowed" : "pointer",
              border: "1px solid transparent",
              boxShadow: status === "buying" ? "none" : "0 4px 24px rgba(139,92,246,0.35)",
            }}
          >
            {status === "buying" ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 rounded-full"
                  style={{ border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #fff" }}
                />
                Processing payment…
              </>
            ) : (
              <>
                {/* ETH diamond icon */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 12l10 6 10-6L12 2zm0 3.5L19 12l-7 4.2L5 12l7-6.5z" opacity="0.6"/>
                  <path d="M2 14l10 6 10-6-10-5.8L2 14z"/>
                </svg>
                Buy License — 0.01 ETH
              </>
            )}
          </motion.button>
        )}

        {/* Error state */}
        {status === "error" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-center"
            style={{ color: "#ef4444" }}
          >
            Transaction failed or rejected. Please try again.
          </motion.p>
        )}

        {/* Success state */}
        {status === "bought" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.4)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)" }}
              >
                {/* Checkmark */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "#10b981" }}>License Purchased!</p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Your wallet is now a verified licensee on the blockchain.
                </p>
              </div>
            </div>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-mono px-3 py-2 rounded-lg break-all neon-link"
              style={{
                background: "rgba(0,212,255,0.05)",
                border: "1px solid rgba(0,212,255,0.2)",
                color: "#00d4ff",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              View on Etherscan: {txHash}
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
/* ── License buy status ───────ca─────────────────────────────── */
type LicenseStatus = "idle" | "buying" | "bought" | "error";

/* ── Main Component ────────────────────────────────────────── */
export default function Verify() {
  const [file,          setFile]          = useState<File | null>(null);
  const [dragOver,      setDragOver]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [scanStep,      setScanStep]      = useState<"l1" | "l2" | null>(null);
  const [report,        setReport]        = useState<Report | null>(null);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>("idle");
  const [licenseTxHash, setLicenseTxHash] = useState("");
  // tokenId is resolved during verification — reused in handleBuyLicense to avoid re-fetch
  const [matchedTokenId, setMatchedTokenId] = useState<bigint | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFile = (f: File) => {
    setFile(f);
    setReport(null);
    setLicenseStatus("idle");
    setMatchedTokenId(null);
    setLicenseTxHash("");
  };

  /* ── Buy license flow ──────────────────────────────────────── */
  const handleBuyLicense = async (fileHash: string) => {
    if (!(window as any).ethereum) return alert("MetaMask is required to buy a license!");
    try {
      setLicenseStatus("buying");
      await ensureSepolia();
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // Use tokenId stored during verification — avoids a second hashToTokenId call
      let tokenId: bigint | null = matchedTokenId;
      if (!tokenId || tokenId === 0n) {
        // Fallback: look it up (should not normally be needed)
        try {
          tokenId = BigInt(await contract.hashToTokenId(fileHash));
        } catch { /* ignore */ }
      }
      if (!tokenId || tokenId === 0n) throw new Error("Model not found on blockchain.");

      // Use licenseFee from contract (default 0.01 ETH if lookup fails)
      let fee: bigint = ethers.parseEther("0.01");
      try {
        const modelData = await contract.registeredModels(tokenId);
        if (modelData?.licenseFee) fee = BigInt(modelData.licenseFee);
      } catch { /* use default fee */ }

      const tx = await contract.buyLicense(tokenId, { value: fee });
      await tx.wait();
      setLicenseTxHash(tx.hash);
      setLicenseStatus("bought");
    } catch (err: any) {
      const rejected =
        err?.code === "ACTION_REJECTED" ||
        err?.code === 4001 ||
        err?.info?.error?.code === 4001 ||
        err?.message?.toLowerCase().includes("user denied") ||
        err?.message?.toLowerCase().includes("user rejected");
      if (rejected) {
        setLicenseStatus("idle");
      } else {
        console.error("License purchase failed:", err);
        setLicenseStatus("error");
      }
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) applyFile(f);
  }, []);

  /* ── Verification flow ─────────────────────────────────── */
  const handleVerify = async () => {
    if (!file) return;
    setLoading(true);
    setReport(null);
    setScanStep(null);

    try {
      // 1. Get fingerprints from Python backend
      const formData = new FormData();
      formData.append("file", file);
      const { data: localHashes } = await axios.post(
        "https://q6lfgqkw-5000.inc1.devtunnels.ms/generate-fingerprints",
        formData,
        { timeout: 30000 }
      );

      // ── 2. Ensure Sepolia network, then set up provider ──────────
      let provider: ethers.BrowserProvider | ethers.JsonRpcProvider;
      if ((window as any).ethereum) {
        await ensureSepolia(); // auto-switch MetaMask to Sepolia
        provider = new ethers.BrowserProvider((window as any).ethereum);
      } else {
        // Fallback: public Sepolia RPC for read-only calls
        provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
      }
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      /**
       * Safe lookup: fileHash → tokenId → ModelData, or null if not registered.
       * Contract maps registeredModels by uint256 tokenId, not by string hash.
       * Use hashToTokenId(fileHash) first to get the tokenId.
       */
      const safeRegisteredModels = async (fileHash: string) => {
        try {
          const tokenId: bigint = await contract.hashToTokenId(fileHash);
          if (!tokenId || tokenId === 0n) return null;
          const d = await contract.registeredModels(tokenId);
          if (!d || d.timestamp === 0n || d.timestamp === undefined) return null;
          // Ethers v6 Result objects are array-like — spread only copies numeric indices.
          // Explicitly extract every named field so properties survive the plain object return.
          return {
            fileHash:       String(d.fileHash       ?? ""),
            structuralHash: String(d.structuralHash ?? ""),
            behavioralHash: String(d.behavioralHash ?? ""),
            timestamp:      BigInt(d.timestamp      ?? 0n),
            owner:          String(d.owner          ?? ""),
            licenseFee:     BigInt(d.licenseFee     ?? 0n),
            tokenId,
          };
        } catch (e: any) {
          if (
            e?.code === "BAD_DATA" ||
            e?.code === "CALL_EXCEPTION" ||
            e?.message?.includes("BAD_DATA") ||
            e?.message?.includes("require(false)")
          ) return null;
          throw e;
        }
      };

      // 3. L1 — exact match
      setScanStep("l1");
      let blockchainData: any = await safeRegisteredModels(localHashes.fileHash);
      let matchKind: MatchKind | null = null;

      if (blockchainData) {
        matchKind = "EXACT";
      } else {
        // 4. L2 — deep structural / behavioral scan
        setScanStep("l2");
        try {
          const result = await contract.checkPlagiarism(
            localHashes.structuralHash,
            localHashes.behavioralHash
          );
          if (result?.[0] === true) {
            blockchainData = await safeRegisteredModels(result[1]);
            if (blockchainData) matchKind = "DEEP";
          }
        } catch (scanErr: any) {
          // CALL_EXCEPTION when list is empty = no plagiarism, safe to treat as clean
          if (
            scanErr?.code !== "BAD_DATA" &&
            scanErr?.code !== "CALL_EXCEPTION" &&
            !scanErr?.message?.includes("require(false)")
          ) console.error("Deep scan error:", scanErr);
        }
      }

      if (matchKind && blockchainData) {
        setMatchedTokenId(blockchainData.tokenId ?? null);
        setReport({
          kind: matchKind,
          local: localHashes,
          original: {
            fileHash:       blockchainData.fileHash,
            structuralHash: blockchainData.structuralHash,
            behavioralHash: blockchainData.behavioralHash,
            owner:          blockchainData.owner,
            date: (() => {
              const ts = Number(blockchainData.timestamp);
              if (!ts || isNaN(ts)) return "Unknown";
              const d = new Date(ts * 1000);
              return isNaN(d.getTime()) ? "Unknown" : d.toLocaleString();
            })(),
          },
        });
      } else {
        setReport({ kind: "CLEAN", local: localHashes });
      }

    } catch (err: any) {
      console.error("Verify error:", err);
      // Backend tunnel down / timeout
      const isBackendDown =
        err?.code === "ECONNABORTED" ||
        err?.message?.toLowerCase().includes("timeout") ||
        err?.message?.toLowerCase().includes("network error") ||
        err?.message?.toLowerCase().includes("econnrefused");
      if (isBackendDown) {
        alert("Cannot reach the backend server. Ask Vansh to restart the Python tunnel and update the URL.");
      } else if (
        err?.code === "BAD_DATA" ||
        err?.code === "CALL_EXCEPTION" ||
        err?.message?.includes("BAD_DATA") ||
        err?.message?.includes("require(false)")
      ) {
        // Contract returned empty / reverted — model simply not registered
        setReport({ kind: "CLEAN", local: {} });
      } else {
        alert("System error: ensure the Python backend is running.");
      }
    } finally {
      setLoading(false);
      setScanStep(null);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
    <div className="space-y-8">

      {/* ── Hero ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-4 pt-4 pb-2"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: "rgba(139,92,246,0.1)",
            border: "1px solid rgba(139,92,246,0.3)",
            color: "#8b5cf6",
          }}
        >
          <ScanLine size={12} />
          Two-Level Scan Engine
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span style={{
            background: "linear-gradient(135deg,#e2eaf4 0%,#8b5cf6 50%,#00d4ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Plagiarism Detector
          </span>
        </h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Cross-references your model's architecture &amp; behavioral fingerprints
          against every entry in the blockchain registry.
        </p>
      </motion.div>

      {/* ── Upload zone ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragOver={(e)  => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className="relative cursor-pointer rounded-2xl p-10 text-center transition-all duration-300 overflow-hidden"
        style={{
          background: dragOver ? "rgba(139,92,246,0.07)" : "rgba(5,20,45,0.60)",
          border: `2px dashed ${dragOver || file ? "rgba(139,92,246,0.6)" : "rgba(139,92,246,0.2)"}`,
          backdropFilter: "blur(20px)",
          boxShadow: dragOver || file
            ? "0 0 40px rgba(139,92,246,0.1), inset 0 0 40px rgba(139,92,246,0.04)"
            : "none",
        }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.998 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => e.target.files?.[0] && applyFile(e.target.files[0])}
          className="hidden"
        />

        <motion.div
          animate={dragOver ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
          className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: file ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(139,92,246,0.2)",
          }}
        >
          {file
            ? <FileCode2   size={28} style={{ color: "#8b5cf6" }} />
            : <UploadCloud size={28} style={{ color: "var(--text-muted)" }} />
          }
        </motion.div>

        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="f" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1">
              <p className="font-semibold text-base" style={{ color: "#8b5cf6" }}>{file.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </motion.div>
          ) : (
            <motion.div key="p" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1">
              <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Drop your model here, or click to browse</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Any AI model file format supported</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Scan button ───────────────────────────────────── */}
      <motion.button
        onClick={handleVerify}
        disabled={loading || !file}
        whileHover={!file || loading ? {} : { scale: 1.02, y: -2 }}
        whileTap={!file  || loading ? {} : { scale: 0.98 }}
        className="relative w-full py-4 rounded-2xl font-bold text-base tracking-wide overflow-hidden"
        style={{
          background:
            !file || loading
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg,#8b5cf6,#00d4ff)",
          color:  !file || loading ? "var(--text-muted)" : "#fff",
          border: "1px solid transparent",
          cursor: !file || loading ? "not-allowed" : "pointer",
          boxShadow:
            !file || loading
              ? "none"
              : "0 8px 40px rgba(139,92,246,0.3), 0 0 0 1px rgba(139,92,246,0.2)",
        }}
      >
        {/* Shimmer on active */}
        {!loading && file && (
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.14) 50%,transparent 100%)",
              backgroundSize: "200% 100%",
            }}
            animate={{ backgroundPosition: ["-200% center", "200% center"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        )}

        <span className="relative flex items-center justify-center gap-2">
          {loading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-5 h-5 rounded-full"
                style={{ border: "2px solid rgba(255,255,255,0.2)", borderTop: "2px solid #fff" }}
              />
              Scanning…
            </>
          ) : (
            <>
              <ScanLine size={20} />
              Verify Model Authenticity
            </>
          )}
        </span>
      </motion.button>

      {/* ── Loading scan stepper ──────────────────────────── */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{   opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{
                background: "rgba(5,20,45,0.7)",
                border: "1px solid rgba(139,92,246,0.15)",
                backdropFilter: "blur(16px)",
              }}
            >
              <p className="text-xs font-semibold tracking-widest uppercase"
                 style={{ color: "var(--text-muted)" }}>
                Scan Progress
              </p>

              {[
                { id: "l1", label: "L1 — Exact File Match",           icon: <Hash  size={15} />, desc: "Querying blockchain for identical binary hash" },
                { id: "l2", label: "L2 — Deep Architecture Scan",     icon: <Cpu   size={15} />, desc: "Checking structural & behavioral fingerprints" },
              ].map((step) => {
                const done   = (step.id === "l1" && scanStep === "l2");
                const active = scanStep === step.id;
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0   }}
                    className="flex items-center gap-4"
                  >
                    {/* Icon */}
                    <motion.div
                      animate={active ? { scale: [1, 1.12, 1] } : {}}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: done    ? "rgba(16,185,129,0.15)"
                                  : active  ? "rgba(139,92,246,0.15)"
                                  :           "rgba(255,255,255,0.04)",
                        border: done    ? "1px solid rgba(16,185,129,0.5)"
                              : active  ? "1px solid rgba(139,92,246,0.6)"
                              :           "1px solid rgba(255,255,255,0.07)",
                        boxShadow: active ? "0 0 16px rgba(139,92,246,0.3)" : "none",
                      }}
                    >
                      {done
                        ? <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                        : <span style={{ color: active ? "#8b5cf6" : "var(--text-muted)" }}>{step.icon}</span>
                      }
                    </motion.div>

                    {/* Text */}
                    <div>
                      <p className="text-sm font-semibold"
                         style={{ color: done ? "#10b981" : active ? "#8b5cf6" : "var(--text-muted)" }}>
                        {step.label}
                      </p>
                      {active && (
                        <motion.p
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-xs mt-0.5 shimmer-text"
                        >
                          {step.desc}
                        </motion.p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result Cards ─────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ─ EXACT match — red ─────────────────────────── */}
        {report?.kind === "EXACT" && (
          <motion.div
            key="exact"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0          }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
          <TiltCard
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "2px solid rgba(239,68,68,0.5)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 50px rgba(239,68,68,0.12)",
            }}
          >
            {/* Card header */}
            <div className="px-6 py-5 flex items-center gap-4"
                 style={{ borderBottom: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.08)" }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 0 20px rgba(239,68,68,0.3)" }}
              >
                <AlertOctagon size={22} style={{ color: "#ef4444" }} />
              </motion.div>
              <div>
                <p className="text-xl font-black" style={{ color: "#ef4444" }}>Direct Plagiarism Detected</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  This file is an exact binary copy of a registered model
                </p>
              </div>
              <span className="ml-auto text-xs px-3 py-1 rounded-full font-bold"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.4)" }}>
                LEVEL 1 — EXACT
              </span>
            </div>

            {/* Owner info */}
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                 style={{ borderBottom: "1px solid rgba(239,68,68,0.12)" }}>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                   style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <User size={16} style={{ color: "var(--text-muted)", marginTop: 2 }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Original Owner</p>
                  <p className="text-sm font-mono font-semibold break-all" style={{ color: "#ef4444" }}>
                    {report.original!.owner || "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                   style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Calendar size={16} style={{ color: "var(--text-muted)", marginTop: 2 }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Registered On</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {report.original!.date}
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                 style={{ color: "var(--text-muted)" }}>Technical Evidence</p>
              <EvidenceBadge match={true}  label="File Integrity Hash (SHA-256)" />
              <EvidenceBadge match={true}  label="Architecture Fingerprint" />
              <EvidenceBadge match={true}  label="Behavioral Logic Hash" />
            </div>

            {/* Buy License */}
            <LicensePanel
              fileHash={report.original!.fileHash}
              status={licenseStatus}
              txHash={licenseTxHash}
              onBuy={handleBuyLicense}
            />
          </TiltCard>
          </motion.div>
        )}

        {/* ─ DEEP / structural match — amber ───────────── */}
        {report?.kind === "DEEP" && (
          <motion.div
            key="deep"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0          }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
          <TiltCard
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(245,158,11,0.06)",
              border: "2px solid rgba(245,158,11,0.45)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 50px rgba(245,158,11,0.1)",
            }}
          >
            {/* Header */}
            <div className="px-6 py-5 flex items-center gap-4"
                 style={{ borderBottom: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.08)" }}>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}
              >
                <ShieldAlert size={22} style={{ color: "#f59e0b" }} />
              </motion.div>
              <div>
                <p className="text-xl font-black" style={{ color: "#f59e0b" }}>Structural Clone Detected</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  Same model architecture &amp; behavior — file was obfuscated or re-saved
                </p>
              </div>
              <span className="ml-auto text-xs px-3 py-1 rounded-full font-bold"
                    style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.4)" }}>
                LEVEL 2 — DEEP SCAN
              </span>
            </div>

            {/* Owner info */}
            <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
                 style={{ borderBottom: "1px solid rgba(245,158,11,0.12)" }}>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                   style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <User size={16} style={{ color: "var(--text-muted)", marginTop: 2 }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Original Owner</p>
                  <p className="text-sm font-mono font-semibold break-all" style={{ color: "#f59e0b" }}>
                    {report.original!.owner}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
                   style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Calendar size={16} style={{ color: "var(--text-muted)", marginTop: 2 }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Registered On</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {report.original!.date}
                  </p>
                </div>
              </div>
            </div>

            {/* Evidence */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3"
                 style={{ color: "var(--text-muted)" }}>Technical Evidence</p>
              <EvidenceBadge match={false} label="File Integrity Hash (SHA-256)" />
              <EvidenceBadge match={true}  label="Architecture Fingerprint" />
              <EvidenceBadge match={true}  label="Behavioral Logic Hash" />
            </div>

            {/* Buy License */}
            <LicensePanel
              fileHash={report.original!.fileHash}
              status={licenseStatus}
              txHash={licenseTxHash}
              onBuy={handleBuyLicense}
            />
          </TiltCard>
          </motion.div>
        )}

        {/* ─ CLEAN ─────────────────────────────────────── */}
        {report?.kind === "CLEAN" && (
          <motion.div
            key="clean"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0          }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
          <TiltCard
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(16,185,129,0.06)",
              border: "2px solid rgba(16,185,129,0.45)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 0 50px rgba(16,185,129,0.1)",
            }}
          >
            <div className="px-6 py-10 flex flex-col items-center text-center space-y-4">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0   }}
                transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(16,185,129,0.15)",
                  border: "1px solid rgba(16,185,129,0.5)",
                  boxShadow: "0 0 30px rgba(16,185,129,0.25)",
                }}
              >
                <ShieldCheck size={36} style={{ color: "#10b981" }} />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0  }}
                transition={{ delay: 0.25 }}
                className="space-y-2"
              >
                <p className="text-2xl font-black" style={{ color: "#10b981" }}>
                  Model Verified Clean
                </p>
                <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
                  No matching architectural or behavioral fingerprints found anywhere in the registry.
                  This model appears to be original.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3 pt-2"
              >
                {["File Hash", "Architecture", "Behavior"].map((label) => (
                  <span key={label}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <CheckCircle2 size={12} />
                    {label}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Hash proof */}
            <div className="px-6 pb-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest mb-2"
                 style={{ color: "var(--text-muted)" }}>Scanned Fingerprints</p>
              {[
                { label: "File Hash",       icon: <Hash    size={13} />, key: "fileHash"       },
                { label: "Structural Hash", icon: <Cpu     size={13} />, key: "structuralHash" },
                { label: "Behavioral Hash", icon: <Layers  size={13} />, key: "behavioralHash" },
              ].map(({ label, icon, key }) => (
                <div key={key}
                     className="px-4 py-3 rounded-xl space-y-1"
                     style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: "var(--text-muted)" }}>{icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: "var(--text-muted)" }}>{label}</span>
                  </div>
                  <p className="hash-text">
                    <ScrambleText text={report.local[key] || ""} speed={14} />
                  </p>
                </div>
              ))}
            </div>
          </TiltCard>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
    </div>
  );
}