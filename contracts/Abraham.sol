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
        uint256 ethAmount = (mannaAmount * MANNA_PRICE) / (1e18);
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

    struct Praise {
        address user;
        uint256 pricePaid;
    }

    // Creation storage
    uint256 public creationCount;
    mapping(uint256 => Creation) public creations;
    uint256[] private _allCreationIds;

    // Praise stacks per creation
    mapping(uint256 => Praise[]) public praiseStacks;

    // Praise pricing
    uint256 public initPraisePrice   = 1e18; // 1 Manna
    uint256 public initUnpraiseCost  = 0.1e18; // 0.1 Manna as unpraise cost

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
        uint256 mannaRefunded,
        uint256 unpraiseCost
    );
    event ConvictionUpdated(uint256 indexed creationId, uint256 newConviction);

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

        // Push to praise stack
        praiseStacks[creationId].push(Praise({
            user: msg.sender,
            pricePaid: priceForOne
        }));

        // Update conviction
        _updateConvictionOnPraise(c, msg.sender);

        c.totalStaked += 1;
        c.praiseBalance[msg.sender] += 1;

        emit Praised(creationId, msg.sender, priceForOne, 1);
    }

    function unpraise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");
        require(c.praiseBalance[msg.sender] > 0, "No praise to unpraise");

        Praise[] storage stack = praiseStacks[creationId];
        require(stack.length > 0, "No praises to unpraise");

        Praise memory lastPraise = stack[stack.length - 1];
        //require(lastPraise.user == msg.sender, "Last praise is not by caller");

        // Calculate net refund
        uint256 netRefund = lastPraise.pricePaid - initUnpraiseCost;

        require(c.praisePool >= lastPraise.pricePaid, "Not enough Manna in praise pool");
        require(balanceOf(address(this)) >= netRefund, "Contract lacks Manna for refund");

        // Pop the last praise
        stack.pop();

        // Update praisePool and totalStaked
        c.praisePool -= lastPraise.pricePaid;
        c.totalStaked -= 1;
        c.praiseBalance[msg.sender] -= 1;

        // Transfer unpraise cost to contract owner\
        _transfer(address(this), owner(), initUnpraiseCost);

        // Transfer net Manna refund to the user
        _transfer(address(this), msg.sender, netRefund);

        // Update conviction
        _updateConvictionOnUnpraise(c, msg.sender);

        emit Unpraised(creationId, msg.sender, 1, netRefund, initUnpraiseCost);
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

    // =========================================================================
    // =                         ADMIN FUNCTIONS                               =
    // =========================================================================

    /**
     * @notice Allows the owner to update the initial praise price.
     * @param newPrice The new price in Manna for praising.
     */
    function setInitPraisePrice(uint256 newPrice) external onlyOwner {
        initPraisePrice = newPrice;
    }

    /**
     * @notice Allows the owner to update the unpraise cost.
     * @param newCost The new cost in Manna for unpraising.
     */
    function setInitUnpraiseCost(uint256 newCost) external onlyOwner {
        initUnpraiseCost = newCost;
    }
}