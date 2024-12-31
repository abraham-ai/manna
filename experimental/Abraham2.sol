// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract Abraham is ERC1155, Ownable {
    
    enum ActionType { Praise, Burn, Bless }

    struct CreationData {
        string  image;          
        uint256 totalStaked;
        uint256 conviction;
        uint256 lastConvictionUpdate; 
    }

    struct StakeInfo {
        uint256 amount;
        ActionType action;
        uint256 stakeTime;
    }

    address public mannaToken;
    uint256 public creationCounter;
    uint256 public endTimestamp;

    uint256 public nextCreationReleaseTime;

    // Human-readable name/symbol
    string public name;
    string public symbol;

    // ID -> Creation data
    mapping(uint256 => CreationData) public creations;

    // creationID -> (user -> StakeInfo)
    mapping(uint256 => mapping(address => StakeInfo)) public userStakes;

    event CreationReleased(uint256 indexed creationId, string image, uint256 timestamp);
    event Staked(uint256 indexed creationId, address indexed user, ActionType action, uint256 amount);
    event Unstaked(uint256 indexed creationId, address indexed user, uint256 amount);
    event MintedTopCreation(uint256 indexed creationId, uint256 conviction);

    constructor(
        address _mannaToken,
        string memory baseURI,
        address initialOwner
    )
        ERC1155(baseURI)
        Ownable(initialOwner)
    {
        mannaToken             = _mannaToken;
        endTimestamp           = block.timestamp + (13 * 365 days);
        name                   = "Abraham ERC1155 Collection";
        symbol                 = "ABR1155";
        nextCreationReleaseTime = block.timestamp; 
    }

    modifier notEnded() {
        require(block.timestamp < endTimestamp, "Contract expired");
        _;
    }

   
    function releaseCreation(string memory image) external onlyOwner notEnded {
        require(
            block.timestamp >= nextCreationReleaseTime,
            "Must wait until the next hourly slot"
        );

        creationCounter++;
        creations[creationCounter] = CreationData({
            image: image,
            totalStaked: 0,
            conviction: 0,
            lastConvictionUpdate: block.timestamp
        });

        // Next release in 1 hour
        nextCreationReleaseTime = block.timestamp + 1 hours;

        emit CreationReleased(creationCounter, image, block.timestamp);
    }

    
    function stakeForCreation(
        uint256 creationId,
        uint256 amount,
        ActionType action
    )
        external
        notEnded
    {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creationId");
        require(amount > 0, "Staking amount must be > 0");

        // 1. Update the creation’s conviction so we keep time-based data accurate
        _updateConviction(creationId);

        // 2. Check bonding curve cost
        uint256 cost = _bondingCurveCost(creations[creationId].totalStaked, amount);
        require(amount >= cost, "Not enough Manna to meet bonding curve cost");

        // 3. Transfer Manna from user to this contract (staking)
        IERC20 manna = IERC20(mannaToken);
        require(
            manna.allowance(msg.sender, address(this)) >= amount,
            "Must approve Abraham to spend Manna"
        );
        bool success = manna.transferFrom(msg.sender, address(this), amount);
        require(success, "Manna transfer failed");

        // 4. Update totalStaked
        creations[creationId].totalStaked += amount;

        // 5. Update user’s stake info
        userStakes[creationId][msg.sender].amount    += amount;
        userStakes[creationId][msg.sender].action     = action; // Overwrites old action
        userStakes[creationId][msg.sender].stakeTime  = block.timestamp;

        // 6. Mint an ERC1155 “stake receipt” token to represent the staked amount
        _mint(msg.sender, creationId, amount, "");

        emit Staked(creationId, msg.sender, action, amount);
    }

    /**
     * @notice Unstake some or all of your Manna from a creation.
     * @param creationId The ID of the creation.
     * @param amount How much Manna to unstake.
     */
    function unstake(uint256 creationId, uint256 amount) external notEnded {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creationId");
        require(amount > 0, "Cannot unstake zero");

        StakeInfo storage sInfo = userStakes[creationId][msg.sender];
        require(sInfo.amount >= amount, "Not enough staked Manna");

        // 1. Update conviction first
        _updateConviction(creationId);

        // 2. Decrease user’s stake & creation total
        sInfo.amount -= amount;
        creations[creationId].totalStaked -= amount;

        // 3. Burn the stake-receipt tokens
        _burn(msg.sender, creationId, amount);

        // 4. Transfer Manna back to user
        IERC20 manna = IERC20(mannaToken);
        bool success = manna.transfer(msg.sender, amount);
        require(success, "Manna transfer to user failed");

        emit Unstaked(creationId, msg.sender, amount);
    }

    
    function mintTopCreation() external onlyOwner {
        require(creationCounter > 0, "No creations available");

        // 1. Find the creation with the highest conviction
        uint256 topId;
        uint256 maxConviction;
        for (uint256 i = 1; i <= creationCounter; i++) {
            _updateConviction(i);
            if (creations[i].conviction > maxConviction) {
                maxConviction = creations[i].conviction;
                topId         = i;
            }
        }
        require(topId > 0, "No valid creation found");

        uint256 rewardTokenId = topId + 1_000_000;
        _mint(owner(), rewardTokenId, 1, ""); // Example: 1 token to the owner

        emit MintedTopCreation(topId, maxConviction);
    }

    
    function setMannaToken(address _mannaToken) external onlyOwner notEnded {
        mannaToken = _mannaToken;
    }

  
    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }

    function _bondingCurveCost(uint256 currentStaked, uint256 stakeAmount)
        internal
        pure
        returns (uint256 cost)
    {
        cost = (currentStaked / 100) + (stakeAmount / 2);
    }

   
    function _updateConviction(uint256 creationId) internal {
        CreationData storage cd = creations[creationId];
        uint256 timeDelta = block.timestamp - cd.lastConvictionUpdate;
        if (timeDelta == 0) {
            return; // no new time has passed
        }

        // Naive formula: conviction += totalStaked * timeDelta
        cd.conviction += cd.totalStaked * timeDelta;
        cd.lastConvictionUpdate = block.timestamp;
    }
}