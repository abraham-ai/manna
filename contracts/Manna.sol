// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Manna is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * (10 ** 18);
    uint256 public constant MANNA_PRICE = 0.0001 ether;

    event BoughtManna(address indexed buyer, uint256 amount);
    event SoldManna(address indexed seller, uint256 mannaAmount, uint256 ethAmount);

    constructor(address initialOwner) ERC20("Manna", "MANNA") Ownable(initialOwner) {
        uint256 initialOwnerSupply = INITIAL_SUPPLY / 2;
        _mint(initialOwner, initialOwnerSupply);
    }

    function buyManna() external payable {
        require(msg.value >= MANNA_PRICE, "Insufficient Ether");
        uint256 mannaAmount = (msg.value * (10 ** 18)) / MANNA_PRICE;
        require(totalSupply() + mannaAmount <= INITIAL_SUPPLY, "Manna supply cap reached");

        _mint(msg.sender, mannaAmount);
        emit BoughtManna(msg.sender, mannaAmount);
    }

    function sellManna(uint256 mannaAmount) external {
        require(balanceOf(msg.sender) >= mannaAmount, "Not enough Manna");
        uint256 ethAmount = (mannaAmount * MANNA_PRICE) / (10 ** 18);
        require(address(this).balance >= ethAmount, "Contract lacks Ether");

        _burn(msg.sender, mannaAmount);

        (bool sent, ) = msg.sender.call{value: ethAmount}("");
        require(sent, "Failed to send Ether");

        emit SoldManna(msg.sender, mannaAmount, ethAmount);
    }

    function getContractBalances() external view returns (uint256 mannaBalance, uint256 ethBalance) {
        mannaBalance = balanceOf(address(this));
        ethBalance = address(this).balance;
    }

    receive() external payable {
        this.buyManna{value: msg.value}();
    }

    function burnFrom(address account, uint256 amount) external {
        require(balanceOf(account) >= amount, "Not enough Manna to create art");
        _burn(account, amount);
    }
}