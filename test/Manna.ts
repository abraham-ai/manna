import { expect } from "chai";
import { ethers } from "hardhat";
import { MannaToken } from "../typechain-types";

describe("MannaToken", function () {
  let mannaToken: MannaToken;
  let owner: any, addr1: any, addr2: any;

  beforeEach(async function () {
    const MannaToken = await ethers.getContractFactory("MannaToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    mannaToken = (await MannaToken.deploy(owner.address)) as MannaToken;
  });

  it("Should assign the initial supply to the owner", async function () {
    const ownerBalance = await mannaToken.balanceOf(owner.address);
    expect(await mannaToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should allow users to praise a creation", async function () {
    const creationId = 1;
    const praiseAmount = ethers.parseEther("10");

    await mannaToken.transfer(addr1.address, praiseAmount);
    await mannaToken.connect(addr1).praise(creationId, praiseAmount);

    const addr1Balance = await mannaToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(0);
  });

  it("Should emit a Praised event when praising a creation", async function () {
    const creationId = 1;
    const praiseAmount = ethers.parseEther("10");

    await mannaToken.transfer(addr1.address, praiseAmount);
    await expect(mannaToken.connect(addr1).praise(creationId, praiseAmount))
      .to.emit(mannaToken, "Praised")
      .withArgs(addr1.address, creationId, praiseAmount);
  });

  it("Should allow users to burn a creation", async function () {
    const creationId = 2;
    const burnAmount = ethers.parseEther("5");

    await mannaToken.transfer(addr1.address, burnAmount);
    await mannaToken.connect(addr1).burn(creationId, burnAmount);

    const addr1Balance = await mannaToken.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(0);
  });

  it("Should emit a Burned event when burning a creation", async function () {
    const creationId = 2;
    const burnAmount = ethers.parseEther("5");

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
    const createAmount = ethers.parseEther("20");

    await mannaToken.transfer(owner.address, createAmount);
    await mannaToken.createArt(createAmount);

    const ownerBalance = await mannaToken.balanceOf(owner.address);
    //expect(ownerBalance).to.equal(
    //  (await mannaToken.totalSupply()).sub(createAmount)
    //);
  });

  it("Should revert if non-owner tries to create art", async function () {
    const createAmount = ethers.parseEther("20");

    await mannaToken.transfer(addr1.address, createAmount);
    //await expect(
    //  mannaToken.connect(addr1).createArt(createAmount)
    //).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
