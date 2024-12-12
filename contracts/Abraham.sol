// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

interface IMannaToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    // no direct call to transfer to zero, we use burnFrom now
}

contract Abraham is ERC1155, Ownable {
    address public mannaToken;
    uint256 public creationCounter;
    uint256 public endTimestamp;

    uint256 public minimumMannaSpend = 1e18;

    struct CreationData {
        uint256 praises;
        uint256 burns;
        uint256 blessings;
        uint256 totalMannaSpent;
    }

    struct UserStats {
        uint256 praiseCount;
        uint256 praiseMannaSpent;
        uint256 burnCount;
        uint256 burnMannaSpent;
    }

    mapping(uint256 => CreationData) public creations;
    mapping(uint256 => mapping(address => UserStats)) public userParticipation;

    event CreationReleased(uint256 indexed creationId);
    event Praised(uint256 indexed creationId, address indexed user, uint256 amount);
    event Burned(uint256 indexed creationId, address indexed user, uint256 amount);
    event Blessed(uint256 indexed creationId, address indexed user, uint256 amount);

    constructor(address _mannaToken, string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        mannaToken = _mannaToken;
        endTimestamp = block.timestamp + (13 * 365 days);
    }

    modifier notEnded() {
        require(block.timestamp < endTimestamp, "Contract expired");
        _;
    }

    function setMinimumMannaSpend(uint256 newMin) external onlyOwner {
        minimumMannaSpend = newMin;
    }

    function releaseCreation() external onlyOwner notEnded {
        creationCounter += 1;
        emit CreationReleased(creationCounter);
    }

    function _spendManna(uint256 amount) internal {
        require(amount >= minimumMannaSpend, "Spend more Manna");
        // Instead of transferFrom to zero, we call burnFrom on Manna
        // User must have approved Abraham contract in MannaToken for at least `amount`.
        (bool success, ) = mannaToken.call(
            abi.encodeWithSignature("burnFrom(address,uint256)", msg.sender, amount)
        );
        require(success, "Manna burn failed");
    }

    function praise(uint256 creationId, uint256 amount) external notEnded {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creation");
        _spendManna(amount);

        creations[creationId].praises += 1;
        creations[creationId].totalMannaSpent += amount;

        userParticipation[creationId][msg.sender].praiseCount += 1;
        userParticipation[creationId][msg.sender].praiseMannaSpent += amount;

        _mint(msg.sender, creationId, amount, "");
        emit Praised(creationId, msg.sender, amount);
    }

    function burnCreation(uint256 creationId, uint256 amount) external notEnded {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creation");
        _spendManna(amount);

        creations[creationId].burns += 1;
        creations[creationId].totalMannaSpent += amount;

        userParticipation[creationId][msg.sender].burnCount += 1;
        userParticipation[creationId][msg.sender].burnMannaSpent += amount;

        _mint(msg.sender, creationId, amount, "");
        emit Burned(creationId, msg.sender, amount);
    }

    function bless(uint256 creationId, uint256 amount) external notEnded {
        require(creationId > 0 && creationId <= creationCounter, "Invalid creation");
        _spendManna(amount);

        creations[creationId].blessings += 1;
        creations[creationId].totalMannaSpent += amount;

        _mint(msg.sender, creationId, amount, "");
        emit Blessed(creationId, msg.sender, amount);
    }

    function setMannaToken(address _mannaToken) external onlyOwner notEnded {
        mannaToken = _mannaToken;
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}
