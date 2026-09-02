// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AtlasXFactory.sol";
import "./AtlasXPair.sol";

interface IERC20Approve {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title AtlasXRouter
 * @dev High-level DEX router for AtlasX — handles multi-hop swaps, add/remove liquidity
 */
contract AtlasXRouter {
    AtlasXFactory public immutable factory;

    constructor(address _factory) {
        factory = AtlasXFactory(_factory);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB
    ) external returns (uint256 lpTokens) {
        address pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }
        IERC20Approve(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20Approve(tokenB).transferFrom(msg.sender, address(this), amountB);
        IERC20Approve(tokenA).approve(pair, amountA);
        IERC20Approve(tokenB).approve(pair, amountB);
        lpTokens = AtlasXPair(pair).addLiquidity(amountA, amountB);
    }

    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        address pair = factory.getPair(tokenIn, tokenOut);
        require(pair != address(0), "No pair");
        IERC20Approve(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20Approve(tokenIn).approve(pair, amountIn);
        amountOut = AtlasXPair(pair).swap(tokenIn, amountIn);
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256) {
        address pair = factory.getPair(tokenIn, tokenOut);
        if (pair == address(0)) return 0;
        return AtlasXPair(pair).getAmountOut(tokenIn, amountIn);
    }
}
