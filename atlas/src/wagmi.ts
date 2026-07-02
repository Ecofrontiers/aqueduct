import { http, createConfig } from "wagmi";
import { celo } from "wagmi/chains";
import { getDefaultConfig } from "connectkit";
import { defineChain } from "viem";

export const filecoinCalibration = defineChain({
  id: 314159,
  name: "Filecoin Calibration",
  nativeCurrency: { name: "Test Filecoin", symbol: "tFIL", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://api.calibration.node.glif.io/rpc/v1"] },
  },
  blockExplorers: {
    default: {
      name: "Filfox",
      url: "https://calibration.filfox.info",
    },
  },
  testnet: true,
});

export const config = createConfig(
  getDefaultConfig({
    chains: [celo, filecoinCalibration],
    walletConnectProjectId: import.meta.env.VITE_WC_PROJECT_ID ?? "",
    appName: "RegenAtlas.xyz",
    transports: {
      [celo.id]: http(
        `https://celo-mainnet.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`
      ),
      [filecoinCalibration.id]: http(
        "https://api.calibration.node.glif.io/rpc/v1"
      ),
    },
  })
);

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
