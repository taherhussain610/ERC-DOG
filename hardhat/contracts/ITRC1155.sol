// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITRC165.sol";

/// @title TRC-1155 Multi Token Standard — Core Interface
/// @dev Equivalent to ERC-1155 for TRON-compatible deployments.
///      interfaceID = 0xd9b67a26
interface ITRC1155 is ITRC165 {
    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    /// @dev Emitted when `_operator` transfers a single token type.
    ///      `_from` == address(0) on mint; `_to` == address(0) on burn.
    event TransferSingle(
        address indexed _operator,
        address indexed _from,
        address indexed _to,
        uint256 _id,
        uint256 _value
    );

    /// @dev Emitted when `_operator` performs a batch transfer.
    ///      `_from` == address(0) on mint; `_to` == address(0) on burn.
    event TransferBatch(
        address indexed _operator,
        address indexed _from,
        address indexed _to,
        uint256[] _ids,
        uint256[] _values
    );

    /// @dev Emitted when an operator approval is toggled.
    event ApprovalForAll(
        address indexed _owner,
        address indexed _operator,
        bool _approved
    );

    /// @dev Emitted when the metadata URI for token `_id` is updated.
    event URI(string _value, uint256 indexed _id);

    // -----------------------------------------------------------------------
    // Functions
    // -----------------------------------------------------------------------

    /// @notice Authorize or revoke `_operator` to manage all tokens of the caller.
    function setApprovalForAll(address _operator, bool _approved) external;

    /// @notice Returns `true` if `_operator` is approved to manage all tokens of `_owner`.
    function isApprovedForAll(address _owner, address _operator) external view returns (bool);

    /// @notice Returns the balance of token `_id` held by `_owner`.
    function balanceOf(address _owner, uint256 _id) external view returns (uint256);

    /// @notice Returns balances for multiple (owner, id) pairs.
    ///         Both arrays must have the same length.
    function balanceOfBatch(
        address[] calldata _owners,
        uint256[] calldata _ids
    ) external view returns (uint256[] memory);

    /// @notice Safely transfers `_value` of token `_id` from `_from` to `_to`.
    ///         Calls `onERC1155Received` on `_to` if it is a contract.
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external;

    /// @notice Safely transfers multiple token types in a single transaction.
    ///         Calls `onERC1155BatchReceived` on `_to` if it is a contract.
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external;
}
