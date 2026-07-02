import { useState } from "react";
import clsx from "clsx";
import { Gear, Percent, Warning } from "@phosphor-icons/react";
import { ITradeSettings } from "../types";
import { NumberInput } from "../../../shared/components/NumberInput";

export const UniswapTradeSettings: React.FC<{
  settings: ITradeSettings;
  onUpdate: (settings: ITradeSettings) => void;
}> = ({ settings, onUpdate }) => {
  const [warning, setWarning] = useState<boolean>(false);

  const handleChange = (value: string) => {
    const amount = parseFloat(value);

    if (amount <= 1 && amount >= 0.05) {
      setWarning(false);
    }

    onUpdate({
      ...settings,
      slippageTolerancePercentage: value,
    });
  };

  const handleBlur = (value: string) => {
    const amount = parseFloat(value);
    if (amount === 0) {
      onUpdate({
        ...settings,
        slippageTolerancePercentage: "0",
      });
      setWarning(true);
      return;
    }

    if (amount > 1 || amount < 0.05) {
      setWarning(true);
    }

    onUpdate({
      ...settings,
      slippageTolerancePercentage: value,
    });
  };

  return (
    <>
      <div className="dropdown dropdown-end">
        <div
          className={clsx(
            "w-[146px] flex items-center justify-between gap-2",
            "rounded-full bg-cardBackground px-3 py-1",
            "hover:bg-base-100 cursor-pointer border",
            warning && "border-warning w-[160px]"
          )}
          tabIndex={0}
          role="button"
        >
          <div className="flex text-xs font-medium">
            <span>{settings.slippageTolerancePercentage}% slippage</span>
            {warning && (
              <div
                className="tooltip"
                data-tip="Slippage below 0.05% or above 1% is not recommended"
              >
                <Warning size={16} weight="fill" className="text-warning" />
              </div>
            )}
          </div>
          <Gear size={24} weight="fill" className="text-gray-400" />
        </div>
        <div
          tabIndex={0}
          className="dropdown-content rounded-md bg-base-100 z-[1] w-auto p-2 shadow"
        >
          <div className="flex items-center gap-4">
            <span className="font-medium text-sm">Max.&nbsp;slippage</span>
            <label className="input input-bordered input-sm flex items-center gap-2">
              <NumberInput
                className="w-16"
                value={settings.slippageTolerancePercentage}
                placeholder="0"
                onChange={handleChange}
                onBlur={handleBlur}
              />
              <Percent size={16} />
            </label>
          </div>
        </div>
      </div>
    </>
  );
};
