// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AtlasXFactory.sol";
import "./AtlasXPair.sol";
import "./AtlasXSecurity.sol";

contract AtlasXRouter is ReentrancyGuard {
    using SafeToken for address;

    struct AddLiquidityParams {
        address tokenA;
        address tokenB;
        uint256 amountADesired;
        uint256 amountBDesired;
        uint256 amountAMin;
        uint256 amountBMin;
        uint256 minLiquidity;
        address recipient;
        uint256 deadline;
    }

    struct RemoveLiquidityParams {
        address tokenA;
        address tokenB;
        uint256 lpTokens;
        uint256 amountAMin;
        uint256 amountBMin;
        address recipient;
        uint256 deadline;
    }

    struct SwapParams {
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 amountOutMin;
        address recipient;
        uint256 deadline;
    }

    AtlasXFactory public immutable factory;

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "Transaction expired");
        _;
    }

    constructor(address factory_) {
        require(factory_.code.length > 0, "Invalid factory");
        factory = AtlasXFactory(factory_);
    }

    function addLiquidity(
        AddLiquidityParams calldata params
    ) external nonReentrant ensure(params.deadline) returns (uint256 lpTokens) {
        require(params.recipient != address(0), "Zero recipient");

        address pairAddress = factory.getPair(params.tokenA, params.tokenB);
        if (pairAddress == address(0)) {
            pairAddress = factory.createPair(params.tokenA, params.tokenB);
        }

        uint256 amountA = _receiveToken(
            params.tokenA,
            msg.sender,
            params.amountADesired
        );
        uint256 amountB = _receiveToken(
            params.tokenB,
            msg.sender,
            params.amountBDesired
        );
        params.tokenA.forceApprove(pairAddress, amountA);
        params.tokenB.forceApprove(pairAddress, amountB);

        AtlasXPair pair = AtlasXPair(pairAddress);
        if (pair.token0() == params.tokenA) {
            lpTokens = pair.addLiquidity(
                amountA,
                amountB,
                params.amountAMin,
                params.amountBMin,
                params.minLiquidity,
                params.recipient,
                params.deadline
            );
        } else {
            lpTokens = pair.addLiquidity(
                amountB,
                amountA,
                params.amountBMin,
                params.amountAMin,
                params.minLiquidity,
                params.recipient,
                params.deadline
            );
        }
    }

    function removeLiquidity(
        RemoveLiquidityParams calldata params
    )
        external
        nonReentrant
        ensure(params.deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        require(params.recipient != address(0), "Zero recipient");
        address pairAddress = factory.getPair(params.tokenA, params.tokenB);
        require(pairAddress != address(0), "No pair");

        AtlasXPair pair = AtlasXPair(pairAddress);
        uint256 balanceABefore = params.tokenA.safeBalanceOf(params.recipient);
        uint256 balanceBBefore = params.tokenB.safeBalanceOf(params.recipient);
        if (pair.token0() == params.tokenA) {
            pair.removeLiquidityFrom(
                msg.sender,
                params.lpTokens,
                params.amountAMin,
                params.amountBMin,
                params.recipient,
                params.deadline
            );
        } else {
            pair.removeLiquidityFrom(
                msg.sender,
                params.lpTokens,
                params.amountBMin,
                params.amountAMin,
                params.recipient,
                params.deadline
            );
        }

        amountA = params.tokenA.safeBalanceOf(params.recipient) - balanceABefore;
        amountB = params.tokenB.safeBalanceOf(params.recipient) - balanceBBefore;
        require(
            amountA >= params.amountAMin && amountB >= params.amountBMin,
            "Liquidity slippage"
        );
    }

    function swapExactTokensForTokens(
        SwapParams calldata params
    ) external nonReentrant ensure(params.deadline) returns (uint256 amountOut) {
        require(params.recipient != address(0), "Zero recipient");
        address pairAddress = factory.getPair(params.tokenIn, params.tokenOut);
        require(pairAddress != address(0), "No pair");

        uint256 actualAmountIn = _receiveToken(
            params.tokenIn,
            msg.sender,
            params.amountIn
        );
        params.tokenIn.forceApprove(pairAddress, actualAmountIn);

        uint256 balanceBefore = params.tokenOut.safeBalanceOf(params.recipient);
        AtlasXPair(pairAddress).swap(
            AtlasXPair.SwapParams({
                tokenIn: params.tokenIn,
                amountIn: actualAmountIn,
                amountOutMin: params.amountOutMin,
                recipient: params.recipient,
                deadline: params.deadline
            })
        );
        amountOut = params.tokenOut.safeBalanceOf(params.recipient) - balanceBefore;
        require(amountOut >= params.amountOutMin, "Insufficient output");
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256) {
        address pairAddress = factory.getPair(tokenIn, tokenOut);
        if (pairAddress == address(0)) {
            return 0;
        }
        return AtlasXPair(pairAddress).getAmountOut(tokenIn, amountIn);
    }

    function _receiveToken(
        address token,
        address from,
        uint256 amount
    ) private returns (uint256 received) {
        require(amount > 0, "Zero amount");
        uint256 balanceBefore = token.safeBalanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        received = token.safeBalanceOf(address(this)) - balanceBefore;
        require(received > 0, "No tokens received");
    }
}
