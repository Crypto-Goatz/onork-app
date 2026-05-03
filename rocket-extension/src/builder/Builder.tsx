import { useEffect, useRef, useState } from "react";
import {
  Layers,
  Search,
  Upload,
  Filter as FilterIcon,
  Sparkles,
} from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import type { Template, TemplateCategory } from "../templates/types";
import { getAllTemplates, isValidTemplate, saveUserTemplate } from "../templates/store";
import { TemplateCard } from "./TemplateCard";
import { TemplateCustomizer } from "./TemplateCustomizer";
import { ApplyThemeCard } from "./ApplyThemeCard";
import type { ToastVariant } from "../components/Toast";

const CATEGORIES: ("All" | TemplateCategory)[] = [
  "All",
  "Landing Pages",
  "Funnels",
  "Thank You Pages",
  "Booking Pages",
  "Campaign Pages",
];

export function Builder({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (v: ToastVariant, m: string) => void;
}) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | TemplateCategory>("All");
  const [active, setActive] = useState<Template | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const list = await getAllTemplates();
    setTemplates(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleExport = (template: Template) => {
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.id}.template.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("success", `Exported "${template.name}"`);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!isValidTemplate(parsed)) {
        toast("error", "Not a valid template file.");
        return;
      }
      await saveUserTemplate(parsed);
      await load();
      toast("success", `Imported "${parsed.name}"`);
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Import failed");
    }
  };

  const filtered = templates.filter((t) => {
    if (category !== "All" && t.category !== category) return false;
    if (
      query &&
      !`${t.name} ${t.description} ${t.category}`
        .toLowerCase()
        .includes(query.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-3 animate-fade-up">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportFile}
      />

      <ApplyThemeCard location={location} toast={toast} />

      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#6EE05A]" />
          <h3 className="text-sm font-medium text-[#e6edf3]">Template Library</h3>
          <span className="text-xs text-[#8b949e] font-mono">
            {loading ? "—" : templates.length}
          </span>
          <button
            onClick={handleImportClick}
            className="ml-auto bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98] flex items-center gap-1"
            title="Import a .template.json file"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8b949e]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          <FilterIcon className="w-3 h-3 text-[#8b949e] flex-shrink-0" />
          {CATEGORIES.map((c) => {
            const isActive = c === category;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 text-[11px] font-medium px-2 py-1 rounded-full transition-all duration-150 ${
                  isActive
                    ? "bg-[#6EE05A]/15 text-[#6EE05A]"
                    : "bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="h-44 bg-[#0d1117] rounded-xl animate-pulse" />
            <div className="h-44 bg-[#0d1117] rounded-xl animate-pulse" />
            <div className="h-44 bg-[#0d1117] rounded-xl animate-pulse" />
            <div className="h-44 bg-[#0d1117] rounded-xl animate-pulse" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onDeploy={(tpl) => setActive(tpl)}
                onExport={handleExport}
              />
            ))}
          </div>
        )}
      </div>

      {active && (
        <TemplateCustomizer
          template={active}
          location={location}
          onClose={() => setActive(null)}
          toast={toast}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-[#0d1117] border border-[#30363d] border-dashed rounded-xl p-6 text-center space-y-2">
      <Sparkles className="w-5 h-5 text-[#6EE05A] mx-auto" />
      <div className="text-xs text-[#e6edf3] font-medium">No templates match</div>
      <div className="text-[11px] text-[#8b949e]">
        Try a different category or clear the search.
      </div>
    </div>
  );
}
