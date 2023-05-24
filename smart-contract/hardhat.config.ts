import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-toolbox";
require('dotenv').config()


const config = {
  solidity: "0.8.19",
  networks: {
    hardhat:{},
    arbitrum: {
      url: process.env.ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};

export default config;

