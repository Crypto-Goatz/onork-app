"use client";

import { Search, Menu, X, Server } from "lucide-react";
import { Dot } from "@/components/ui/Dot";
import { SERVICE_COUNT } from "@/lib/services";

interface HeaderProps {
  title: string;
  vaultCount: number;
  onCmdK: () => void;
  onMobileMenu: () => void;
  mobileMenuOpen: boolean;
  mcpOnline?: boolean;
}

export function Header({ title, vaultCount, onCmdK, onMobileMenu, mobileMenuOpen, mcpOnline }: HeaderProps) {
  return (
    <header className="shrink-0 h-14 lg:h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 border-b border-white/[0.08] bg-onork-bg/80 backdrop-blur-xl z-10">
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenu}
          className="md:hidden p-1.5 rounded-lg text-onork-text-dim hover:text-onork-text hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <h1 className="text-lg lg:text-xl font-semibold text-onork-text tracking-tight">{title}</h1>
      </div>

      {/* Right: MCP status + search + vault */}
      <div className="flex items-center gap-3">
        {/* 0nMCP server status */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
          mcpOnline
            ? "bg-onork-green/5 border-onork-green/20"
            : "bg-white/[0.04] border-white/[0.08]"
        }`}>
          <Server size={12} className={mcpOnline ? "text-onork-green" : "text-onork-text-muted"} />
          <span className={`text-xs font-medium ${mcpOnline ? "text-onork-green" : "text-onork-text-muted"}`}>
            {mcpOnline ? "0nMCP" : "Offline"}
          </span>
          <Dot on={mcpOnline || false} />
        </div>

        <button
          onClick={onCmdK}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-onork-text-dim hover:text-onork-text hover:bg-white/[0.06] transition-all cursor-pointer"
        >
          <Search size={14} />
          <span className="text-xs hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-onork-text-muted font-mono">
            {"\u2318"}K
          </kbd>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <Dot on={vaultCount > 0} />
          <span className="text-xs text-onork-text-dim font-medium">
            {vaultCount}/{SERVICE_COUNT}
          </span>
        </div>
      </div>
    </header>
  );
}
