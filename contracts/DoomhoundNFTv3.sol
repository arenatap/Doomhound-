// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title DoomhoundNFTv3 — Hounds of the Hell
 * @notice NFT Collection on Avalanche — Identical to v2 but with improved security
 * 
 * Features:
 * - Max 100 supply
 * - Paid mint at 0.69 AVAX (configurable)
 * - Free mint with ECDSA signature verification
 * - Admin mint for airdrops
 * - Burn function for NFT owners
 * - Reveal mechanism (unrevealed → revealed baseURI)
 * - Withdraw for owner
 * - Signer separate from owner (best practice)
 */
contract DoomhoundNFTv3 is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ===== Constants =====
    uint256 public constant MAX_SUPPLY = 100;

    // ===== State Variables =====
    uint256 private _nextTokenId = 1; // Start from 1 like v2
    uint256 public paidMintPrice = 0.69 ether;

    bool public freeMintActive = false;
    bool public paidMintActive = false;
    bool public revealed = false;

    string private _baseURIExtended;
    string private _notRevealedURI;

    address public signer;

    // Track free mint claims per address
    mapping(address => uint256) public freeMintClaimed;
    mapping(address => uint256) public nonces;

    // ===== Events =====
    event NFTMinted(address indexed minter, uint256 indexed tokenId, string mintType);
    event NFTBurned(address indexed burner, uint256 indexed tokenId);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event Withdrawn(address indexed to, uint256 amount);

    // ===== Constructor =====
    constructor(
        address initialSigner,
        string memory notRevealedURI
    ) ERC721("Hounds of the Hell", "HOTH") Ownable(msg.sender) {
        require(initialSigner != address(0), "Signer cannot be zero address");
        signer = initialSigner;
        _notRevealedURI = notRevealedURI;
    }

    // ===== Mint Functions =====

    /**
     * @notice Free mint with ECDSA signature from backend signer
     * @param nonce The nonce for this address (from contract state)
     * @param signature The ECDSA signature from the backend signer
     */
    function claimFreeMint(uint256 nonce, bytes calldata signature) external {
        require(freeMintActive, "Free mint is not active");
        require(totalSupply() < MAX_SUPPLY, "Max supply reached");

        // Verify the signature: sign(keccak256(abi.encodePacked(msg.sender, nonce)))
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedHash.recover(signature);
        require(recoveredSigner == signer, "Invalid signature");

        // Verify nonce matches current contract nonce
        require(nonce == nonces[msg.sender], "Invalid nonce");

        // Increment nonce and free mint count
        nonces[msg.sender]++;
        freeMintClaimed[msg.sender]++;

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, "free");
    }

    /**
     * @notice Paid mint at current paidMintPrice
     */
    function paidMint() external payable {
        require(paidMintActive, "Paid mint is not active");
        require(totalSupply() < MAX_SUPPLY, "Max supply reached");
        require(msg.value >= paidMintPrice, "Insufficient AVAX");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        emit NFTMinted(msg.sender, tokenId, "paid");
    }

    /**
     * @notice Admin mint for airdrops — only owner
     * @param to Address to mint to
     * @param quantity Number of NFTs to mint
     */
    function adminMint(address to, uint256 quantity) external onlyOwner {
        require(totalSupply() + quantity <= MAX_SUPPLY, "Exceeds max supply");
        require(to != address(0), "Cannot mint to zero address");

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            emit NFTMinted(to, tokenId, "admin");
        }
    }

    // ===== Burn Function =====

    /**
     * @notice Burn an NFT you own
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external {
        require(ownerOf(tokenId) == msg.sender, "You do not own this NFT");
        _burn(tokenId);
        emit NFTBurned(msg.sender, tokenId);
    }

    // ===== Owner Functions =====

    function setBaseURI(string calldata baseURI_) external onlyOwner {
        _baseURIExtended = baseURI_;
    }

    function setNotRevealedURI(string calldata notRevealedURI_) external onlyOwner {
        _notRevealedURI = notRevealedURI_;
    }

    function setSigner(address signer_) external onlyOwner {
        require(signer_ != address(0), "Signer cannot be zero address");
        address oldSigner = signer;
        signer = signer_;
        emit SignerUpdated(oldSigner, signer_);
    }

    function setFreeMintActive(bool active) external onlyOwner {
        freeMintActive = active;
    }

    function setPaidMintActive(bool active) external onlyOwner {
        paidMintActive = active;
    }

    function setPaidMintPrice(uint256 price) external onlyOwner {
        paidMintPrice = price;
    }

    function reveal() external onlyOwner {
        revealed = true;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        emit Withdrawn(owner(), balance);
    }

    // ===== Overrides =====

    function _baseURI() internal view override returns (string memory) {
        return _baseURIExtended;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        require(ownerOf(tokenId) != address(0), "Token does not exist");

        if (!revealed) {
            return _notRevealedURI;
        }

        string memory base = _baseURI();
        return string(abi.encodePacked(base, Strings.toString(tokenId), ".json"));
    }

    // The following functions are overrides required by Solidity
    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function maxSupply() public pure returns (uint256) {
        return MAX_SUPPLY;
    }

    // ===== Receive AVAX =====
    receive() external payable {}
}
