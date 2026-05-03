import { useEffect, useMemo, useState } from "react";
import {
  X,
  Loader2,
  Rocket,
  Eye,
  Sliders,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import type { Template, TemplateVariable } from "../templates/types";
import { renderTemplate } from "../templates/types";
import { crm, CrmApiError, type Funnel } from "../lib/crm-api";
import type { SavedLocation } from "../lib/storage";
import type { ToastVariant } from "../components/Toast";

type Stage = "editing" | "deployed";

export function TemplateCustomizer({
  template,
  location,
  onClose,
  toast,
}: {
  template: Template;
  location: SavedLocation;
  onClose: () => void;
  toast: (v: ToastVariant, m: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(template.variables.map((v) => [v.key, v.defaultValue])),
  );
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [stage, setStage] = useState<Stage>("editing");
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [funnelsLoading, setFunnelsLoading] = useState(true);
  const [funnelId, setFunnelId] = useState<string>("");
  const [pageName, setPageName] = useState(template.name);
  const [deploying, setDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  // Auto-fill from CRM location data on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const details = await crm.getLocation(location.id);
        if (cancelled) return;
        setValues((prev) => {
          const next = { ...prev };
          for (const v of template.variables) {
            if (!v.autoFillFrom) continue;
            const sourceValue = (() => {
              switch (v.autoFillFrom) {
                case "name":
                  return details.name;
                case "phone":
                  return details.phone;
                case "address":
                  return details.address;
                case "email":
                  return details.email;
                case "website":
                  return details.website;
              }
            })();
            if (sourceValue && next[v.key] === v.defaultValue) {
              next[v.key] = sourceValue;
            }
          }
          return next;
        });
      } catch {
        // best-effort — silently keep defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.id, template]);

  // Load funnels
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setFunnelsLoading(true);
      try {
        const list = await crm.listFunnels(location.id);
        if (cancelled) return;
        setFunnels(list);
        if (list[0]) setFunnelId(list[0].id);
      } catch (err) {
        if (cancelled) return;
        toast(
          "error",
          err instanceof CrmApiError
            ? `Funnels: ${err.message}`
            : "Could not load funnels",
        );
      } finally {
        if (!cancelled) setFunnelsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.id, toast]);

  const renderedHtml = useMemo(
    () => renderTemplate(template.html, values),
    [template.html, values],
  );

  const handleDeploy = async () => {
    if (!funnelId) {
      toast("error", "Pick a funnel to deploy into.");
      return;
    }
    setDeploying(true);
    try {
      const result = await crm.createFunnelPage(location.id, {
        name: pageName,
        funnelId,
        html: renderedHtml,
      });
      setDeployedUrl(result.url ?? null);
      setStage("deployed");
      toast("success", `Deployed "${pageName}" to ${location.name}`);
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0d1117]">
      <header className="h-12 flex items-center justify-between px-3 border-b border-[#30363d] bg-[#0d1117] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg p-1.5 transition-all duration-150"
            aria-label="Close customizer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[#e6edf3] truncate">
              {template.name}
            </div>
            <div className="text-[10px] text-[#8b949e] truncate">
              → {location.name}
            </div>
          </div>
        </div>
        <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden">
          <button
            onClick={() => setView("edit")}
            className={`px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors duration-150 ${
              view === "edit"
                ? "bg-[#6EE05A] text-[#0d1117]"
                : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <Sliders className="w-3 h-3" />
            Edit
          </button>
          <button
            onClick={() => setView("preview")}
            className={`px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition-colors duration-150 ${
              view === "preview"
                ? "bg-[#6EE05A] text-[#0d1117]"
                : "text-[#8b949e] hover:text-[#e6edf3]"
            }`}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>
      </header>

      {stage === "deployed" ? (
        <DeployedScreen
          url={deployedUrl}
          name={pageName}
          locationName={location.name}
          onClose={onClose}
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {view === "edit" ? (
              <EditPanel
                variables={template.variables}
                values={values}
                onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
              />
            ) : (
              <PreviewPanel html={renderedHtml} />
            )}
          </div>

          <footer className="border-t border-[#30363d] px-3 py-2.5 bg-[#0d1117] space-y-2 flex-shrink-0">
            <div className="grid grid-cols-[1fr_1fr] gap-2">
              <div>
                <label className="text-[10px] font-medium text-[#8b949e] mb-1 block">
                  Page name
                </label>
                <input
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#8b949e] mb-1 block">
                  Funnel
                </label>
                <select
                  value={funnelId}
                  onChange={(e) => setFunnelId(e.target.value)}
                  disabled={funnelsLoading}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-[#e6edf3] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none disabled:opacity-50"
                >
                  {funnelsLoading && <option>Loading…</option>}
                  {!funnelsLoading && funnels.length === 0 && (
                    <option value="">No funnels found</option>
                  )}
                  {funnels.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleDeploy}
              disabled={deploying || !funnelId}
              className="w-full bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deploying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4" />
              )}
              Deploy to {location.name}
            </button>
          </footer>
        </>
      )}
    </div>
  );
}

function EditPanel({
  variables,
  values,
  onChange,
}: {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {variables.map((v) => (
        <div key={v.key}>
          <label className="text-[11px] font-medium text-[#8b949e] mb-1 flex items-center gap-1.5">
            {v.label}
            {v.autoFillFrom && (
              <span className="bg-[#58a6ff]/10 text-[#58a6ff] text-[9px] font-medium px-1 py-0.5 rounded">
                AUTO
              </span>
            )}
          </label>
          {v.type === "textarea" ? (
            <textarea
              value={values[v.key] ?? ""}
              onChange={(e) => onChange(v.key, e.target.value)}
              rows={2}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150 resize-none"
            />
          ) : (
            <input
              value={values[v.key] ?? ""}
              onChange={(e) => onChange(v.key, e.target.value)}
              type={v.type === "url" ? "url" : "text"}
              inputMode={v.type === "currency" ? "decimal" : undefined}
              className={`w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150 ${v.type === "url" || v.type === "currency" ? "font-mono" : ""}`}
            />
          )}
          {v.hint && (
            <div className="text-[10px] text-[#8b949e] mt-1">{v.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewPanel({ html }: { html: string }) {
  return (
    <div className="border border-[#30363d] rounded-xl overflow-hidden bg-[#0d1117] h-full min-h-[400px]">
      <iframe
        srcDoc={html}
        title="Template preview"
        sandbox="allow-same-origin"
        className="w-full h-full"
        style={{ minHeight: "440px" }}
      />
    </div>
  );
}

function DeployedScreen({
  url,
  name,
  locationName,
  onClose,
}: {
  url: string | null;
  name: string;
  locationName: string;
  onClose: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-8 animate-fade-up">
      <div className="text-center space-y-4 max-w-[320px]">
        <div className="w-14 h-14 rounded-full bg-[#6EE05A]/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-7 h-7 text-[#6EE05A]" />
        </div>
        <div>
          <div className="text-base font-medium text-[#e6edf3]">Deployed</div>
          <div className="text-xs text-[#8b949e] mt-1">
            "{name}" is live in {locationName}.
          </div>
        </div>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[#6EE05A] hover:text-[#5bc74a] transition-colors"
          >
            Open in new tab <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {!url && (
          <div className="text-[11px] text-[#fbbf24] flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            CRM didn't return a preview URL — check the funnel directly.
          </div>
        )}
        <button
          onClick={onClose}
          className="bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
        >
          Done
        </button>
      </div>
    </div>
  );
}
