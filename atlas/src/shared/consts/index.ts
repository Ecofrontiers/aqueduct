import { ChainId, Token } from "@uniswap/sdk-core";
import { MapStyles } from "../types";

// 1. CELO
//  • Address: 0x471ece3750da237f93b8e339c536989b8978a438
//  • Description: Native cryptocurrency of the Celo platform.

// 2. USDGLO (Glo Dollar)
//  • Address: 0x4f604735c1cf31399c6e711d5962b2b3e0225ad3
//  • Description: Stablecoin pegged to the US Dollar on Celo.

// 3. cUSD (Celo Dollar)
//  • Address: 0x765de816845861e75a25fca122bb6898b8b1282a
//  • Description: Another stablecoin pegged to the US Dollar on Celo.

// 4. USDC (Wormhole)
//  • Address: 0x37f750b7cc259a2f741af45294f6a16572cf5cad
//  • Description: USDC bridged via Wormhole on Celo.

// 5. USDC (Circle)
//  • Address: 0xceba9300f2b948710d2653dd7b07f33a8b32118c
//  • Description: USDC issued directly by Circle on Celo.

// 6. USDT (Wormhole)
//  • Address: 0x617f3112bf5397d0467d315cc709ef968d9ba546
//  • Description: Tether (USDT) bridged via Wormhole on Celo.

// 7. USDT on Celo
//  • Address: 0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e
//  • Description: Tether (USDT) native to the Celo blockchain.

export const CELO_CUSD_TOKEN_ADDRESS =
  "0x765DE816845861e75A25fCA122bb6898B8B1282a";

export const CELO_CUSD_TOKEN = new Token(
  ChainId.CELO,
  CELO_CUSD_TOKEN_ADDRESS,
  18,
  "cUSD",
  "Celo Dollar"
);

export const CELO_CELO_TOKEN_ADDRESS =
  "0x471EcE3750Da237f93B8E339c536989b8978a438";

export const CELO_CELO_TOKEN = new Token(
  ChainId.CELO,
  CELO_CELO_TOKEN_ADDRESS,
  18,
  "CELO",
  "Celo"
);

export const CELO_USDGLO_TOKEN_ADDRESS =
  "0x4f604735c1cf31399c6e711d5962b2b3e0225ad3";

export const CELO_USDGLO_TOKEN = new Token(
  ChainId.CELO,
  CELO_USDGLO_TOKEN_ADDRESS,
  18,
  "USDGLO",
  "Glo Dollar"
);

export const CELO_USDC_WORMHOLE_TOKEN_ADDRESS =
  "0x37f750b7cc259a2f741af45294f6a16572cf5cad";

export const CELO_USDC_WORMHOLE_TOKEN = new Token(
  ChainId.CELO,
  CELO_USDC_WORMHOLE_TOKEN_ADDRESS,
  6,
  "USDC",
  "USD Coin (Wormhole)"
);

export const CELO_USDC_TOKEN_ADDRESS =
  "0xceba9300f2b948710d2653dd7b07f33a8b32118c";

export const CELO_USDC_TOKEN = new Token(
  ChainId.CELO,
  CELO_USDC_TOKEN_ADDRESS,
  6,
  "USDC",
  "USD Coin"
);

export const CELO_USDT_WORMHOLE_TOKEN_ADDRESS =
  "0x617f3112bf5397d0467d315cc709ef968d9ba546";

export const CELO_USDT_WORMHOLE_TOKEN = new Token(
  ChainId.CELO,
  CELO_USDT_WORMHOLE_TOKEN_ADDRESS,
  6,
  "USDT",
  "Tether (USDT) Wormhole"
);

export const CELO_USDT_TOKEN_ADDRESS =
  "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e";

export const CELO_USDT_TOKEN = new Token(
  ChainId.CELO,
  CELO_USDT_TOKEN_ADDRESS,
  6,
  "USDT",
  "Tether (USDT)"
);

export const NATIVITY_MAP = {
  native: "Onchain native",
  tokenized: "Tokenized",
  onchain_enforcement: "Onchain enforcement",
  onchain_integration: "Onchain Integration",
};

export const NEW_NATIVITY_MAP = {
  STATUS_QUO: "Status Quo",
  ONCHAIN_REPRESENTATION: "Onchain Representation",
  ONCHAIN_INTEGRATION: "Onchain Integration",
  ONCHAIN_ENFORCEMENT: "Onchain Enforcement",
  FULLY_ONCHAIN: "Fully Onchain",
  PRETOKEN: "Pretoken",
};

export const FILBEAM_CLIENT = "0xC4d9d1a93068d311Ab18E988244123430eB4F1CD";

export const BIOREGION_PROXIMITY = { lat: 5, lng: 10 };

export const MAP_STYLES: { [key in MapStyles]: string } = {
  map: "mapbox://styles/mapbox/light-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
};
