"use client";
/**
 * Register Page — /
 * ─────────────────────────────────────────────────────────────
 * Allows a user to:
 *  1. Upload an AI model file (.pkl / .h5 / .keras)
 *  2. Generate cryptographic fingerprints via Python backend
 *  3. Run plagiarism pre-check on-chain (blocks duplicates)
 *  4. Register the model permanently on Sepolia via MetaMask
 *
 * Design: dark glassmorphism cards, Framer Motion reveals,
 *         animated 4-phase stepper, hash display, glow effects.
 */

import { useState, useRef, useCallback } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Fingerprint, ShieldOff, ShieldCheck,
  Clock, ExternalLink, AlertTriangle, CheckCircle2,
  FileCode2, Cpu, Layers, Hash, XCircle
} from "lucide-react";
import ScrambleText   from "@/app/components/ScrambleText";
import TiltCard       from "@/app/components/TiltCard";
import SuccessConfetti from "@/app/components/SuccessConfetti";

/* ── Contract config ──────────────────────────────────────── */
const contractABI = [
  // _fee = license price buyers pay (in wei). We default to 0.01 ETH.
  "function registerModel(string memory _fileHash, string memory _structHash, string memory _behavHash, uint256 _fee) public",
  "function hashToTokenId(string memory) public view returns (uint256)",
  "function registeredModels(uint256) public view returns (string fileHash, string structuralHash, string behavioralHash, uint256 timestamp, address owner, uint256 licenseFee)",
  "function checkPlagiarism(string memory _s, string memory _b) public view returns (bool found, string memory matchedFileHash)",
];
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xB33696938e5b161b337d58C03b98f7C28b065c0f";

/* ── Sepolia network enforcer ────────────────────────────── */
const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

async function ensureSepolia() {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask is not installed!");
  const currentChain: string = await eth.request({ method: "eth_chainId" });
  if (currentChain.toLowerCase() === SEPOLIA_CHAIN_ID) return; // already correct
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID }],
    });
  } catch (switchErr: any) {
    // 4902 = chain not added yet — add it automatically
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

/* ── Phase metadata ───────────────────────────────────────── */
const PHASES = [
  { id: 1, label: "Analyze Model",        icon: <Cpu      size={16} />, desc: "Generating cryptographic fingerprints" },
  { id: 2, label: "Scan Blockchain",      icon: <Layers   size={16} />, desc: "Checking for duplicate architectures" },
  { id: 3, label: "MetaMask Approval",    icon: <ShieldCheck size={16} />, desc: "Awaiting wallet signature" },
  { id: 4, label: "Block Confirmation",  icon: <Clock    size={16} />, desc: "Writing to the blockchain" },
] as const;

type PhaseNum  = 0 | 1 | 2 | 3 | 4; // 0 = idle, 1-4 = active phases
type StatusKind = "idle" | "running" | "success" | "blocked" | "error" | "cancelled";

export default function Home() {
  const [file,        setFile]        = useState<File | null>(null);
  const [dragOver,    setDragOver]    = useState(false);
  const [phase,       setPhase]       = useState<PhaseNum>(0);
  const [statusKind,  setStatusKind]  = useState<StatusKind>("idle");
  const [statusMsg,   setStatusMsg]   = useState("Select a model file to begin.");
  const [hashes,      setHashes]      = useState<Record<string, string> | null>(null);
  const [txHash,      setTxHash]      = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── File selection helpers ─────────────────────────────── */
  const applyFile = (f: File) => {
    setFile(f);
    setHashes(null);
    setTxHash("");
    setPhase(0);
    setStatusKind("idle");
    setStatusMsg(`File ready: ${f.name}`);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) applyFile(dropped);
  }, []);

  /* ── Main registration flow ─────────────────────────────── */
  const processAndRegister = async () => {
    if (!file) return;
    setStatusKind("running");
    setTxHash("");
    setHashes(null);

    try {
      // ── Phase 1: fingerprints ──────────────────────────────
      setPhase(1);
      setStatusMsg("Analyzing model — generating cryptographic fingerprints…");
      const formData = new FormData();
      formData.append("file", file);
      const { data: generatedHashes } = await axios.post(
        "https://q6lfgqkw-5000.inc1.devtunnels.ms/generate-fingerprints",
        formData,
        { timeout: 30000 }
      );
      setHashes(generatedHashes);

      // ── Phase 2: plagiarism check ──────────────────────────
      setPhase(2);
      setStatusMsg("Scanning blockchain for matching architectures…");
      await ensureSepolia(); // switch to Sepolia before any contract call
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // Check 0: exact fileHash already registered? (hashToTokenId → tokenId > 0 means exists)
      try {
        const tokenId: bigint = await contract.hashToTokenId(generatedHashes.fileHash);
        if (tokenId > 0n) {
          setPhase(0);
          setStatusKind("blocked");
          setStatusMsg("This exact model is already registered on the blockchain.");
          return;
        }
      } catch (e: any) {
        // Revert = not found, safe to continue
        if (e?.code !== "CALL_EXCEPTION" && !e?.code?.includes("BAD_DATA")) throw e;
      }

      // checkPlagiarism returns 0x when no match exists — handle gracefully
      let alreadyExists = false;
      try {
        const plagiarismCheck = await contract.checkPlagiarism(
          generatedHashes.structuralHash,
          generatedHashes.behavioralHash
        );
        alreadyExists = plagiarismCheck?.[0] === true;
      } catch (e: any) {
        // BAD_DATA or CALL_EXCEPTION means contract returned empty (no match) — safe to proceed
        if (
          !e?.code?.includes("BAD_DATA") &&
          e?.code !== "CALL_EXCEPTION" &&
          !e?.message?.includes("require(false)")
        ) throw e;
      }
      if (alreadyExists) {
        setPhase(0);
        setStatusKind("blocked");
        setStatusMsg("Registration blocked — this architecture is already registered.");
        return;
      }

      setPhase(3);
      setStatusMsg("Model is clean — please approve the transaction in MetaMask.");

      // Send directly — staticCall is skipped because ERC721._mint() causes
      // false reverts (data="0x") on staticCall even when the tx would succeed.
      // Duplicates are already caught above via hashToTokenId + checkPlagiarism.
      // License fee = 0.01 ETH (buyers pay this to the owner when licensing).
      const licenseFeeSetting = ethers.parseEther("0.01");
      const tx = await contract.registerModel(
        generatedHashes.fileHash,
        generatedHashes.structuralHash,
        generatedHashes.behavioralHash,
        licenseFeeSetting
      );

      // ── Phase 4: block confirmation ────────────────────────
      setPhase(4);
      setStatusMsg("Transaction broadcast — waiting for block confirmation…");
      await tx.wait();

      setPhase(0);
      setStatusKind("success");
      setStatusMsg("Model identity permanently registered on the blockchain.");
      setTxHash(tx.hash);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 1400);

    } catch (err: any) {
      setPhase(0);
      // Backend tunnel down / timeout
      const isBackendDown =
        err?.code === "ECONNABORTED" ||
        err?.message?.toLowerCase().includes("timeout") ||
        err?.message?.toLowerCase().includes("network error") ||
        err?.message?.toLowerCase().includes("econnrefused");
      if (isBackendDown) {
        setStatusKind("error");
        setStatusMsg("Cannot reach the backend server. Ask Vansh to restart the Python tunnel and update the URL.");
        return;
      }
      const rejected =
        err?.code === "ACTION_REJECTED" ||
        err?.code === 4001 ||
        err?.info?.error?.code === 4001 ||
        err?.message?.toLowerCase().includes("user denied") ||
        err?.message?.toLowerCase().includes("user rejected");
      const alreadyRegistered =
        err?.reason?.toLowerCase().includes("already") ||
        err?.message?.toLowerCase().includes("already registered") ||
        err?.data?.message?.toLowerCase().includes("already");
      if (rejected) {
        setStatusKind("cancelled");
        setStatusMsg("Transaction cancelled — you rejected the MetaMask request.");
      } else if (alreadyRegistered) {
        setStatusKind("blocked");
        setStatusMsg("This model is already registered on the blockchain.");
      } else {
        console.error(err);
        setStatusKind("error");
        setStatusMsg(err?.reason || err?.message || "An unexpected error occurred.");
      }
    }
  };

  const isRunning = statusKind === "running";

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="space-y-8">

      {/* ── Page Hero ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-4 pt-4 pb-2"
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase"
          style={{
            background: "rgba(0,212,255,0.08)",
            border: "1px solid rgba(0,212,255,0.25)",
            color: "#00d4ff",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Sepolia Testnet
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          <span style={{
            background: "linear-gradient(135deg,#e2eaf4 0%,#00d4ff 50%,#8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            Register AI Model
          </span>
        </h1>
        <p className="text-base max-w-xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Upload your model to generate its unique cryptographic fingerprints and
          permanently anchor its identity on the blockchain.
        </p>
      </motion.div>

      {/* ── Upload Zone ──────────────────────────────────── */}
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
          background: dragOver
            ? "rgba(0,212,255,0.07)"
            : "rgba(5,20,45,0.60)",
          border: `2px dashed ${dragOver || file ? "rgba(0,212,255,0.6)" : "rgba(0,212,255,0.2)"}`,
          backdropFilter: "blur(20px)",
          boxShadow: dragOver || file
            ? "0 0 40px rgba(0,212,255,0.12), inset 0 0 40px rgba(0,212,255,0.04)"
            : "none",
        }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.998 }}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pkl,.h5,.keras"
          onChange={(e) => e.target.files?.[0] && applyFile(e.target.files[0])}
          className="hidden"
        />

        {/* Icon */}
        <motion.div
          animate={dragOver ? { scale: 1.2, rotate: 5 } : { scale: 1, rotate: 0 }}
          className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: file
              ? "rgba(0,212,255,0.12)"
              : "rgba(255,255,255,0.04)",
            border: "1px solid rgba(0,212,255,0.2)",
          }}
        >
          {file
            ? <FileCode2 size={28} style={{ color: "#00d4ff" }} />
            : <Upload   size={28} style={{ color: "var(--text-muted)" }} />
          }
        </motion.div>

        {/* Text */}
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file-name"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -8 }}
              className="space-y-1"
            >
              <p className="font-semibold text-base" style={{ color: "#00d4ff" }}>
                {file.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(file.size / 1024).toFixed(1)} KB — click to change
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{   opacity: 0, y: -8 }}
              className="space-y-1"
            >
              <p className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
                Drop your model here, or click to browse
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Supports Scikit-Learn (.pkl) and TensorFlow (.h5 / .keras)
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Register Button ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <motion.button
          onClick={processAndRegister}
          disabled={!file || isRunning}
          whileHover={!file || isRunning ? {} : { scale: 1.02, y: -2 }}
          whileTap={!file  || isRunning ? {} : { scale: 0.98 }}
          className="relative w-full py-4 rounded-2xl font-bold text-base tracking-wide overflow-hidden transition-all magnetic-btn"
          style={{
            background:
              !file || isRunning
                ? "rgba(255,255,255,0.05)"
                : "linear-gradient(135deg,#00d4ff,#8b5cf6)",
            color: !file || isRunning ? "var(--text-muted)" : "#fff",
            border: "1px solid transparent",
            cursor: !file || isRunning ? "not-allowed" : "pointer",
            boxShadow:
              !file || isRunning
                ? "none"
                : "0 8px 40px rgba(0,212,255,0.3), 0 0 0 1px rgba(0,212,255,0.2)",
          }}
        >
          {/* Animated shimmer overlay when active */}
          {!isRunning && file && (
            <motion.div
              className="absolute inset-0 rounded-2xl"
              style={{
                background:
                  "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%)",
                backgroundSize: "200% 100%",
              }}
              animate={{ backgroundPosition: ["-200% center", "200% center"] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            />
          )}

          <span className="relative flex items-center justify-center gap-2">
            {isRunning ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 rounded-full"
                  style={{
                    border: "2px solid rgba(255,255,255,0.2)",
                    borderTop: "2px solid #fff",
                  }}
                />
                Processing…
              </>
            ) : (
              <>
                <Fingerprint size={20} />
                Generate Fingerprints &amp; Register on Blockchain
              </>
            )}
          </span>
        </motion.button>
      </motion.div>

      {/* ── 4-Phase Progress Stepper ─────────────────────── */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{   opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className="overflow-hidden"
          >
            <div
              className="rounded-2xl p-6"
              style={{
                background: "rgba(5,20,45,0.7)",
                border: "1px solid rgba(0,212,255,0.12)",
                backdropFilter: "blur(16px)",
              }}
            >
              <p className="text-xs font-semibold tracking-widest uppercase mb-5"
                 style={{ color: "var(--text-muted)" }}>
                Registration Progress
              </p>
              <div className="space-y-4">
                {PHASES.map((p) => {
                  const done    = phase > p.id;
                  const active  = phase === p.id;
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0  }}
                      transition={{ delay: p.id * 0.07 }}
                      className="flex items-center gap-4"
                    >
                      {/* Step circle */}
                      <motion.div
                        animate={active ? { scale: [1, 1.15, 1] } : {}}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: done    ? "rgba(16,185,129,0.15)"
                                    : active  ? "rgba(0,212,255,0.15)"
                                    :           "rgba(255,255,255,0.04)",
                          border: done    ? "1px solid rgba(16,185,129,0.5)"
                                : active  ? "1px solid rgba(0,212,255,0.6)"
                                :           "1px solid rgba(255,255,255,0.07)",
                          boxShadow: active ? "0 0 16px rgba(0,212,255,0.3)" : "none",
                        }}
                      >
                        {done
                          ? <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                          : <span style={{ color: active ? "#00d4ff" : "var(--text-muted)" }}>{p.icon}</span>
                        }
                      </motion.div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold"
                           style={{ color: done ? "#10b981" : active ? "#00d4ff" : "var(--text-muted)" }}>
                          {p.label}
                        </p>
                        {active && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-xs mt-0.5 shimmer-text"
                          >
                            {p.desc}
                          </motion.p>
                        )}
                      </div>

                      {/* Connector dot */}
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                           style={{
                             background: done   ? "#10b981"
                                       : active ? "#00d4ff"
                                       :          "rgba(255,255,255,0.1)",
                           }}
                      />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Card ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {statusKind !== "idle" && !isRunning && (
          <motion.div
            key={statusKind}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -8, scale: 0.97  }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`rounded-2xl p-6 space-y-4 ${statusKind === "success" ? "success-ring" : ""}`}
            style={{
              background:
                statusKind === "success"   ? "rgba(16,185,129,0.07)"
              : statusKind === "blocked"   ? "rgba(245,158,11,0.07)"
              : statusKind === "error"     ? "rgba(239,68,68,0.07)"
              : statusKind === "cancelled" ? "rgba(100,116,139,0.07)"
              : "rgba(5,20,45,0.7)",
              border:
                statusKind === "success"   ? "1px solid rgba(16,185,129,0.35)"
              : statusKind === "blocked"   ? "1px solid rgba(245,158,11,0.35)"
              : statusKind === "error"     ? "1px solid rgba(239,68,68,0.35)"
              : statusKind === "cancelled" ? "1px solid rgba(100,116,139,0.35)"
              : "1px solid rgba(0,212,255,0.12)",
              backdropFilter: "blur(16px)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Confetti burst on success */}
            {showConfetti && statusKind === "success" && <SuccessConfetti />}

            {/* Status header */}
            <div className="flex items-center gap-3" style={{ position: "relative", zIndex: 1 }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    statusKind === "success"   ? "rgba(16,185,129,0.15)"
                  : statusKind === "blocked"   ? "rgba(245,158,11,0.15)"
                  : statusKind === "cancelled" ? "rgba(100,116,139,0.15)"
                  : "rgba(239,68,68,0.15)",
                }}
              >
                {statusKind === "success"   && <ShieldCheck   size={20} style={{ color: "#10b981" }} />}
                {statusKind === "blocked"   && <ShieldOff     size={20} style={{ color: "#f59e0b" }} />}
                {statusKind === "error"     && <AlertTriangle size={20} style={{ color: "#ef4444" }} />}
                {statusKind === "cancelled" && <XCircle       size={20} style={{ color: "#94a3b8" }} />}
              </div>
              <p className="text-sm font-semibold"
                 style={{
                   color: statusKind === "success"   ? "#10b981"
                        : statusKind === "blocked"   ? "#f59e0b"
                        : statusKind === "cancelled" ? "#94a3b8"
                        : "#ef4444",
                 }}>
                {statusMsg}
              </p>
            </div>

            {/* Etherscan link on success */}
            {statusKind === "success" && txHash && (
              <motion.a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl w-full font-mono break-all neon-link"
                style={{
                  position: "relative",
                  zIndex: 1,
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.2)",
                  color: "#00d4ff",
                }}
              >
                <ExternalLink size={12} className="flex-shrink-0" />
                {txHash}
              </motion.a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generated Hashes ─────────────────────────────── */}
      <AnimatePresence>
        {hashes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0  }}
            exit={{   opacity: 0          }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
          <TiltCard
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(5,20,45,0.7)",
              border: "1px solid rgba(0,212,255,0.12)",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center gap-2 border-b"
              style={{ borderColor: "rgba(0,212,255,0.1)" }}
            >
              <Hash size={16} style={{ color: "#00d4ff" }} />
              <p className="text-sm font-bold tracking-wide"
                 style={{ color: "var(--text-primary)" }}>
                Cryptographic Fingerprints
              </p>
              <span
                className="ml-auto text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}
              >
                Generated
              </span>
            </div>

            {/* Hash rows */}
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {[
                { label: "File Hash",        key: "fileHash",        icon: <FileCode2 size={14} /> },
                { label: "Structural Hash",  key: "structuralHash",  icon: <Cpu       size={14} /> },
                { label: "Behavioral Hash",  key: "behavioralHash",  icon: <Layers    size={14} /> },
              ].map(({ label, key, icon }, i) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0   }}
                  transition={{ delay: i * 0.1  }}
                  className="px-6 py-4 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--text-muted)" }}>{icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-widest"
                          style={{ color: "var(--text-muted)" }}>
                      {label}
                    </span>
                  </div>
                  <p className="hash-text">
                    <ScrambleText text={hashes[key]} speed={14} />
                  </p>
                </motion.div>
              ))}
            </div>
          </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}