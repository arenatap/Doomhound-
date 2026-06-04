// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title DoomhoundNFT - Hounds of the Hell
 * @dev NFT Collection on Avalanche C-Chain
 *      MAX_SUPPLY = 100
 *      Features: Free Mint (whitelist), Paid Mint, Burn Mint (11M $DOOMHOUND),
 *                Admin Mint, Admin Mint Token (specific ID), Admin Mint Token Batch
 */
contract DoomhoundNFT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // ========== Constants ==========
    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant MINT_PRICE = 0.5 ether;          // Paid mint price in AVAX
    uint256 public constant BURN_AMOUNT = 11_000_000 * 10**18; // 11M $DOOMHOUND (18 decimals)
    uint256 public constant MAX_PAID_PER_WALLET = 2;
    uint256 public constant MAX_FREE_PER_WALLET = 1;

    // ========== State ==========
    address public signer;                  // ECDSA signer for free mint signatures
    string  private _baseURI;               // Revealed metadata base URI
    string  private _unrevealedURI;         // Unrevealed metadata URI
    bool    public freeMintActive = false;
    bool    public paidMintActive = false;
    bool    public burnMintActive = false;
    bool    public revealed = false;
    uint256 public totalFreeMinted = 0;
    uint256 public totalFreeMintAllowed = 10; // Only 10 free mints

    // Track mints per wallet
    mapping(address => uint256) public freeMintCount;
    mapping(address => uint256) public paidMintCount;
    mapping(address => uint256) public burnMintCount;

    // $DOOMHOUND token address for burn verification
    address public doomhoundToken;

    // ========== Events ==========
    event FreeMintClaimed(address indexed to, uint256 tokenId);
    event PaidMint(address indexed to, uint256 tokenId, uint256 price);
    event BurnMint(address indexed to, uint256 tokenId, bytes32 burnTxHash);
    event AdminMinted(address indexed to, uint256 tokenId);
    event AdminMintedToken(address indexed to, uint256 tokenId);
    event AdminMintedTokenBatch(address indexed to, uint256[] tokenIds);
    event URIsUpdated(string baseURI, string unrevealedURI);
    event MintStatusChanged(bool freeMint, bool paidMint, bool burnMint);
    event SignerUpdated(address indexed newSigner);
    event DoomhoundTokenUpdated(address indexed newToken);

    // ========== Constructor ==========
    constructor(
        address _signer,
        address _doomhoundToken
    ) ERC721("Hounds of the Hell", "HOTH") Ownable(msg.sender) {
        require(_signer != address(0), "Invalid signer");
        require(_doomhoundToken != address(0), "Invalid token");
        signer = _signer;
        doomhoundToken = _doomhoundToken;
    }

    // ========== Modifiers ==========
    modifier onlyWhenFreeMintActive() {
        require(freeMintActive, "Free mint not active");
        _;
    }

    modifier onlyWhenPaidMintActive() {
        require(paidMintActive, "Paid mint not active");
        _;
    }

    modifier onlyWhenBurnMintActive() {
        require(burnMintActive, "Burn mint not active");
        _;
    }

    // ========== Internal ==========
    function _baseURI() internal view override returns (string memory) {
        return _baseURI;
    }

    /**
     * @dev Override tokenURI to return unrevealed URI when not revealed
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return _unrevealedURI;
        }

        string memory base = _baseURI;
        return bytes(base).length > 0
            ? string(abi.encodePacked(base, _toString(tokenId), ".json"))
            : "";
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // ========== Free Mint (Whitelist with ECDSA signature) ==========
    /**
     * @notice Claim a free mint NFT. Requires a valid signature from the signer.
     * @param signature ECDSA signature from the signer verifying eligibility
     */
    function claimFreeMint(bytes calldata signature) external onlyWhenFreeMintActive nonReentrant {
        require(totalFreeMinted < totalFreeMintAllowed, "All free mints claimed");
        require(freeMintCount[msg.sender] < MAX_FREE_PER_WALLET, "Already claimed free mint");

        // Verify signature: signer signs keccak256(abi_encode(address, chainId, contract))
        bytes32 hash = keccak256(abi.encodePacked(
            msg.sender,
            block.chainid,
            address(this)
        ));
        bytes32 ethSignedHash = hash.toEthSignedMessageHash();
        require(ethSignedHash.recover(signature) == signer, "Invalid signature");

        uint256 tokenId = totalSupply();
        require(tokenId < MAX_SUPPLY, "Max supply reached");

        freeMintCount[msg.sender]++;
        totalFreeMinted++;
        _safeMint(msg.sender, tokenId);

        emit FreeMintClaimed(msg.sender, tokenId);
    }

    // ========== Paid Mint ==========
    /**
     * @notice Mint an NFT by paying AVAX
     */
    function mintPaid() external payable onlyWhenPaidMintActive nonReentrant {
        require(msg.value >= MINT_PRICE, "Insufficient AVAX");
        require(paidMintCount[msg.sender] < MAX_PAID_PER_WALLET, "Max paid mints reached");
        require(totalSupply() < MAX_SUPPLY, "Max supply reached");

        paidMintCount[msg.sender]++;
        uint256 tokenId = totalSupply();
        _safeMint(msg.sender, tokenId);

        emit PaidMint(msg.sender, tokenId, msg.value);
    }

    // ========== Burn Mint (11M $DOOMHOUND) ==========
    /**
     * @notice Mint an NFT by burning 11M $DOOMHOUND tokens.
     *         The user must have already called transfer() or approve() on the $DOOMHOUND token
     *         to send tokens to a burn address. The backend verifies the burn transaction on-chain,
     *         then calls adminMint to reward the user.
     *
     *         Direct on-chain verification: user calls this with the burn tx hash,
     *         contract verifies the transfer event in that tx.
     * @param burnTxHash The transaction hash where the user burned $DOOMHOUND tokens
     */
    function mintWithToken(bytes32 burnTxHash) external onlyWhenBurnMintActive nonReentrant {
        require(totalSupply() < MAX_SUPPLY, "Max supply reached");
        require(burnMintCount[msg.sender] < 1, "Already burn minted");

        // Verify the burn transaction on-chain
        // The burn tx must be a transfer of BURN_AMOUNT $DOOMHOUND from msg.sender to the burn address (0x0...0)
        bool verified = _verifyBurnTx(burnTxHash, msg.sender);
        require(verified, "Burn verification failed");

        burnMintCount[msg.sender]++;
        uint256 tokenId = totalSupply();
        _safeMint(msg.sender, tokenId);

        emit BurnMint(msg.sender, tokenId, burnTxHash);
    }

    /**
     * @dev Verify that a transaction contains a Transfer event of BURN_AMOUNT $DOOMHOUND
     *      from the claimer to the dead address (0x000000000000000000000000000000000000dEaD)
     */
    function _verifyBurnTx(bytes32 txHash, address claimer) internal view returns (bool) {
        // Get the receipt for the transaction
        // We use assembly to call the standard precompile or we check the logs
        // Since we can't access receipts directly in Solidity, we use a different approach:
        // The backend (API) verifies the burn tx off-chain and calls adminMint instead.
        // This on-chain version is a placeholder that always returns false for security.
        // Use the backend API route for burn mint verification.
        return false;
    }

    // ========== Admin Functions ==========
    /**
     * @notice Admin mint - mint the next available token to a recipient
     */
    function adminMint(address to) external onlyOwner {
        require(totalSupply() < MAX_SUPPLY, "Max supply reached");
        uint256 tokenId = totalSupply();
        _safeMint(to, tokenId);
        emit AdminMinted(to, tokenId);
    }

    /**
     * @notice Admin mint a specific token ID to a recipient (for airdrops)
     */
    function adminMintToken(address to, uint256 tokenId) external onlyOwner {
        require(tokenId > 0 && tokenId <= MAX_SUPPLY, "Invalid token ID");
        require(!_exists(tokenId), "Token already minted");
        _safeMint(to, tokenId);
        emit AdminMintedToken(to, tokenId);
    }

    /**
     * @notice Admin mint multiple specific token IDs to a recipient (for batch airdrops)
     */
    function adminMintTokenBatch(address to, uint256[] calldata tokenIds) external onlyOwner {
        require(tokenIds.length > 0, "Empty token list");
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i] > 0 && tokenIds[i] <= MAX_SUPPLY, "Invalid token ID");
            require(!_exists(tokenIds[i]), "Token already minted");
            _safeMint(to, tokenIds[i]);
        }
        emit AdminMintedTokenBatch(to, tokenIds);
    }

    // ========== Configuration ==========
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        _baseURI = newBaseURI;
    }

    function setUnrevealedURI(string calldata newUnrevealedURI) external onlyOwner {
        _unrevealedURI = newUnrevealedURI;
    }

    function setRevealed(bool _revealed) external onlyOwner {
        revealed = _revealed;
    }

    function setSigner(address _signer) external onlyOwner {
        require(_signer != address(0), "Invalid signer");
        signer = _signer;
        emit SignerUpdated(_signer);
    }

    function setDoomhoundToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token");
        doomhoundToken = _token;
        emit DoomhoundTokenUpdated(_token);
    }

    function setFreeMintActive(bool active) external onlyOwner {
        freeMintActive = active;
        emit MintStatusChanged(freeMintActive, paidMintActive, burnMintActive);
    }

    function setPaidMintActive(bool active) external onlyOwner {
        paidMintActive = active;
        emit MintStatusChanged(freeMintActive, paidMintActive, burnMintActive);
    }

    function setBurnMintActive(bool active) external onlyOwner {
        burnMintActive = active;
        emit MintStatusChanged(freeMintActive, paidMintActive, burnMintActive);
    }

    function setTotalFreeMintAllowed(uint256 _total) external onlyOwner {
        require(_total <= MAX_SUPPLY, "Exceeds max supply");
        totalFreeMintAllowed = _total;
    }

    /**
     * @notice Withdraw contract AVAX balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    // ========== Overrides for ERC721Enumerable ==========
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

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
