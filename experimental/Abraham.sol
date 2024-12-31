// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

interface IMannaToken {
    function burnFrom(address account, uint256 amount) external;
}

interface IAbrahamNFT {
function mintCreationNFT(address to, uint256 creationId,  string memory tokenUri) external;
}

contract Abraham is ERC1155, Ownable {
    address public mannaToken;
    address public abrahamNFT; 
    uint256 public creationCounter;
    uint256 public endTimestamp;

    uint256 public minimumMannaSpend = 1e18;
    string public name;
    string public symbol;

    struct CreationData {
        uint256 praises;
        uint256 burns;
        uint256 blessings;
        uint256 totalMannaSpent;
        string image; // New field for image URL
    }

    struct UserStats {
        uint256 praiseCount;
        uint256 praiseMannaSpent;
        uint256 burnCount;
        uint256 burnMannaSpent;
    }

    mapping(uint256 => CreationData) public creations;
    mapping(uint256 => mapping(address => UserStats)) public userParticipation;

    event CreationReleased(uint256 indexed creationId, string image); // include image in event
    event Praised(uint256 indexed creationId, address indexed user, uint256 amount);
    event Burned(uint256 indexed creationId, address indexed user, uint256 amount);
    event Blessed(uint256 indexed creationId, address indexed user, uint256 amount);

    constructor(address _mannaToken, string memory uri_, address initialOwner) ERC1155(uri_) Ownable(initialOwner) {
        mannaToken = _mannaToken;
        endTimestamp = block.timestamp + (13 * 365 days);
        name = "Abraham ERC1155 Collection";
        symbol = "ABR1155";
    }

    modifier notEnded() {
        require(block.timestamp < endTimestamp, "Contract expired");
        _;
    }

    function setMinimumMannaSpend(uint256 newMin) external onlyOwner {
        minimumMannaSpend = newMin;
    }

    function setAbrahamNFT(address _abrahamNFT) external onlyOwner {
        abrahamNFT = _abrahamNFT;
    }

    function releaseCreation(string memory image) external onlyOwner notEnded {
        creationCounter += 1;

        creations[creationCounter] = CreationData({
            praises: 0,
            burns: 0,
            blessings: 0,
            totalMannaSpent: 0,
            image: image
        });

        emit CreationReleased(creationCounter, image);

        require(abrahamNFT != address(0), "AbrahamNFT not set");
        IAbrahamNFT(abrahamNFT).mintCreationNFT(owner(), creationCounter, image);
    }

    function _spendManna(uint256 amount) internal {
        require(amount >= minimumMannaSpend, "Spend more Manna");
        IMannaToken(mannaToken).burnFrom(msg.sender, amount);
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
