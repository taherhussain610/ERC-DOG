// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITRC165.sol";

/// @title TRC-1155 Token Receiver Interface
/// @dev Any contract that wishes to receive TRC-1155 tokens safely must
///      implement this interface.
///      interfaceID = 0x4e2312e0
///        = bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
///          XOR bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
///        = 0xf23a6e61 XOR 0xbc197c81
interface TRC1155TokenReceiver is ITRC165 {
    /// @notice Handle the receipt of a single TRC-1155 token type.
    /// @dev Called by a TRC-1155 contract after a safe transfer.
    ///      Must return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`.
    ///      = 0xf23a6e61
    /// @return bytes4 Magic value, or reverts on rejection.
    function onERC1155Received(
        address _operator,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external returns (bytes4);

    /// @notice Handle the receipt of multiple TRC-1155 token types.
    /// @dev Called by a TRC-1155 contract after a safe batch transfer.
    ///      Must return `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`.
    ///      = 0xbc197c81
    /// @return bytes4 Magic value, or reverts on rejection.
    function onERC1155BatchReceived(
        address _operator,
        address _from,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external returns (bytes4);
}
