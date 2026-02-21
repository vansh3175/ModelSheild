import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/app/components/Navbar";
import AnimatedBackground from "@/app/components/AnimatedBackground";
import CursorGlow from "@/app/components/CursorGlow";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ModelShield — Decentralized AI Registry",
  description: "Cryptographic integrity verification and tamper detection for AI models on the blockchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      {/* Dark base: bg-base from globals.css via inline style fallback */}
      <body className={`${inter.variable} min-h-screen`} style={{ background: "#010a18" }}>
        {/* Full-page animated background — fixed, behind everything */}
        <AnimatedBackground />
        {/* Cursor spotlight glow */}
        <CursorGlow />
        {/* Sticky top navbar */}
        <Navbar />
        {/* Page content */}
        <main className="relative z-10 w-full">
          {children}
        </main>
      </body>
    </html>
  );
}