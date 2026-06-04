"use client";

import { Web3Provider } from "@/components/providers/web3-provider";

export default function NFTLayout({ children }: { children: React.ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}
