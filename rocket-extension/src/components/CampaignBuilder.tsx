import { useEffect, useState } from "react";
import { Megaphone, Play, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { CampaignTemplate, SavedLocation } from "../lib/storage";
import { getCampaignTemplates, saveCampaignTemplate } from "../lib/storage";
import { BUILT_IN_TEMPLATES } from "../lib/templates";
import { crm, CrmApiError } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

type StepResult = {
  index: number;
  ok: boolean;
  message: string;
};

export function CampaignBuilder({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>(
    BUILT_IN_TEMPLATES[0]?.id ?? "",
  );
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<StepResult[]>([]);

  useEffect(() => {
    void (async () => {
      const stored = await getCampaignTemplates();
      const merged = mergeTemplates(BUILT_IN_TEMPLATES, stored);
      setTemplates(merged);
      // ensure built-ins are persisted on first load so they're editable
      for (const t of BUILT_IN_TEMPLATES) {
        if (!stored.some((s) => s.id === t.id)) {
          await saveCampaignTemplate(t);
        }
      }
    })();
  }, []);

  const selected = templates.find((t) => t.id === selectedId) ?? null;

  const runTemplate = async () => {
    if (!selected) return;
    setRunning(true);
    setResults([]);
    const out: StepResult[] = [];
    for (let i = 0; i < selected.steps.length; i++) {
      const step = selected.steps[i];
      try {
        if (step.type === "create_tag") {
          await crm.createTag(location.id, step.name);
          out.push({ index: i, ok: true, message: `Tag "${step.name}"` });
        } else if (step.type === "create_trigger_link") {
          await crm.createTriggerLink(location.id, {
            name: step.name,
            redirectTo: step.redirectTo,
          });
          out.push({ index: i, ok: true, message: `Link "${step.name}"` });
        } else if (step.type === "create_custom_field") {
          await crm.createCustomField(location.id, {
            name: step.name,
            dataType: step.dataType,
          });
          out.push({ index: i, ok: true, message: `Field "${step.name}"` });
        } else if (step.type === "note") {
          out.push({ index: i, ok: true, message: step.text });
        }
      } catch (err) {
        const msg =
          err instanceof CrmApiError ? err.message : String(err);
        out.push({ index: i, ok: false, message: msg });
      }
      setResults([...out]);
    }
    const okCount = out.filter((r) => r.ok).length;
    const errCount = out.length - okCount;
    if (errCount === 0) {
      toast("success", `Campaign ran cleanly — ${okCount} step${okCount === 1 ? "" : "s"}`);
    } else {
      toast("error", `${errCount} step${errCount === 1 ? "" : "s"} failed`);
    }
    setRunning(false);
  };

  return (
    <div className="space-y-3">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#6EE05A]" />
          <h3 className="text-sm font-medium text-[#e6edf3]">Campaign Templates</h3>
        </div>

        <div className="space-y-1.5">
          {templates.map((t) => {
            const isSel = t.id === selectedId;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-lg px-3 py-2 border transition-all duration-150 ${
                  isSel
                    ? "bg-[#6EE05A]/5 border-[#6EE05A]/40"
                    : "bg-[#0d1117] border-[#30363d] hover:border-[#484f58] hover:bg-[#1c2128]"
                }`}
              >
                <div
                  className={`text-xs font-medium ${
                    isSel ? "text-[#6EE05A]" : "text-[#e6edf3]"
                  }`}
                >
                  {t.name}
                </div>
                <div className="text-[11px] text-[#8b949e] mt-0.5">
                  {t.description}
                </div>
                <div className="text-[10px] text-[#8b949e] mt-1 font-mono">
                  {t.steps.length} step{t.steps.length === 1 ? "" : "s"}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <button
            onClick={() => void runTemplate()}
            disabled={running}
            className="w-full bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {running ? "Running…" : `Run on ${location.name}`}
          </button>
        )}
      </div>

      {selected && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-2">
          <h4 className="text-xs font-medium text-[#8b949e] uppercase tracking-wide">
            Steps
          </h4>
          <div className="space-y-1.5">
            {selected.steps.map((step, i) => {
              const result = results.find((r) => r.index === i);
              return (
                <div
                  key={i}
                  className="flex items-start gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {result ? (
                      result.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#6EE05A]" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-[#f87171]" />
                      )
                    ) : running ? (
                      <Loader2 className="w-3.5 h-3.5 text-[#8b949e] animate-spin" />
                    ) : (
                      <span className="block w-3.5 h-3.5 rounded-full border border-[#30363d]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#c9d1d9]">
                      {describeStep(step)}
                    </div>
                    {result && !result.ok && (
                      <div className="text-[10px] text-[#f87171] mt-0.5">
                        {result.message}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function describeStep(
  step: CampaignTemplate["steps"][number],
): string {
  switch (step.type) {
    case "create_tag":
      return `Create tag: ${step.name}`;
    case "create_trigger_link":
      return `Create trigger link: ${step.name} → ${step.redirectTo}`;
    case "create_custom_field":
      return `Create field: ${step.name} (${step.dataType})`;
    case "note":
      return `Note: ${step.text}`;
  }
}

function mergeTemplates(
  builtin: CampaignTemplate[],
  stored: CampaignTemplate[],
): CampaignTemplate[] {
  const map = new Map<string, CampaignTemplate>();
  for (const t of builtin) map.set(t.id, t);
  for (const t of stored) map.set(t.id, t);
  return Array.from(map.values());
}
