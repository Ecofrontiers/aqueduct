import { celo } from "viem/chains";
import { IChainRpcUrls } from "./types";
export const CHAIN_RPC_URLS: IChainRpcUrls = {
  [celo.id]: `https://celo-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`,
};
