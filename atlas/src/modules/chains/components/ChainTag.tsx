import { Platform } from "../../assets";
import { ChainIcon } from "./ChainIcon";

export const ChainTag = ({ platform }: { platform: Platform }) => {
  return (
    <div className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100">
      <ChainIcon chainId={platform.id} chainName={platform.name} size={18} />
    </div>
  );
};
