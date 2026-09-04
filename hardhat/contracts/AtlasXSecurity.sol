// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Token {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

library SafeToken {
    function safeBalanceOf(address token, address account) internal view returns (uint256 balance) {
        (bool success, bytes memory result) = token.staticcall(
            abi.encodeCall(IERC20Token.balanceOf, (account))
        );
        require(success && result.length >= 32, "Token balance query failed");
        balance = abi.decode(result, (uint256));
    }

    function safeTransfer(address token, address to, uint256 amount) internal {
        _callOptionalReturn(token, abi.encodeCall(IERC20Token.transfer, (to, amount)));
    }

    function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        _callOptionalReturn(
            token,
            abi.encodeCall(IERC20Token.transferFrom, (from, to, amount))
        );
    }

    function forceApprove(address token, address spender, uint256 amount) internal {
        bytes memory approval = abi.encodeCall(IERC20Token.approve, (spender, amount));
        if (!_callOptionalReturnBool(token, approval)) {
            _callOptionalReturn(token, abi.encodeCall(IERC20Token.approve, (spender, 0)));
            _callOptionalReturn(token, approval);
        }
    }

    function _callOptionalReturn(address token, bytes memory data) private {
        require(_callOptionalReturnBool(token, data), "Token operation failed");
    }

    function _callOptionalReturnBool(address token, bytes memory data) private returns (bool) {
        if (token.code.length == 0) {
            return false;
        }

        (bool success, bytes memory result) = token.call(data);
        return success && (result.length == 0 || (result.length >= 32 && abi.decode(result, (bool))));
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private reentrancyStatus = NOT_ENTERED;

    modifier nonReentrant() {
        require(reentrancyStatus == NOT_ENTERED, "Reentrant call");
        reentrancyStatus = ENTERED;
        _;
        reentrancyStatus = NOT_ENTERED;
    }
}

abstract contract Ownable2Step {
    address public owner;
    address public pendingOwner;

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero owner");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "Not pending owner");
        address previousOwner = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        emit OwnershipTransferred(previousOwner, msg.sender);
    }
}
