const hre = require("hardhat");
require("dotenv").config();
const contractOwner = process.env.CONTRACT_OWNER;

async function main() {
  // Deploy the MannaToken contract
  await deployMannaTokenContract();
}

async function deployMannaTokenContract() {
  const initialOwner = contractOwner;

  // Deploy the MannaToken contract
  const MannaToken = await hre.ethers.getContractFactory("MannaToken");
  const mannaToken = await MannaToken.deploy(initialOwner);
  await mannaToken.waitForDeployment();

  console.log(
    `MannaToken contract deployed to: ${await mannaToken.getAddress()}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
