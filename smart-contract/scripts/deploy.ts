import {ethers} from "hardhat"

const main_ = async () => {
  const ChessEthFactory = await ethers.getContractFactory('ChessEth')
  const ChessEthContract = await ChessEthFactory.deploy()
  await ChessEthContract.deployed()
  console.log('Smart Contract deployed to: ', ChessEthContract.address )
}
  

const runMain = async () => {
  try {
    await main_();
    process.exit(0);
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

runMain();