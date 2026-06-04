// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 *  _____                   _____ _           _   _       _   
 * |  __ \                 |  __ \ |         | | | |     | |  
 * | |  | | ___   ___ ___  | |  | | |__  _   _| |_| |__   | |_ 
 * | |  | |/ _ \ / __/ __| | |  | | '_ \| | | | __| '_ \  | __|
 * | |__| | (_) | (__\__ \ | |__| | |_) | |_| | |_| | | | | |_ 
 * |_____/ \___/ \___|___/ |_____/|_.__/ \__,_|\__|_| |_|  \__|
 *
 * DOOMHOUND NFT Collection v2 — 100 unique hounds on Avalanche
 * 
 * Features:
 * - Free mint with backend signature verification (whitelist via Arena handle)
 * - Paid mint at configurable price (0.69 AVAX default)
 * - Token mint: burn $DOOMHOUND tokens to 0xdead (11M default)
 * - Random reveal via seed
 * - Max 2 per wallet for paid mint, 1 per wallet for free/token mint
 * - Admin functions for airdrops and metadata management
 */

contract DoomhoundNFTv2 is ERC721, ERC721Enumerable, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ===== CONSTANTS =====
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant MAX_PAID_PER_WALLET = 2;
    uint256 public constant MAX_FREE_PER_WALLET = 1;
    uint256 public constant MAX_TOKEN_PER_WALLET = 1;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    // ===== STATE =====
    uint256 public paidMintPrice = 0.69 ether;
    uint256 public tokenMintPrice = 11_000_000 * 10**18; // 11M $DOOMHOUND (18 decimals)
    
    // $DOOMHOUND ERC-20 token
    IERC20 public doomhoundToken;
    
    // Metadata
    string private _baseTokenURI;
    string public unrevealedURI;
    bool public revealed = false;

    // Minting state
    bool public freeMintActive = false;
    bool public paidMintActive = false;
    bool public tokenMintActive = false;

    // Backend signer address — verifies whitelist signatures
    address public signer;

    // Track claims
    mapping(address => uint256) public freeMintClaimed;
    mapping(address => uint256) public paidMintClaimed;
    mapping(address => uint256) public tokenMintClaimed;
    
    // Used signatures (prevent replay attacks)
    mapping(bytes32 => bool) public usedSignatures;

    // ===== EVENTS =====
    event FreeMint(address indexed to, uint256 tokenId);
    event PaidMint(address indexed to, uint256 tokenId, uint256 price);
    event TokenMint(address indexed to, uint256 tokenId, uint256 tokenAmount);
    event BaseURIUpdated(string newBaseURI);
    event SignerUpdated(address newSigner);
    event Revealed(string revealedURI);
    event TokenMintPriceUpdated(uint256 newPrice);

    // ===== ERRORS =====
    error SoldOut();
    error FreeMintNotActive();
    error PaidMintNotActive();
    error TokenMintNotActive();
    error AlreadyClaimedFree();
    error PaidMintLimitExceeded();
    error TokenMintLimitExceeded();
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error InsufficientPayment();
    error TokenTransferFailed();
    error NotRevealed();

    // ===== CONSTRUCTOR =====
    constructor(
        address initialSigner,
        address initialTokenAddress,
        string memory initialBaseURI,
        string memory initialUnrevealedURI
    ) ERC721("Hounds of the Hell", "HOTH") Ownable(msg.sender) {
        signer = initialSigner;
        doomhoundToken = IERC20(initialTokenAddress);
        _baseTokenURI = initialBaseURI;
        unrevealedURI = initialUnrevealedURI;
    }

    // ===== FREE MINT (Whitelist with signature) =====
    /**
     * @dev Mint a free NFT with a backend-signed signature.
     * The backend verifies the Arena handle is whitelisted and signs:
     * keccak256(abi.encodePacked(wallet, nonce))
     * 
     * @param nonce      Unique nonce from the backend (prevents replay)
     * @param signature  Backend's ECDSA signature
     */
    function claimFreeMint(
        uint256 nonce,
        bytes calldata signature
    ) external {
        if (!freeMintActive) revert FreeMintNotActive();
        if (totalSupply() >= MAX_SUPPLY) revert SoldOut();
        if (freeMintClaimed[msg.sender] >= MAX_FREE_PER_WALLET) revert AlreadyClaimedFree();

        // Verify signature: signer signed keccak256(wallet + nonce)
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce)).toEthSignedMessageHash();
        
        // Check signature hasn't been used
        bytes32 sigKey = keccak256(signature);
        if (usedSignatures[sigKey]) revert SignatureAlreadyUsed();

        if (hash.recover(signature) != signer) revert InvalidSignature();

        // Mark signature as used
        usedSignatures[sigKey] = true;
        freeMintClaimed[msg.sender]++;

        uint256 tokenId = totalSupply() + 1;
        _safeMint(msg.sender, tokenId);

        emit FreeMint(msg.sender, tokenId);
    }

    // ===== PAID MINT (AVAX) =====
    /**
     * @dev Mint an NFT by paying the mint price in AVAX.
     * @param quantity  Number of NFTs to mint (max 2 per wallet)
     */
    function mintPaid(uint256 quantity) external payable {
        if (!paidMintActive) revert PaidMintNotActive();
        if (totalSupply() + quantity > MAX_SUPPLY) revert SoldOut();
        if (paidMintClaimed[msg.sender] + quantity > MAX_PAID_PER_WALLET) revert PaidMintLimitExceeded();
        if (msg.value < paidMintPrice * quantity) revert InsufficientPayment();

        paidMintClaimed[msg.sender] += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);
            emit PaidMint(msg.sender, tokenId, paidMintPrice);
        }
    }

    // ===== TOKEN MINT (Burn $DOOMHOUND to 0xdead) =====
    /**
     * @dev Mint an NFT by burning $DOOMHOUND tokens.
     * Tokens are transferred from the user to the 0xdead burn address.
     * Max 1 NFT per wallet for token mint.
     * @param quantity  Number of NFTs to mint (max 1 per wallet)
     */
    function mintWithToken(uint256 quantity) external {
        if (!tokenMintActive) revert TokenMintNotActive();
        if (totalSupply() + quantity > MAX_SUPPLY) revert SoldOut();
        if (tokenMintClaimed[msg.sender] + quantity > MAX_TOKEN_PER_WALLET) revert TokenMintLimitExceeded();

        uint256 totalCost = tokenMintPrice * quantity;

        // Transfer tokens from user to 0xdead (burn)
        bool success = doomhoundToken.transferFrom(msg.sender, BURN_ADDRESS, totalCost);
        if (!success) revert TokenTransferFailed();

        tokenMintClaimed[msg.sender] += quantity;

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);
            emit TokenMint(msg.sender, tokenId, tokenMintPrice);
        }
    }

    // ===== ADMIN MINT (for giveaways/team) =====
    function adminMint(address to, uint256 quantity) external onlyOwner {
        if (totalSupply() + quantity > MAX_SUPPLY) revert SoldOut();

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(to, tokenId);
        }
    }

    // ===== ADMIN FUNCTIONS =====

    function setFreeMintActive(bool active) external onlyOwner {
        freeMintActive = active;
    }

    function setPaidMintActive(bool active) external onlyOwner {
        paidMintActive = active;
    }

    function setTokenMintActive(bool active) external onlyOwner {
        tokenMintActive = active;
    }

    function setPaidMintPrice(uint256 newPrice) external onlyOwner {
        paidMintPrice = newPrice;
    }

    function setTokenMintPrice(uint256 newPrice) external onlyOwner {
        tokenMintPrice = newPrice;
        emit TokenMintPriceUpdated(newPrice);
    }

    function setDoomhoundToken(address newToken) external onlyOwner {
        doomhoundToken = IERC20(newToken);
    }

    function setSigner(address newSigner) external onlyOwner {
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setUnrevealedURI(string calldata newUnrevealedURI) external onlyOwner {
        unrevealedURI = newUnrevealedURI;
    }

    function reveal(string calldata revealedURI_) external onlyOwner {
        revealed = true;
        unrevealedURI = revealedURI_;
        emit Revealed(revealedURI_);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    // ===== OVERRIDES =====

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return unrevealedURI;
        }

        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId), ".json"));
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
