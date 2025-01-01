// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Abraham is ERC20, Ownable {

    // =========================================================================
    //                            MANNA TOKEN LOGIC                            
    // =========================================================================

    uint256 public constant INITIAL_SUPPLY = 1_000_000 * (10 ** 18);
    uint256 public constant MANNA_PRICE    = 0.0001 ether;

    event BoughtManna(address indexed buyer, uint256 amount);
    event SoldManna(address indexed seller, uint256 mannaAmount, uint256 ethAmount);

    constructor(address initialOwner)
        ERC20("Manna", "MANNA")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "Invalid owner address");
        uint256 initialOwnerSupply = INITIAL_SUPPLY / 2;
        _mint(initialOwner, initialOwnerSupply);
    }

    function buyManna() public payable {
        require(msg.value > 0, "No Ether sent");
        require(msg.value >= MANNA_PRICE, "Insufficient Ether for min purchase");
        
        uint256 mannaAmount = (msg.value * (10 ** 18)) / MANNA_PRICE;

        // If you want to cap at INITIAL_SUPPLY, you can check totalSupply
        require(totalSupply() + mannaAmount <= INITIAL_SUPPLY, "Supply cap reached");

        _mint(msg.sender, mannaAmount);
        emit BoughtManna(msg.sender, mannaAmount);
    }

    function sellManna(uint256 mannaAmount) external {
        require(balanceOf(msg.sender) >= mannaAmount, "Not enough Manna to sell");

        // Calculate how much Ether the user should receive
        uint256 ethAmount = (mannaAmount * MANNA_PRICE) / (10 ** 18);
        require(address(this).balance >= ethAmount, "Contract lacks Ether for buyback");
        _burn(msg.sender, mannaAmount);

        // Send Ether to the seller
        (bool sent, ) = msg.sender.call{value: ethAmount}("");
        require(sent, "Failed to send Ether");

        emit SoldManna(msg.sender, mannaAmount, ethAmount);
    }

    function getContractBalances()
        external
        view
        returns (uint256 mannaBalance, uint256 ethBalance)
    {
        mannaBalance = balanceOf(address(this));
        ethBalance   = address(this).balance;
    }

    receive() external payable {
        if (msg.value > 0) {
            buyManna();
        }
    }


    // =========================================================================
    //                       ABRAHAM CREATION/PRAISE LOGIC                     
    // =========================================================================

    struct Creation {
        uint256 id;
        string metadataUri;
        uint256 totalStaked;   // total # of "praise units" staked
        uint256 praisePool;    // total Manna stored in the pool for this creation
        uint256 conviction;    // sum of (balance * timeHeld)
        mapping(address => uint256) praiseBalance;
        mapping(address => uint256) stakeTime;
    }

    // Creation storage
    uint256 public creationCount;
    mapping(uint256 => Creation) public creations;
    uint256[] private _allCreationIds;

    // Praise pricing
    uint256 public initPraisePrice   = 1e18; // 1 Manna
    uint256 public initUnpraisePrice = 1e18; // 1 Manna

    event CreationAdded(uint256 indexed creationId, string metadataUri);
    event Praised(
        uint256 indexed creationId,
        address indexed user,
        uint256 pricePaid,
        uint256 unitsPraised
    );
    event Unpraised(
        uint256 indexed creationId,
        address indexed user,
        uint256 unitsUnpraised,
        uint256 mannaRefunded
    );
    event ConvictionUpdated(uint256 indexed creationId, uint256 newConviction);

    // Secondary market (sell/buy praise units) events and storage
    struct PraiseListing {
        uint256 creationId;
        address seller;
        uint256 amount;
        uint256 pricePerPraise;
    }
    PraiseListing[] public praiseListings;

    event PraiseListed(
        uint256 listingId,
        uint256 creationId,
        address indexed seller,
        uint256 amount,
        uint256 pricePerPraise
    );
    event PraiseSold(
        uint256 listingId,
        uint256 creationId,
        address indexed buyer,
        uint256 amount,
        uint256 totalCost
    );

    function newCreation(string calldata metadataUri) external onlyOwner {
        creationCount++;
        Creation storage c = creations[creationCount];
        c.id = creationCount;
        c.metadataUri = metadataUri;

        _allCreationIds.push(creationCount);

        emit CreationAdded(creationCount, metadataUri);
    }

 
    function praise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");

        // Price for praising 1 unit
        uint256 currentStaked = c.totalStaked;
        uint256 priceForOne = initPraisePrice + (currentStaked * initPraisePrice);

        // Check user has enough Manna
        require(balanceOf(msg.sender) >= priceForOne, "Insufficient Manna to praise");

        // Transfer Manna from user to this contract
        _transfer(msg.sender, address(this), priceForOne);

        // Increase creation's pool
        c.praisePool += priceForOne;

        // Update conviction
        _updateConvictionOnPraise(c, msg.sender);

        c.totalStaked = currentStaked + 1;
        c.praiseBalance[msg.sender]++;

        emit Praised(creationId, msg.sender, priceForOne, 1);
    }

    function unpraise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");
        require(c.praiseBalance[msg.sender] > 0, "No praise to unpraise");

        uint256 refundForOne = initUnpraisePrice;
        require(c.praisePool >= refundForOne, "Not enough Manna in praise pool");

        // Update conviction
        _updateConvictionOnUnpraise(c, msg.sender);

        // Adjust balances
        c.praiseBalance[msg.sender]--;
        c.totalStaked--;
        c.praisePool -= refundForOne;

        // Transfer Manna refund to the user
        _transfer(address(this), msg.sender, refundForOne);

        emit Unpraised(creationId, msg.sender, 1, refundForOne);
    }

    /**
     * @dev List some of your praises for sale (secondary market).
     */
    function listPraiseForSale(
        uint256 creationId,
        uint256 amount,
        uint256 pricePerPraise
    ) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");
        require(c.praiseBalance[msg.sender] >= amount, "Insufficient praises to sell");

        praiseListings.push(PraiseListing({
            creationId: creationId,
            seller: msg.sender,
            amount: amount,
            pricePerPraise: pricePerPraise
        }));

        uint256 listingId = praiseListings.length - 1;

        emit PraiseListed(listingId, creationId, msg.sender, amount, pricePerPraise);
    }

    /**
     * @dev Buy some praises from a listing (secondary market).
     *      Payment is done in Manna from the buyer’s balance directly to the seller.
     */
    function buyPraise(uint256 listingId, uint256 amount) external {
        PraiseListing storage listing = praiseListings[listingId];
        require(listing.amount >= amount, "Not enough praises available in this listing");

        uint256 totalCost = amount * listing.pricePerPraise;
        require(balanceOf(msg.sender) >= totalCost, "Insufficient Manna to purchase praise");

        // Transfer Manna from buyer to seller
        _transfer(msg.sender, listing.seller, totalCost);

        // Update praise balances
        Creation storage c = creations[listing.creationId];
        c.praiseBalance[msg.sender]     += amount;
        c.praiseBalance[listing.seller] -= amount;

        // Decrease the listing's available amount
        listing.amount -= amount;

        emit PraiseSold(listingId, listing.creationId, msg.sender, amount, totalCost);
    }

    /**
     * @dev Internal helper to update conviction at praising time.
     */
    function _updateConvictionOnPraise(Creation storage c, address user) internal {
        uint256 currentBalance = c.praiseBalance[user];
        if (currentBalance > 0) {
            // Add conviction for the time already held
            uint256 timeHeld = block.timestamp - c.stakeTime[user];
            uint256 addedConviction = currentBalance * timeHeld;
            c.conviction += addedConviction;

            emit ConvictionUpdated(c.id, c.conviction);
        }
        // Reset the stakeTime to "now" for fresh holdings
        c.stakeTime[user] = block.timestamp;
    }

    /**
     * @dev Internal helper to update conviction at unpraising time.
     */
    function _updateConvictionOnUnpraise(Creation storage c, address user) internal {
        uint256 currentBalance = c.praiseBalance[user];
        // Add conviction for the time these units were held
        uint256 timeHeld = block.timestamp - c.stakeTime[user];
        uint256 addedConviction = currentBalance * timeHeld;
        c.conviction += addedConviction;

        emit ConvictionUpdated(c.id, c.conviction);

        // Reset the stakeTime to now (for any remaining units)
        c.stakeTime[user] = block.timestamp;
    }

    // =========================================================================
    // =                             VIEW METHODS                               =
    // =========================================================================

    function getCreation(uint256 creationId)
        external
        view
        returns (
            uint256 id,
            string memory uri,
            uint256 totalStaked,
            uint256 praisePool,
            uint256 conviction
        )
    {
        Creation storage c = creations[creationId];
        id          = c.id;
        uri         = c.metadataUri;
        totalStaked = c.totalStaked;
        praisePool  = c.praisePool;
        conviction  = c.conviction;
    }

    /**
     * @notice Returns how many praise units a user has staked for a given creation.
     */
    function getUserPraise(uint256 creationId, address user)
        external
        view
        returns (uint256)
    {
        return creations[creationId].praiseBalance[user];
    }

    /**
     * @notice Returns an array of all creation IDs.
     */
    function allCreationIds() external view returns (uint256[] memory) {
        return _allCreationIds;
    }

    /**
     * @notice Returns the current array of praise listings.
     */
    function getPraiseListings() external view returns (PraiseListing[] memory) {
        return praiseListings;
    }
}