import { http, createConfig, fallback } from "wagmi";
import { avalanche, defineChain } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Multiple Avalanche RPCs for reliability — if one is down, the next is used
const AVALANCHE_RPC_URLS = [
  "https://api.avax.network/ext/bc/C/rpc",
  "https://avalanche-c-chain-rpc.publicnode.com",
  "https://rpc.ankr.com/avalanche",
];

// Ensure chainId is exactly 43114 — some wallets return hex 0xa86a
const avalancheCChain = defineChain({
  ...avalanche,
  id: 43114,
  name: "Avalanche C-Chain",
  nativeCurrency: {
    name: "Avalanche",
    symbol: "AVAX",
    decimals: 18,
  },
  rpcUrls: {
    ...avalanche.rpcUrls,
    default: { http: AVALANCHE_RPC_URLS },
  },
});

export const config = getDefaultConfig({
  appName: "DOOMHOUND — Hounds of the Hell",
  projectId: "7cb18e39bf7086547505c8363371af8e",
  chains: [avalancheCChain],
  ssr: true,
  transports: {
    [avalancheCChain.id]: fallback(
      AVALANCHE_RPC_URLS.map(url => http(url)),
      { rank: false }
    ),
  },
});
