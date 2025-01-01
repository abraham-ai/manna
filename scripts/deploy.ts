const hre = require("hardhat");
import * as dotenv from "dotenv";

dotenv.config();

const contractOwner = process.env.CONTRACT_OWNER;

async function main() {
  if (!contractOwner) {
    throw new Error("CONTRACT_OWNER not set in .env");
  }

  // Deploy Abraham contract
  const abraham = await deployAbraham(contractOwner);

  console.log("Deployment complete.");
  console.log(`Abraham deployed at: ${await abraham.getAddress()}`);
}

async function deployAbraham(initialOwner: string) {
  const Abraham = await hre.ethers.getContractFactory("Abraham");
  const abraham = await Abraham.deploy(initialOwner);

  await abraham.waitForDeployment();

  console.log(`Abraham deployed at: ${await abraham.getAddress()}`);
  return abraham;
}

// Execute the deployment script
main().catch((error) => {
  console.error("Error deploying contract:", error);
  process.exitCode = 1;
});
