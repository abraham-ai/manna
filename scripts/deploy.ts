const hre = require("hardhat");
require("dotenv").config();

const contractOwner = process.env.CONTRACT_OWNER;

async function main() {
  if (!contractOwner) {
    throw new Error("CONTRACT_OWNER not set in .env");
  }

  // Deploy MannaToken
  const mannaToken = await deployMannaToken(contractOwner);

  // Deploy AbrahamNFT
  const abrahamNFT = await deployAbrahamNFT(
    contractOwner,
    "https://metadata.example.com/"
  );

  // Deploy Abraham
  const abraham = await deployAbraham(
    mannaToken,
    "https://example.com/{id}.json",
    contractOwner
  );

  // Transfer AbrahamNFT ownership to Abraham
  await transferOwnershipAbrahamNFT(abrahamNFT, abraham);

  // Set AbrahamNFT in Abraham
  await setAbrahamNFTInAbraham(abraham, abrahamNFT);

  console.log("Deployment complete.");
  console.log(`MannaToken: ${await mannaToken.getAddress()}`);
  console.log(`AbrahamNFT: ${await abrahamNFT.getAddress()}`);
  console.log(`Abraham: ${await abraham.getAddress()}`);
}

async function deployMannaToken(initialOwner: string) {
  const MannaToken = await hre.ethers.getContractFactory("MannaToken");
  const mannaToken = await MannaToken.deploy(initialOwner);
  await mannaToken.waitForDeployment();
  console.log(`MannaToken deployed at: ${await mannaToken.getAddress()}`);
  return mannaToken;
}

async function deployAbrahamNFT(initialOwner: string, baseURI: string) {
  const AbrahamNFT = await hre.ethers.getContractFactory("AbrahamNFT");
  const abrahamNFT = await AbrahamNFT.deploy(initialOwner, baseURI);
  await abrahamNFT.waitForDeployment();
  console.log(`AbrahamNFT deployed at: ${await abrahamNFT.getAddress()}`);
  return abrahamNFT;
}

async function deployAbraham(
  mannaToken: { getAddress: () => any },
  uri: string,
  initialOwner: string
) {
  const mannaAddress = await mannaToken.getAddress();
  const Abraham = await hre.ethers.getContractFactory("Abraham");
  const abraham = await Abraham.deploy(mannaAddress, uri, initialOwner);
  await abraham.waitForDeployment();
  console.log(`Abraham deployed at: ${await abraham.getAddress()}`);
  return abraham;
}

async function transferOwnershipAbrahamNFT(
  abrahamNFT: {
    getAddress: () => any;
    owner: () => any;
    transferOwnership: (arg0: any) => any;
  },
  abraham: { getAddress: () => any }
) {
  const abrahamNFTAddress = await abrahamNFT.getAddress();
  const abrahamAddress = await abraham.getAddress();

  // We need the signer who currently owns AbrahamNFT (the deployer) to call transferOwnership
  const [deployer] = await hre.ethers.getSigners();
  const nftOwner = await abrahamNFT.owner();
  if (nftOwner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      "Deployer does not own AbrahamNFT. Check initialOwner param."
    );
  }

  const tx = await abrahamNFT.transferOwnership(abrahamAddress);
  await tx.wait();
  console.log(
    `AbrahamNFT ownership transferred to Abraham at ${abrahamAddress}`
  );
}

async function setAbrahamNFTInAbraham(
  abraham: { setAbrahamNFT: (arg0: any) => any },
  abrahamNFT: { getAddress: () => any }
) {
  const abrahamNFTAddress = await abrahamNFT.getAddress();
  const tx = await abraham.setAbrahamNFT(abrahamNFTAddress);
  await tx.wait();
  console.log(`AbrahamNFT set in Abraham: ${abrahamNFTAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
