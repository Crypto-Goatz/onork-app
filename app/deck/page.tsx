"use client";

import { useState, useCallback, useEffect } from "react";
import { useVault } from "@/lib/hooks/useVault";
import { useFlows } from "@/lib/hooks/useFlows";
import { useHistory } from "@/lib/hooks/useHistory";
import { Modal } from "@/components/ui/Modal";
import { SlideOver } from "@/components/ui/SlideOver";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { Chat, type ChatMessage } from "./components/Chat";
import { ChatInput } from "./components/ChatInput";
import { CommandPalette } from "./components/CommandPalette";
import { VaultOverlay } from "./components/VaultOverlay";
import { VaultDetail } from "./components/VaultDetail";
import { FlowsOverlay } from "./components/FlowsOverlay";
import { HistoryOverlay } from "./components/HistoryOverlay";

type View = "dashboard" | "chat" | "vault" | "flows" | "history";

interface ModalConfig {
  title: string;
  body: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeckPage() {
  const [view, setView] = useState<View>("dashboard");
  const [activeSvc, setActiveSvc] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mcpOnline, setMcpOnline] = useState(false);
  const vault = useVault();
  const flows = useFlows();
  const hist = useHistory();
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      r: "sys",
      t: "Welcome to 0nork. I'm your command orchestrator — powered by 0nMCP with 550 tools across 26 services. Open the Vault to connect services, or just tell me what you need done.",
    },
  ]);
  const [inp, setInp] = useState("");
  const [showCmd, setShowCmd] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

  // Check 0nMCP health on load
  useEffect(() => {
    fetch("/api/0nmcp/health")
      .then((r) => r.json())
      .then((data) => setMcpOnline(data.status !== "offline"))
      .catch(() => setMcpOnline(false));
  }, []);

  // Responsive sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setSidebarCollapsed(true);
      else setSidebarCollapsed(false);
      if (window.innerWidth < 768) setMobileMenuOpen(false);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowCmd((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const addMsg = useCallback((msg: ChatMessage) => {
    setMsgs((prev) => [...prev, msg]);
  }, []);

  const updateLastMsg = useCallback((update: Partial<ChatMessage>) => {
    setMsgs((prev) => {
      const newMsgs = [...prev];
      const last = newMsgs[newMsgs.length - 1];
      if (last) {
        newMsgs[newMsgs.length - 1] = { ...last, ...update };
      }
      return newMsgs;
    });
  }, []);

  const send = useCallback(async () => {
    const t = inp.trim();
    if (!t) return;
    setInp("");
    setShowCmd(false);

    // Slash commands
    if (t === "/flows") { setView("flows"); return; }
    if (t === "/vault") { setView("vault"); setActiveSvc(null); return; }
    if (t === "/history") { setView("history"); return; }

    // Add user message
    addMsg({ r: "user", t });
    hist.add("chat", t);

    // Add loading indicator
    addMsg({ r: "sys", t: "", loading: true, source: "0nmcp" });

    try {
      // Get connected services for context
      const connectedServices = Object.keys(vault.credentials || {}).filter(
        (k) => vault.isC(k)
      );

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, connectedServices }),
      });

      const data = await res.json();

      // Replace loading message with real response
      updateLastMsg({
        t: data.response || "No response received.",
        loading: false,
        source: data.source || "local",
        status: data.status,
        steps: data.steps,
        services: data.services,
      });

      hist.add("execution", `${data.source === "0nmcp" ? "[0nMCP] " : ""}${t}`);
    } catch {
      updateLastMsg({
        t: "Failed to reach the server. Check that 0nMCP is running.",
        loading: false,
        source: "local",
        status: "failed",
      });
    }
  }, [inp, addMsg, updateLastMsg, hist, vault]);

  const handleServiceClick = useCallback((key: string) => {
    setActiveSvc(key);
  }, []);

  const handleConfirmModal = useCallback(
    (config: { title: string; body: string; onConfirm: () => void }) => {
      setModal({
        ...config,
        onCancel: () => setModal(null),
        onConfirm: () => {
          config.onConfirm();
          setModal(null);
        },
      });
    },
    [],
  );

  const handleViewChange = useCallback((v: View) => {
    setView(v);
    setActiveSvc(null);
    setMobileMenuOpen(false);
  }, []);

  const VIEW_TITLES: Record<View, string> = {
    dashboard: "Dashboard",
    chat: "Chat",
    vault: "Vault",
    flows: "Workflows",
    history: "History",
  };

  return (
    <>
      {modal && (
        <Modal
          open={!!modal}
          title={modal.title}
          onConfirm={modal.onConfirm}
          onCancel={modal.onCancel}
          danger={modal.danger}
        >
          {modal.body}
        </Modal>
      )}

      <CommandPalette
        open={showCmd}
        onClose={() => setShowCmd(false)}
        onSelect={(cmd) => {
          setShowCmd(false);
          if (cmd === "/vault") handleViewChange("vault");
          else if (cmd === "/flows") handleViewChange("flows");
          else if (cmd === "/history") handleViewChange("history");
          else if (cmd === "/chat") handleViewChange("chat");
          else {
            setInp(cmd + " ");
            handleViewChange("chat");
          }
        }}
      />

      <div className="h-dvh w-full flex bg-onork-bg overflow-hidden animate-fade-in">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-[90] bg-onork-bg/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          className={`shrink-0 z-[95] ${
            mobileMenuOpen
              ? "fixed inset-y-0 left-0 md:relative"
              : "hidden md:block"
          }`}
        >
          <Sidebar
            view={view}
            setView={handleViewChange}
            vaultCount={vault.n}
            collapsed={sidebarCollapsed && !mobileMenuOpen}
            onToggleCollapse={() => {
              if (window.innerWidth < 768) {
                setMobileMenuOpen(false);
              } else {
                setSidebarCollapsed((p) => !p);
              }
            }}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            title={VIEW_TITLES[view]}
            vaultCount={vault.n}
            onCmdK={() => setShowCmd(true)}
            onMobileMenu={() => setMobileMenuOpen((p) => !p)}
            mobileMenuOpen={mobileMenuOpen}
            mcpOnline={mcpOnline}
          />

          <main className="flex-1 overflow-hidden">
            {view === "dashboard" && (
              <div className="h-full overflow-y-auto">
                <DashboardView
                  vaultCount={vault.n}
                  flowCount={flows.f.length}
                  historyCount={hist.h.length}
                  isC={vault.isC}
                  recentHistory={hist.h}
                  setView={handleViewChange}
                  mcpOnline={mcpOnline}
                />
              </div>
            )}

            {view === "chat" && (
              <div className="h-full flex flex-col">
                <Chat msgs={msgs} />
                <ChatInput
                  value={inp}
                  onChange={setInp}
                  onSend={send}
                  onSlash={setShowCmd}
                  mcpOnline={mcpOnline}
                />
              </div>
            )}

            {view === "vault" && (
              <div className="h-full overflow-y-auto">
                <VaultOverlay
                  isC={vault.isC}
                  vaultCount={vault.n}
                  onSelectService={handleServiceClick}
                />
                <SlideOver
                  open={!!activeSvc}
                  onClose={() => setActiveSvc(null)}
                  title="Configure Service"
                >
                  {activeSvc && (
                    <VaultDetail
                      serviceKey={activeSvc}
                      isC={vault.isC(activeSvc)}
                      get={vault.get}
                      set={vault.set}
                      onBack={() => setActiveSvc(null)}
                      onConfirmModal={handleConfirmModal}
                      onHistory={hist.add}
                    />
                  )}
                </SlideOver>
              </div>
            )}

            {view === "flows" && (
              <div className="h-full overflow-y-auto">
                <FlowsOverlay
                  flows={flows.f}
                  onToggle={flows.tog}
                  onDelete={(f) =>
                    setModal({
                      title: "Delete workflow?",
                      body: `Remove "${f.name}"? This can't be undone.`,
                      danger: true,
                      onConfirm: () => {
                        flows.rm(f.id);
                        hist.add("workflow", `Deleted "${f.name}"`);
                        setModal(null);
                      },
                      onCancel: () => setModal(null),
                    })
                  }
                  onNewFlow={() => {
                    addMsg({
                      r: "sys",
                      t: "Describe what you want to automate in plain English and I'll build the workflow for you.",
                    });
                    hist.add("ui", "Opened workflow builder");
                    handleViewChange("chat");
                  }}
                  onHistory={hist.add}
                />
              </div>
            )}

            {view === "history" && (
              <div className="h-full overflow-y-auto">
                <HistoryOverlay
                  history={hist.h}
                  onClear={() =>
                    setModal({
                      title: "Clear all history?",
                      body: "This will permanently delete all activity logs.",
                      danger: true,
                      onConfirm: () => {
                        hist.clear();
                        setModal(null);
                      },
                      onCancel: () => setModal(null),
                    })
                  }
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
