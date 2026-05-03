import { Download, Rocket } from "lucide-react";
import type { Template } from "../templates/types";

export function TemplateCard({
  template,
  onDeploy,
  onExport,
}: {
  template: Template;
  onDeploy: (t: Template) => void;
  onExport: (t: Template) => void;
}) {
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden hover:border-[#484f58] hover:bg-[#1c2128] hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20 transition-all duration-200 flex flex-col">
      <div
        className="aspect-[5/3] bg-[#0d1117] border-b border-[#30363d]"
        dangerouslySetInnerHTML={{ __html: template.thumbnail }}
      />
      <div className="p-3 space-y-1.5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-sm font-medium text-[#e6edf3] truncate">
            {template.name}
          </div>
          <span className="bg-[#6EE05A]/10 text-[#6EE05A] text-[10px] font-medium px-1.5 py-0.5 rounded font-mono flex-shrink-0">
            {template.variables.length}
          </span>
        </div>
        <div className="text-[11px] text-[#8b949e] line-clamp-2 flex-1">
          {template.description}
        </div>
        <span className="bg-[#58a6ff]/10 text-[#58a6ff] text-[10px] font-medium px-1.5 py-0.5 rounded inline-flex w-fit">
          {template.category}
        </span>
        <div className="flex items-center gap-1.5 pt-1">
          <button
            onClick={() => onDeploy(template)}
            className="flex-1 bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-2.5 py-1.5 text-xs hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] flex items-center justify-center gap-1"
          >
            <Rocket className="w-3 h-3" />
            Deploy
          </button>
          <button
            onClick={() => onExport(template)}
            className="bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
            aria-label="Export template"
            title="Export as JSON"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
