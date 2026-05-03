import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Wrench,
  Megaphone,
  Layers,
  Settings as SettingsIcon,
  Rocket,
} from "lucide-react";
import {
  getState,
  setActiveLocation,
  type SavedLocation,
} from "../lib/storage";
import { extractLocationId, getCrmBaseDomain } from "../lib/url-detector";
import { LocationSwitcher } from "../components/LocationSwitcher";
import { QuickActions } from "../components/QuickActions";
import { TagManager } from "../components/TagManager";
import { ContactSearch } from "../components/ContactSearch";
import { CustomFieldManager } from "../components/CustomFieldManager";
import { TriggerLinkManager } from "../components/TriggerLinkManager";
import { WorkflowList } from "../components/WorkflowList";
import { CampaignBuilder } from "../components/CampaignBuilder";
import { Settings } from "../components/Settings";
import { Builder } from "../builder/Builder";
import { ToastStack, useToasts } from "../components/Toast";

type Tab = "dashboard" | "actions" | "campaigns" | "builder" | "settings";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "actions", label: "Actions", icon: Wrench },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "builder", label: "Builder", icon: Layers },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [crmDomain, setCrmDomain] = useState<string | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const toasts = useToasts();
  const pushToast = toasts.push;

  const refresh = useCallback(async () => {
    const state = await getState();
    setLocations(state.locations);
    setActiveIdState(state.activeLocationId);
    setDetectedId(state.detectedLocationId);
  }, []);

  const detectFromActiveTab = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      if (!tab?.url) return;
      const id = extractLocationId(tab.url);
      const domain = getCrmBaseDomain(tab.url);
      setCrmDomain(domain);
      if (id) {
        setDetectedId(id);
        await chrome.storage.local.set({ detectedLocationId: id });
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      await detectFromActiveTab();
      setBootstrapped(true);
    })();

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (
        "locations" in changes ||
        "activeLocationId" in changes ||
        "detectedLocationId" in changes
      ) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh, detectFromActiveTab]);

  useEffect(() => {
    if (!detectedId || !activeId) return;
    if (detectedId === activeId) return;
    if (locations.some((l) => l.id === detectedId)) {
      void setActiveLocation(detectedId);
    }
  }, [detectedId, activeId, locations]);

  const active = useMemo(
    () => locations.find((l) => l.id === activeId) ?? null,
    [locations, activeId],
  );

  const onSelectLocation = async (id: string) => {
    await setActiveLocation(id);
    await refresh();
  };

  return (
    <div className="w-[400px] h-[600px] bg-[#0d1117] text-[#c9d1d9] font-sans flex flex-col overflow-hidden">
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <header className="h-12 bg-[#0d1117]/80 backdrop-blur border-b border-[#30363d] flex items-center justify-between px-3 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#6EE05A]/10 flex items-center justify-center flex-shrink-0">
            <Rocket className="w-4 h-4 text-[#6EE05A]" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#e6edf3] leading-tight tracking-tight">
              RocketOpp
            </div>
            <div className="text-[10px] text-[#8b949e] leading-tight font-mono">
              CRM Admin
            </div>
          </div>
        </div>
        <LocationSwitcher
          locations={locations}
          activeId={activeId}
          detectedId={detectedId}
          onSelect={onSelectLocation}
          onAddNew={() => setTab("settings")}
        />
      </header>

      <nav className="flex border-b border-[#30363d] bg-[#0d1117] flex-shrink-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium border-b-2 transition-all duration-150 ${
                isActive
                  ? "border-[#6EE05A] text-[#6EE05A]"
                  : "border-transparent text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#161b22]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto px-3 py-3">
        {!bootstrapped ? (
          <div className="space-y-3">
            <div className="h-24 bg-[#161b22] rounded-xl animate-pulse" />
            <div className="h-32 bg-[#161b22] rounded-xl animate-pulse" />
          </div>
        ) : !active ? (
          <EmptyState
            detectedId={detectedId}
            onAddNew={() => setTab("settings")}
          />
        ) : tab === "dashboard" ? (
          <QuickActions
            location={active}
            onNavigate={(t) => setTab(t)}
            toast={pushToast}
          />
        ) : tab === "actions" ? (
          <div className="space-y-3 animate-fade-up">
            <ContactSearch
              location={active}
              crmDomain={crmDomain}
              toast={pushToast}
            />
            <TagManager location={active} toast={pushToast} />
            <CustomFieldManager location={active} toast={pushToast} />
            <TriggerLinkManager location={active} toast={pushToast} />
            <WorkflowList location={active} toast={pushToast} />
          </div>
        ) : tab === "campaigns" ? (
          <div className="animate-fade-up">
            <CampaignBuilder location={active} toast={pushToast} />
          </div>
        ) : tab === "builder" ? (
          <Builder location={active} toast={pushToast} />
        ) : (
          <div className="animate-fade-up">
            <Settings
              locations={locations}
              activeId={activeId}
              detectedId={detectedId}
              onChange={refresh}
              toast={pushToast}
            />
          </div>
        )}
      </main>

      <footer className="border-t border-[#30363d] px-3 py-1.5 flex items-center justify-between text-[10px] text-[#8b949e] flex-shrink-0">
        <span className="font-mono">v1.1.0</span>
        <span>RocketOpp · Internal</span>
      </footer>
    </div>
  );
}

function EmptyState({
  detectedId,
  onAddNew,
}: {
  detectedId: string | null;
  onAddNew: () => void;
}) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 text-center space-y-3 animate-fade-up hover:border-[#484f58] hover:shadow-lg hover:shadow-black/20 transition-all duration-200">
      <div className="w-10 h-10 rounded-full bg-[#6EE05A]/10 flex items-center justify-center mx-auto">
        <Rocket className="w-5 h-5 text-[#6EE05A]" />
      </div>
      <div>
        <div className="text-sm font-medium text-[#e6edf3] tracking-tight">
          No active location
        </div>
        <div className="text-xs text-[#8b949e] mt-1 leading-relaxed">
          Add a location with its PIT token to start managing it from here.
        </div>
      </div>
      {detectedId && (
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-2 text-left">
          <div className="text-[10px] text-[#8b949e]">Detected on this page</div>
          <div className="text-xs font-mono text-[#58a6ff] break-all">
            {detectedId}
          </div>
        </div>
      )}
      <button
        onClick={onAddNew}
        className="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
      >
        Add location
      </button>
    </div>
  );
}
