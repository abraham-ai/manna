import { expect } from "chai";
const hre = require("hardhat");
import { AbrahamNFT } from "../typechain-types";

describe("AbrahamNFT", function () {
  let abrahamNFT: AbrahamNFT;
  let owner: any, addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await hre.ethers.getSigners();
    const AbrahamNFT = await hre.ethers.getContractFactory("AbrahamNFT");
    abrahamNFT = (await AbrahamNFT.deploy(
      owner.address,
      "https://metadata.example.com/"
    )) as AbrahamNFT;
  });

  it("Should mint a new NFT to the specified address", async function () {
    await abrahamNFT.connect(owner).mintCreationNFT(addr1.address, 1);
    const ownerOfToken = await abrahamNFT.ownerOf(1);
    expect(ownerOfToken).to.equal(addr1.address);
  });

  it("Should allow changing the base URI", async function () {
    await abrahamNFT
      .connect(owner)
      .setBaseURI("https://newmetadata.example.com/");
    await abrahamNFT.connect(owner).mintCreationNFT(owner.address, 2);
    const tokenURI = await abrahamNFT.tokenURI(2);
    expect(tokenURI).to.include("https://newmetadata.example.com/");
  });

  it("Should revert if non-owner tries to mint", async function () {
    await expect(
      abrahamNFT.connect(addr1).mintCreationNFT(addr1.address, 2)
    ).to.be.revertedWithCustomError(abrahamNFT, "OwnableUnauthorizedAccount");
  });
});
