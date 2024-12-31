// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AbrahamNFT
 * @dev One-of-one ERC-721 NFT for each creation, owned by Abraham contract after testing setup.
 */
contract AbrahamNFT is ERC721URIStorage, Ownable  {
    string private _baseTokenURI;

    constructor(address initialOwner, string memory baseURI) ERC721("Abraham NFT", "ABR") Ownable(initialOwner) {
        _baseTokenURI = baseURI;
    }

    function mintCreationNFT(address to, uint256 creationId,  string memory tokenUri) external onlyOwner {
        _safeMint(to, creationId);
        _setTokenURI(creationId, tokenUri);
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
}
