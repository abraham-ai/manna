// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Abraham is ERC20, Ownable {

     uint256 public constant INITIAL_SUPPLY = 1000000 * (10 ** 18);
    uint256 public constant MANNA_PRICE = 0.0001 ether;
   
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

   
    uint256 public initPraisePrice = 1e18; // 1 Manna   
    uint256 public initUnpraisePrice = 1e18;// 1 Manna  

    event CreationAdded(uint256 indexed creationId, string metadataUri);
    event CreationUpdated(
        uint256 indexed creationId,
        string metadataUri,
        uint256 totalStaked,
        uint256 praisePool,
        uint256 conviction
    );
    event Praised(uint256 indexed creationId, address indexed user, uint256 pricePaid, uint256 unitsPraised);
    event Unpraised(uint256 indexed creationId, address indexed user, uint256 unitsUnpraised, uint256 mannaRefunded);
    event ConvictionUpdated(uint256 indexed creationId, uint256 newConviction);


    constructor(address initialOwner) ERC20("Manna", "MANNA") Ownable(initialOwner) {
        uint256 initialOwnerSupply = INITIAL_SUPPLY / 2;
        _mint(initialOwner, initialOwnerSupply);
    }

   
    function newCreation(string calldata metadataUri) external onlyOwner {
        creationCount++;
        Creation storage c = creations[creationCount];
        c.id = creationCount;
        c.metadataUri = metadataUri;
        _allCreationIds.push(creationCount);

        emit CreationAdded(creationCount, metadataUri);
        _emitCreationUpdated(creationCount);
    }

  
    function praise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");

        uint256 currentStaked = c.totalStaked;
        uint256 priceForOne = initPraisePrice + (currentStaked * initPraisePrice);

        require(balanceOf(msg.sender) >= priceForOne, "Not enough Manna");
        _burn(msg.sender, priceForOne);

        c.praisePool += priceForOne;
        _updateConvictionOnPraise(c, msg.sender);

        c.totalStaked = currentStaked + 1;
        c.praiseBalance[msg.sender]++;

        emit Praised(creationId, msg.sender, priceForOne, 1);
        _emitCreationUpdated(creationId);
    }

    /**
     * @dev User unpraises a creation, receiving `initUnpraisePrice` Manna (minted).
     */
    function unpraise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");
        require(c.praiseBalance[msg.sender] > 0, "No praise to unpraise");

        require(c.praisePool >= initUnpraisePrice, "Not enough in praise pool");
        _updateConvictionOnUnpraise(c, msg.sender);

        c.praiseBalance[msg.sender]--;
        c.totalStaked--;

        c.praisePool -= initUnpraisePrice;
        _mint(msg.sender, initUnpraisePrice);

        emit Unpraised(creationId, msg.sender, 1, initUnpraisePrice);
        _emitCreationUpdated(creationId);
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

    function _emitCreationUpdated(uint256 creationId) internal {
        Creation storage c = creations[creationId];
        emit CreationUpdated(
            c.id,
            c.metadataUri,
            c.totalStaked,
            c.praisePool,
            c.conviction
        );
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

    function mintManna(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burnManna(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}