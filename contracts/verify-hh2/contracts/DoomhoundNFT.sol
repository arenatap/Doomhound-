// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract DoomhoundNFT is ERC721, ERC721Enumerable, ERC721URIStorage, Ownable {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 100;
    uint256 public constant MAX_FREE_PER_WALLET = 1;
    uint256 public constant MAX_TOKEN_PER_WALLET = 1;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    IERC20 public doomhoundToken;
    address public signer;
    uint256 public paidMintPrice;
    uint256 public tokenMintPrice;
    string private _unrevealedURI;
    string public provenanceHash;
    bool public revealed;
    bool public freeMintActive;
    bool public mintActive;

    mapping(address => bool) public freeMintClaimed;
    mapping(bytes32 => bool) public usedSignatures;

    event FreeMint(address indexed minter, uint256 tokenId);
    event PaidMint(address indexed minter, uint256 tokenId, uint256 quantity);
    event TokenMint(address indexed minter, uint256 tokenId, uint256 burnAmount);
    event Revealed(string baseURI);
    event ProvenanceSet(string hash);

    error SoldOut();
    error InvalidSignature();
    error SignatureAlreadyUsed();
    error InsufficientPayment();

    constructor(
        address _initialOwner,
        address _doomhoundToken,
        string memory _baseURI,
        string memory _unrevealedImageURI
    ) ERC721("Hounds of the Hell", "HOTH") Ownable(_initialOwner) {
        doomhoundToken = IERC20(_doomhoundToken);
        _unrevealedURI = _unrevealedImageURI;
        paidMintPrice = 0.69 ether;
        tokenMintPrice = 11_000_000 * 10**18;
        signer = _initialOwner;
    }

    function freeMint(bytes calldata _signature) external {
        require(freeMintActive, "Free minting not active");
        if (totalSupply() >= MAX_SUPPLY) revert SoldOut();
        if (freeMintClaimed[msg.sender]) revert("Free mint already claimed");

        bytes32 hash = keccak256(abi.encodePacked(msg.sender));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(hash);
        address recovered = ECDSA.recover(ethSignedHash, _signature);
        if (recovered != signer) revert InvalidSignature();
        if (usedSignatures[hash]) revert SignatureAlreadyUsed();

        usedSignatures[hash] = true;
        freeMintClaimed[msg.sender] = true;

        uint256 tokenId = totalSupply() + 1;
        _safeMint(msg.sender, tokenId);

        emit FreeMint(msg.sender, tokenId);
    }

    function mintPaid(uint256 _quantity) external payable {
        require(mintActive, "Minting not active");
        if (totalSupply() + _quantity > MAX_SUPPLY) revert SoldOut();
        if (msg.value < paidMintPrice * _quantity) revert InsufficientPayment();

        for (uint256 i = 0; i < _quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);
            emit PaidMint(msg.sender, tokenId, _quantity);
        }
    }

    function mintWithToken(uint256 _quantity) external {
        require(mintActive, "Minting not active");
        if (totalSupply() + _quantity > MAX_SUPPLY) revert SoldOut();

        uint256 totalCost = tokenMintPrice * _quantity;
        require(doomhoundToken.transferFrom(msg.sender, BURN_ADDRESS, totalCost), "Burn transfer failed");

        for (uint256 i = 0; i < _quantity; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(msg.sender, tokenId);
            emit TokenMint(msg.sender, tokenId, tokenMintPrice);
        }
    }

    function adminMint(address _to, uint256 _amount) external onlyOwner {
        require(totalSupply() + _amount <= MAX_SUPPLY, "Exceeds max supply");
        for (uint256 i = 0; i < _amount; i++) {
            uint256 tokenId = totalSupply() + 1;
            _safeMint(_to, tokenId);
        }
    }

    function reveal(string calldata _baseURI) external onlyOwner {
        _baseURI = _baseURI;
        revealed = true;
        emit Revealed(_baseURI);
    }

    function setProvenanceHash(string calldata _hash) external onlyOwner {
        provenanceHash = _hash;
        emit ProvenanceSet(_hash);
    }

    function setFreeMintActive(bool _active) external onlyOwner {
        freeMintActive = _active;
    }

    function setMintActive(bool _active) external onlyOwner {
        mintActive = _active;
    }

    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    function setPaidMintPrice(uint256 _price) external onlyOwner {
        paidMintPrice = _price;
    }

    function setTokenMintPrice(uint256 _price) external onlyOwner {
        tokenMintPrice = _price;
    }

    function setUnrevealedURI(string calldata _uri) external onlyOwner {
        _unrevealedURI = _uri;
    }

    function unrevealedURI() external view returns (string memory) {
        return _unrevealedURI;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        _requireOwned(tokenId);

        if (!revealed) {
            return _unrevealedURI;
        }

        return super.tokenURI(tokenId);
    }

    function _update(address to, uint256 tokenId, address auth) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
