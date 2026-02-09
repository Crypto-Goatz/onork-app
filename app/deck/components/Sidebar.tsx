"use client";

import {
  LayoutDashboard,
  MessageSquare,
  KeyRound,
  Workflow,
  Clock,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Dot } from "@/components/ui/Dot";
import { SERVICE_COUNT } from "@/lib/services";

type View = "dashboard" | "chat" | "vault" | "flows" | "history";

interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  vaultCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const NAV_ITEMS: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "vault", label: "Vault", icon: KeyRound },
  { key: "flows", label: "Workflows", icon: Workflow },
  { key: "history", label: "History", icon: Clock },
];

export function Sidebar({
  view,
  setView,
  vaultCount,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={`h-full shrink-0 flex flex-col border-r border-white/[0.08] bg-onork-bg/80 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className={`shrink-0 flex items-center gap-2.5 px-4 h-14 border-b border-white/[0.08] ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-onork-p1 to-onork-b1 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xs">0n</span>
        </div>
        {!collapsed && (
          <span className="text-base font-black bg-gradient-to-r from-onork-p3 to-onork-b2 bg-clip-text text-transparent">
            0nork
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer group ${
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
              } ${
                active
                  ? "bg-gradient-to-r from-onork-p1/15 to-transparent border-l-[3px] border-onork-p1 text-onork-text"
                  : "border-l-[3px] border-transparent text-onork-text-dim hover:text-onork-text hover:bg-white/[0.04]"
              }`}
              title={collapsed ? label : undefined}
            >
              <Icon
                size={20}
                className={`shrink-0 transition-colors ${
                  active ? "text-onork-p3" : "text-onork-text-muted group-hover:text-onork-text-dim"
                }`}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`shrink-0 border-t border-white/[0.08] px-3 py-3 ${collapsed ? "px-2" : ""}`}>
        {/* Status */}
        <div className={`flex items-center gap-2 mb-3 ${collapsed ? "justify-center" : ""}`}>
          <Dot on={vaultCount > 0} />
          {!collapsed && (
            <span className="text-xs text-onork-text-dim">
              {vaultCount}/{SERVICE_COUNT} connected
            </span>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center gap-2 py-2 rounded-lg text-onork-text-muted hover:text-onork-text-dim hover:bg-white/[0.04] transition-colors cursor-pointer ${
            collapsed ? "justify-center px-0" : "px-2"
          }`}
        >
          {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
