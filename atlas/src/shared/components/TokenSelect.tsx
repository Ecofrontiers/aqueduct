import clsx from "clsx";
import { ChainIcon } from "../../modules/chains/components/ChainIcon";
import { CaretDown } from "@phosphor-icons/react";
import {
  CELO_CELO_TOKEN,
  CELO_CUSD_TOKEN,
  CELO_USDC_TOKEN,
  CELO_USDC_WORMHOLE_TOKEN,
  CELO_USDGLO_TOKEN,
  CELO_USDT_TOKEN,
  CELO_USDT_WORMHOLE_TOKEN,
} from "../consts";
import { Token } from "../types";

interface TokenSelectProps {
  selectedToken: Token;
  onTokenChange: (token: Token) => void;
}

const tokens = [
  CELO_CELO_TOKEN as Token,
  CELO_CUSD_TOKEN as Token,
  CELO_USDGLO_TOKEN as Token,
  CELO_USDC_TOKEN as Token,
  CELO_USDC_WORMHOLE_TOKEN as Token,
  CELO_USDT_TOKEN as Token,
  CELO_USDT_WORMHOLE_TOKEN as Token,
];

// Currently only supports CELO chain
export const TokenSelect: React.FC<TokenSelectProps> = ({
  selectedToken,
  onTokenChange,
}) => {
  const handleTokenSelect = (token: Token) => {
    const elem: any = document.activeElement;
    if (elem) {
      elem?.blur();
    }
    onTokenChange(token);
  };

  const tokenLogo = `${selectedToken.symbol.toUpperCase()}.${["PLASTIK", "CUSD"].includes(selectedToken.symbol.toUpperCase()) ? "png" : "svg"}`;

  return (
    <div className="dropdown dropdown-top dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="bg-slate-200 p-1 rounded-full flex gap-2 items-center mt-1 border-[1px] border-slate-400"
      >
        <div className="relative">
          <img
            src={`/tokens/${tokenLogo}`}
            alt={selectedToken?.symbol}
            className="w-8 h-8"
          />
          <div
            className={clsx(
              "absolute bottom-0 right-0",
              "border-[1px] border-cardBackground",
              "w-[14px] h-[14px] flex items-center justify-center rounded-sm"
            )}
            style={{
              backgroundColor: "#FCFF52",
            }}
          >
            <ChainIcon chainId="celo" size={8} />
          </div>
        </div>
        <span className="text-lg font-bold">{selectedToken?.symbol}</span>
        <CaretDown size={20} weight="bold" />
      </div>
      <div
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box w-60 p-2 shadow z-10"
      >
        {tokens.map((token) => {
          return (
            <div
              key={token.address}
              className={clsx(
                "flex gap-2 items-center cursor-pointer hover:bg-slate-200 mb-1 p-1 rounded",
                selectedToken?.address === token.address && "bg-slate-200"
              )}
              onClick={() => handleTokenSelect(token)}
            >
              <div className="relative">
                <img
                  src={`/tokens/${token.symbol.toUpperCase()}.${["PLASTIK", "CUSD"].includes(token.symbol.toUpperCase()) ? "png" : "svg"}`}
                  alt={token?.name}
                  className="w-8 h-8"
                />
                <div
                  className={clsx(
                    "absolute bottom-0 right-0",
                    "border-[1px] border-cardBackground",
                    "w-[14px] h-[14px] flex items-center justify-center rounded-sm"
                  )}
                  style={{
                    backgroundColor: "#FCFF52",
                  }}
                >
                  <ChainIcon chainId="celo" size={8} />
                </div>
              </div>
              <span className="text-base font-bold">{token?.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
