import { ChainId, Token } from "@uniswap/sdk-core";
import { Address } from "viem";

// Token Addresses
export const CELO_USDC_TOKEN_ADDRESS =
  "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
export const CELO_CHAR_TOKEN_ADDRESS =
  "0x50E85c754929840B58614F48e29C64BC78C58345";
export const MAINNET_USDC_TOKEN_ADDRESS =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
export const MAINNET_UNI_TOKEN_ADDRESS =
  "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";

export const CELO_ETHIX_TOKEN_ADDRESS =
  "0x9995cc8F20Db5896943Afc8eE0ba463259c931ed";
export const CELO_CUSD_TOKEN_ADDRESS =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const CELO_PLASTIK_TOKEN_ADDRESS =
  "0x27cd006548dF7C8c8e9fdc4A67fa05C2E3CA5CF9";

export const SUPPORTED_TOKENS = [
  CELO_CHAR_TOKEN_ADDRESS,
  CELO_ETHIX_TOKEN_ADDRESS,
  CELO_PLASTIK_TOKEN_ADDRESS,
];

// Token Instances
export const MAINNET_USDC_TOKEN = new Token(
  ChainId.MAINNET,
  MAINNET_USDC_TOKEN_ADDRESS,
  6,
  "USDC",
  "USD//C"
);

export const MAINNET_UNI_TOKEN = new Token(
  ChainId.MAINNET,
  MAINNET_UNI_TOKEN_ADDRESS,
  18,
  "UNI",
  "Uniswap"
);

export const CELO_USDC_TOKEN = new Token(
  ChainId.CELO,
  CELO_USDC_TOKEN_ADDRESS,
  6,
  "USDC",
  "USDC"
);

export const CELO_CHAR_TOKEN = new Token(
  ChainId.CELO,
  CELO_CHAR_TOKEN_ADDRESS,
  18,
  "CHAR",
  "Biochar"
);

export const CELO_ETHIX_TOKEN = new Token(
  ChainId.CELO,
  CELO_ETHIX_TOKEN_ADDRESS,
  18,
  "ETHIX",
  "Ethix"
);

export const CELO_CUSD_TOKEN = new Token(
  ChainId.CELO,
  CELO_CUSD_TOKEN_ADDRESS,
  18,
  "cUSD",
  "Celo Dollar"
);

export const CELO_PLASTIK_TOKEN = new Token(
  ChainId.CELO,
  CELO_PLASTIK_TOKEN_ADDRESS,
  9,
  "PLASTIK",
  "Plastik"
);

export const CELO_TOKENS_MAP: Record<string, Token> = {
  [CELO_USDC_TOKEN_ADDRESS.toLowerCase()]: CELO_USDC_TOKEN,
  [CELO_CHAR_TOKEN_ADDRESS.toLowerCase()]: CELO_CHAR_TOKEN,
  [CELO_ETHIX_TOKEN_ADDRESS.toLowerCase()]: CELO_ETHIX_TOKEN,
  [CELO_CUSD_TOKEN_ADDRESS.toLowerCase()]: CELO_CUSD_TOKEN,
  [CELO_PLASTIK_TOKEN_ADDRESS.toLowerCase()]: CELO_PLASTIK_TOKEN,
};

export const TOKEN_POOL_TOKEN_MAP: Record<Address, Token> = {
  [CELO_ETHIX_TOKEN_ADDRESS.toLowerCase()]: CELO_CUSD_TOKEN,
  [CELO_PLASTIK_TOKEN_ADDRESS.toLowerCase()]: CELO_CUSD_TOKEN,
  [CELO_CHAR_TOKEN_ADDRESS.toLowerCase()]: CELO_USDC_TOKEN,
};
