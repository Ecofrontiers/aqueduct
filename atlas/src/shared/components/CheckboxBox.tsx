import clsx from "clsx";

export const CheckboxBox = ({
  checked,
  className,
  variant,
}: {
  checked: boolean;
  variant?: "small" | "medium";
  className?: string;
}): JSX.Element => {
  return (
    <div
      className={clsx(
        "w-6 h-6 border-[1px] border-white rounded-lg bg-slate-50",
        "flex justify-center items-center",
        checked && "!bg-blue-950",
        variant === "small"
          ? "!w-3.5 !h-3.5 rounded-none"
          : variant === "medium"
            ? "w-5 h-5"
            : "w-6 h-6",
        className && className
      )}
    ></div>
  );
};
