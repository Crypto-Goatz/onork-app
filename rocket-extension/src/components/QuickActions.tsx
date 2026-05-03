import { useEffect, useState } from "react";
import {
  Users,
  Tag as TagIcon,
  GitBranch,
  Megaphone,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { SavedLocation } from "../lib/storage";
import { crm, CrmApiError } from "../lib/crm-api";
import type { ToastVariant } from "./Toast";

type Stats = {
  contactCount: number | null;
  tagCount: number | null;
  workflowCount: number | null;
  loading: boolean;
  errored: boolean;
};

const EMPTY_STATS: Stats = {
  contactCount: null,
  tagCount: null,
  workflowCount: null,
  loading: false,
  errored: false,
};

export function QuickActions({
  location,
  onNavigate,
  toast,
}: {
  location: SavedLocation;
  onNavigate: (tab: "actions" | "campaigns") => void;
  toast: (variant: ToastVariant, text: string) => void;
}) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [locDetails, setLocDetails] = useState<{
    name: string;
    timezone?: string;
  } | null>(null);

  const load = async () => {
    setStats({ ...EMPTY_STATS, loading: true });
    try {
      const [tags, workflows, contacts, details] = await Promise.allSettled([
        crm.listTags(location.id),
        crm.listWorkflows(location.id),
        crm.searchContacts(location.id, "", 1),
        crm.getLocation(location.id),
      ]);

      const next: Stats = {
        loading: false,
        errored: false,
        contactCount: contacts.status === "fulfilled" ? contacts.value.length : null,
        tagCount: tags.status === "fulfilled" ? tags.value.length : null,
        workflowCount:
          workflows.status === "fulfilled" ? workflows.value.length : null,
      };

      if (details.status === "fulfilled") {
        setLocDetails({
          name: details.value.name,
          timezone: details.value.timezone,
        });
      }

      const allFailed = [tags, workflows, contacts, details].every(
        (r) => r.status === "rejected",
      );
      if (allFailed) {
        next.errored = true;
        const first = [tags, workflows, contacts, details].find(
          (r) => r.status === "rejected",
        );
        const reason =
          first && first.status === "rejected"
            ? first.reason instanceof CrmApiError
              ? first.reason.message
              : String(first.reason)
            : "Unknown error";
        toast("error", reason);
      }
      setStats(next);
    } catch (err) {
      setStats({ ...EMPTY_STATS, errored: true });
      toast("error", err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.id]);

  return (
    <div className="space-y-4 animate-fade-up">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <div className="text-base font-medium text-[#e6edf3] truncate">
              {locDetails?.name ?? location.name}
            </div>
            <div className="text-[11px] text-[#8b949e] font-mono truncate">
              {location.id}
            </div>
            {locDetails?.timezone && (
              <div className="text-[11px] text-[#8b949e] mt-0.5">
                {locDetails.timezone}
              </div>
            )}
          </div>
          <button
            onClick={() => void load()}
            disabled={stats.loading}
            className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg p-1.5 transition-all duration-150 disabled:opacity-50"
            aria-label="Refresh stats"
          >
            {stats.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Tags" value={stats.tagCount} loading={stats.loading} />
          <StatCard
            label="Workflows"
            value={stats.workflowCount}
            loading={stats.loading}
          />
          <StatCard
            label="Reachable"
            value={stats.errored ? 0 : stats.loading ? null : 1}
            loading={stats.loading}
            isHealth
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ActionButton
          icon={Users}
          label="Search Contacts"
          onClick={() => onNavigate("actions")}
        />
        <ActionButton
          icon={TagIcon}
          label="Tag Manager"
          onClick={() => onNavigate("actions")}
        />
        <ActionButton
          icon={GitBranch}
          label="Workflows"
          onClick={() => onNavigate("actions")}
        />
        <ActionButton
          icon={Megaphone}
          label="Run Campaign"
          onClick={() => onNavigate("campaigns")}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  isHealth,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  isHealth?: boolean;
}) {
  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2">
      {loading ? (
        <div className="h-5 w-8 bg-[#161b22] rounded animate-pulse" />
      ) : (
        <div
          className={`text-lg font-semibold ${
            isHealth
              ? value === 1
                ? "text-[#6EE05A]"
                : "text-[#f87171]"
              : "text-[#e6edf3]"
          }`}
        >
          {isHealth ? (value === 1 ? "OK" : "ERR") : (value ?? "—")}
        </div>
      )}
      <div className="text-[11px] text-[#8b949e]">{label}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 flex flex-col items-start gap-2 hover:border-[#484f58] hover:bg-[#1c2128] transition-all duration-150 active:scale-[0.98]"
    >
      <Icon className="w-4 h-4 text-[#6EE05A]" />
      <span className="text-sm font-medium text-[#e6edf3] text-left">
        {label}
      </span>
    </button>
  );
}
