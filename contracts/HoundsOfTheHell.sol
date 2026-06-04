// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

/**
 * @title HoundsOfTheHell (HOTH)
 * @dev NFT collection on Avalanche C-Chain — 100 max supply
 *      - claimFreeMint: free mint with EIP-191 signature verification
 *      - mintPaid: paid mint in AVAX
 *      - mintWithToken: mint using $DOOMHOUND ERC-20 token
 *      - adminMint: owner airdrop function
 */
contract HoundsOfTheHell is ERC721, ERC721URIStorage, ERC721Burnable, Ownable, ReentrancyGuard {
    using Strings for uint256;

    // ===== CONSTANTS =====
    uint256 public constant MAX_SUPPLY = 100;

    // ===== PRICING =====
    uint256 public mintPrice = 0.5 ether;           // AVAX per NFT
    uint256 public tokenMintCost = 1_000_000e18;    // 1M $DOOMHOUND per NFT

    // ===== SUPPLY TRACKING =====
    uint256 private _nextTokenId = 1;

    // ===== METADATA =====
    string private _baseTokenURI;
    string private _unrevealedURI;
    bool public revealed = false;

    // ===== FREE MINT =====
    address public signer;                           // EIP-191 signer address
    mapping(address => bool) public freeMintClaimed; // Track claimed free mints

    // ===== TOKEN MINT =====
    address public doomhoundToken;                   // $DOOMHOUND ERC-20 contract

    // ===== EVENTS =====
    event FreeMintClaimed(address indexed claimer, uint256 tokenId);
    event PaidMint(address indexed minter, uint256 quantity, uint256 totalPrice);
    event TokenMint(address indexed minter, uint256 quantity);
    event AdminMint(address indexed to, uint256 quantity);
    event Revealed(bool status);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event MintPriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TokenMintCostUpdated(uint256 oldCost, uint256 newCost);
    event Withdrawn(address indexed to, uint256 amount);

    // ===== ERRORS =====
    error SoldOut();
    error InsufficientPayment();
    error FreeMintAlreadyClaimed();
    error InvalidSignature();
    error ExceedsMaxSupply();

    constructor(
        address _signer,
        address _doomhoundToken,
        string memory _initialBaseURI,
        string memory _initialUnrevealedURI
    ) ERC721("Hounds of the Hell", "HOTH") Ownable(msg.sender) {
        signer = _signer;
        doomhoundToken = _doomhoundToken;
        _baseTokenURI = _initialBaseURI;
        _unrevealedURI = _initialUnrevealedURI;
    }

    // ===== MODIFIERS =====
    modifier notSoldOut(uint256 quantity) {
        if (_nextTokenId - 1 + quantity > MAX_SUPPLY) revert SoldOut();
        _;
    }

    // ===== FREE MINT =====
    /**
     * @dev Claim a free NFT with EIP-191 signature verification.
     *      Signer signs: keccak256(abi.encodePacked(msg.sender, nonce))
     *      Server signs with NFT_SIGNER_PRIVATE_KEY
     */
    function claimFreeMint(
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant notSoldOut(1) {
        if (freeMintClaimed[msg.sender]) revert FreeMintAlreadyClaimed();

        // Verify EIP-191 signature
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, nonce));
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        address recoveredSigner = ECDSA.recover(ethSignedHash, signature);
        if (recoveredSigner != signer) revert InvalidSignature();

        freeMintClaimed[msg.sender] = true;
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        emit FreeMintClaimed(msg.sender, tokenId);
    }

    // ===== PAID MINT (AVAX) =====
    /**
     * @dev Mint NFTs by paying AVAX. Refunds excess payment.
     */
    function mintPaid(
        uint256 quantity
    ) external payable nonReentrant notSoldOut(quantity) {
        uint256 totalCost = mintPrice * quantity;
        if (msg.value < totalCost) revert InsufficientPayment();

        // Refund excess payment
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - totalCost}("");
            require(refundSuccess, "Refund failed");
        }

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }

        emit PaidMint(msg.sender, quantity, totalCost);
    }

    // ===== TOKEN MINT ($DOOMHOUND) =====
    /**
     * @dev Mint NFTs by burning $DOOMHOUND tokens.
     *      Tokens are transferred FROM the minter TO this contract.
     */
    function mintWithToken(
        uint256 quantity
    ) external nonReentrant notSoldOut(quantity) {
        uint256 totalCost = tokenMintCost * quantity;

        IERC20(doomhoundToken).transferFrom(
            msg.sender,
            address(this),
            totalCost
        );

        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(msg.sender, tokenId);
        }

        emit TokenMint(msg.sender, quantity);
    }

    // ===== ADMIN MINT (AIRDROP) =====
    /**
     * @dev Owner mints NFTs to specified addresses (for airdrop).
     */
    function adminMint(
        address to,
        uint256 quantity
    ) external onlyOwner notSoldOut(quantity) {
        for (uint256 i = 0; i < quantity; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
        }

        emit AdminMint(to, quantity);
    }

    // ===== BATCH ADMIN MINT =====
    /**
     * @dev Batch airdrop: mint different quantities to different addresses.
     */
    function adminMintBatch(
        address[] calldata recipients,
        uint256[] calldata quantities
    ) external onlyOwner {
        require(recipients.length == quantities.length, "Array length mismatch");

        uint256 totalToMint = 0;
        for (uint256 i = 0; i < quantities.length; i++) {
            totalToMint += quantities[i];
        }
        if (_nextTokenId - 1 + totalToMint > MAX_SUPPLY) revert ExceedsMaxSupply();

        for (uint256 i = 0; i < recipients.length; i++) {
            for (uint256 j = 0; j < quantities[i]; j++) {
                uint256 tokenId = _nextTokenId++;
                _safeMint(recipients[i], tokenId);
            }
        }
    }

    // ===== METADATA =====
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return _unrevealedURI;
        }

        string memory baseURI = _baseTokenURI;
        return
            bytes(baseURI).length > 0
                ? string(abi.encodePacked(baseURI, tokenId.toString(), ".json"))
                : "";
    }

    // ===== OWNER FUNCTIONS =====
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
    }

    function setUnrevealedURI(string calldata newUnrevealedURI) external onlyOwner {
        _unrevealedURI = newUnrevealedURI;
    }

    function setRevealed(bool status) external onlyOwner {
        revealed = status;
        emit Revealed(status);
    }

    function setSigner(address newSigner) external onlyOwner {
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = mintPrice;
        mintPrice = newPrice;
        emit MintPriceUpdated(oldPrice, newPrice);
    }

    function setTokenMintCost(uint256 newCost) external onlyOwner {
        uint256 oldCost = tokenMintCost;
        tokenMintCost = newCost;
        emit TokenMintCostUpdated(oldCost, newCost);
    }

    function setDoomhoundToken(address newToken) external onlyOwner {
        doomhoundToken = newToken;
    }

    // ===== WITHDRAW =====
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No AVAX to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");

        emit Withdrawn(owner(), balance);
    }

    // ===== VIEW FUNCTIONS =====
    function totalMinted() external view returns (uint256) {
        return _nextTokenId - 1;
    }

    function remainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - (_nextTokenId - 1);
    }

    // ===== OVERRIDES =====
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

// ===== ECDSA HELPER (inline to avoid import issues) =====
library ECDSA {
    function recover(
        bytes32 hash,
        bytes calldata signature
    ) internal pure returns (address) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }

        if (v < 27) {
            v += 27;
        }
        require(v == 27 || v == 28, "Invalid signature v value");

        return ecrecover(hash, v, r, s);
    }
}
