// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

// OZ imports for ERC20 and Ownable
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Abraham is ERC20, Ownable {
   
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * (10 ** 18); 
    uint256 public constant MANNA_PRICE = 0.0001 ether; // for buy/sell

  
    struct Creation {
        uint256 id;
        string metadataUri;
        uint256 totalStaked;   // total 'praise units' staked
        uint256 praisePool;    // Manna tokens currently in the creation's pool
        uint256 conviction;    // cumulative 'conviction' for this creation
        mapping(address => uint256) praiseBalance; // how many praise units each user has
        mapping(address => uint256) stakeTime;     // last time user updated stake (for conviction)
    }

    // For listing praise for sale (p2p)
    struct PraiseListing {
        uint256 creationId;
        address seller;
        uint256 amount;           
        uint256 pricePerPraise;
    }

    uint256 public creationCount;
    mapping(uint256 => Creation) public creations;
    uint256[] private _allCreationIds;

    uint256 public initPraisePrice = 1e18;    // 1 Manna
    uint256 public initUnpraisePrice = 1e18;  // 1 Manna

    PraiseListing[] public praiseListings;

    event CreationAdded(
        uint256 indexed creationId,
        string metadataUri
    );

    event CreationStateUpdated(
        uint256 indexed creationId,
        string metadataUri,
        uint256 totalStaked,
        uint256 praisePool,
        uint256 conviction
    );

    event Praised(
        uint256 indexed creationId,
        address indexed user,
        uint256 mannaPaid,
        uint256 unitsPraised
    );

    event Unpraised(
        uint256 indexed creationId,
        address indexed user,
        uint256 unitsUnpraised,
        uint256 mannaRefunded
    );

    event ConvictionUpdated(
        uint256 indexed creationId,
        uint256 newConviction
    );

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

    event BoughtManna(
        address indexed buyer,
        uint256 amount
    );

    event SoldManna(
        address indexed seller,
        uint256 mannaAmount,
        uint256 ethAmount
    );

   
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
        emit CreationStateUpdated(
            creationCount,
            metadataUri,
            c.totalStaked,
            c.praisePool,
            c.conviction
        );
    }

    function praise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");

        uint256 currentStaked = c.totalStaked;
        // e.g. priceForOne = basePrice + (N * basePrice)
        // => basePrice * (N + 1)
        uint256 priceForOne = initPraisePrice + (currentStaked * initPraisePrice);

        // Check that user has enough Manna to pay
        require(balanceOf(msg.sender) >= priceForOne, "Not enough Manna to praise");

        // Transfer Manna from user to this contract (no approval needed, same contract)
        _transfer(msg.sender, address(this), priceForOne);

        // Update creation pool and stats
        c.praisePool += priceForOne;
        _updateConvictionOnPraise(c, msg.sender);

        c.totalStaked = currentStaked + 1;
        c.praiseBalance[msg.sender] += 1;

        emit Praised(creationId, msg.sender, priceForOne, 1);
        emit CreationStateUpdated(
            creationId,
            c.metadataUri,
            c.totalStaked,
            c.praisePool,
            c.conviction
        );
    }
    function unpraise(uint256 creationId) external {
        Creation storage c = creations[creationId];
        require(c.id > 0, "Creation does not exist");
        require(c.praiseBalance[msg.sender] > 0, "No praise to unpraise");

        uint256 refundForOne = initUnpraisePrice;

        require(c.praisePool >= refundForOne, "Not enough in praise pool");
        _updateConvictionOnUnpraise(c, msg.sender);

        c.praiseBalance[msg.sender] -= 1;
        c.totalStaked -= 1;
        c.praisePool -= refundForOne;

        // Transfer Manna back to user
        _transfer(address(this), msg.sender, refundForOne);

        emit Unpraised(creationId, msg.sender, 1, refundForOne);
        // Emit creation state update
        emit CreationStateUpdated(
            creationId,
            c.metadataUri,
            c.totalStaked,
            c.praisePool,
            c.conviction
        );
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
        // Buyer must have enough Manna
        require(balanceOf(msg.sender) >= totalCost, "Not enough Manna for purchase");

        // Transfer Manna from buyer to seller
        _transfer(msg.sender, listing.seller, totalCost);

        // Update praise balances
        Creation storage c = creations[listing.creationId];
        c.praiseBalance[msg.sender] += amount;
        c.praiseBalance[listing.seller] -= amount;

        listing.amount -= amount;

        emit PraiseSold(listingId, listing.creationId, msg.sender, amount, totalCost);
    }

    function _updateConvictionOnPraise(Creation storage c, address user) internal {
        uint256 currentBalance = c.praiseBalance[user];

        // If user already had some praise staked, add conviction for the time it was staked
        if (currentBalance > 0) {
            uint256 timeHeld = block.timestamp - c.stakeTime[user];
            uint256 addedConviction = currentBalance * timeHeld;
            c.conviction += addedConviction;
            emit ConvictionUpdated(c.id, c.conviction);
        }

        // Reset stakeTime
        c.stakeTime[user] = block.timestamp;
    }

    function _updateConvictionOnUnpraise(Creation storage c, address user) internal {
        // Add conviction for the time the user held the stake
        uint256 currentBalance = c.praiseBalance[user];
        uint256 timeHeld = block.timestamp - c.stakeTime[user];
        uint256 addedConviction = currentBalance * timeHeld;
        c.conviction += addedConviction;

        emit ConvictionUpdated(c.id, c.conviction);

        // Reset stakeTime
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

    function getUserPraise(uint256 creationId, address user)
        external
        view
        returns (uint256)
    {
        return creations[creationId].praiseBalance[user];
    }

    function allCreationIds() external view returns (uint256[] memory) {
        return _allCreationIds;
    }

    function getPraiseListings() external view returns (PraiseListing[] memory) {
        return praiseListings;
    }

    function buyManna() public payable {
        require(msg.value >= MANNA_PRICE, "Insufficient Ether sent");
        uint256 mannaAmount = (msg.value * (10 ** 18)) / MANNA_PRICE;

        // If you want to cap at INITIAL_SUPPLY, you can check totalSupply
        require(totalSupply() + mannaAmount <= INITIAL_SUPPLY, "Supply cap reached");

        _mint(msg.sender, mannaAmount);
        emit BoughtManna(msg.sender, mannaAmount);
    }

    function sellManna(uint256 mannaAmount) external {
        require(balanceOf(msg.sender) >= mannaAmount, "Not enough Manna to sell");
        uint256 ethAmount = (mannaAmount * MANNA_PRICE) / (10 ** 18);
        require(address(this).balance >= ethAmount, "Contract lacks sufficient Ether");

        _burn(msg.sender, mannaAmount);

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
        ethBalance = address(this).balance;
    }
    receive() external payable {
        if (msg.value > 0) {
            buyManna();
        }
    }
}