import { computePoolAddress } from "@uniswap/v3-sdk";
import { POOL_FACTORY_CONTRACTS_MAP } from "../.";
import { Token } from "@uniswap/sdk-core";

export const getPoolAddress = ({
  tokenIn,
  tokenOut,
  poolFee,
  chainId,
}: {
  tokenIn: Token;
  tokenOut: Token;
  poolFee: number;
  chainId: number;
}) => {
  return computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACTS_MAP[chainId],
    tokenA: tokenIn,
    tokenB: tokenOut,
    fee: poolFee,
  });
};
