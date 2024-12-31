const hre = require("hardhat");
require("dotenv").config();

const contractOwner = process.env.CONTRACT_OWNER;

async function main() {
  if (!contractOwner) {
    throw new Error("CONTRACT_OWNER not set in .env");
  }

  // Deploy Manna contract
  const manna = await deployManna(contractOwner);

  // Deploy Abraham contract
  const abraham = await deployAbraham(manna, contractOwner);

  console.log("Deployment complete.");
  console.log(`Manna: ${await manna.getAddress()}`);
  console.log(`Abraham: ${await abraham.getAddress()}`);
}

async function deployManna(initialOwner: string) {
  const Manna = await hre.ethers.getContractFactory("Manna");
  const manna = await Manna.deploy(initialOwner);
  console.log(`Manna deployed at: ${await manna.getAddress()}`);
  return manna;
}

async function deployAbraham(
  manna: { getAddress: () => any },
  initialOwner: string
) {
  const mannaAddress = await manna.getAddress();
  const Abraham = await hre.ethers.getContractFactory("Abraham");
  const abraham = await Abraham.deploy(mannaAddress, initialOwner);
  console.log(`Abraham deployed at: ${await abraham.getAddress()}`);
  return abraham;
}

// Execute the deployment script
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
