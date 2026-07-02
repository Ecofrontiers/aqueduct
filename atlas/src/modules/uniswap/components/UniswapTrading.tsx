import { useState } from "react";
import { UniswapTokenInput } from "./UniswapTokenInput";
import { Percent, Token } from "@uniswap/sdk-core";
import { Route, SwapOptions } from "@uniswap/v3-sdk";
import {
  divideBigInts,
  formatNumber,
  parseNumber,
} from "../../../shared/helpers";
import { useAccount, useAccountEffect } from "wagmi";
import {
  getQuoteSimulation,
  executeTrade,
  getPool,
  getTokenApproval,
  UNISWAP_POOLS_MAP,
  ITradeSettings,
} from "../.";
import { increaseByPercent } from "../../../shared/helpers/percent";
import { parseUnits } from "viem";
import { useTokenBalance } from "../hooks/useFormattedBalance";
import { useModal } from "connectkit";
import { Modal } from "../../../shared/components";
import { waitForTransactionReceipt } from "@wagmi/core";
import { config } from "../../../wagmi";
import {
  ArrowsDownUp,
  CircleNotch,
  Cube,
  WarningDiamond,
} from "@phosphor-icons/react";
import { UniswapTradeSettings } from "./UniswapTradeSettings";
import clsx from "clsx";
import { analytics } from "../../analytics";

interface UniswapTradingProps {
  tokenPair: [Token, Token];
}

type SwappingState =
  | "connect_wallet"
  | "enter_amount"
  | "insufficient_balance"
  | "ready"
  | "confirm_approve"
  | "awaiting_approval_confirmation"
  | "confirm_swap"
  | "swap"
  | "done"
  | "error";

const buttonText: Record<SwappingState, string> = {
  connect_wallet: "Connect Wallet",
  enter_amount: "Enter an amount",
  insufficient_balance: "Insufficient Balance",
  ready: "Swap",
  confirm_approve: "Approve and swap",
  awaiting_approval_confirmation: "Awaiting confirmation",
  confirm_swap: "Confirm Swap",
  swap: "Swap",
  done: "Swap",
  error: "Confirm Swap",
};

export const UniswapTrading: React.FC<UniswapTradingProps> = ({
  tokenPair,
}) => {
  const [tokenIn, setTokenIn] = useState(tokenPair[0]);
  const [tokenOut, setTokenOut] = useState(tokenPair[1]);
  const [showModal, setShowModal] = useState(false);
  const [amountIn, setAmountIn] = useState("");
  const [amountOut, setAmountOut] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [tradeType, setTradeType] = useState<"exactInput" | "exactOutput">(
    "exactInput"
  );
  const [swapExchangeRate, setSwapExchangeRate] = useState("");
  const { address } = useAccount();
  useAccountEffect({
    onConnect: () => setStatus("enter_amount"),
    onDisconnect: () => setStatus("connect_wallet"),
  });
  const [status, setStatus] = useState<SwappingState>(
    !address ? "connect_wallet" : "enter_amount"
  );
  const { setOpen } = useModal();

  const tokenInBalance = useTokenBalance({
    token: tokenIn,
    account: address,
  });

  const tokenOutBalance = useTokenBalance({
    token: tokenOut,
    account: address,
  });

  const [tradeSettings, setTradeSettings] = useState<ITradeSettings>({
    slippageTolerancePercentage: "0.5",
    deadlineInMinutes: 10,
  });

  const { address: poolAddress, fee: poolFee } =
    UNISWAP_POOLS_MAP[`${tokenIn.address}${tokenOut.address}`] ||
    UNISWAP_POOLS_MAP[`${tokenOut.address}${tokenIn.address}`];

  const options: SwapOptions = {
    slippageTolerance: new Percent(50, 10000), // 50 bips, or 0.50%
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    recipient: address || "", // That's hackish, but because later we check if address is defined, it's fine
    sqrtPriceLimitX96: 0,
  };

  const handleAmountInChange = async (value: string) => {
    setAmountIn(value);
    const amount = parseFloat(value);

    if (isNaN(amount) || amount === 0) {
      setStatus("enter_amount");
      setAmountOut("");
      return;
    }

    const formattedAmount = parseNumber(value, tokenIn.decimals);

    if (address) {
      if (tokenInBalance.value < formattedAmount) {
        setStatus("insufficient_balance");
      } else {
        setStatus("ready");
      }
    }

    const quote = await getQuoteSimulation({
      type: "exactIn",
      amount: formattedAmount,
      tokenIn,
      tokenOut,
      fee: poolFee,
    });

    const pricePerToken = divideBigInts(
      parseNumber(value, tokenOut.decimals),
      quote,
      5
    );
    setSwapExchangeRate(pricePerToken);

    setTradeType("exactInput");
    setAmountOut(formatNumber(quote, tokenOut.decimals));
  };

  const handleAmountOutChange = async (value: string) => {
    setAmountOut(value);
    const amount = parseFloat(value);

    if (isNaN(amount) || amount === 0) {
      setStatus("enter_amount");
      setAmountIn("");
      return;
    }

    const formattedAmount = parseNumber(value, tokenOut.decimals);
    const quote = await getQuoteSimulation({
      type: "exactOut",
      amount: formattedAmount,
      tokenIn,
      tokenOut,
      fee: poolFee,
    });

    if (address) {
      if (tokenInBalance.value < quote) {
        setStatus("insufficient_balance");
      } else {
        setStatus("ready");
      }
    }

    const pricePerToken = divideBigInts(
      quote,
      parseNumber(value, tokenIn.decimals),
      5
    );
    setSwapExchangeRate(pricePerToken);

    setTradeType("exactOutput");
    setAmountIn(formatNumber(quote, tokenIn.decimals));
  };

  const handleBuy = async () => {
    analytics.sendSwappingEvent({
      action: "Buying process started",
      label: `Wallet: ${address}`,
    });
    if (!amountIn || !address) {
      return;
    }

    let pool;
    try {
      pool = await getPool(poolAddress, tokenIn, tokenOut);
    } catch (e) {
      console.error(e);
      return;
    }

    const swapRoute = new Route([pool], tokenIn, tokenOut);

    const amountInWithDecimals = parseUnits(
      amountIn.toString(),
      tokenIn.decimals
    );

    try {
      const tradeOptions: SwapOptions = {
        ...options,
        slippageTolerance: new Percent(
          parseNumber(tradeSettings.slippageTolerancePercentage, 2).toString(),
          10000
        ),
      };

      analytics.sendSwappingEvent({
        action: `Request Token Swap Confirmation`,
        value: parseFloat(amountIn),
        label: `${tokenIn.symbol} to ${tokenOut.symbol}`,
      });

      const res = await executeTrade({
        options: tradeOptions,
        tokenIn,
        tokenOut,
        amountIn: amountInWithDecimals,
        amountOut: parseNumber(amountOut, tokenOut.decimals),
        recipient: address,
        swapRoute,
        type: tradeType,
        poolFee,
      });

      setTransactionHash(res);
      setAmountIn("");
      setAmountOut("");
      setStatus("done");
      analytics.sendSwappingEvent({
        action: `Token Swap Completed`,
        value: parseFloat(amountIn),
        label: `${tokenIn.symbol} to ${tokenOut.symbol} ${res}`,
      });
    } catch (e) {
      analytics.sendSwappingEvent({
        action: `Token Swap Failed`,
        value: parseFloat(amountIn),
        label: `${tokenIn.symbol} to ${tokenOut.symbol}`,
      });
      setStatus("error");
    }
  };

  const handleButtonClick = () => {
    if (status === "connect_wallet") {
      analytics.sendSwappingEvent({ action: "Connect Wallet" });
      setOpen(true);
    } else if (status === "ready") {
      setShowModal(true);
      requestTokenSpendingApproval();
    } else if (status === "confirm_swap" || status === "error") {
      setStatus("confirm_swap");
      setShowModal(true);
      handleBuy();
    } else {
      handleBuy();
    }
  };

  const requestTokenSpendingApproval = async () => {
    analytics.sendSwappingEvent({
      action: `Request Token Spending Approval`,
      value: parseFloat(amountIn),
      label: tokenIn.symbol,
    });
    const amountInWithDecimals = parseUnits(
      amountIn.toString(),
      tokenIn.decimals
    );
    const tradeOptions: SwapOptions = {
      ...options,
      slippageTolerance: new Percent(
        parseNumber(tradeSettings.slippageTolerancePercentage, 2).toString(),
        10000
      ),
    };

    try {
      const approvalAmount: bigint =
        tradeType === "exactInput"
          ? amountInWithDecimals
          : increaseByPercent(
              amountInWithDecimals,
              tradeOptions.slippageTolerance
            );

      const hash = await getTokenApproval(tokenIn, approvalAmount);
      setStatus("awaiting_approval_confirmation");
      await waitForTransactionReceipt(config, { hash });
      setStatus("confirm_swap");
      handleBuy();
    } catch (e) {
      setShowModal(false);
      setStatus("ready");
      return;
    }
  };

  const handleSwitchTokens = () => {
    const temp = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(temp);
    setAmountIn("");
    setAmountOut("");
    setSwapExchangeRate("");
  };

  return (
    <>
      <div>
        <div className="flex justify-end mb-2">
          <UniswapTradeSettings
            settings={tradeSettings}
            onUpdate={(settings) => {
              setTradeSettings(settings);
            }}
          />
        </div>
        <div className="relative">
          <div className="mb-1">
            <UniswapTokenInput
              type="sell"
              placeholder="0"
              token={tokenIn}
              value={amountIn}
              formattedBalance={tokenInBalance.formattedBalance}
              displayBalance={!!address}
              onChange={(value) => handleAmountInChange(value)}
            />
          </div>
          <UniswapTokenInput
            type="buy"
            placeholder="0"
            token={tokenOut}
            value={amountOut}
            formattedBalance={tokenOutBalance.formattedBalance}
            displayBalance={!!address}
            onChange={(value) => handleAmountOutChange(value)}
          />
          <button
            onClick={handleSwitchTokens}
            className={clsx(
              "bg-cardBackground border-2 border-white w-12 h-8 absolute top-[calc(50%-16px)] left-[calc(50%-24px)]",
              "rounded-full flex justify-center items-center shadow-sm",
              "hover:bg-white"
            )}
          >
            <ArrowsDownUp size={24} weight="fill" />
          </button>
        </div>
        <button
          className="button button-gradient w-full my-2"
          onClick={handleButtonClick}
          disabled={
            status === "insufficient_balance" ||
            status === "enter_amount" ||
            status === "awaiting_approval_confirmation"
          }
        >
          {buttonText[status]}
        </button>
        {swapExchangeRate && (
          <div className="text-xs font-semibold">
            1 {tokenOut.symbol} = {swapExchangeRate} {tokenIn.symbol}
          </div>
        )}
      </div>
      {showModal && (
        <Modal
          onClose={() => {
            if (status === "done") {
              setStatus("enter_amount");
            }
            setShowModal(false);
          }}
        >
          <div className="w-[320px]">
            {status === "ready" && (
              <div className="flex flex-col items-center text-center">
                <CircleNotch size={64} className="animate-spin" />
                <div className="text-xl mb-2 font-semibold">
                  Approve token spending
                </div>
                <div className="text-sm mb-4">
                  Before swapping, you need to approve token spending, which
                  allows the platform to access your tokens. This step doesn't
                  swap your tokens yet; you'll still need to confirm the swap
                  afterward.
                </div>
                <div className="font-semibold">Proceed in your wallet</div>
              </div>
            )}
            {status === "awaiting_approval_confirmation" && (
              <div className="flex flex-col items-center text-center">
                <CircleNotch size={64} className="animate-spin" />
                <div className="text-xl mb-2 font-semibold">
                  Awaiting transaction confirmation
                </div>
                <div className="text-sm mb-4">
                  We are waiting for the transaction to be confirmed on chain
                  before proceeding
                </div>
                <div className="font-semibold">Please hold on tight</div>
              </div>
            )}
            {status === "confirm_swap" && (
              <div className="flex flex-col items-center text-center">
                <CircleNotch size={64} className="animate-spin" />
                <div className="text-xl mb-2 font-semibold">Confirm swap</div>
                <div className="text-sm mb-4">
                  Confirm the swap in your wallet
                </div>
                <div className="font-semibold">Proceed in your wallet</div>
              </div>
            )}
            {status === "error" && (
              <div className="flex flex-col items-center text-center">
                <WarningDiamond size={64} />
                <div className="text-xl mb-2 font-semibold text-red-500">
                  Error
                </div>
                <div className="text-sm mb-4">
                  An error occurred while processing the transaction
                </div>
              </div>
            )}
            {status === "done" && (
              <div className="flex flex-col items-center text-center">
                <Cube size={64} />
                <div className="text-xl mb-2 font-semibold">
                  Swap successful
                </div>
                <div className="text-sm mb-4">
                  The swap was successful. You can view the transaction on
                  CeloScan:
                </div>
                {transactionHash && (
                  <a
                    className="text-blue-500 break-words break-all"
                    href={`https://celoscan.io/tx/${transactionHash}`}
                    target="_blank"
                  >
                    {transactionHash}
                  </a>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};
