"use client";

import { useState, useCallback } from "react";
import { useVault } from "@/lib/hooks/useVault";
import { useFlows } from "@/lib/hooks/useFlows";
import { useHistory } from "@/lib/hooks/useHistory";
import { respond } from "@/lib/ai-responder";
import { Modal } from "@/components/ui/Modal";
import { Header } from "./components/Header";
import { IdeasTicker } from "./components/IdeasTicker";
import { ServiceStrip } from "./components/ServiceStrip";
import { Chat, type ChatMessage } from "./components/Chat";
import { ChatInput } from "./components/ChatInput";
import { CommandPalette } from "./components/CommandPalette";
import { VaultOverlay } from "./components/VaultOverlay";
import { VaultDetail } from "./components/VaultDetail";
import { FlowsOverlay } from "./components/FlowsOverlay";
import { HistoryOverlay } from "./components/HistoryOverlay";

interface ModalConfig {
  title: string;
  body: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeckPage() {
  const [view, setView] = useState("home");
  const [activeSvc, setActiveSvc] = useState<string | null>(null);
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
    setView("vault");
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

      <div
        className="max-w-[480px] w-full h-dvh mx-auto flex flex-col relative overflow-hidden animate-fade-in"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, #7c3aed44, transparent 60%), #08081a",
          borderLeft: "1px solid #1e225822",
          borderRight: "1px solid #1e225822",
        }}
      >
        <Header
          vaultCount={vault.n}
          view={view}
          setView={setView}
          onVaultOpen={() => setActiveSvc(null)}
        />

        <IdeasTicker isC={vault.isC} />

        {/* Overlays */}
        {view === "vault" && (
          <VaultOverlay
            isC={vault.isC}
            vaultCount={vault.n}
            activeSvc={activeSvc}
            onClose={() => setView("home")}
            onSelectService={(k) => setActiveSvc(k)}
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
          </VaultOverlay>
        )}

        {view === "flows" && (
          <FlowsOverlay
            flows={flows.f}
            onClose={() => setView("home")}
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
            }}
            onHistory={hist.add}
          />
        )}

        {view === "history" && (
          <HistoryOverlay
            history={hist.h}
            onClose={() => setView("home")}
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
        )}

        <ServiceStrip isC={vault.isC} onServiceClick={handleServiceClick} />

        <Chat msgs={msgs} />

        <CommandPalette
          open={showCmd}
          onSelect={(cmd) => {
            setInp(cmd + " ");
            setShowCmd(false);
          }}
        />

        <ChatInput
          value={inp}
          onChange={setInp}
          onSend={send}
          onSlash={setShowCmd}
        />
      </div>
    </>
  );
}
