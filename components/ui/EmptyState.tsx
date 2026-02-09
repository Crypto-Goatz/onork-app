"use client";

import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in">
      <div className="w-14 h-14 rounded-2xl bg-onork-p1/10 border border-onork-p1/20 flex items-center justify-center mb-5">
        <Icon size={24} className="text-onork-p3" />
      </div>
      <h3 className="text-base font-semibold text-onork-text mb-1.5">{title}</h3>
      <p className="text-sm text-onork-text-dim text-center max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-onork-p1 to-onork-b1 hover:shadow-lg hover:shadow-onork-p1/20 transition-all duration-300 cursor-pointer"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
