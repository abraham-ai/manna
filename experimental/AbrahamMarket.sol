// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title IMannaToken
 * @dev Interface for the MannaToken ERC20 contract.
 */
interface IMannaToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
contract AbrahamMarket is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // Token name and symbol (optional for ERC1155)
    string public name;
    string public symbol;

    // Reference to the MannaToken ERC20 contract
    IMannaToken public mannaToken;

    // Counter for new creations
    uint256 public creationCounter;

    // Duration for each cycle (e.g., 1 week)
    uint256 public cycleDuration;

    // Timestamp of the last cycle
    uint256 public lastCycleTime;

    // Struct to store creation data
    struct Creation {
        uint256 id;
        string imageURL;
        uint256 totalStaked;
        bool mintedAsTop;
        uint256 createdAt;
    }

    // Mapping from creation ID to Creation data
    mapping(uint256 => Creation) public creations;

    // Struct to store user stake information
    struct StakeInfo {
        uint256 amount;      // Amount of Manna staked
        uint256 stakeTime;   // Timestamp when the stake was made
    }

    // Mapping from creation ID to user address to StakeInfo
    mapping(uint256 => mapping(address => StakeInfo)) public userStakes;

    // Events
    event CreationReleased(uint256 indexed creationId, string imageURL);
    event Praised(uint256 indexed creationId, address indexed user, uint256 amount);
    event Burned(uint256 indexed creationId, address indexed user, uint256 amount);
    event Blessed(uint256 indexed creationId, address indexed user, uint256 amount);
    event TopCreationSelected(uint256 indexed creationId);
    event BidPlaced(uint256 indexed creationId, address indexed bidder, uint256 amount);
    event AuctionFinalized(uint256 indexed creationId, address winner, uint256 amount);

    // Bidding related variables
    struct Auction {
        bool active;
        address highestBidder;
        uint256 highestBid;
        uint256 biddingEndTime;
    }

    // Mapping from creation ID to Auction
    mapping(uint256 => Auction) public auctions;

    constructor(address _mannaToken, string memory baseURI, uint256 _cycleDuration) ERC1155(baseURI) {
        name = "Abraham Collection";
        symbol = "ABRAHAM-1155";
        mannaToken = IMannaToken(_mannaToken);
        cycleDuration = _cycleDuration;
        lastCycleTime = block.timestamp;
    }

   
    modifier checkCycle() {
        if (block.timestamp >= lastCycleTime + cycleDuration) {
            _selectTopCreation();
            lastCycleTime = block.timestamp;
        }
        _;
    }

    function setBaseURI(string memory newURI) external onlyOwner {
        _setURI(newURI);
    }

    function releaseCreation(string memory imageURL) external onlyOwner checkCycle {
        creationCounter += 1;
        creations[creationCounter] = Creation({
            id: creationCounter,
            imageURL: imageURL,
            totalStaked: 0,
            mintedAsTop: false,
            createdAt: block.timestamp
        });

        emit CreationReleased(creationCounter, imageURL);
    }

    function praise(uint256 creationId, uint256 amount) external nonReentrant checkCycle {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creationId");
        require(amount > 0, "Amount must be > 0");

        // Calculate cost using bonding curve
        uint256 cost = getBondingCost(creationId, amount);
        require(amount >= cost, "Insufficient Manna for bonding curve");

        // Transfer Manna from user to contract
        bool success = mannaToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Manna transfer failed");

        // Update total staked for the creation
        creations[creationId].totalStaked += amount;

        // Update user's stake info
        StakeInfo storage stake = userStakes[creationId][msg.sender];
        stake.amount += amount;
        stake.stakeTime = block.timestamp;

        // Mint ERC1155 tokens to the user
        _mint(msg.sender, creationId, amount, "");

        emit Praised(creationId, msg.sender, amount);
    }

   
    function burnCreation(uint256 creationId, uint256 amount) external nonReentrant checkCycle {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creationId");
        require(amount > 0, "Amount must be > 0");

        // Calculate cost using bonding curve
        uint256 cost = getBondingCost(creationId, amount);
        require(amount >= cost, "Insufficient Manna for bonding curve");

        // Transfer Manna from user to contract
        bool success = mannaToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Manna transfer failed");

        // Update total staked for the creation
        creations[creationId].totalStaked += amount;

        // Update user's stake info
        StakeInfo storage stake = userStakes[creationId][msg.sender];
        stake.amount += amount;
        stake.stakeTime = block.timestamp;

        // Mint ERC1155 tokens to the user
        _mint(msg.sender, creationId, amount, "");

        emit Burned(creationId, msg.sender, amount);
    }

   
    function bless(uint256 creationId, uint256 amount) external nonReentrant checkCycle {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creationId");
        require(amount > 0, "Amount must be > 0");

        // Calculate cost using bonding curve
        uint256 cost = getBondingCost(creationId, amount);
        require(amount >= cost, "Insufficient Manna for bonding curve");

        // Transfer Manna from user to contract
        bool success = mannaToken.transferFrom(msg.sender, address(this), amount);
        require(success, "Manna transfer failed");

        // Update total staked for the creation
        creations[creationId].totalStaked += amount;

        // Update user's stake info
        StakeInfo storage stake = userStakes[creationId][msg.sender];
        stake.amount += amount;
        stake.stakeTime = block.timestamp;

        // Mint ERC1155 tokens to the user
        _mint(msg.sender, creationId, amount, "");

        emit Blessed(creationId, msg.sender, amount);
    }

   
    function getBondingCost(uint256 creationId, uint256 amount) public view returns (uint256 cost) {
        // Simple linear bonding curve: cost increases by 1% per total staked
        // More sophisticated curves can be implemented
        Creation storage c = creations[creationId];
        cost = (amount * (c.totalStaked + amount)) / 100; // 1% of (totalStaked + amount)
    }


    function _selectTopCreation() internal {
        uint256 topId = 0;
        uint256 highestConviction = 0;

        for (uint256 i = 1; i <= creationCounter; i++) {
            if (creations[i].mintedAsTop) {
                continue; // Skip already minted top creations
            }
            uint256 conviction = getConviction(i);
            if (conviction > highestConviction) {
                highestConviction = conviction;
                topId = i;
            }
        }

        require(topId != 0, "No valid top creation found");

        creations[topId].mintedAsTop = true;
        emit TopCreationSelected(topId);

        // Start auction for the top creation
        _startAuction(topId);
    }

    function getConviction(uint256 creationId) public view returns (uint256 conviction) {
        Creation storage c = creations[creationId];
        // Conviction = totalStaked * (currentTime - createdAt)
        uint256 timeStaked = block.timestamp - c.createdAt;
        conviction = c.totalStaked * timeStaked;
    }

    function _startAuction(uint256 creationId) internal {
        require(!auctions[creationId].active, "Auction already active for this creation");

        auctions[creationId] = Auction({
            active: true,
            highestBidder: address(0),
            highestBid: 0,
            biddingEndTime: block.timestamp + 7 days // Auction lasts for 7 days
        });
    }

    function placeBid(uint256 creationId, uint256 bidAmount) external nonReentrant {
        Auction storage auction = auctions[creationId];
        require(auction.active, "No active auction for this creation");
        require(block.timestamp < auction.biddingEndTime, "Auction has ended");
        require(bidAmount > auction.highestBid, "Bid must be higher than current highest bid");

        // Transfer Manna from bidder to contract
        bool success = mannaToken.transferFrom(msg.sender, address(this), bidAmount);
        require(success, "Manna transfer failed");

        // Refund the previous highest bidder
        if (auction.highestBidder != address(0)) {
            bool refundSuccess = mannaToken.transfer(auction.highestBidder, auction.highestBid);
            require(refundSuccess, "Refund to previous bidder failed");
        }

        // Update highest bid
        auction.highestBidder = msg.sender;
        auction.highestBid = bidAmount;

        emit BidPlaced(creationId, msg.sender, bidAmount);
    }
    
    function finalizeAuction(uint256 creationId) external nonReentrant {
        Auction storage auction = auctions[creationId];
        require(auction.active, "No active auction for this creation");
        require(block.timestamp >= auction.biddingEndTime, "Auction is still ongoing");
        require(auction.highestBidder != address(0), "No bids placed");

        // Mark the auction as inactive
        auction.active = false;

        // Transfer the ERC1155 tokens to the highest bidder
        // Assuming the contract holds the ERC1155 tokens for this creation
        // If not, adjust accordingly
        _safeTransferFrom(owner(), auction.highestBidder, creationId, creations[creationId].totalStaked, "");

        emit AuctionFinalized(creationId, auction.highestBidder, auction.highestBid);
    }

  

    
    function withdrawManna() external onlyOwner {
        uint256 balance = mannaToken.balanceOf(address(this));
        require(balance > 0, "No Manna to withdraw");

        bool success = mannaToken.transfer(owner(), balance);
        require(success, "Manna transfer failed");
    }
}