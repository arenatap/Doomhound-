import { http, createConfig, fallback } from "wagmi";
import { avalanche } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Multiple Avalanche RPCs for reliability — if one is down, the next is used
const AVALANCHE_RPC_URLS = [
  "https://api.avax.network/ext/bc/C/rpc",
  "https://avalanche-c-chain-rpc.publicnode.com",
  "https://rpc.ankr.com/avalanche",
];

export const config = getDefaultConfig({
  appName: "DOOMHOUND — Hounds of the Hell",
  projectId: "7cb18e39bf7086547505c8363371af8e",
  chains: [avalanche],
  ssr: true,
  transports: {
    [avalanche.id]: fallback(
      AVALANCHE_RPC_URLS.map(url => http(url)),
      { rank: false }
    ),
  },
});
