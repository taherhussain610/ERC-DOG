// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AtlasXSecurity.sol";
import "./TRC1155TokenReceiver.sol";

interface IERC1155MarketToken {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;
}

contract AtlasXMarketplace is TRC1155TokenReceiver, Ownable2Step, ReentrancyGuard {
    uint256 public constant FEE_DENOMINATOR = 10_000;
    uint256 public constant MAX_PROTOCOL_FEE_BPS = 1_000;

    struct Listing {
        address token;
        address seller;
        address feeRecipient;
        uint256 tokenId;
        uint256 remaining;
        uint256 unitPrice;
        uint64 expiresAt;
        uint16 feeBps;
        bool active;
    }

    uint256 public nextListingId = 1;
    uint16 public protocolFeeBps;
    address public protocolFeeRecipient;
    bool public paused;
    mapping(uint256 => Listing) public listings;
    mapping(address => uint256) public proceeds;

    address private expectedToken;
    address private expectedFrom;
    uint256 private expectedTokenId;
    uint256 private expectedAmount;

    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed token,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        uint64 expiresAt
    );
    event ListingPurchased(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 totalPrice
    );
    event ListingCancelled(uint256 indexed listingId);
    event ProceedsWithdrawn(address indexed account, uint256 amount);
    event ProtocolFeeUpdated(address indexed recipient, uint16 feeBps);
    event PauseChanged(bool paused);

    modifier whenNotPaused() {
        require(!paused, "Marketplace paused");
        _;
    }

    constructor(address feeRecipient_, uint16 feeBps_) {
        _setProtocolFee(feeRecipient_, feeBps_);
    }

    function createListing(
        address token,
        uint256 tokenId,
        uint256 amount,
        uint256 unitPrice,
        uint64 expiresAt
    ) external nonReentrant whenNotPaused returns (uint256 listingId) {
        require(token.code.length > 0, "Invalid token");
        require(amount > 0 && unitPrice > 0, "Invalid listing");
        require(expiresAt == 0 || expiresAt > block.timestamp, "Invalid expiry");

        IERC1155MarketToken asset = IERC1155MarketToken(token);
        require(asset.isApprovedForAll(msg.sender, address(this)), "Marketplace not approved");

        listingId = nextListingId++;
        listings[listingId] = Listing({
            token: token,
            seller: msg.sender,
            feeRecipient: protocolFeeRecipient,
            tokenId: tokenId,
            remaining: amount,
            unitPrice: unitPrice,
            expiresAt: expiresAt,
            feeBps: protocolFeeBps,
            active: true
        });

        uint256 balanceBefore = asset.balanceOf(address(this), tokenId);
        expectedToken = token;
        expectedFrom = msg.sender;
        expectedTokenId = tokenId;
        expectedAmount = amount;
        asset.safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
        expectedToken = address(0);
        expectedFrom = address(0);
        expectedTokenId = 0;
        expectedAmount = 0;
        require(
            asset.balanceOf(address(this), tokenId) - balanceBefore == amount,
            "Escrow transfer mismatch"
        );

        emit ListingCreated(
            listingId,
            msg.sender,
            token,
            tokenId,
            amount,
            unitPrice,
            expiresAt
        );
    }

    function buy(
        uint256 listingId,
        uint256 amount
    ) external payable nonReentrant whenNotPaused {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing inactive");
        require(amount > 0 && amount <= listing.remaining, "Invalid amount");
        require(
            listing.expiresAt == 0 || block.timestamp <= listing.expiresAt,
            "Listing expired"
        );

        uint256 totalPrice = listing.unitPrice * amount;
        require(msg.value == totalPrice, "Incorrect payment");

        listing.remaining -= amount;
        if (listing.remaining == 0) {
            listing.active = false;
        }

        uint256 fee = (totalPrice * listing.feeBps) / FEE_DENOMINATOR;
        proceeds[listing.seller] += totalPrice - fee;
        proceeds[listing.feeRecipient] += fee;

        IERC1155MarketToken(listing.token).safeTransferFrom(
            address(this),
            msg.sender,
            listing.tokenId,
            amount,
            ""
        );
        emit ListingPurchased(listingId, msg.sender, amount, totalPrice);
    }

    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Listing inactive");
        require(msg.sender == listing.seller, "Not seller");

        uint256 amount = listing.remaining;
        listing.remaining = 0;
        listing.active = false;
        IERC1155MarketToken(listing.token).safeTransferFrom(
            address(this),
            listing.seller,
            listing.tokenId,
            amount,
            ""
        );
        emit ListingCancelled(listingId);
    }

    function withdrawProceeds() external nonReentrant {
        uint256 amount = proceeds[msg.sender];
        require(amount > 0, "No proceeds");
        proceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        emit ProceedsWithdrawn(msg.sender, amount);
    }

    function setProtocolFee(address recipient, uint16 feeBps) external onlyOwner {
        _setProtocolFee(recipient, feeBps);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PauseChanged(paused_);
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x4e2312e0;
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata
    ) external view override returns (bytes4) {
        require(
            msg.sender == expectedToken
                && operator == address(this)
                && from == expectedFrom
                && id == expectedTokenId
                && value == expectedAmount,
            "Unexpected token transfer"
        );
        return 0xf23a6e61;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert("Batch listings unsupported");
    }

    receive() external payable {
        revert("Use buy");
    }

    function _setProtocolFee(address recipient, uint16 feeBps) private {
        require(recipient != address(0), "Zero fee recipient");
        require(feeBps <= MAX_PROTOCOL_FEE_BPS, "Fee too high");
        protocolFeeRecipient = recipient;
        protocolFeeBps = feeBps;
        emit ProtocolFeeUpdated(recipient, feeBps);
    }
}
