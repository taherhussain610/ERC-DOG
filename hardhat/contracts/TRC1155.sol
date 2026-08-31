// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITRC1155.sol";
import "./ITRC1155MetadataURI.sol";
import "./TRC1155TokenReceiver.sol";

/// @title TRC-1155 Base Implementation
/// @dev Implements the full TRC-1155 multi-token standard with:
///      - Fungible and non-fungible token support via ID encoding
///      - Safe single and batch transfers
///      - Operator approvals
///      - Fungible mint (one-to-many) and non-fungible mint
///      - TRC-165 interface detection
///
///      ID encoding convention (matches Enjin reference):
///        Fungible  : bit 255 = 0  (top bit clear)
///        Non-Fungible type : bit 255 = 1, bits 127-0 = 0  (index field zero)
///        Non-Fungible item : bit 255 = 1, top 128 bits = type, bottom 128 bits = index
///
///      interfaceIDs registered:
///        0x01ffc9a7 — TRC-165
///        0xd9b67a26 — TRC-1155 core
///        0x0e89341c — TRC-1155 Metadata URI
contract TRC1155 is ITRC1155MetadataURI {
    // -----------------------------------------------------------------------
    // Constants — magic return values expected from receiver hooks
    // -----------------------------------------------------------------------

    /// @dev bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 private constant TRC1155_ACCEPTED = 0xf23a6e61;

    /// @dev bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 private constant TRC1155_BATCH_ACCEPTED = 0xbc197c81;

    // -----------------------------------------------------------------------
    // ID encoding helpers
    // -----------------------------------------------------------------------

    uint256 private constant TYPE_MASK    = type(uint128).max << 128; // top 128 bits
    uint256 private constant NF_BIT       = 1 << 255;                 // top bit flags NF type

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    /// @dev id => (owner => balance)  — used for both fungible and NF types
    mapping(uint256 => mapping(address => uint256)) internal _balances;

    /// @dev owner => (operator => approved)
    mapping(address => mapping(address => bool)) internal _operatorApprovals;

    /// @dev NF token id => owner  (only populated for non-fungible items)
    mapping(uint256 => address) internal _nfOwners;

    /// @dev NF type => highest index minted so far
    mapping(uint256 => uint256) internal _maxIndex;

    /// @dev token id => URI  (overrides the base URI when set)
    mapping(uint256 => string) internal _tokenURIs;

    /// @dev Base URI string; may contain "{id}" placeholder.
    string internal _baseURI;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(string memory baseURI_) {
        _baseURI = baseURI_;
    }

    // -----------------------------------------------------------------------
    // TRC-165
    // -----------------------------------------------------------------------

    function supportsInterface(bytes4 interfaceID) external pure override returns (bool) {
        return interfaceID == 0x01ffc9a7   // TRC-165
            || interfaceID == 0xd9b67a26   // TRC-1155 core
            || interfaceID == 0x0e89341c;  // TRC-1155 Metadata URI
    }

    // -----------------------------------------------------------------------
    // Metadata
    // -----------------------------------------------------------------------

    function uri(uint256 id) external view override returns (string memory) {
        string memory tokenURI = _tokenURIs[id];
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }
        return _baseURI;
    }

    // -----------------------------------------------------------------------
    // Balance queries
    // -----------------------------------------------------------------------

    function balanceOf(address _owner, uint256 _id)
        external
        view
        override
        returns (uint256)
    {
        require(_owner != address(0), "TRC1155: zero address");
        return _balances[_id][_owner];
    }

    function balanceOfBatch(
        address[] calldata _owners,
        uint256[] calldata _ids
    ) external view override returns (uint256[] memory balancesBatch) {
        require(_owners.length == _ids.length, "TRC1155: length mismatch");
        balancesBatch = new uint256[](_owners.length);
        for (uint256 i = 0; i < _owners.length; ++i) {
            require(_owners[i] != address(0), "TRC1155: zero address");
            balancesBatch[i] = _balances[_ids[i]][_owners[i]];
        }
    }

    // -----------------------------------------------------------------------
    // Approval
    // -----------------------------------------------------------------------

    function setApprovalForAll(address _operator, bool _approved) external override {
        require(_operator != msg.sender, "TRC1155: self approval");
        _operatorApprovals[msg.sender][_operator] = _approved;
        emit ApprovalForAll(msg.sender, _operator, _approved);
    }

    function isApprovedForAll(address _owner, address _operator)
        external
        view
        override
        returns (bool)
    {
        return _operatorApprovals[_owner][_operator];
    }

    // -----------------------------------------------------------------------
    // Transfers
    // -----------------------------------------------------------------------

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external override {
        require(_to != address(0), "TRC1155: zero recipient");
        require(
            _from == msg.sender || _operatorApprovals[_from][msg.sender],
            "TRC1155: not approved"
        );

        _safeTransferFrom(_from, _to, _id, _value, _data);
    }

    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external override {
        require(_to != address(0), "TRC1155: zero recipient");
        require(
            _from == msg.sender || _operatorApprovals[_from][msg.sender],
            "TRC1155: not approved"
        );
        require(_ids.length == _values.length, "TRC1155: length mismatch");

        for (uint256 i = 0; i < _ids.length; ++i) {
            _doTransfer(_from, _to, _ids[i], _values[i]);
        }

        emit TransferBatch(msg.sender, _from, _to, _ids, _values);

        if (_isContract(_to)) {
            require(
                TRC1155TokenReceiver(_to).onERC1155BatchReceived(
                    msg.sender,
                    _from,
                    _ids,
                    _values,
                    _data
                ) == TRC1155_BATCH_ACCEPTED,
                "TRC1155: batch receiver rejected"
            );
        }
    }

    // -----------------------------------------------------------------------
    // Internal transfer helpers
    // -----------------------------------------------------------------------

    function _safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) internal {
        _doTransfer(_from, _to, _id, _value);
        emit TransferSingle(msg.sender, _from, _to, _id, _value);

        if (_isContract(_to)) {
            require(
                TRC1155TokenReceiver(_to).onERC1155Received(
                    msg.sender,
                    _from,
                    _id,
                    _value,
                    _data
                ) == TRC1155_ACCEPTED,
                "TRC1155: receiver rejected"
            );
        }
    }

    function _doTransfer(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value
    ) internal {
        if (_isNonFungibleItem(_id)) {
            require(_value == 1, "TRC1155: NF value must be 1");
            require(_nfOwners[_id] == _from, "TRC1155: not NF owner");
            _nfOwners[_id] = _to;
        }
        require(_balances[_id][_from] >= _value, "TRC1155: insufficient balance");
        _balances[_id][_from] -= _value;
        _balances[_id][_to]   += _value;
    }

    // -----------------------------------------------------------------------
    // Mint — fungible
    // -----------------------------------------------------------------------

    /// @notice Mint `_quantities[i]` of fungible token `_id` to each address in `_to`.
    /// @dev Reverts if `_id` is a non-fungible type.
    function _mintFungible(
        uint256 _id,
        address[] memory _to,
        uint256[] memory _quantities
    ) internal {
        require(!_isNonFungible(_id), "TRC1155: not fungible");
        require(_to.length == _quantities.length, "TRC1155: length mismatch");

        for (uint256 i = 0; i < _to.length; ++i) {
            address to = _to[i];
            uint256 quantity = _quantities[i];
            require(to != address(0), "TRC1155: zero address");

            _balances[_id][to] += quantity;

            // address(0) as _from signals a mint
            emit TransferSingle(msg.sender, address(0), to, _id, quantity);

            if (_isContract(to)) {
                _doSafeTransferAcceptanceCheck(msg.sender, address(0), to, _id, quantity, "");
            }
        }
    }

    // -----------------------------------------------------------------------
    // Mint — non-fungible
    // -----------------------------------------------------------------------

    /// @notice Mint one non-fungible item of type `_type` to each address in `_to`.
    /// @dev `_type` must be a non-fungible type (NF_BIT set, index field zero).
    function _mintNonFungible(uint256 _type, address[] memory _to) internal {
        require(_isNonFungible(_type), "TRC1155: not NF type");

        uint256 index = _maxIndex[_type] + 1;
        _maxIndex[_type] = _to.length + _maxIndex[_type];

        for (uint256 i = 0; i < _to.length; ++i) {
            address dst = _to[i];
            require(dst != address(0), "TRC1155: zero address");
            uint256 id = _type | (index + i);

            _nfOwners[id] = dst;
            _balances[id][dst] = 1;

            emit TransferSingle(msg.sender, address(0), dst, id, 1);

            if (_isContract(dst)) {
                _doSafeTransferAcceptanceCheck(msg.sender, address(0), dst, id, 1, "");
            }
        }
    }

    // -----------------------------------------------------------------------
    // Burn helpers
    // -----------------------------------------------------------------------

    function _burn(address _from, uint256 _id, uint256 _value) internal {
        require(_from != address(0), "TRC1155: zero address");
        require(_balances[_id][_from] >= _value, "TRC1155: insufficient balance");

        if (_isNonFungibleItem(_id)) {
            require(_value == 1, "TRC1155: NF value must be 1");
            delete _nfOwners[_id];
        }
        _balances[_id][_from] -= _value;

        emit TransferSingle(msg.sender, _from, address(0), _id, _value);
    }

    // -----------------------------------------------------------------------
    // URI helpers
    // -----------------------------------------------------------------------

    function _setTokenURI(uint256 _id, string memory _uri) internal {
        _tokenURIs[_id] = _uri;
        emit URI(_uri, _id);
    }

    function _setBaseURI(string memory baseURI_) internal {
        _baseURI = baseURI_;
    }

    // -----------------------------------------------------------------------
    // ID type predicates
    // -----------------------------------------------------------------------

    function _isNonFungible(uint256 id) internal pure returns (bool) {
        return (id & NF_BIT) != 0 && (id & ~TYPE_MASK) == 0;
    }

    function _isNonFungibleItem(uint256 id) internal pure returns (bool) {
        return (id & NF_BIT) != 0 && (id & ~TYPE_MASK) != 0;
    }

    function _getNonFungibleType(uint256 id) internal pure returns (uint256) {
        return id & TYPE_MASK;
    }

    function ownerOf(uint256 id) external view returns (address) {
        require(_isNonFungibleItem(id), "TRC1155: not NF item");
        return _nfOwners[id];
    }

    // -----------------------------------------------------------------------
    // Contract detection
    // -----------------------------------------------------------------------

    function _isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }

    // -----------------------------------------------------------------------
    // Receiver acceptance check
    // -----------------------------------------------------------------------

    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) internal {
        require(
            TRC1155TokenReceiver(to).onERC1155Received(operator, from, id, value, data)
                == TRC1155_ACCEPTED,
            "TRC1155: receiver rejected"
        );
    }
}
