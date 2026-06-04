"use client";

import { avalanche, defineChain } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, fallback } from "wagmi";

export const NFT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// $DOOMHOUND token contract — used across multiple components
export const DOOMHOUND_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_DOOMHOUND_CONTRACT ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "7cb18e39bf7086547505c8363371af8e";

export const AVAX_RPC_URL = process.env.NEXT_PUBLIC_AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";

// Define a custom Avalanche chain to ensure chainId matches exactly
// Some wallets return chainId as hex (0xa86a) which should equal 43114 decimal
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
    default: { http: [AVAX_RPC_URL] },
  },
});

export const config = getDefaultConfig({
  appName: "DOOMHOUND — Hounds of the Hell",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [avalancheCChain],
  transports: {
    [avalancheCChain.id]: fallback([
      http(AVAX_RPC_URL),
      http("https://avalanche-c-chain-rpc.publicnode.com"),
      http("https://rpc.ankr.com/avalanche"),
    ]),
  },
  ssr: true,
});
