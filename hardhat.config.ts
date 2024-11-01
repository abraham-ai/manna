require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path: __dirname + "/.env" });

const privateKey = process.env.PRIVATE_KEY;

/** @type import('hardhat/config').HardhatUserConfig */
console.log(privateKey);
module.exports = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      chainId: 1337,
    },

    basemainnet: {
      url: "https://mainnet.base.org",
      accounts: [privateKey],
      gasPrice: 1000000000,
    },
    basesepolia: {
      url: "https://sepolia.base.org",
      accounts: [privateKey],
      gasPrice: 1000000000,
    },
    baselocal: {
      url: "http://localhost:8545",
      accounts: [privateKey],
      gasPrice: 1000000000,
    },
    //Optimism
    opsepolia: {
      chainId: 11155420,
      url: `https://optimism-sepolia.blockpi.network/v1/rpc/public`,
      accounts: [privateKey],
    },
  },
};
