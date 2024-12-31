import { expect } from "chai";
const hre = require("hardhat");

describe("Abraham and Manna Contracts", function () {
  let mannaContract: any;
  let abrahamContract: any;
  let owner: any;
  let user1: any;
  let user2: any;

  before(async () => {
    [owner, user1, user2] = await hre.ethers.getSigners();

    // Deploy Manna contract
    const Manna = await hre.ethers.getContractFactory("Manna");
    mannaContract = await Manna.deploy(owner.address);

    // Deploy Abraham contract
    const Abraham = await hre.ethers.getContractFactory("Abraham");
    abrahamContract = await Abraham.deploy(
      await mannaContract.getAddress(),
      owner.address
    );

    // Transfer Manna to users for testing
    const initialManna = hre.ethers.parseEther("1000");
    await mannaContract.connect(owner).transfer(user1.address, initialManna);
    await mannaContract.connect(owner).transfer(user2.address, initialManna);
  });
  it("Should deploy contracts with correct initial settings", async () => {
    expect(await mannaContract.name()).to.equal("Manna");
    expect(await mannaContract.symbol()).to.equal("MANNA");
    expect(await abrahamContract.initPraisePrice()).to.equal(
      hre.ethers.parseEther("0.1")
    );
    expect(await abrahamContract.initUnpraisePrice()).to.equal(
      hre.ethers.parseEther("0.1")
    );
  });

  it("Should allow the owner to create a new creation", async () => {
    const metadataUri = "ipfs://creation-metadata";
    await expect(abrahamContract.connect(owner).newCreation(metadataUri))
      .to.emit(abrahamContract, "CreationAdded")
      .withArgs(1, metadataUri);

    const creation = await abrahamContract.getCreation(1);
    expect(creation.uri).to.equal(metadataUri);
    expect(creation.totalStaked).to.equal(0);
    expect(creation.praisePool).to.equal(0);
  });

  it("Should allow users to praise a creation", async () => {
    const creationId = 1;
    const praisePrice = await abrahamContract.initPraisePrice();
    const abrahamAddress = await abrahamContract.getAddress();
    await mannaContract.connect(user1).approve(abrahamAddress, praisePrice);
    await expect(abrahamContract.connect(user1).praise(creationId))
      .to.emit(abrahamContract, "Praised")
      .withArgs(creationId, user1.address, praisePrice, 1);

    const creation = await abrahamContract.getCreation(creationId);
    expect(creation.totalStaked).to.equal(1);
    expect(creation.praisePool).to.equal(praisePrice);

    const userPraise = await abrahamContract.getUserPraise(
      creationId,
      user1.address
    );
    expect(userPraise).to.equal(1);
  });

  it("Should allow users to unpraise a creation", async () => {
    const creationId = 1;
    const unpraisePrice = await abrahamContract.initUnpraisePrice();

    await expect(abrahamContract.connect(user1).unpraise(creationId))
      .to.emit(abrahamContract, "Unpraised")
      .withArgs(creationId, user1.address, 1, unpraisePrice);

    const creation = await abrahamContract.getCreation(creationId);
    expect(creation.totalStaked).to.equal(0);
    expect(creation.praisePool).to.equal(0);

    const userPraise = await abrahamContract.getUserPraise(
      creationId,
      user1.address
    );
    expect(userPraise).to.equal(0);
  });

  it("Should allow users to list praises for sale", async () => {
    const creationId = 1;
    const praisePrice = await abrahamContract.initPraisePrice();
    const listingPrice = hre.ethers.parseEther("0.2");
    const abrahamAddress = await abrahamContract.getAddress();
    // Praise a creation
    await mannaContract.connect(user1).approve(abrahamAddress, praisePrice);
    await abrahamContract.connect(user1).praise(creationId);

    // List praise for sale
    await expect(
      abrahamContract
        .connect(user1)
        .listPraiseForSale(creationId, 1, listingPrice)
    )
      .to.emit(abrahamContract, "PraiseListed")
      .withArgs(0, creationId, user1.address, 1, listingPrice);

    const listings = await abrahamContract.getPraiseListings();
    expect(listings[0].creationId).to.equal(creationId);
    expect(listings[0].seller).to.equal(user1.address);
    expect(listings[0].amount).to.equal(1);
    expect(listings[0].pricePerPraise).to.equal(listingPrice);
  });

  it("Should allow users to buy praises", async () => {
    const listingId = 0;
    const listing = await abrahamContract.getPraiseListings();
    const totalCost = listing[listingId].pricePerPraise;
    const abrahamAddress = await abrahamContract.getAddress();

    await mannaContract.connect(user2).approve(abrahamAddress, totalCost);
    await expect(abrahamContract.connect(user2).buyPraise(listingId, 1))
      .to.emit(abrahamContract, "PraiseSold")
      .withArgs(
        listingId,
        listing[listingId].creationId,
        user2.address,
        1,
        totalCost
      );

    const user2Praise = await abrahamContract.getUserPraise(
      listing[listingId].creationId,
      user2.address
    );
    expect(user2Praise).to.equal(1);

    const updatedListings = await abrahamContract.getPraiseListings();
    expect(updatedListings[listingId].amount).to.equal(0); // Listing completed
  });
});
