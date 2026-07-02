import { ChainId } from "@uniswap/sdk-core";
import { Address } from "viem";

export const MAINNET_QUOTER_CONTRACT_ADDRESS =
  "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

export const CELO_QUOTER_CONTRACT_ADDRESS =
  "0x82825d0554fA07f7FC52Ab63c961F330fdEFa8E8";

export const QUOTER_CONTRACTS_MAP: { [key: number]: Address } = {
  [ChainId.MAINNET]: MAINNET_QUOTER_CONTRACT_ADDRESS,
  [ChainId.CELO]: CELO_QUOTER_CONTRACT_ADDRESS,
};
