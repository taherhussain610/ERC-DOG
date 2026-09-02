// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ITRC1155.sol";

/// @title TRC-1155 Metadata URI Extension
/// @dev interfaceID = 0x0e89341c
interface ITRC1155MetadataURI is ITRC1155 {
    /// @notice Returns the URI for token `_id`.
    ///         If the URI includes `{id}`, clients substitute the actual
    ///         token ID (zero-padded 64-character hex, no 0x prefix).
    function uri(uint256 _id) external view returns (string memory);
}
