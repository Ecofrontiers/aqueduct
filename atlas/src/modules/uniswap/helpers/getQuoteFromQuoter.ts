import {
  CurrencyAmount,
  QUOTER_ADDRESSES,
  Token,
  TradeType,
} from "@uniswap/sdk-core";
import { Route, SwapQuoter } from "@uniswap/v3-sdk";
import { Address, decodeAbiParameters, parseAbiParameters } from "viem";
import { call, getChainId } from "@wagmi/core";
import { config } from "../../../wagmi";

export async function getQuoteFromQuoter({
  swapRoute,
  amount,
  token,
  tradeType,
}: {
  swapRoute: Route<Token, Token>;
  amount: bigint;
  token: Token;
  tradeType: TradeType;
}): Promise<bigint> {
  let chainId = getChainId(config);
  // @TODO: Remove this when we have a proper chainId for localhost
  if (chainId === 31337) {
    chainId = 1;
  }
  const useQuoterV2 = chainId === 42220;

  const { calldata } = SwapQuoter.quoteCallParameters(
    swapRoute,
    CurrencyAmount.fromRawAmount(token, amount.toString()),
    tradeType,
    {
      useQuoterV2,
    }
  );

  const quoteCallReturnData = await call(config, {
    to: QUOTER_ADDRESSES[chainId] as Address,
    data: calldata as Address,
  });

  if (!quoteCallReturnData.data) {
    throw new Error("No data returned from quote call");
  }

  const quoteAmount = decodeAbiParameters(
    parseAbiParameters("uint256"),
    quoteCallReturnData.data
  )[0];

  console.log("quoteAmount", quoteAmount);

  return quoteAmount;
}
