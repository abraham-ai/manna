import { expect } from "chai";
const hre = require("hardhat");

describe("Abraham Contract", function () {
  let abraham: any;
  let owner: any;
  let user1: any;
  let user2: any;

  // Ethers v6 typically returns `bigint` for parseEther, but let's store them as bigints
  const INITIAL_SUPPLY = hre.ethers.parseEther("1000000"); // 1,000,000 * 10^18
  const MANNA_PRICE = hre.ethers.parseEther("0.0001"); // 0.0001 ETH

  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();

    const Abraham = await hre.ethers.getContractFactory("Abraham");
    abraham = await Abraham.deploy(owner.address);
    await abraham.waitForDeployment();
  });

  describe("Manna (ERC20) Logic", function () {
    it("Should assign half of the INITIAL_SUPPLY to the owner at deployment", async function () {
      const ownerBalance = await abraham.balanceOf(owner.address);
      const totalSupply = await abraham.totalSupply();
      const expectedHalf = INITIAL_SUPPLY / 2n;

      expect(ownerBalance).to.equal(totalSupply);
      expect(totalSupply).to.equal(expectedHalf);
    });

    it("Should allow buying Manna with Ether", async function () {
      await abraham.connect(user1).buyManna({ value: MANNA_PRICE });
      const user1MannaBal = await abraham.balanceOf(user1.address);
      const oneManna = 1n * 10n ** 18n;
      expect(user1MannaBal).to.equal(oneManna);
    });

    it("Should emit BoughtManna event when buying Manna", async function () {
      const oneManna = 1n * 10n ** 18n;
      await expect(abraham.connect(user1).buyManna({ value: MANNA_PRICE }))
        .to.emit(abraham, "BoughtManna")
        .withArgs(user1.address, oneManna);
    });

    it("Should revert if not enough Ether sent for min purchase", async function () {
      const tooLittle = MANNA_PRICE - 1n;
      await expect(
        abraham.connect(user1).buyManna({ value: tooLittle })
      ).to.be.rejectedWith("Insufficient Ether for min purchase");
    });

    it("Should allow selling Manna for Ether if contract has Ether", async function () {
      // user1 buys 0.001 ETH worth of Manna
      const buyAmount = hre.ethers.parseEther("0.001");
      await abraham.connect(user1).buyManna({ value: buyAmount });

      // user1 now has some Manna to sell
      const user1MannaBal = await abraham.balanceOf(user1.address);

      // user1's ETH before
      const user1InitialEthBN = BigInt(
        (await hre.ethers.provider.getBalance(user1.address)).toString()
      );

      // Sell all Manna
      await abraham.connect(user1).sellManna(user1MannaBal);

      // user1's ETH after
      const user1FinalEthBN = BigInt(
        (await hre.ethers.provider.getBalance(user1.address)).toString()
      );

      // We expect user1FinalEthBN > user1InitialEthBN (they gained some ETH from selling)
      expect(user1FinalEthBN).to.be.greaterThan(user1InitialEthBN);
    });

    it("Should emit SoldManna event when selling Manna", async function () {
      // user1 buys 1 Manna
      await abraham.connect(user1).buyManna({ value: MANNA_PRICE });
      const user1Balance = await abraham.balanceOf(user1.address);

      await expect(abraham.connect(user1).sellManna(user1Balance))
        .to.emit(abraham, "SoldManna")
        .withArgs(user1.address, user1Balance, MANNA_PRICE);
    });

    it("Should revert if user tries to sell Manna they don't have", async function () {
      await expect(abraham.connect(user1).sellManna(1n)).to.be.rejectedWith(
        "Not enough Manna to sell"
      );
    });

    it("Should return correct contract balances", async function () {
      // user1 buys 1 Manna => 0.0001 ETH
      await abraham.connect(user1).buyManna({ value: MANNA_PRICE });
      const [mannaBalance, ethBalance] = await abraham.getContractBalances();

      // Typically 0 Manna in contract after a direct buy
      expect(mannaBalance).to.equal(0n);
      // Contract's ETH balance => MANNA_PRICE
      expect(ethBalance).to.equal(MANNA_PRICE);
    });

    it("Should allow buying Manna via fallback (receive) function", async () => {
      // For Ethers v6, the contract address is in `.target`; for older versions it's `.address`.
      const contractAddress = abraham.target || abraham.address;

      // We want to buy 2 Manna => cost is MANNA_PRICE * 2
      const fallbackBuy = MANNA_PRICE * 2n;

      await user1.sendTransaction({
        to: contractAddress,
        value: fallbackBuy,
      });

      // user1 should have 2 Manna now => 2 * 10^18
      const user1Bal = await abraham.balanceOf(user1.address);
      const twoManna = 2n * 10n ** 18n;
      expect(user1Bal).to.equal(twoManna);
    });
  });

  // ------------------------------------
  //          CREATION LOGIC
  // ------------------------------------
  describe("Creation Logic", function () {
    it("Should allow only owner to create a new creation", async function () {
      const metadataUri = "ipfs://creation-metadata";

      // Attempt as user1 => revert w/ custom error from new Ownable
      await expect(abraham.connect(user1).newCreation(metadataUri))
        .to.be.revertedWithCustomError(abraham, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);

      // Now as owner => success
      await expect(abraham.connect(owner).newCreation(metadataUri))
        .to.emit(abraham, "CreationAdded")
        .withArgs(1n, metadataUri);

      const creationData = await abraham.getCreation(1);
      expect(creationData.uri).to.equal(metadataUri);
      expect(creationData.totalStaked).to.equal(0n);
      expect(creationData.praisePool).to.equal(0n);

      const creationIds = await abraham.allCreationIds();
      expect(creationIds.length).to.equal(1);
      expect(creationIds[0]).to.equal(1n);
    });

    it("Should allow praising a creation (assuming user has enough Manna)", async function () {
      await abraham.connect(owner).newCreation("ipfs://creation1");

      // user1 buys 2 Manna => 2 * MANNA_PRICE in ETH
      const buyETH = MANNA_PRICE * 2n;
      await abraham.connect(user1).buyManna({ value: buyETH });

      const initPraisePrice = await abraham.initPraisePrice(); // typically 1e18 => 1 Manna

      await expect(abraham.connect(user1).praise(1))
        .to.emit(abraham, "Praised")
        .withArgs(1n, user1.address, initPraisePrice, 1n);

      const creation = await abraham.getCreation(1);
      expect(creation.totalStaked).to.equal(1n);
      expect(creation.praisePool).to.equal(initPraisePrice);

      const user1Praise = await abraham.getUserPraise(1, user1.address);
      expect(user1Praise).to.equal(1n);
    });

    it("Should revert praising if creation does not exist", async function () {
      await expect(abraham.connect(user1).praise(999)).to.be.rejectedWith(
        "Creation does not exist"
      );
    });

    it("Should revert praising if user doesn’t have enough Manna", async function () {
      await abraham.connect(owner).newCreation("ipfs://creation1");
      // user1 has 0 Manna
      await expect(abraham.connect(user1).praise(1)).to.be.rejectedWith(
        "Insufficient Manna to praise"
      );
    });

    it("Should allow unpraising and refund Manna", async function () {
      await abraham.connect(owner).newCreation("ipfs://creation1");

      // user1 buys 2 Manna and praises once
      const buy2Manna = MANNA_PRICE * 2n;
      await abraham.connect(user1).buyManna({ value: buy2Manna });
      await abraham.connect(user1).praise(1);

      const initUnpraisePrice = await abraham.initUnpraisePrice();
      await expect(abraham.connect(user1).unpraise(1))
        .to.emit(abraham, "Unpraised")
        .withArgs(1n, user1.address, 1n, initUnpraisePrice);

      const creation = await abraham.getCreation(1);
      expect(creation.totalStaked).to.equal(0n);
      expect(creation.praisePool).to.equal(0n);

      const user1Praise = await abraham.getUserPraise(1, user1.address);
      expect(user1Praise).to.equal(0n);
    });

    it("Should revert if user has no praise to unpraise", async function () {
      await abraham.connect(owner).newCreation("ipfs://creation1");
      // user1 never praised
      await expect(abraham.connect(user1).unpraise(1)).to.be.rejectedWith(
        "No praise to unpraise"
      );
    });
  });

  // ------------------------------------
  //       SECONDARY MARKET LOGIC
  // ------------------------------------
  describe("Secondary Market", () => {
    beforeEach(async () => {
      await abraham.connect(owner).newCreation("ipfs://creation1");
      const buyMannaETH = MANNA_PRICE * 5n;
      await abraham.connect(user1).buyManna({ value: buyMannaETH });
      // user1 praises #1 twice
      await abraham.connect(user1).praise(1);
      await abraham.connect(user1).praise(1);
    });

    it("Should list praises for sale if user has them", async () => {
      const listingPrice = hre.ethers.parseEther("0.2");
      await expect(abraham.connect(user1).listPraiseForSale(1, 2, listingPrice))
        .to.emit(abraham, "PraiseListed")
        .withArgs(0n, 1n, user1.address, 2n, listingPrice);

      const listings = await abraham.getPraiseListings();
      expect(listings.length).to.equal(1);
      expect(listings[0].creationId).to.equal(1n);
      expect(listings[0].seller).to.equal(user1.address);
      expect(listings[0].amount).to.equal(2n);
      expect(listings[0].pricePerPraise).to.equal(listingPrice);
    });

    it("Should revert if user tries to list more praise than they own", async () => {
      await expect(
        abraham
          .connect(user1)
          .listPraiseForSale(1, 5, hre.ethers.parseEther("0.1"))
      ).to.be.rejectedWith("Insufficient praises to sell");
    });

    it("Should allow another user to buy praises from listing", async () => {
      // user1 lists 2 praises at 0.2 Manna each
      const listPrice = hre.ethers.parseEther("0.2");
      await abraham.connect(user1).listPraiseForSale(1, 2, listPrice);

      // user2 needs enough Manna => buy ~50 Manna
      await abraham.connect(user2).buyManna({ value: MANNA_PRICE * 50n });

      // user2 buys 1 praise => cost = 1 * 0.2 Manna
      const listingId = 0;
      const amountToBuy = 1;
      const totalCost = listPrice * BigInt(amountToBuy);

      await expect(abraham.connect(user2).buyPraise(listingId, amountToBuy))
        .to.emit(abraham, "PraiseSold")
        .withArgs(listingId, 1n, user2.address, 1n, totalCost);

      const user2Praises = await abraham.getUserPraise(1, user2.address);
      expect(user2Praises).to.equal(1n);

      // user1 had 2 => sold 1 => now 1 left
      const user1Praises = await abraham.getUserPraise(1, user1.address);
      expect(user1Praises).to.equal(1n);

      // listing's amount is 1 now
      const listings = await abraham.getPraiseListings();
      expect(listings[listingId].amount).to.equal(1n);
    });

    it("Should revert if listing doesn’t have enough praises left", async () => {
      const listPrice = hre.ethers.parseEther("0.2");
      await abraham.connect(user1).listPraiseForSale(1, 2, listPrice);

      await abraham.connect(user2).buyManna({ value: MANNA_PRICE * 10n });
      await expect(abraham.connect(user2).buyPraise(0, 3)).to.be.rejectedWith(
        "Not enough praises available in this listing"
      );
    });

    it("Should revert if buyer doesn't have enough Manna", async () => {
      // user1 lists 2 praises at 1 Manna each => total 2 Manna
      await abraham
        .connect(user1)
        .listPraiseForSale(1, 2, hre.ethers.parseEther("1"));
      // user2 has 0 Manna => revert
      await expect(abraham.connect(user2).buyPraise(0, 1)).to.be.rejectedWith(
        "Insufficient Manna to purchase praise"
      );
    });
  });
});
