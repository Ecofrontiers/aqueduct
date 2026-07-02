import type { ReactNode } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";

interface CollapsibleSectionProps {
  id: string;
  icon: ReactNode;
  label: string;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

export function CollapsibleSection({
  id,
  icon,
  label,
  isOpen,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="border-t border-gray-100">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        {icon}
        <span className="font-semibold">{label}</span>
        {isOpen ? (
          <CaretDown size={11} className="ml-auto text-gray-400" />
        ) : (
          <CaretRight size={11} className="ml-auto text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}
