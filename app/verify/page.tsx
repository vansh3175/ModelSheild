"use client";
import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

// 🚨 MAKE SURE THIS MATCHES YOUR LATEST REMIX DEPLOYMENT
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xB33696938e5b161b337d58C03b98f7C28b065c0f";

const contractABI = [
  "function registeredModels(string memory) public view returns (string fileHash, string structuralHash, string behavioralHash, uint256 timestamp, address owner)",
  "function checkPlagiarism(string memory _s, string memory _b) public view returns (bool found, string memory matchedFileHash)"
];

export default function Verify() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleVerify = async () => {
    if (!file) return alert("Please select a file!");
    setLoading(true);
    setReport(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // 1. Get hashes from Python
      const { data: localHashes } = await axios.post("http://localhost:5000/generate-fingerprints", formData);
      
      console.log("🚨 1. PYTHON HASHES:", localHashes);

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

      // 2. CHECK EXACT MATCH FIRST
      let blockchainData = await contract.registeredModels(localHashes.fileHash);
      let isDeepScanMatch = false;

      console.log("🚨 2. EXACT MATCH TIMESTAMP:", blockchainData.timestamp.toString());

      // 3. ONLY DEEP SCAN IF EXACT MATCH FAILED
      if (blockchainData.timestamp === 0n) {
        console.log("🚨 3. STARTING DEEP SCAN...");
        try {
          const result = await contract.checkPlagiarism(
            localHashes.structuralHash,
            localHashes.behavioralHash
          );
          
          console.log("🚨 4. DEEP SCAN RESULT:", result);
          
          if (result && result[0] === true) {
            console.log("🚨 5. DEEP SCAN FOUND A MATCH!");
            blockchainData = await contract.registeredModels(result[1]);
            isDeepScanMatch = true;
          }
        } catch (scanError) {
          console.error("🚨 CONTRACT ERROR DURING DEEP SCAN:", scanError);
        }
      }

      // 4. FINAL VERDICT
      if (blockchainData && blockchainData.timestamp !== 0n) {
        setReport({
          status: "FOUND",
          isDeepScan: isDeepScanMatch,
          local: localHashes,
          original: {
            fileHash: blockchainData.fileHash,
            structuralHash: blockchainData.structuralHash,
            behavioralHash: blockchainData.behavioralHash,
            owner: blockchainData.owner,
            date: new Date(Number(blockchainData.timestamp) * 1000).toLocaleString()
          }
        });
      } else {
        setReport({ 
          status: "NOT_FOUND", 
          local: localHashes 
        });
      }

    } catch (err: any) {
      console.error("Critical Error:", err);
      alert("System Error: Ensure Python is running and you have registered at least one model.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Plagiarism Detector</h1>
        <p className="text-gray-600 italic">Cross-referencing Model Architecture & Behavior against the Blockchain</p>
      </div>
      
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 mb-10 text-center">
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)} 
          className="mb-6 block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" 
        />
        <button 
          onClick={handleVerify} 
          disabled={loading || !file}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-400 transition-all shadow-lg"
        >
          {loading ? "Running Deep Scan..." : "Verify Model Authenticity"}
        </button>
      </div>

      {report && report.status === "FOUND" && (
        <div className={`p-8 rounded-2xl border-4 shadow-2xl animate-in fade-in zoom-in duration-300 ${report.isDeepScan ? "bg-orange-50 border-orange-500" : "bg-red-50 border-red-600"}`}>
          <div className="flex items-center space-x-4 mb-6">
            <span className="text-5xl">{report.isDeepScan ? "⚠️" : "🚨"}</span>
            <div>
              <h2 className={`text-3xl font-black ${report.isDeepScan ? "text-orange-700" : "text-red-700"}`}>
                {report.isDeepScan ? "Structural Match Found!" : "Direct Plagiarism Detected!"}
              </h2>
              <p className="text-gray-700 font-medium">Owner: <span className="font-mono bg-white px-2 py-1 rounded border">{report.original.owner}</span></p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-inner space-y-4">
            <h3 className="font-bold text-gray-500 uppercase tracking-widest text-xs border-b pb-2">Technical Evidence</h3>
            
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-600">File Integrity:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${report.local.fileHash === report.original.fileHash ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                {report.local.fileHash === report.original.fileHash ? "MATCHED (Lazy Copy)" : "BYPASSED (Tampered File)"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-600">Architecture Fingerprint:</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">MATCH FOUND</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-600">Behavioral Logic:</span>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">MATCH FOUND</span>
            </div>
          </div>
          
          <p className="mt-6 text-center text-sm text-gray-500 font-medium">Model originally registered on: {report.original.date}</p>
        </div>
      )}

      {report && report.status === "NOT_FOUND" && (
        <div className="bg-emerald-50 p-10 rounded-2xl border-4 border-emerald-500 text-center shadow-xl animate-in slide-in-from-bottom-4 duration-500">
          <span className="text-6xl mb-4 block">🛡️</span>
          <h2 className="text-3xl font-black text-emerald-800">Model is Verified Clean</h2>
          <p className="text-emerald-700 mt-2 text-lg">No matching architectural or behavioral fingerprints found on the registry.</p>
        </div>
      )}
    </div>
  );
}