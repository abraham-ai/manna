// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MannaToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * (10 ** 18);
    uint256 public constant MANNA_PRICE = 0.0001 ether;

    event Praised(address indexed user, uint256 indexed creationId, uint256 amount);
    event Burned(address indexed user, uint256 indexed creationId, uint256 amount);
    event Blessed(address indexed user, uint256 indexed creationId, string comment);
    event BoughtManna(address indexed buyer, uint256 amount);
    event SoldManna(address indexed seller, uint256 mannaAmount, uint256 ethAmount);

    constructor(address initialOwner) ERC20("Manna", "MANNA") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function praise(uint256 creationId, uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Not enough Manna");
        _transfer(msg.sender, owner(), amount);
        emit Praised(msg.sender, creationId, amount);
    }

    function burn(uint256 creationId, uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "Not enough Manna");
        _transfer(msg.sender, owner(), amount);
        emit Burned(msg.sender, creationId, amount);
    }

    function bless(uint256 creationId, string calldata comment) external {
        emit Blessed(msg.sender, creationId, comment);
    }

    function createArt(uint256 amount) external onlyOwner {
        require(balanceOf(msg.sender) >= amount, "Not enough Manna to create art");
        _burn(msg.sender, amount);
        // Logic for Abraham to create art can be implemented here
    }

    function buyManna() external payable {
        require(msg.value >= MANNA_PRICE, "Insufficient Ether to buy Manna");
        uint256 mannaAmount = (msg.value / MANNA_PRICE) * (10 ** 18);
        require(totalSupply() + mannaAmount <= INITIAL_SUPPLY, "Not enough Manna available");
        _mint(msg.sender, mannaAmount);
        emit BoughtManna(msg.sender, mannaAmount);
    }

    function sellManna(uint256 mannaAmount) external {
        require(balanceOf(msg.sender) >= mannaAmount, "Not enough Manna to sell");
        uint256 ethAmount = (mannaAmount / (10 ** 18)) * MANNA_PRICE;
        require(address(this).balance >= ethAmount, "Contract does not have enough Ether");
        _burn(msg.sender, mannaAmount);
        payable(msg.sender).transfer(ethAmount);
        emit SoldManna(msg.sender, mannaAmount, ethAmount);
    }
    
    receive() external payable {
        this.buyManna{value: msg.value}();
    }
}
