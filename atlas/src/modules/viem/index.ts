import { Chain, createPublicClient, http } from "viem";
import { CHAIN_RPC_URLS } from "./consts";

export const getPublicClient = (chain: Chain) =>
  createPublicClient({
    chain,
    transport: http(CHAIN_RPC_URLS[chain.id]),
  });
