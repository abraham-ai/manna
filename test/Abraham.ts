import { expect } from "chai";
const hre = require("hardhat");
import { MannaToken, Abraham } from "../typechain-types";

describe("Abraham", function () {
  let mannaToken: MannaToken;
  let abraham: Abraham;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();

    // Deploy MannaToken
    const MannaToken = await hre.ethers.getContractFactory("MannaToken");
    mannaToken = (await MannaToken.deploy(owner.address)) as MannaToken;

    // Deploy Abraham
    const Abraham = await hre.ethers.getContractFactory("Abraham");
    abraham = (await Abraham.deploy(
      mannaToken.getAddress(),
      "https://example.com/{id}.json"
    )) as Abraham;

    // Owner releases a creation
    await abraham.connect(owner).releaseCreation();
  });

  it("Should have a released creation", async function () {
    const counter = await abraham.creationCounter();
    expect(counter).to.equal(1);
  });

  it("Should allow praising after buying and approving Manna", async function () {
    // Buy Manna for addr1
    const buyAmount = hre.ethers.parseEther("0.0001"); // Buy 1 Manna
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });
    const oneManna = hre.ethers.parseUnits("1", 18);

    // Approve Abraham
    await mannaToken.connect(addr1).approve(abraham.getAddress(), oneManna);

    // Praise creationId=1 with 1 Manna
    await abraham.connect(addr1).praise(1, oneManna);

    // Check ERC-1155 balance
    const balance1155 = await abraham.balanceOf(addr1.address, 1);
    expect(balance1155).to.equal(oneManna);

    // Check user stats
    const userStats = await abraham.userParticipation(1, addr1.address);
    expect(userStats.praiseCount).to.equal(1);
    expect(userStats.praiseMannaSpent).to.equal(oneManna);

    // Check creation stats
    const creation = await abraham.creations(1);
    expect(creation.praises).to.equal(1);
    expect(creation.totalMannaSpent).to.equal(oneManna);
  });

  it("Should allow burning creation similarly", async function () {
    // Buy Manna for addr2
    const buyAmount = hre.ethers.parseEther("0.0002"); // Buy 2 Manna
    await mannaToken.connect(addr2).buyManna({ value: buyAmount });
    const twoManna = hre.ethers.parseUnits("2", 18);

    await mannaToken.connect(addr2).approve(abraham.getAddress(), twoManna);

    // Burn creationId=1 with 2 Manna
    await abraham.connect(addr2).burnCreation(1, twoManna);

    const balance1155 = await abraham.balanceOf(addr2.address, 1);
    expect(balance1155).to.equal(twoManna);

    const userStats = await abraham.userParticipation(1, addr2.address);
    expect(userStats.burnCount).to.equal(1);
    expect(userStats.burnMannaSpent).to.equal(twoManna);

    const creation = await abraham.creations(1);
    expect(creation.burns).to.equal(1);
    expect(creation.totalMannaSpent).to.equal(twoManna);
  });

  it("Should allow blessing creation", async function () {
    // Buy Manna for addr1
    const buyAmount = hre.ethers.parseEther("0.0001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });
    const oneManna = hre.ethers.parseUnits("1", 18);

    await mannaToken.connect(addr1).approve(abraham.getAddress(), oneManna);
    await abraham.connect(addr1).bless(1, oneManna);

    const balance1155 = await abraham.balanceOf(addr1.address, 1);
    expect(balance1155).to.equal(oneManna);

    const creation = await abraham.creations(1);
    expect(creation.blessings).to.equal(1);
    expect(creation.totalMannaSpent).to.equal(oneManna);
  });

  it("Should revert if spending less than minimumMannaSpend", async function () {
    // minimumMannaSpend = 1 Manna (1e18)
    // We'll give the user only 0.5 Manna from the owner to ensure they have less than required.
    const halfManna = hre.ethers.parseUnits("0.5", 18); // 0.5 Manna

    // Owner has half the initial supply, well above 0.5 Manna.
    await mannaToken.transfer(addr1.address, halfManna);

    // Now addr1 has only 0.5 Manna
    await mannaToken.connect(addr1).approve(abraham.getAddress(), halfManna);

    // Attempt to praise with 0.5 Manna, should fail with "Spend more Manna"
    await expect(
      abraham.connect(addr1).praise(1, halfManna)
    ).to.be.revertedWith("Spend more Manna");
  });

  it("Should fail after 13 years", async function () {
    await hre.ethers.provider.send("evm_increaseTime", [13 * 365 * 24 * 3600]);
    await hre.ethers.provider.send("evm_mine", []);

    const oneManna = hre.ethers.parseUnits("1", 18);
    await mannaToken
      .connect(addr1)
      .buyManna({ value: hre.ethers.parseEther("0.0001") });
    await mannaToken.connect(addr1).approve(abraham.getAddress(), oneManna);

    await expect(abraham.connect(addr1).praise(1, oneManna)).to.be.revertedWith(
      "Contract expired"
    );
  });
});
