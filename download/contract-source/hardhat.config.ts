import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    avax: {
      type: "http",
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [process.env.PRIVATE_KEY!],
      chainId: 43114,
    },
  },
  etherscan: {
    apiKey: {
      avax: process.env.SNOWTRACE_API_KEY || "placeholder",
    },
  },
};

export default config;
