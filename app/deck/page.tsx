"use client";

import { useState, useCallback, useEffect } from "react";
import { useVault } from "@/lib/hooks/useVault";
import { useFlows } from "@/lib/hooks/useFlows";
import { useHistory } from "@/lib/hooks/useHistory";
import { respond } from "@/lib/ai-responder";
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
  const vault = useVault();
  const flows = useFlows();
  const hist = useHistory();
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    {
      r: "sys",
      t: "Welcome to 0nork. I'm your command orchestrator. Open the Vault to connect services, or just ask me anything.",
    },
  ]);
  const [inp, setInp] = useState("");
  const [showCmd, setShowCmd] = useState(false);
  const [modal, setModal] = useState<ModalConfig | null>(null);

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

  const addMsg = useCallback((r: "user" | "sys", t: string) => {
    setMsgs((prev) => [...prev, { r, t }]);
  }, []);

  const send = useCallback(() => {
    const t = inp.trim();
    if (!t) return;
    setInp("");
    setShowCmd(false);
    addMsg("user", t);
    hist.add("chat", t);

    if (t === "/flows") { setView("flows"); return; }
    if (t === "/vault") { setView("vault"); setActiveSvc(null); return; }
    if (t === "/history") { setView("history"); return; }

    addMsg("sys", respond(t, vault, flows));
  }, [inp, addMsg, hist, vault, flows]);

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
                    addMsg(
                      "sys",
                      "Workflow builder coming soon - use natural language in chat to describe what you want to automate.",
                    );
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
