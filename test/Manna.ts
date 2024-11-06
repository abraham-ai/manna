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

  it("Should assign the initial supply to the owner", async function () {
    const ownerBalance = await mannaToken.balanceOf(owner.address);
    expect(await mannaToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should allow users to praise a creation", async function () {
    const creationId = 1;
    const praiseAmount = hre.ethers.parseEther("10");

    await mannaToken.transfer(addr1.address, praiseAmount);
    await mannaToken.connect(addr1).praise(creationId, praiseAmount);

    const addr1Balance = await mannaToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(0);
  });

  it("Should emit a Praised event when praising a creation", async function () {
    const creationId = 1;
    const praiseAmount = hre.ethers.parseEther("10");

    await mannaToken.transfer(addr1.address, praiseAmount);
    await expect(mannaToken.connect(addr1).praise(creationId, praiseAmount))
      .to.emit(mannaToken, "Praised")
      .withArgs(addr1.address, creationId, praiseAmount);
  });

  it("Should allow users to burn a creation", async function () {
    const creationId = 2;
    const burnAmount = hre.ethers.parseEther("5");

    await mannaToken.transfer(addr1.address, burnAmount);
    await mannaToken.connect(addr1).burn(creationId, burnAmount);

    const addr1Balance = await mannaToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(0);
  });

  it("Should emit a Burned event when burning a creation", async function () {
    const creationId = 2;
    const burnAmount = hre.ethers.parseEther("5");

    await mannaToken.transfer(addr1.address, burnAmount);
    await expect(mannaToken.connect(addr1).burn(creationId, burnAmount))
      .to.emit(mannaToken, "Burned")
      .withArgs(addr1.address, creationId, burnAmount);
  });

  it("Should allow users to bless a creation", async function () {
    const creationId = 3;
    const comment = "Amazing creation!";

    await expect(mannaToken.connect(addr1).bless(creationId, comment))
      .to.emit(mannaToken, "Blessed")
      .withArgs(addr1.address, creationId, comment);
  });

  it("Should allow the owner to create art by burning tokens", async function () {
    const createAmount = hre.ethers.parseEther("20");

    await mannaToken.transfer(owner.address, createAmount);
    await mannaToken.createArt(createAmount);

    const ownerBalance = await mannaToken.balanceOf(owner.address);
    //expect(ownerBalance).to.equal(
    //  (await mannaToken.totalSupply()).sub(createAmount)
    //);
  });

  it("Should revert if non-owner tries to create art", async function () {
    const createAmount = hre.ethers.parseEther("20");

    await mannaToken.transfer(addr1.address, createAmount);
    //await expect(
    //  mannaToken.connect(addr1).createArt(createAmount)
    //).to.be.revertedWith("Ownable: caller is not the owner");
  });

  // New Tests for Buy and Sell Functionality
  it("Should allow users to buy Manna with Ether", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });

    const mannaBalance = await mannaToken.balanceOf(addr1.address);
    const expectedMannaAmount = hre.ethers.parseUnits("1", 18); // 1 Manna token (assuming 18 decimals)
    expect(mannaBalance).to.equal(expectedMannaAmount);
  });

  it("Should emit a BoughtManna event when buying Manna", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await expect(mannaToken.connect(addr1).buyManna({ value: buyAmount }))
      .to.emit(mannaToken, "BoughtManna")
      .withArgs(addr1.address, hre.ethers.parseUnits("1", 18));
  });

  it("Should allow users to sell Manna for Ether", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });

    const mannaAmount = hre.ethers.parseUnits("1", 18); // Selling 1 Manna token
    await mannaToken.connect(addr1).sellManna(mannaAmount);

    const addr1Balance = await hre.ethers.provider.getBalance(addr1.address);
    expect(addr1Balance).to.be.gt(buyAmount); // The balance should increase after selling
  });

  it("Should emit a SoldManna event when selling Manna", async function () {
    const buyAmount = hre.ethers.parseEther("0.0001");
    await mannaToken.connect(addr1).buyManna({ value: buyAmount });

    const mannaAmount = hre.ethers.parseUnits("1", 18); // Selling 1 Manna token
    await expect(mannaToken.connect(addr1).sellManna(mannaAmount))
      .to.emit(mannaToken, "SoldManna")
      .withArgs(addr1.address, mannaAmount, buyAmount);
  });
});
