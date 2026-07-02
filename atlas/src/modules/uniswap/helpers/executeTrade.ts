import { ChainId, Token, TradeType } from "@uniswap/sdk-core";
import { Route, SwapOptions, SwapRouter } from "@uniswap/v3-sdk";
import {
  sendTransaction,
  simulateContract,
  writeContract,
  getChainId,
} from "@wagmi/core";
import { Address } from "viem";
import { config } from "../../../wagmi";
import {
  CELO_SWAP_ROUTER_ADDRESS,
  MAINNET_SWAP_ROUTER_ADDRESS,
  ABI_CELO_ROUTER,
  getQuoteFromQuoter,
} from "../.";
import { getUncheckedTrade } from "./getUncheckedTrade";
import {
  decreaseByPercent,
  increaseByPercent,
} from "../../../shared/helpers/percent";

export async function executeTrade({
  options,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  recipient,
  swapRoute,
  type,
  poolFee,
}: {
  options: SwapOptions;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
  amountOut: bigint;
  recipient: Address;
  swapRoute: Route<Token, Token>;
  type: "exactInput" | "exactOutput";
  poolFee: number;
}): Promise<Address> {
  const chainId = getChainId(config);

  let quotedAmountIn;
  let quotedAmountOut;
  try {
    if (type === "exactInput") {
      // This quote represent the amount of tokenOut that will be received
      quotedAmountOut = await getQuoteFromQuoter({
        swapRoute,
        amount: amountIn,
        token: tokenIn,
        tradeType: TradeType.EXACT_INPUT,
      });
    } else {
      // This quote represent the amount of tokenIn that will be spent
      quotedAmountIn = await getQuoteFromQuoter({
        swapRoute,
        amount: amountOut,
        token: tokenOut,
        tradeType: TradeType.EXACT_OUTPUT,
      });
    }
  } catch (e) {
    throw new Error(`Failed to get quote from quoter: ${e}`);
  }

  if (chainId === ChainId.CELO) {
    try {
      let result: any;
      if (type === "exactInput") {
        if (!quotedAmountOut) {
          throw new Error("No quoted amount out");
        }

        const amountOutMinimum = decreaseByPercent(
          BigInt(quotedAmountOut),
          options.slippageTolerance
        );
        result = await simulateContract(config, {
          abi: ABI_CELO_ROUTER,
          address: CELO_SWAP_ROUTER_ADDRESS,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: tokenIn.address as Address,
              tokenOut: tokenOut.address as Address,
              fee: poolFee,
              recipient,
              deadline: Math.floor(Date.now() / 1000) + 60 * 20,
              amountIn: BigInt(amountIn),
              amountOutMinimum,
              sqrtPriceLimitX96: BigInt(0),
            },
          ],
        });
      } else {
        if (!quotedAmountIn) {
          throw new Error("No quoted amount in");
        }
        const amountInMaximum = increaseByPercent(
          BigInt(quotedAmountIn),
          options.slippageTolerance
        );

        result = await simulateContract(config, {
          abi: ABI_CELO_ROUTER,
          address: CELO_SWAP_ROUTER_ADDRESS,
          functionName: "exactOutputSingle",
          args: [
            {
              tokenIn: tokenIn.address as Address,
              tokenOut: tokenOut.address as Address,
              fee: poolFee,
              recipient,
              amountOut: BigInt(amountOut),
              amountInMaximum,
              sqrtPriceLimitX96: BigInt(0),
            },
          ],
        });
      }

      if (!result) {
        throw new Error("No data returned from quote call");
      }

      const hash = await writeContract(config, result.request);

      return hash;
    } catch (e) {
      throw new Error(`Failed to execute trade: ${e}`);
    }
  }

  // @TODO: Implement properly for other chains
  let trade;
  try {
    if (!quotedAmountOut) {
      throw new Error("No quoted amount in or out");
    }
    trade = getUncheckedTrade({
      swapRoute,
      tokenIn,
      tokenOut,
      amountIn,
      quoteAmount: quotedAmountOut,
    });
  } catch (e) {
    console.error(e);
    throw new Error(`Failed to get trade: ${e}`);
  }

  const methodParameters = SwapRouter.swapCallParameters([trade], options);

  const res = await sendTransaction(config, {
    to: MAINNET_SWAP_ROUTER_ADDRESS,
    data: methodParameters.calldata as Address,
  });

  return res;
}
