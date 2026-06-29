"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface HeaderProps {
  activePage?: "dashboard" | "evidence" | "store";
  contextLabel?: string; // e.g. "TRUSTROUTER" or "EVIDENCE PACK"
}

export function Header({ activePage = "dashboard", contextLabel = "TRUSTROUTER" }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-6 py-0 flex items-center justify-between h-14">

      {/* ── Left: Logo + breadcrumb + context pill ── */}
      <div className="flex items-center gap-5">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <a href="/" className="flex items-center">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <Image src="/icon.webp" alt="CROO" width={36} height={36} className="w-full h-full object-cover" />
            </div>
          </a>
          <span className="text-gray-300 mx-1 text-lg font-thin">/</span>
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wide">CAPGUARD</span>

          {/* Context pill — TRUSTROUTER or EVIDENCE PACK */}
          <div className="ml-1 flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 text-[10px] font-bold text-gray-700 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#A3FF12]" style={{ boxShadow: "0 0 6px rgba(163,255,18,0.8)" }} />
            {contextLabel}
          </div>
        </div>

        {/* ── Center nav ── */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium ml-2">
          <a
            href="/"
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activePage === "dashboard"
                ? "text-[#0A0A0A] font-semibold border-b-2 border-[#A3FF12] rounded-none pb-0 pt-0 px-0 mx-2"
                : "text-gray-500 hover:text-[#0A0A0A]"
            }`}
          >
            Dashboard
          </a>
          <a
            href="/evidence"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
              activePage === "evidence"
                ? "text-[#0A0A0A] font-semibold border-b-2 border-[#A3FF12] rounded-none pb-0 pt-0 px-0 mx-2"
                : "text-gray-500 hover:text-[#0A0A0A]"
            }`}
          >
            Evidence
            <span className="text-[9px] font-bold bg-[#A3FF12] text-black px-1.5 py-0.5 rounded-full uppercase tracking-wide leading-none">
              Judges
            </span>
          </a>
          <a
            href="https://agent.croo.network"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-500 hover:text-[#0A0A0A] transition-colors px-2 py-1.5"
          >
            My First Agent
            <span className="text-[9px] font-bold border border-[#A3FF12] text-[#A3FF12] px-1.5 py-0.5 rounded uppercase tracking-wide leading-none ml-0.5">
              Campaign
            </span>
          </a>
        </nav>
      </div>

      {/* ── Right: Register Agent + Profile dropdown ── */}
      <div className="flex items-center gap-3">
        {/* Register Agent / View on Store */}
        <a
          href="https://agent.croo.network/agents/413395a1-dadd-4775-a3a6-f193c10bac98"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center bg-[#A3FF12] text-black font-bold px-5 py-2 rounded-full text-sm hover:brightness-95 transition-all"
        >
          View on Store
        </a>

        {/* Profile avatar with dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-9 h-9 rounded-full overflow-hidden border-2 border-[#A3FF12] flex items-center justify-center bg-[#0A0A0A] hover:opacity-90 transition-opacity cursor-pointer"
            aria-label="Profile menu"
            id="profile-btn"
          >
            {/* CROO brand icon as avatar */}
            <Image src="/icon.webp" alt="Profile" width={36} height={36} className="w-full h-full object-cover" />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 top-12 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden"
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>

              {/* Wallet section */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Wallet</span>
                  <span className="text-sm font-bold text-[#0A0A0A]">$0.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-gray-500">Demo Mode</span>
                  <a
                    href="https://agent.croo.network"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#A3FF12] text-black text-xs font-bold px-3 py-1 rounded-full hover:brightness-95 transition-all"
                  >
                    Top Up
                  </a>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                {[
                  {
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    ),
                    label: "Account",
                    href: "https://agent.croo.network/account",
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    ),
                    label: "My Agents",
                    href: "https://agent.croo.network/my-agents",
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ),
                    label: "My Orders",
                    href: "https://agent.croo.network/my-orders",
                  },
                  {
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ),
                    label: "Evidence Pack",
                    href: "/evidence",
                    internal: true,
                  },
                ].map(({ icon, label, href, internal }) => (
                  <a
                    key={label}
                    href={href}
                    target={internal ? undefined : "_blank"}
                    rel={internal ? undefined : "noopener noreferrer"}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-gray-400">{icon}</span>
                    {label}
                  </a>
                ))}

                <div className="border-t border-gray-100 mt-1">
                  <a
                    href="https://github.com/xDzaky/capguard-trustrouter"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    GitHub Repository
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
