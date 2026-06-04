"use client";

import { avalanche } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";

export const NFT_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// $DOOMHOUND token contract — used across multiple components
export const DOOMHOUND_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_DOOMHOUND_CONTRACT ||
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const WALLETCONNECT_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const AVAX_RPC_URL = process.env.NEXT_PUBLIC_AVAX_RPC_URL || "https://api.avax.network/ext/bc/C/rpc";

export const config = getDefaultConfig({
  appName: "DOOMHOUND — Hounds of the Hell",
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [avalanche],
  transports: {
    [avalanche.id]: http(AVAX_RPC_URL),
  },
  ssr: true,
});
