import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Tag as TagIcon } from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError, type Tag } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

export function TagManager({
  location,
  toast,
}: {
  location: SavedLocation;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await crm.listTags(location.id);
      setTags(list);
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
    const names = bulkInput
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setCreating(true);
    let ok = 0;
    let fail = 0;
    for (const name of names) {
      try {
        await crm.createTag(location.id, name);
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setCreating(false);
    setBulkInput("");
    if (ok > 0) toast("success", `Created ${ok} tag${ok === 1 ? "" : "s"}`);
    if (fail > 0) toast("error", `${fail} failed`);
    void load();
  };

  const handleDelete = async (tag: Tag) => {
    setDeletingId(tag.id);
    try {
      await crm.deleteTag(location.id, tag.id);
      toast("success", `Deleted "${tag.name}"`);
      setTags((prev) => prev.filter((t) => t.id !== tag.id));
    } catch (err) {
      toast("error", err instanceof CrmApiError ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <TagIcon className="w-4 h-4 text-[#6EE05A]" />
        <h3 className="text-sm font-medium text-[#e6edf3]">Tags</h3>
        <span className="text-xs text-[#8b949e]">
          {loading ? "—" : tags.length}
        </span>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-[#8b949e] block">
          Create (comma-separated for bulk)
        </label>
        <div className="flex gap-2">
          <input
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="vip, follow-up, hot-lead"
            className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !bulkInput.trim()}
            className="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-3 py-1.5 text-xs hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {creating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Create
          </button>
        </div>
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {loading ? (
          <div className="space-y-1">
            <div className="h-7 bg-[#161b22] rounded animate-pulse" />
            <div className="h-7 bg-[#161b22] rounded animate-pulse" />
            <div className="h-7 bg-[#161b22] rounded animate-pulse" />
          </div>
        ) : tags.length === 0 ? (
          <div className="text-xs text-[#8b949e] py-3 text-center">
            No tags yet.
          </div>
        ) : (
          tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between gap-2 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 hover:border-[#484f58] transition-colors duration-150"
            >
              <span className="text-xs text-[#c9d1d9] truncate">{tag.name}</span>
              <button
                onClick={() => void handleDelete(tag)}
                disabled={deletingId === tag.id}
                className="text-[#8b949e] hover:text-[#f87171] transition-colors duration-150 flex-shrink-0 disabled:opacity-50"
                aria-label={`Delete ${tag.name}`}
              >
                {deletingId === tag.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
