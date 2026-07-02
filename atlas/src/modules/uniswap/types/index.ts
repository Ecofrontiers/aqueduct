import { FeeAmount } from "@uniswap/v3-sdk";
import { Address } from "viem";

export type IUniswapPoolsMap = Record<
  string,
  { address: Address; fee: FeeAmount }
>;

export interface IPoolFactoryMap {
  [key: number]: string;
}

export interface ITradeSettings {
  slippageTolerancePercentage: string;
  deadlineInMinutes: number;
  recipient?: Address;
}
