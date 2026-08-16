import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Eye,
  Users,
  Megaphone,
  PenLine,
  MessageCircle,
  KeyRound,
  Settings as SettingsIcon,
  ExternalLink,
  Search,
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
import { ToastStack, useToasts } from "../components/Toast";

/**
 * Surface C — the extension panel, rebuilt to design_handoff_0ncore 3
 * (Chrome Extension.dc.html + screenshots/extension-01-now.png).
 *
 * IT IS LIGHT, NOT CONSOLE DARK. Worth saying because the token file and this
 * app both assumed otherwise for a long time: design-tokens.ts is the #0d1117
 * console family and the comp paints a white panel. The panel sits beside a
 * page the person is reading, and a black slab next to LinkedIn or a client's
 * website reads as a separate application rather than a tool for that page.
 *
 * CONTEXT, NOT NAVIGATION. The panel leads with the tab you are on. That is the
 * whole difference from the web app: "Now" is first because the answer to "what
 * do I want here" is nearly always about the page in front of you.
 *
 * EVERY WRITE NAMES THE CLIENT IT WILL HIT, in the button, before it is pressed
 * — "Save as contact → RocketOpp HQ", never a bare "Save". Acting on the wrong
 * sub-account is the one mistake this thing can make that cannot be undone by
 * clicking again.
 */
type Tab = "now" | "leads" | "campaigns" | "compose" | "chat" | "account";

const TABS: { id: Tab; label: string; icon: typeof Eye }[] = [
  { id: "now", label: "Now", icon: Eye },
  { id: "leads", label: "Leads", icon: Users },
  { id: "campaigns", label: "Campaigns", icon: Megaphone },
  { id: "compose", label: "Compose", icon: PenLine },
  { id: "chat", label: "Chat", icon: MessageCircle },
  { id: "account", label: "Account", icon: KeyRound },
];

/** What the panel can say about the page without a content script. */
interface PageContext {
  url: string;
  title: string;
  host: string;
  kind: "linkedin-profile" | "crm" | "site" | "blank";
}

function classify(url: string, title: string): PageContext {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return { url, title, host: "", kind: "blank" };
  }
  const kind: PageContext["kind"] =
    /(^|\.)linkedin\.com$/.test(host) && /\/in\//.test(url)
      ? "linkedin-profile"
      : /(leadconnectorhq|gohighlevel|rocketclients|180crm)\.com$/.test(host)
        ? "crm"
        : "site";
  return { url, title, host, kind };
}

export function App() {
  const [tab, setTab] = useState<Tab>("now");
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [activeId, setActiveIdState] = useState<string | null>(null);
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [crmDomain, setCrmDomain] = useState<string | null>(null);
  const [page, setPage] = useState<PageContext | null>(null);
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
      const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!t?.url) return;
      setPage(classify(t.url, t.title ?? ""));
      const id = extractLocationId(t.url);
      setCrmDomain(getCrmBaseDomain(t.url));
      if (id) {
        setDetectedId(id);
        await chrome.storage.local.set({ detectedLocationId: id });
      }
    } catch {
      // A tab we are not allowed to read is a normal state, not an error.
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      await detectFromActiveTab();
      setBootstrapped(true);
    })();

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>) => {
      if ("locations" in changes || "activeLocationId" in changes || "detectedLocationId" in changes) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [refresh, detectFromActiveTab]);

  useEffect(() => {
    if (!detectedId || !activeId) return;
    if (detectedId === activeId) return;
    if (locations.some((l) => l.id === detectedId)) void setActiveLocation(detectedId);
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
    <div className="flex h-[600px] w-[400px] flex-col overflow-hidden bg-white font-sans text-[#171717]">
      <ToastStack toasts={toasts.toasts} onDismiss={toasts.dismiss} />

      <header className="flex h-12 flex-shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <img src="/icons/wordmark.png" alt="0nCORE" className="h-[18px] w-auto"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          <span className="text-[14px] font-bold tracking-tight">0nCORE</span>
          {/* Green = a key that works. It is the first thing to check when
              something did not happen, so it sits beside the mark. */}
          <span
            title={active ? "Connected" : "No client key"}
            className={`h-2 w-2 rounded-full ${active ? "bg-[#6EE05A]" : "bg-[#d97706]"}`}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <LocationSwitcher
            locations={locations}
            activeId={activeId}
            detectedId={detectedId}
            onSelect={onSelectLocation}
            onAddNew={() => setTab("account")}
          />
          <button
            onClick={() => setTab("account")}
            aria-label="Settings"
            className="grid h-7 w-7 place-items-center rounded-lg text-[#737373] transition-colors hover:bg-[#f4f4f4] hover:text-[#171717]"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Icon over label, lime pill on the active one — the comp's tab row. */}
      <nav className="flex flex-shrink-0 gap-0.5 px-2 pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={on ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10.5px] font-medium transition-colors ${
                on ? "bg-[rgba(110,224,90,0.16)] text-[#16a34a]" : "text-[#737373] hover:bg-[#f4f4f4]"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </nav>

      <main className="flex-1 overflow-y-auto px-3 pb-3">
        {!bootstrapped ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-[#f4f4f4]" />
            <div className="h-32 animate-pulse rounded-2xl bg-[#f4f4f4]" />
          </div>
        ) : !active ? (
          // "Disconnected state is one screen with one button, never a broken
          // tab." Every tab collapses to this until there is a client to act on.
          <NoClient detectedId={detectedId} onAddNew={() => setTab("account")} />
        ) : tab === "now" ? (
          <NowTab page={page} clientName={active.name} onGoLeads={() => setTab("leads")} />
        ) : tab === "leads" ? (
          <div className="space-y-3">
            <Eyebrow icon={Search}>Find someone in {active.name}</Eyebrow>
            {/* This is search, not the captured-leads queue the spec describes.
                Labelled for what it does — a search box under a "Leads" heading
                that implies a queue is how someone concludes their captures
                were lost. */}
            <ContactSearch location={active} crmDomain={crmDomain} toast={pushToast} />
            <TagManager location={active} toast={pushToast} />
            <CustomFieldManager location={active} toast={pushToast} />
            <TriggerLinkManager location={active} toast={pushToast} />
            <WorkflowList location={active} toast={pushToast} />
          </div>
        ) : tab === "campaigns" ? (
          <CampaignBuilder location={active} toast={pushToast} />
        ) : tab === "compose" ? (
          <NotWired name="Compose">
            Generating posts, gigs and emails from a voice profile is designed
            and not yet wired here. The web app can do it today.
          </NotWired>
        ) : tab === "chat" ? (
          <NotWired name="Chat">
            Jaxx with this page as context is designed and not yet wired here.
          </NotWired>
        ) : (
          <div className="space-y-3">
            <QuickActions location={active} onNavigate={() => setTab("now")} toast={pushToast} />
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

      <footer className="flex flex-shrink-0 items-center justify-between border-t border-[#e5e5e5] px-3 py-1.5 text-[10px] text-[#a3a3a3]">
        <span className="font-mono">v1.1.0</span>
        <a
          href="https://app.0ncore.com/crm"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 transition-colors hover:text-[#16a34a]"
        >
          Open the full app <ExternalLink className="h-3 w-3" />
        </a>
      </footer>
    </div>
  );
}

/** The context tab. What it offers changes with the page you are on. */
function NowTab({
  page, clientName, onGoLeads,
}: { page: PageContext | null; clientName: string; onGoLeads: () => void }) {
  if (!page || page.kind === "blank") {
    return (
      <>
        <Eyebrow icon={Eye}>On this page</Eyebrow>
        <Card>
          <p className="text-[13px] leading-relaxed text-[#737373]">
            Nothing to act on here. Open a profile, a client&rsquo;s site, or their CRM and
            this fills in.
          </p>
        </Card>
      </>
    );
  }

  const label =
    page.kind === "linkedin-profile" ? "LinkedIn profile"
    : page.kind === "crm" ? "Your CRM"
    : page.host;

  return (
    <>
      <Eyebrow icon={Eye}>On this page · {label}</Eyebrow>
      {/* Green-tinted, because this card is the one thing on the panel that is
          about the page rather than about the product. */}
      <div className="rounded-2xl border border-[rgba(22,163,74,0.25)] bg-[#f6fdf8] p-4">
        <div className="truncate text-[14px] font-semibold text-[#171717]">
          {page.title || page.host}
        </div>
        <div className="mt-0.5 truncate text-[12px] text-[#737373]">{page.host}</div>

        {page.kind === "linkedin-profile" && (
          // No fabricated chips. The name, title and company in the comp come
          // from reading the page, and this build has no content script on
          // linkedin.com — inventing them from the tab title would put made-up
          // details on a Save button.
          <p className="mt-3 text-[12px] leading-relaxed text-[#737373]">
            Reading the name, title and company off the page needs the LinkedIn
            content script, which is not in this build yet. Until it is, save the
            person from the full app.
          </p>
        )}

        <button
          onClick={onGoLeads}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#171717] px-4 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.01] active:scale-[0.99]"
        >
          {/* The client is named in the button, before the press. */}
          Find or save in <span className="font-bold">{clientName}</span>
        </button>
      </div>
    </>
  );
}

function Eyebrow({ icon: Icon, children }: { icon: typeof Eye; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">
      <Icon className="h-3.5 w-3.5" /> {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[#e5e5e5] bg-white p-4">{children}</div>;
}

function NotWired({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="text-[13.5px] font-semibold text-[#171717]">{name} is not switched on yet</div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#737373]">{children}</p>
    </Card>
  );
}

function NoClient({ detectedId, onAddNew }: { detectedId: string | null; onAddNew: () => void }) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#e5e5e5] bg-white p-5 text-center">
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[rgba(110,224,90,0.16)]">
        <KeyRound className="h-5 w-5 text-[#16a34a]" />
      </div>
      <div>
        <div className="text-[13.5px] font-semibold text-[#171717]">No client connected</div>
        <div className="mt-1 text-[12.5px] leading-relaxed text-[#737373]">
          Add a client and its key, and every tab here starts working.
        </div>
      </div>
      {detectedId && (
        <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-2 text-left">
          <div className="text-[10px] text-[#a3a3a3]">Detected on this page</div>
          <div className="break-all font-mono text-[11.5px] text-[#16a34a]">{detectedId}</div>
        </div>
      )}
      <button
        onClick={onAddNew}
        className="rounded-full bg-[#171717] px-5 py-2.5 text-[13px] font-semibold text-white transition-transform active:scale-[0.98]"
      >
        Add a client
      </button>
    </div>
  );
}
