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

/* ── Contract ──────────────────────────────────────────────── */
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xB33696938e5b161b337d58C03b98f7C28b065c0f";

const contractABI = [
  "function registeredModels(string memory) public view returns (string fileHash, string structuralHash, string behavioralHash, uint256 timestamp, address owner)",
  "function checkPlagiarism(string memory _s, string memory _b) public view returns (bool found, string memory matchedFileHash)",
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

/* ── Main Component ────────────────────────────────────────── */
export default function Verify() {
  const [file,    setFile]    = useState<File | null>(null);
  const [dragOver,setDragOver]= useState(false);
  const [loading, setLoading] = useState(false);
  const [scanStep,setScanStep]= useState<"l1" | "l2" | null>(null);
  const [report,  setReport]  = useState<Report | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFile = (f: File) => {
    setFile(f);
    setReport(null);
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
        "http://localhost:5000/generate-fingerprints",
        formData
      );

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      // 2. L1 — exact match
      setScanStep("l1");
      let blockchainData = await contract.registeredModels(localHashes.fileHash);
      let matchKind: MatchKind | null = null;

      if (blockchainData.timestamp !== 0n) {
        matchKind = "EXACT";
      } else {
        // 3. L2 — deep structural / behavioral scan
        setScanStep("l2");
        try {
          const result = await contract.checkPlagiarism(
            localHashes.structuralHash,
            localHashes.behavioralHash
          );
          if (result?.[0] === true) {
            blockchainData = await contract.registeredModels(result[1]);
            matchKind = "DEEP";
          }
        } catch (scanErr) {
          console.error("Deep scan error:", scanErr);
        }
      }

      if (matchKind && blockchainData?.timestamp !== 0n) {
        setReport({
          kind: matchKind,
          local: localHashes,
          original: {
            fileHash:       blockchainData.fileHash,
            structuralHash: blockchainData.structuralHash,
            behavioralHash: blockchainData.behavioralHash,
            owner:          blockchainData.owner,
            date: new Date(Number(blockchainData.timestamp) * 1000).toLocaleString(),
          },
        });
      } else {
        setReport({ kind: "CLEAN", local: localHashes });
      }

    } catch (err: any) {
      console.error("Verify error:", err);
      alert("System error: ensure the Python backend is running and MetaMask is available.");
    } finally {
      setLoading(false);
      setScanStep(null);
    }
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
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
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
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
              <EvidenceBadge match={true}  label="File Integrity Hash (SHA-256)" />
              <EvidenceBadge match={true}  label="Architecture Fingerprint" />
              <EvidenceBadge match={true}  label="Behavioral Logic Hash" />
            </div>
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
                  <p className="hash-text">{report.local[key]}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}