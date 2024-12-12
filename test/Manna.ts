import { expect } from "chai";
const hre = require("hardhat");
import { MannaToken } from "../typechain-types";

describe("MannaToken", function () {
  let mannaToken: MannaToken;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    const MannaToken = await hre.ethers.getContractFactory("MannaToken");
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    mannaToken = (await MannaToken.deploy(owner.address)) as MannaToken;
  });

  it("Should assign half of initial supply to the owner", async function () {
    const ownerBalance = await mannaToken.balanceOf(owner.address);
    const total = await mannaToken.totalSupply();
    // Initially half of INITIAL_SUPPLY to owner
    // The rest will be minted when buying Manna
    expect(ownerBalance).to.equal(total);
  });

  it("Should allow buying Manna with Ether", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001"); // 1 Manna
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });
    const mannaBalance = await mannaToken.balanceOf(addr1.address);
    const oneManna = hre.ethers.parseUnits("1", 18);
    expect(mannaBalance).to.equal(oneManna);
  });

  it("Should emit a BoughtManna event when buying Manna", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    const oneManna = hre.ethers.parseUnits("1", 18);
    await expect(mannaToken.connect(addr1).buyManna({ value: buyAmount }))
      .to.emit(mannaToken, "BoughtManna")
      .withArgs(addr1.address, oneManna);
  });

  it("Should revert if not enough Ether to buy Manna", async function () {
    const tooLittle = hre.ethers.parseEther("0.00005");
    await expect(
      mannaToken.connect(addr1).buyManna({ value: tooLittle })
    ).to.be.revertedWith("Insufficient Ether");
  });

  it("Should allow selling Manna for Ether if contract has Ether", async function () {
    // Give contract Ether by buying from owner
    const buyAmount = hre.ethers.parseEther("0.001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });

    // Now addr1 has some Manna
    const mannaBalance = await mannaToken.balanceOf(addr1.address);

    // Sell it back
    const initialEthBalance = await hre.ethers.provider.getBalance(
      addr1.address
    );
    await mannaToken.connect(addr1).sellManna(mannaBalance);
    const finalEthBalance = await hre.ethers.provider.getBalance(addr1.address);

    expect(finalEthBalance).to.be.gt(initialEthBalance);
  });

  it("Should emit SoldManna event when selling Manna", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });

    const mannaBalance = await mannaToken.balanceOf(addr1.address);
    await expect(mannaToken.connect(addr1).sellManna(mannaBalance))
      .to.emit(mannaToken, "SoldManna")
      .withArgs(addr1.address, mannaBalance, buyAmount);
  });

  it("Should revert selling Manna if user doesn't have enough", async function () {
    await expect(mannaToken.connect(addr1).sellManna(1)).to.be.revertedWith(
      "Not enough Manna"
    );
  });

  it("Should get correct contract balances", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });
    const [mannaBalance, ethBalance] = await mannaToken.getContractBalances();
    expect(mannaBalance).to.equal(0);
    expect(ethBalance).to.equal(buyAmount);
  });
});
