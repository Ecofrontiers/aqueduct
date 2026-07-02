import clsx from "clsx";

export default ({
  title,
  value,
  defaultValue,
  className,
  onClick,
}: {
  title: string;
  value: string;
  defaultValue: string;
  className?: string;
  onClick?: () => void;
}): JSX.Element => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "flex justify-between items-center border-[1px] border-white rounded-lg bg-slate-50",
        "px-4 py-6 font-medium text-xl",
        className
      )}
    >
      <div className="text-blue-950">{title}</div>
      <div>
        {value === defaultValue ? (
          <span className="text-slate-400">All</span>
        ) : (
          <span className="text-primary-500">{value}</span>
        )}
      </div>
    </div>
  );
};
