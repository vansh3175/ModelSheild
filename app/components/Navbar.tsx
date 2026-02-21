"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Link from "next/link";

export default function Navbar() {
  const [walletAddress, setWalletAddress] = useState<string>("");

  const connectWallet = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setWalletAddress(address);
      } catch (error) {
        console.error("Wallet connection failed:", error);
      }
    } else {
      alert("Please install MetaMask to use this dApp!");
    }
  };

  return (
    <nav className="flex justify-between items-center p-6 bg-gray-900 text-white shadow-lg">
      <div className="flex items-center space-x-6">
        <h1 className="text-2xl font-bold text-blue-400 border-r pr-6 border-gray-600">
          AI Model Registry
        </h1>
        <Link href="/" className="hover:text-blue-300 transition">Register</Link>
        <Link href="/verify" className="hover:text-blue-300 transition">Verify Plagiarism</Link>
      </div>

      <button
        onClick={connectWallet}
        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition shadow-md"
      >
        {walletAddress 
          ? `Connected: ${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}` 
          : "Connect Wallet"}
      </button>
    </nav>
  );
}