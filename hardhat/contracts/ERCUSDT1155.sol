// SPDX-License-Identifier: MIT
// cspell:ignore XUSDT
pragma solidity ^0.8.28;

import "./AtlasXSecurity.sol";
import "./ITRC1155MetadataURI.sol";
import "./TRC1155TokenReceiver.sol";

contract AtlasXUSDT1155 is ITRC1155MetadataURI, Ownable2Step, ReentrancyGuard {
    uint256 public constant USDT_TOKEN_ID = 1;
    uint256 public constant INITIAL_SUPPLY = 50_000_000;
    uint256 public constant MAX_SUPPLY = 100_000_000;
    uint256 public constant UNIT_VALUE_USD_6DP = 1_000_000;

    string public constant name = "ERC USDT TRC20 (ERC-1155 representation)";
    string public constant symbol = "USDT";
    string public constant networkName = "ERC";
    string public constant logoUri = "https://assets.coingecko.com/coins/images/325/small/Tether.png";

    string private metadataUri;
    uint256 private _totalSupply;
    bool public paused;
    mapping(uint256 => mapping(address => uint256)) private balances;
    mapping(address => mapping(address => bool)) private operatorApprovals;

    event Paused(address indexed account);
    event Unpaused(address indexed account);

    constructor(string memory tokenMetadataUri) {
        require(bytes(tokenMetadataUri).length > 0, "Empty metadata URI");
        metadataUri = tokenMetadataUri;
        _mint(msg.sender, USDT_TOKEN_ID, INITIAL_SUPPLY);
    }

    modifier whenNotPaused() {
        require(!paused, "Token paused");
        _;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == 0x01ffc9a7
            || interfaceId == 0xd9b67a26
            || interfaceId == 0x0e89341c;
    }

    function uri(uint256 id) external view override returns (string memory) {
        require(id == USDT_TOKEN_ID, "Token does not exist");
        return metadataUri;
    }

    function setURI(string calldata newMetadataUri) external onlyOwner {
        require(bytes(newMetadataUri).length > 0, "Empty metadata URI");
        metadataUri = newMetadataUri;
        emit URI(newMetadataUri, USDT_TOKEN_ID);
    }

    function totalSupply(uint256 id) external view returns (uint256) {
        _requireToken(id);
        return _totalSupply;
    }

    function exists(uint256 id) external view returns (bool) {
        return id == USDT_TOKEN_ID && _totalSupply > 0;
    }

    function balanceOf(address account, uint256 id) external view override returns (uint256) {
        require(account != address(0), "Zero account");
        _requireToken(id);
        return balances[id][account];
    }

    function balanceOfBatch(
        address[] calldata accounts,
        uint256[] calldata ids
    ) external view override returns (uint256[] memory batchBalances) {
        require(accounts.length == ids.length, "Length mismatch");
        batchBalances = new uint256[](accounts.length);

        for (uint256 i = 0; i < accounts.length; ++i) {
            require(accounts[i] != address(0), "Zero account");
            _requireToken(ids[i]);
            batchBalances[i] = balances[ids[i]][accounts[i]];
        }
    }

    function isApprovedForAll(
        address account,
        address operator
    ) external view override returns (bool) {
        return operatorApprovals[account][operator];
    }

    function setApprovalForAll(address operator, bool approved) external override {
        require(operator != msg.sender, "Self approval");
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external override whenNotPaused nonReentrant {
        _requireApproved(from);
        _transfer(from, to, id, amount);
        emit TransferSingle(msg.sender, from, to, id, amount);
        _checkSingleReceiver(msg.sender, from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external override whenNotPaused nonReentrant {
        require(ids.length == amounts.length, "Length mismatch");
        _requireApproved(from);

        for (uint256 i = 0; i < ids.length; ++i) {
            _transfer(from, to, ids[i], amounts[i]);
        }

        emit TransferBatch(msg.sender, from, to, ids, amounts);
        _checkBatchReceiver(msg.sender, from, to, ids, amounts, data);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external onlyOwner whenNotPaused nonReentrant {
        _mint(to, id, amount);
        _checkSingleReceiver(msg.sender, address(0), to, id, amount, data);
    }

    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external onlyOwner whenNotPaused nonReentrant {
        require(to != address(0), "Zero recipient");
        require(ids.length == amounts.length, "Length mismatch");

        uint256 minted;
        for (uint256 i = 0; i < ids.length; ++i) {
            _requireToken(ids[i]);
            minted += amounts[i];
            balances[ids[i]][to] += amounts[i];
        }
        require(_totalSupply + minted <= MAX_SUPPLY, "Supply cap exceeded");
        _totalSupply += minted;

        emit TransferBatch(msg.sender, address(0), to, ids, amounts);
        _checkBatchReceiver(msg.sender, address(0), to, ids, amounts, data);
    }

    function burn(
        address from,
        uint256 id,
        uint256 amount
    ) external whenNotPaused {
        _requireApproved(from);
        _burn(from, id, amount);
    }

    function burnBatch(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external whenNotPaused {
        require(ids.length == amounts.length, "Length mismatch");
        _requireApproved(from);

        for (uint256 i = 0; i < ids.length; ++i) {
            _burn(from, ids[i], amounts[i]);
        }
        emit TransferBatch(msg.sender, from, address(0), ids, amounts);
    }

    function pause() external onlyOwner {
        require(!paused, "Already paused");
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(paused, "Not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }

    function _mint(address to, uint256 id, uint256 amount) internal {
        require(to != address(0), "Zero recipient");
        _requireToken(id);
        require(_totalSupply + amount <= MAX_SUPPLY, "Supply cap exceeded");
        balances[id][to] += amount;
        _totalSupply += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }

    function _burn(address from, uint256 id, uint256 amount) internal {
        _requireToken(id);
        require(balances[id][from] >= amount, "Insufficient balance");
        balances[id][from] -= amount;
        _totalSupply -= amount;
        emit TransferSingle(msg.sender, from, address(0), id, amount);
    }

    function _transfer(address from, address to, uint256 id, uint256 amount) internal {
        require(from != address(0), "Zero sender");
        require(to != address(0), "Zero recipient");
        _requireToken(id);
        require(balances[id][from] >= amount, "Insufficient balance");
        balances[id][from] -= amount;
        balances[id][to] += amount;
    }

    function _requireApproved(address from) internal view {
        require(
            from == msg.sender || operatorApprovals[from][msg.sender],
            "Not approved"
        );
    }

    function _requireToken(uint256 id) internal pure {
        require(id == USDT_TOKEN_ID, "Token does not exist");
    }

    function _checkSingleReceiver(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            return;
        }

        try TRC1155TokenReceiver(to).onERC1155Received(
            operator,
            from,
            id,
            amount,
            data
        ) returns (bytes4 response) {
            require(response == 0xf23a6e61, "Receiver rejected tokens");
        } catch {
            revert("Invalid token receiver");
        }
    }

    function _checkBatchReceiver(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            return;
        }

        try TRC1155TokenReceiver(to).onERC1155BatchReceived(
            operator,
            from,
            ids,
            amounts,
            data
        ) returns (bytes4 response) {
            require(response == 0xbc197c81, "Receiver rejected tokens");
        } catch {
            revert("Invalid token receiver");
        }
    }
}