import { CurrencyAmount, Token, TradeType } from "@uniswap/sdk-core";
import { Route, Trade } from "@uniswap/v3-sdk";

export const getUncheckedTrade = ({
  swapRoute,
  tokenIn,
  tokenOut,
  amountIn,
  quoteAmount,
}: {
  swapRoute: Route<Token, Token>;
  tokenIn: Token;
  tokenOut: Token;
  amountIn: bigint;
  quoteAmount: bigint;
}) => {
  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute,
    inputAmount: CurrencyAmount.fromRawAmount(tokenIn, amountIn.toString()),
    outputAmount: CurrencyAmount.fromRawAmount(
      tokenOut,
      quoteAmount.toString()
    ),
    tradeType: TradeType.EXACT_INPUT,
  });

  return uncheckedTrade;
};
