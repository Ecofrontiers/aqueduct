import { CaretDown, CaretUp } from "@phosphor-icons/react";
import clsx from "clsx";
import React from "react";

export default ({
  title,
  selectedCount,
  className,
  isOpen,
  onClick,
  onToggleClick,
}: {
  title: string;
  selectedCount: number;
  className?: string;
  isOpen: boolean;
  onClick: () => void;
  onToggleClick: (event: React.MouseEvent) => void;
}): JSX.Element => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex justify-between items-center border-[1px] border-white rounded-lg bg-slate-50",
        "font-medium text-xl",
        className
      )}
    >
      <div className="text-blue-950 relative pl-4 py-4 text-lg">
        {title}
        {selectedCount > 0 && (
          <div
            className={clsx(
              "w-5 h-5 flex items-center justify-center text-sm font-medium rounded-full bg-blue-950 text-white",
              "absolute top-3 -right-6"
            )}
          >
            {selectedCount}
          </div>
        )}
      </div>
      <div
        onClick={(e) => {
          onToggleClick(e);
        }}
        className="flex justify-center items-center py-4 px-4"
      >
        {isOpen ? <CaretUp size={32} /> : <CaretDown size={32} />}
      </div>
    </div>
  );
};
