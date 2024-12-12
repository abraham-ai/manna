// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MannaToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1000000 * (10 ** 18);
    uint256 public constant MANNA_PRICE = 0.0001 ether;

    event BoughtManna(address indexed buyer, uint256 amount);
    event SoldManna(address indexed seller, uint256 mannaAmount, uint256 ethAmount);

    constructor(address initialOwner) ERC20("Manna", "MANNA") Ownable(initialOwner) {
        uint256 initialOwnerSupply = INITIAL_SUPPLY / 2;
        _mint(initialOwner, initialOwnerSupply);
        // The rest can be minted via buyManna until cap is reached
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

    /**
     * @dev Allow another contract (like Abraham) to burn tokens on behalf of a user
     * The user must have approved at least `amount` to `msg.sender` (the Abraham contract).
     */
    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = allowance(account, msg.sender);
        require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
        // Decrease allowance before burning, to prevent double spending
        _approve(account, msg.sender, currentAllowance - amount);
        _burn(account, amount);
    }
}
