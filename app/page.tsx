"use client";
import { useState } from "react";
import { ethers } from "ethers";
import axios from "axios";

// This is the "map" of your Solidity smart contract so React knows how to talk to it
const contractABI = [
  "function registerModel(string memory _fileHash, string memory _structuralHash, string memory _behavioralHash) public",
  "event ModelRegistered(string fileHash, address owner, uint256 timestamp)",
  "function checkPlagiarism(string memory _s, string memory _b) public view returns (bool found, string memory matchedFileHash)"

];

// YOUR DEPLOYED CONTRACT ADDRESS ON SEPOLIA
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x52ade45e3ahaiciygiC6e7AD9" ;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Idle");
  const [hashes, setHashes] = useState<any>(null);
  const [txHash, setTxHash] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setHashes(null);
      setTxHash("");
      setStatus("File selected. Ready to generate fingerprints.");
    }
  };

const processAndRegister = async () => {
    if (!file) return alert("Please select a model file first!");

    try {
      // PHASE 1: Generate Fingerprints
      setStatus("1/4: Analyzing AI Model (Generating Fingerprints)...");
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post("http://localhost:5000/generate-fingerprints", formData);
      const generatedHashes = response.data;
      setHashes(generatedHashes);

      // Connect to Blockchain
      if (!(window as any).ethereum) throw new Error("MetaMask is not installed!");
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

      // 🚨 PHASE 2: THE NEW FIREWALL (Check before registering)
      setStatus("2/4: Scanning blockchain for existing architecture matches...");
      
      // We call your checkPlagiarism function as a read-only check
      const plagiarismCheck = await contract.checkPlagiarism(
        generatedHashes.structuralHash,
        generatedHashes.behavioralHash
      );

      // If plagiarismCheck[0] is true, it means the model is already in the database!
      if (plagiarismCheck && plagiarismCheck[0] === true) {
        setStatus("Registration Blocked: Model already exists on the network!");
        return alert("🚨 REGISTRATION BLOCKED: This model's architecture and behavior are already registered by another owner!");
      }

      // PHASE 3: Send to Smart Contract (If clean)
      setStatus("3/4: Model is clean! Please approve registration in MetaMask.");
      const tx = await contract.registerModel(
        generatedHashes.fileHash,
        generatedHashes.structuralHash,
        generatedHashes.behavioralHash
      );
      
      // PHASE 4: Wait for block
      setStatus("4/4: Waiting for Blockchain confirmation...");
      await tx.wait(); 
      
      setStatus("Success! Model Identity permanently registered on the blockchain.");
      setTxHash(tx.hash);

    } catch (error: any) {
      console.error(error);
      setStatus("Error: " + (error.message || "Something went wrong"));
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-12 p-8 bg-white rounded-xl shadow-xl border border-gray-100">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Register AI Model</h1>
      <p className="text-gray-500 mb-8">
        Upload your original model to generate its cryptographic fingerprints and permanently lock its identity on the Sepolia testnet.
      </p>

      {/* Upload Box */}
      <div className="border-2 border-dashed border-blue-300 bg-blue-50 p-10 rounded-xl text-center mb-8">
        <input 
          type="file" 
          accept=".pkl, .h5, .keras" 
          onChange={handleFileChange} 
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
        />
        <p className="text-sm text-gray-400 mt-3">Supports Scikit-Learn (.pkl) and TensorFlow (.keras / .h5)</p>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={processAndRegister}
          disabled={!file || status.includes("1/3") || status.includes("2/3") || status.includes("3/3")}
          className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold text-lg w-full disabled:bg-gray-400 transition"
        >
          Generate Fingerprints & Register
        </button>
      </div>

      {/* Status & Results Display */}
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">System Status:</h3>
        <p className={`text-sm font-medium ${status.includes("Error") ? "text-red-500" : status.includes("Success") ? "text-green-600" : "text-blue-600"}`}>
          {status}
        </p>

        {hashes && (
          <div className="mt-6 space-y-3 text-sm">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Generated Fingerprints:</h3>
            <p><span className="font-bold text-gray-600">File Hash:</span> <span className="text-gray-500 font-mono break-all">{hashes.fileHash}</span></p>
            <p><span className="font-bold text-gray-600">Structural Hash:</span> <span className="text-gray-500 font-mono break-all">{hashes.structuralHash}</span></p>
            <p><span className="font-bold text-gray-600">Behavioral Hash:</span> <span className="text-gray-500 font-mono break-all">{hashes.behavioralHash}</span></p>
          </div>
        )}

        {txHash && (
          <div className="mt-6 p-4 bg-green-100 text-green-800 rounded-lg text-sm border border-green-200">
            <strong>Registration Complete!</strong> View your permanent proof on Etherscan:<br/>
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-blue-600 underline font-mono break-all">
              {txHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}