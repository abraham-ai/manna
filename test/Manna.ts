import { expect } from "chai";
const hre = require("hardhat");
import { Manna } from "../typechain-types";

describe("Manna", function () {
  let manna: Manna;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    const Manna = await hre.ethers.getContractFactory("Manna");
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    manna = (await Manna.deploy(owner.address)) as Manna;
  });

  it("Should assign half of initial supply to the owner", async function () {
    const ownerBalance = await manna.balanceOf(owner.address);
    const total = await manna.totalSupply();
    // Initially half of INITIAL_SUPPLY to owner
    // The rest will be minted when buying Manna
    expect(ownerBalance).to.equal(total);
  });

  it("Should allow buying Manna with Ether", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001"); // 1 Manna
    await manna.connect(addr1).buyManna({ value: buyAmount });
    const mannaBalance = await manna.balanceOf(addr1.address);
    const oneManna = hre.ethers.parseUnits("1", 18);
    expect(mannaBalance).to.equal(oneManna);
  });

  it("Should emit a BoughtManna event when buying Manna", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    const oneManna = hre.ethers.parseUnits("1", 18);
    await expect(manna.connect(addr1).buyManna({ value: buyAmount }))
      .to.emit(manna, "BoughtManna")
      .withArgs(addr1.address, oneManna);
  });

  it("Should revert if not enough Ether to buy Manna", async function () {
    const tooLittle = hre.ethers.parseEther("0.00005");
    await expect(
      manna.connect(addr1).buyManna({ value: tooLittle })
    ).to.be.revertedWith("Insufficient Ether");
  });

  it("Should allow selling Manna for Ether if contract has Ether", async function () {
    // Give contract Ether by buying from owner
    const buyAmount = hre.ethers.parseEther("0.001");
    await manna.connect(addr1).buyManna({ value: buyAmount });

    // Now addr1 has some Manna
    const mannaBalance = await manna.balanceOf(addr1.address);

    // Sell it back
    const initialEthBalance = await hre.ethers.provider.getBalance(
      addr1.address
    );
    await manna.connect(addr1).sellManna(mannaBalance);
    const finalEthBalance = await hre.ethers.provider.getBalance(addr1.address);

    expect(finalEthBalance).to.be.gt(initialEthBalance);
  });

  it("Should emit SoldManna event when selling Manna", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await manna.connect(addr1).buyManna({ value: buyAmount });

    const mannaBalance = await manna.balanceOf(addr1.address);
    await expect(manna.connect(addr1).sellManna(mannaBalance))
      .to.emit(manna, "SoldManna")
      .withArgs(addr1.address, mannaBalance, buyAmount);
  });

  it("Should revert selling Manna if user doesn't have enough", async function () {
    await expect(manna.connect(addr1).sellManna(1)).to.be.revertedWith(
      "Not enough Manna"
    );
  });

  it("Should get correct contract balances", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await manna.connect(addr1).buyManna({ value: buyAmount });
    const [mannaBalance, ethBalance] = await manna.getContractBalances();
    expect(mannaBalance).to.equal(0);
    expect(ethBalance).to.equal(buyAmount);
  });
});
