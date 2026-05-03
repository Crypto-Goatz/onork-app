import { useEffect, useState } from "react";
import { Plus, Loader2, Database } from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError, type CustomField } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

const DATA_TYPES = [
  "TEXT",
  "LARGE_TEXT",
  "NUMERICAL",
  "PHONE",
  "MONETORY",
  "CHECKBOX",
  "SINGLE_OPTIONS",
  "MULTIPLE_OPTIONS",
  "DATE",
  "TEXTBOX_LIST",
];

export function CustomFieldManager({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState("TEXT");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await crm.listCustomFields(location.id);
      setFields(list);
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await crm.createCustomField(location.id, { name: name.trim(), dataType });
      toast("success", `Created "${name.trim()}"`);
      setName("");
      void load();
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-[#6EE05A]" />
        <h3 className="text-sm font-medium text-[#e6edf3]">Custom Fields</h3>
        <span className="text-xs text-[#8b949e]">
          {loading ? "—" : fields.length}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Field name"
          className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
        />
        <select
          value={dataType}
          onChange={(e) => setDataType(e.target.value)}
          className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-[#e6edf3] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none"
        >
          {DATA_TYPES.map((dt) => (
            <option key={dt} value={dt}>
              {dt}
            </option>
          ))}
        </select>
        <button
          onClick={handleCreate}
          disabled={creating || !name.trim()}
          className="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-3 py-1.5 text-xs hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {creating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      <div className="max-h-[160px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="space-y-1">
            <div className="h-7 bg-[#0d1117] rounded animate-pulse" />
            <div className="h-7 bg-[#0d1117] rounded animate-pulse" />
          </div>
        ) : fields.length === 0 ? (
          <div className="text-xs text-[#8b949e] py-2 text-center">
            No custom fields.
          </div>
        ) : (
          fields.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5"
            >
              <span className="text-xs text-[#c9d1d9] truncate">{f.name}</span>
              <span className="bg-[#6EE05A]/10 text-[#6EE05A] text-[10px] font-medium px-1.5 py-0.5 rounded font-mono flex-shrink-0">
                {f.dataType}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
