// SPDX-License-Identifier: MIT
// cspell:ignore XUSDT
pragma solidity ^0.8.28;

contract AtlasXUSDT1155 {
    uint256 public constant USDT_TOKEN_ID = 1;
    uint256 public constant INITIAL_SUPPLY = 50_000_000;
    uint256 public constant UNIT_VALUE_USD_6DP = 1_000_000;

    string public constant name = "ERC USDT TRC20 (ERC-1155 representation)";
    string public constant symbol = "USDT";
    string public constant networkName = "ERC";
    string public constant logoUri = "https://assets.coingecko.com/coins/images/325/small/Tether.png";

    address public immutable owner;
    string private metadataUri;
    uint256 private _totalSupply;
    mapping(address => mapping(uint256 => uint256)) private balances;
    mapping(address => mapping(address => bool)) private operatorApprovals;

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    constructor(string memory tokenMetadataUri) {
        owner = msg.sender;
        metadataUri = tokenMetadataUri;
        _mint(msg.sender, USDT_TOKEN_ID, INITIAL_SUPPLY);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function uri(uint256 id) external view returns (string memory) {
        require(id == USDT_TOKEN_ID, "Token does not exist");
        return metadataUri;
    }

    function totalSupply(uint256 id) external view returns (uint256) {
        require(id == USDT_TOKEN_ID, "Token does not exist");
        return _totalSupply;
    }

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        require(account != address(0), "Zero account");
        require(id == USDT_TOKEN_ID, "Token does not exist");
        return balances[account][id];
    }

    function isApprovedForAll(address account, address operator) external view returns (bool) {
        return operatorApprovals[account][operator];
    }

    function setApprovalForAll(address operator, bool approved) external {
        require(operator != msg.sender, "Self approval");
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata
    ) external {
        require(to != address(0), "Zero recipient");
        require(from == msg.sender || operatorApprovals[from][msg.sender], "Not approved");
        require(id == USDT_TOKEN_ID, "Token does not exist");
        require(balances[from][id] >= amount, "Insufficient balance");

        balances[from][id] -= amount;
        balances[to][id] += amount;
        emit TransferSingle(msg.sender, from, to, id, amount);
    }

    function mint(address to, uint256 id, uint256 amount, bytes calldata) external onlyOwner {
        require(to != address(0), "Zero recipient");
        require(id == USDT_TOKEN_ID, "Token does not exist");
        _mint(to, id, amount);
    }

    function _mint(address to, uint256 id, uint256 amount) internal {
        balances[to][id] += amount;
        _totalSupply += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }
}