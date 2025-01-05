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

  // ------------------------------------
  //          Manna (ERC20) Logic
  // ------------------------------------
  describe("Manna (ERC20) Logic", function () {
    it("Should assign half of the INITIAL_SUPPLY to the owner at deployment", async function () {
      const ownerBalance = await abraham.balanceOf(owner.address);
      const totalSupply = await abraham.totalSupply();
      const expectedHalf = INITIAL_SUPPLY / 2n;

      expect(ownerBalance).to.equal(expectedHalf);
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
      ).to.be.revertedWith("Insufficient Ether for min purchase");
    });

    it("Should allow selling Manna for Ether if contract has Ether", async function () {
      // user1 buys 0.001 ETH worth of Manna (10 Manna at 0.0001 ETH each)
      const buyAmount = hre.ethers.parseEther("0.001");
      await abraham.connect(user1).buyManna({ value: buyAmount });

      // user1 now has some Manna to sell
      const user1MannaBal = await abraham.balanceOf(user1.address);
      expect(user1MannaBal).to.equal(10n * 10n ** 18n); // 10 Manna

      // user1's ETH before
      const user1InitialEth = await hre.ethers.provider.getBalance(
        user1.address
      );

      // Sell all Manna
      const sellTx = await abraham.connect(user1).sellManna(user1MannaBal);
      const sellReceipt = await sellTx.wait();

      // user1's ETH after
      const user1FinalEth = await hre.ethers.provider.getBalance(user1.address);

      // Calculate the ETH received from selling Manna
      const ethAmount = hre.ethers.parseEther("0.001"); // 10 Manna * 0.0001 ETH each

      // Ensure that the final ETH balance is greater than the initial (after accounting for gas)
      expect(user1FinalEth).to.be.above(user1InitialEth);
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
      await expect(abraham.connect(user1).sellManna(1n)).to.be.revertedWith(
        "Not enough Manna to sell"
      );
    });

    it("Should return correct contract balances", async function () {
      // user1 buys 1 Manna => 0.0001 ETH
      await abraham.connect(user1).buyManna({ value: MANNA_PRICE });
      const [mannaBalance, ethBalance] = await abraham.getContractBalances();

      // Manna is held in praise pools, not directly in the contract's balance
      // Since no praise has been done yet, mannaBalance should be 0
      expect(mannaBalance).to.equal(0n);
      // Contract's ETH balance => MANNA_PRICE
      expect(ethBalance).to.equal(MANNA_PRICE);
    });

    it("Should allow buying Manna via fallback (receive) function", async () => {
      // For hre.Ethers v6, the contract address is in `.target`; for older versions it's `.address`.
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
  //          Creation Logic
  // ------------------------------------
  describe("Creation Logic", function () {
    beforeEach(async () => {
      // Create a new creation before each test in this block
      await abraham.connect(owner).newCreation("ipfs://creation1");
    });

    it("Should allow only owner to create a new creation", async function () {
      const metadataUri = "ipfs://creation-metadata";

      // Attempt as user1 => revert with custom error from Ownable
      await expect(abraham.connect(user1).newCreation(metadataUri))
        .to.be.revertedWithCustomError(abraham, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);

      // Now as owner => success
      await expect(abraham.connect(owner).newCreation(metadataUri))
        .to.emit(abraham, "CreationAdded")
        .withArgs(2n, metadataUri);

      const creationData = await abraham.getCreation(2);
      expect(creationData.uri).to.equal(metadataUri);
      expect(creationData.totalStaked).to.equal(0n);
      expect(creationData.praisePool).to.equal(0n);

      const creationIds = await abraham.allCreationIds();
      expect(creationIds.length).to.equal(2);
      expect(creationIds[1]).to.equal(2n);
    });

    it("Should allow praising a creation (assuming user has enough Manna)", async function () {
      // user1 buys 2 Manna => 2 * MANNA_PRICE in ETH
      const buyETH = MANNA_PRICE * 2n; // 0.0002 ETH
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
      await expect(abraham.connect(user1).praise(999)).to.be.revertedWith(
        "Creation does not exist"
      );
    });

    it("Should revert praising if user doesn’t have enough Manna", async function () {
      // user1 has 0 Manna
      await expect(abraham.connect(user1).praise(1)).to.be.revertedWith(
        "Insufficient Manna to praise"
      );
    });

    it("Should allow unpraising and refund Manna with correct parameters", async function () {
      // Create a second creation to ensure separation
      await abraham.connect(owner).newCreation("ipfs://creation2");

      // user1 buys 2 Manna and praises once on creation1
      const buy2Manna = MANNA_PRICE * 2n; // 0.0002 ETH
      await abraham.connect(user1).buyManna({ value: buy2Manna });
      await abraham.connect(user1).praise(1); // Pays 1e18 Manna

      const initUnpraiseCost = await abraham.initUnpraiseCost(); // 0.1e18
      const initPraisePrice = await abraham.initPraisePrice(); // 1e18

      // After praising, c.totalStaked =1, c.praisePool =1e18
      // refundForOne =1e18
      // netRefund =1e18 -0.1e18=0.9e18

      const refundForOne = initPraisePrice; //1e18
      const netRefund = refundForOne - initUnpraiseCost; //0.9e18

      // Correctly access the contract's address
      const contractAddress = abraham.target || abraham.address;

      await expect(abraham.connect(user1).unpraise(1))
        .to.emit(abraham, "Unpraised")
        .withArgs(1n, user1.address, 1n, netRefund, initUnpraiseCost);

      const creation = await abraham.getCreation(1);
      expect(creation.totalStaked).to.equal(0n);
      expect(creation.praisePool).to.equal(0n);

      const user1Praise = await abraham.getUserPraise(1, user1.address);
      expect(user1Praise).to.equal(0n);

      // Check that the owner received the unpraise cost
      const ownerMannaBalance = await abraham.balanceOf(owner.address);
      expect(ownerMannaBalance).to.equal(
        INITIAL_SUPPLY / 2n + initUnpraiseCost
      ); // Initial half + fee

      // Check that the contract Manna balance is zero
      const contractMannaBalance = await abraham.balanceOf(contractAddress);
      expect(contractMannaBalance).to.equal(0n);
    });

    it("Should revert if user has no praise to unpraise", async function () {
      // user1 never praised
      await expect(abraham.connect(user1).unpraise(1)).to.be.revertedWith(
        "No praise to unpraise"
      );
    });

    // ------------------------------------
    //      Multiple Users Praise and Unpraise
    // ------------------------------------
    describe("Multiple Users Praise and Unpraise", function () {
      beforeEach(async () => {
        // user1 buys 5 Manna
        const buyMannaUser1 = MANNA_PRICE * 5n; // 0.0005 ETH
        await abraham.connect(user1).buyManna({ value: buyMannaUser1 });

        // user2 buys 5 Manna instead of 3 to allow praising twice
        const buyMannaUser2 = MANNA_PRICE * 5n; // 0.0005 ETH
        await abraham.connect(user2).buyManna({ value: buyMannaUser2 });
      });

      it("Should handle multiple users praising the same creation correctly", async function () {
        const initPraisePrice = await abraham.initPraisePrice(); //1e18

        // user1 praises once (1e18)
        await expect(abraham.connect(user1).praise(1))
          .to.emit(abraham, "Praised")
          .withArgs(1n, user1.address, initPraisePrice, 1n);

        // user2 praises first time (2e18)
        const firstPraisePriceUser2 = initPraisePrice + initPraisePrice; //1e18 +1e18=2e18
        await expect(abraham.connect(user2).praise(1))
          .to.emit(abraham, "Praised")
          .withArgs(1n, user2.address, firstPraisePriceUser2, 1n);

        // user2 praises second time (3e18)
        const secondPraisePriceUser2 = initPraisePrice + 2n * initPraisePrice; //1e18 +2e18=3e18
        await expect(abraham.connect(user2).praise(1))
          .to.emit(abraham, "Praised")
          .withArgs(1n, user2.address, secondPraisePriceUser2, 1n);

        // Verify totalStaked and praisePool
        const creation = await abraham.getCreation(1);
        expect(creation.totalStaked).to.equal(3n); //1 (user1) +2 (user2)

        // Verify praisePool
        // After user1's praise: +1e18
        // After user2's first praise: +2e18
        // After user2's second praise: +3e18
        // Total praisePool =6e18
        expect(creation.praisePool).to.equal(6n * 10n ** 18n);

        // Verify user praise balances
        const user1Praise = await abraham.getUserPraise(1, user1.address);
        const user2Praise = await abraham.getUserPraise(1, user2.address);
        expect(user1Praise).to.equal(1n);
        expect(user2Praise).to.equal(2n);
      });

      it("Should handle multiple users unpraising correctly", async function () {
        const initPraisePrice = await abraham.initPraisePrice(); //1e18
        const initUnpraiseCost = await abraham.initUnpraiseCost(); //0.1e18

        // user1 praises once (1e18)
        await abraham.connect(user1).praise(1); // praise1: user1:1e18

        // user2 praises twice (2e18 and 3e18)
        await abraham.connect(user2).praise(1); // praise2: user2:2e18
        await abraham.connect(user2).praise(1); // praise3: user2:3e18
        // Total praisePool =6e18

        // First unpraise: user2 unpraises last praise (3e18)
        const expectedNetRefundUser2_First = 3n * 10n ** 18n - initUnpraiseCost; //2.9e18
        const expectedUnpraiseFeeUser2_First = initUnpraiseCost; //0.1e18

        await expect(abraham.connect(user2).unpraise(1))
          .to.emit(abraham, "Unpraised")
          .withArgs(
            1n,
            user2.address,
            1n,
            expectedNetRefundUser2_First,
            expectedUnpraiseFeeUser2_First
          );

        // Second unpraise: user2 unpraises second praise (2e18)
        const expectedNetRefundUser2_Second =
          2n * 10n ** 18n - initUnpraiseCost; //1.9e18
        const expectedUnpraiseFeeUser2_Second = initUnpraiseCost; //0.1e18

        await expect(abraham.connect(user2).unpraise(1))
          .to.emit(abraham, "Unpraised")
          .withArgs(
            1n,
            user2.address,
            1n,
            expectedNetRefundUser2_Second,
            expectedUnpraiseFeeUser2_Second
          );

        // Finally, user1 unpraises their praise (1e18)
        const expectedNetRefundUser1 = 1n * 10n ** 18n - initUnpraiseCost; //0.9e18
        const expectedUnpraiseFeeUser1 = initUnpraiseCost; //0.1e18

        await expect(abraham.connect(user1).unpraise(1))
          .to.emit(abraham, "Unpraised")
          .withArgs(
            1n,
            user1.address,
            1n,
            expectedNetRefundUser1,
            expectedUnpraiseFeeUser1
          );

        // Verify praise balances
        const user1Praise = await abraham.getUserPraise(1, user1.address);
        const user2Praise = await abraham.getUserPraise(1, user2.address);
        expect(user1Praise).to.equal(0n);
        expect(user2Praise).to.equal(0n);

        // Verify praisePool is zero
        const creation = await abraham.getCreation(1);
        expect(creation.praisePool).to.equal(0n);

        // Check that the owner received the unpraise costs
        const ownerMannaBalance = await abraham.balanceOf(owner.address);
        expect(ownerMannaBalance).to.equal(
          INITIAL_SUPPLY / 2n + initUnpraiseCost * 3n
        ); // Initial half + 3 fees
      });

      it("Should correctly handle multiple praises and unpraises affecting praisePool", async function () {
        const initPraisePrice = await abraham.initPraisePrice(); //1e18
        const initUnpraiseCost = await abraham.initUnpraiseCost(); //0.1e18

        // user1 praises once (1e18)
        await abraham.connect(user1).praise(1); // praise1: user1:1e18

        // praisePool should be initPraisePrice
        let creation = await abraham.getCreation(1);
        expect(creation.praisePool).to.equal(initPraisePrice); //1e18

        // user2 praises twice (2e18 and 3e18)
        await abraham.connect(user2).praise(1); // praise2: user2:2e18
        await abraham.connect(user2).praise(1); // praise3: user2:3e18
        // Total praisePool =1e18 +2e18 +3e18=6e18

        // praisePool should now be 6e18
        creation = await abraham.getCreation(1);
        expect(creation.praisePool).to.equal(6n * 10n ** 18n); //6e18

        // user2 unpraises twice
        // First unpraise:
        const expectedNetRefundUser2_First = 3n * 10n ** 18n - initUnpraiseCost; //2.9e18
        const expectedUnpraiseFeeUser2_First = initUnpraiseCost; //0.1e18

        await expect(abraham.connect(user2).unpraise(1))
          .to.emit(abraham, "Unpraised")
          .withArgs(
            1n,
            user2.address,
            1n,
            expectedNetRefundUser2_First,
            expectedUnpraiseFeeUser2_First
          );

        // praisePool after first unpraise:6e18 -3e18=3e18
        creation = await abraham.getCreation(1);
        expect(creation.praisePool).to.equal(3n * 10n ** 18n); //3e18

        // Second unpraise:
        const expectedNetRefundUser2_Second =
          2n * 10n ** 18n - initUnpraiseCost; //1.9e18
        const expectedUnpraiseFeeUser2_Second = initUnpraiseCost; //0.1e18

        await expect(abraham.connect(user2).unpraise(1))
          .to.emit(abraham, "Unpraised")
          .withArgs(
            1n,
            user2.address,
            1n,
            expectedNetRefundUser2_Second,
            expectedUnpraiseFeeUser2_Second
          );

        // praisePool after second unpraise:3e18 -2e18=1e18
        creation = await abraham.getCreation(1);
        expect(creation.praisePool).to.equal(1n * 10n ** 18n); //1e18

        // user1 unpraises once
        const expectedNetRefundUser1 = 1n * 10n ** 18n - initUnpraiseCost; //0.9e18
        const expectedUnpraiseFeeUser1 = initUnpraiseCost; //0.1e18

        await expect(abraham.connect(user1).unpraise(1))
          .to.emit(abraham, "Unpraised")
          .withArgs(
            1n,
            user1.address,
            1n,
            expectedNetRefundUser1,
            expectedUnpraiseFeeUser1
          );

        // praisePool after third unpraise:1e18 -1e18=0
        creation = await abraham.getCreation(1);
        expect(creation.praisePool).to.equal(0n * 10n ** 18n); //0

        // Verify praise balances
        const user1Praise = await abraham.getUserPraise(1, user1.address);
        const user2Praise = await abraham.getUserPraise(1, user2.address);
        expect(user1Praise).to.equal(0n);
        expect(user2Praise).to.equal(0n);

        // Verify owner's Manna balance increased by total fees (0.1e18 *3=0.3e18)
        const ownerMannaBalance = await abraham.balanceOf(owner.address);
        expect(ownerMannaBalance).to.equal(
          INITIAL_SUPPLY / 2n + initUnpraiseCost * 3n
        ); // Initial half + 3 fees
      });
    });
  });
});
