import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";

export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    avax: {
      type: "http",
      url: "https://api.avax.network/ext/bc/C/rpc",
      chainId: 43114,
      accounts: ["e97882f59948d58d142f8d2dd2c36f91e85a31c0b0fa1d33302f92ca4ee8c3b7"],
    },
  },
  etherscan: {
    apiKey: {
      avax: "free",
    },
    customChains: [
      {
        network: "avax",
        chain: 43114,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan",
          browserURL: "https://snowtrace.io",
        },
      },
    ],
  },
};
