// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Abraham is Ownable {
    IERC20 public immutable manna;

    struct Creation {
        uint256 id;
        string metadataUri;
        uint256 totalStaked;
        uint256 praisePool;
        uint256 conviction;
        mapping(address => uint256) praiseBalance;
        mapping(address => uint256) stakeTime;
    }

    uint256 public creationCount;
    mapping(uint256 => Creation) public creations;
    uint256[] private _allCreationIds;

    uint256 public initPraisePrice = 1e17; // 0.1 Manna
    uint256 public initUnpraisePrice = 1e17; // 0.1 Manna

    struct PraiseListing {
        uint256 creationId;
        address seller;
        uint256 amount;
        uint256 pricePerPraise;
    }

    PraiseListing[] public praiseListings;

    event CreationAdded(uint256 indexed creationId, string metadataUri);
    event Praised(uint256 indexed creationId, address indexed user, uint256 pricePaid, uint256 unitsPraised);
    event Unpraised(uint256 indexed creationId, address indexed user, uint256 unitsUnpraised, uint256 mannaRefunded);
    event ConvictionUpdated(uint256 indexed creationId, uint256 newConviction);
    event PraiseListed(uint256 listingId, uint256 creationId, address indexed seller, uint256 amount, uint256 pricePerPraise);
    event PraiseSold(uint256 listingId, uint256 creationId, address indexed buyer, uint256 amount, uint256 totalCost);

    constructor(address _manna, address initialOwner) Ownable(initialOwner) {
        require(_manna != address(0), "Invalid token address");
        manna = IERC20(_manna);
    }

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

        uint256 currentStaked = c.totalStaked;
        uint256 priceForOne = initPraisePrice + (currentStaked * initPraisePrice);

        bool transferred = manna.transferFrom(msg.sender, address(this), priceForOne);
        require(transferred, "Manna transfer failed");

        c.praisePool += priceForOne;

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

        require(c.praisePool >= refundForOne, "Not enough in praise pool");

        _updateConvictionOnUnpraise(c, msg.sender);

        c.praiseBalance[msg.sender]--;
        c.totalStaked--;
        c.praisePool -= refundForOne;

        bool sent = manna.transfer(msg.sender, refundForOne);
        require(sent, "Refund transfer failed");

        emit Unpraised(creationId, msg.sender, 1, refundForOne);
    }

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

    function buyPraise(uint256 listingId, uint256 amount) external {
        PraiseListing storage listing = praiseListings[listingId];
        require(listing.amount >= amount, "Not enough praises available");

        uint256 totalCost = amount * listing.pricePerPraise;
        bool transferred = manna.transferFrom(msg.sender, listing.seller, totalCost);
        require(transferred, "Payment failed");

        Creation storage c = creations[listing.creationId];
        c.praiseBalance[msg.sender] += amount;
        c.praiseBalance[listing.seller] -= amount;

        listing.amount -= amount;

        emit PraiseSold(listingId, listing.creationId, msg.sender, amount, totalCost);
    }

    function _updateConvictionOnPraise(Creation storage c, address user) internal {
        uint256 currentBalance = c.praiseBalance[user];
        if (currentBalance > 0) {
            uint256 timeHeld = block.timestamp - c.stakeTime[user];
            uint256 addedConviction = currentBalance * timeHeld;
            c.conviction += addedConviction;
            emit ConvictionUpdated(c.id, c.conviction);
        }
        c.stakeTime[user] = block.timestamp;
    }

    function _updateConvictionOnUnpraise(Creation storage c, address user) internal {
        uint256 currentBalance = c.praiseBalance[user];
        uint256 timeHeld = block.timestamp - c.stakeTime[user];
        uint256 addedConviction = currentBalance * timeHeld;
        c.conviction += addedConviction;
        emit ConvictionUpdated(c.id, c.conviction);
        c.stakeTime[user] = block.timestamp;
    }

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
        id = c.id;
        uri = c.metadataUri;
        totalStaked = c.totalStaked;
        praisePool = c.praisePool;
        conviction = c.conviction;
    }

    function getUserPraise(uint256 creationId, address user) external view returns (uint256) {
        return creations[creationId].praiseBalance[user];
    }

    function allCreationIds() external view returns (uint256[] memory) {
        return _allCreationIds;
    }

    function getPraiseListings() external view returns (PraiseListing[] memory) {
        return praiseListings;
    }
}