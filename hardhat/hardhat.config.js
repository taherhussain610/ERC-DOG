import hardhatEthers from "@nomicfoundation/hardhat-ethers";

export default {
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337,
      mining: { auto: true, interval: 0 },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
        accountsBalance: "10000000000000000000000",
      },
    },
    atlasx: {
      type: "http",
      url: process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545",
      chainId: 31337,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
      },
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./artifacts",
    cache: "./cache",
  },
};
