// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AtlasXSecurity.sol";

contract AtlasXPair is ReentrancyGuard {
    using SafeToken for address;

    struct SwapCache {
        bool isToken0In;
        address tokenOut;
        uint256 balance0Before;
        uint256 balance1Before;
        uint256 balanceInBefore;
        uint256 actualAmountIn;
        uint256 quotedAmountOut;
        uint256 recipientBalanceBefore;
    }

    struct SwapParams {
        address tokenIn;
        uint256 amountIn;
        uint256 amountOutMin;
        address recipient;
        uint256 deadline;
    }

    struct RemovalCache {
        uint256 balance0;
        uint256 balance1;
        uint256 payout0;
        uint256 payout1;
        uint256 recipientBalance0;
        uint256 recipientBalance1;
    }

    address public immutable factory;
    address public immutable token0;
    address public immutable token1;
    address public immutable owner;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;
    mapping(address => mapping(address => uint256)) public liquidityAllowance;

    uint256 public constant MINIMUM_LIQUIDITY = 1_000;
    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1_000;

    event LiquidityApproval(address indexed provider, address indexed spender, uint256 amount);
    event LiquidityAdded(
        address indexed provider,
        address indexed recipient,
        uint256 amount0,
        uint256 amount1,
        uint256 lpTokens
    );
    event LiquidityRemoved(
        address indexed provider,
        address indexed recipient,
        uint256 amount0,
        uint256 amount1,
        uint256 lpTokens
    );
    event Swap(
        address indexed trader,
        address indexed recipient,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );
    event Sync(uint256 reserve0, uint256 reserve1);

    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "Transaction expired");
        _;
    }

    constructor(address token0_, address token1_, address owner_) {
        require(token0_ != token1_, "Identical tokens");
        require(token0_ != address(0) && token1_ != address(0), "Zero token");
        factory = msg.sender;
        token0 = token0_;
        token1 = token1_;
        owner = owner_;
    }

    function approveLiquidity(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "Zero spender");
        liquidityAllowance[msg.sender][spender] = amount;
        emit LiquidityApproval(msg.sender, spender, amount);
        return true;
    }

    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 minLiquidity,
        address recipient,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 lpTokens) {
        require(recipient != address(0), "Zero recipient");
        require(amount0Desired > 0 && amount1Desired > 0, "Zero amount");

        uint256 balance0Before = token0.safeBalanceOf(address(this));
        uint256 balance1Before = token1.safeBalanceOf(address(this));
        token0.safeTransferFrom(msg.sender, address(this), amount0Desired);
        token1.safeTransferFrom(msg.sender, address(this), amount1Desired);
        uint256 balance0After = token0.safeBalanceOf(address(this));
        uint256 balance1After = token1.safeBalanceOf(address(this));
        uint256 amount0 = balance0After - balance0Before;
        uint256 amount1 = balance1After - balance1Before;

        require(amount0 >= amount0Min && amount1 >= amount1Min, "Liquidity slippage");

        if (totalLiquidity == 0) {
            uint256 rootLiquidity = _sqrt(balance0After * balance1After);
            require(rootLiquidity > MINIMUM_LIQUIDITY, "Insufficient initial liquidity");
            liquidity[address(0)] = MINIMUM_LIQUIDITY;
            totalLiquidity = MINIMUM_LIQUIDITY;
            lpTokens = rootLiquidity - MINIMUM_LIQUIDITY;
        } else {
            require(balance0Before > 0 && balance1Before > 0, "Invalid reserves");
            lpTokens = _min(
                (amount0 * totalLiquidity) / balance0Before,
                (amount1 * totalLiquidity) / balance1Before
            );
        }

        require(lpTokens > 0 && lpTokens >= minLiquidity, "Insufficient liquidity minted");
        liquidity[recipient] += lpTokens;
        totalLiquidity += lpTokens;
        _updateReserves(balance0After, balance1After);

        emit LiquidityAdded(msg.sender, recipient, amount0, amount1, lpTokens);
    }

    function removeLiquidity(
        uint256 lpTokens,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amount0, uint256 amount1) {
        return _removeLiquidity(
            msg.sender,
            lpTokens,
            amount0Min,
            amount1Min,
            recipient
        );
    }

    function removeLiquidityFrom(
        address provider,
        uint256 lpTokens,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amount0, uint256 amount1) {
        if (msg.sender != provider) {
            uint256 allowed = liquidityAllowance[provider][msg.sender];
            require(allowed >= lpTokens, "Liquidity allowance exceeded");
            if (allowed != type(uint256).max) {
                liquidityAllowance[provider][msg.sender] = allowed - lpTokens;
                emit LiquidityApproval(provider, msg.sender, allowed - lpTokens);
            }
        }

        return _removeLiquidity(provider, lpTokens, amount0Min, amount1Min, recipient);
    }

    function swap(
        SwapParams calldata params
    ) external nonReentrant ensure(params.deadline) returns (uint256 amountOut) {
        require(
            params.tokenIn == token0 || params.tokenIn == token1,
            "Invalid token"
        );
        require(params.amountIn > 0, "Zero amount");
        require(
            params.recipient != address(0) && params.recipient != address(this),
            "Invalid recipient"
        );

        SwapCache memory cache;
        cache.balance0Before = token0.safeBalanceOf(address(this));
        cache.balance1Before = token1.safeBalanceOf(address(this));
        require(cache.balance0Before > 0 && cache.balance1Before > 0, "No liquidity");

        cache.isToken0In = params.tokenIn == token0;
        cache.balanceInBefore = cache.isToken0In
            ? cache.balance0Before
            : cache.balance1Before;
        params.tokenIn.safeTransferFrom(msg.sender, address(this), params.amountIn);
        uint256 balanceInAfter = params.tokenIn.safeBalanceOf(address(this));
        cache.actualAmountIn = balanceInAfter - cache.balanceInBefore;
        require(cache.actualAmountIn > 0, "No tokens received");

        uint256 reserveOut = cache.isToken0In
            ? cache.balance1Before
            : cache.balance0Before;
        cache.quotedAmountOut = _getAmountOut(
            cache.balanceInBefore,
            reserveOut,
            cache.actualAmountIn
        );
        require(cache.quotedAmountOut >= params.amountOutMin, "Insufficient output");

        cache.tokenOut = cache.isToken0In ? token1 : token0;
        cache.recipientBalanceBefore = cache.tokenOut.safeBalanceOf(params.recipient);
        cache.tokenOut.safeTransfer(params.recipient, cache.quotedAmountOut);
        amountOut = cache.tokenOut.safeBalanceOf(params.recipient)
            - cache.recipientBalanceBefore;
        require(
            amountOut >= params.amountOutMin && amountOut > 0,
            "Insufficient output"
        );

        uint256 balance0After = token0.safeBalanceOf(address(this));
        uint256 balance1After = token1.safeBalanceOf(address(this));
        require(
            balance0After * balance1After
                >= cache.balance0Before * cache.balance1Before,
            "Invariant violation"
        );
        _updateReserves(balance0After, balance1After);

        emit Swap(
            msg.sender,
            params.recipient,
            params.tokenIn,
            cache.actualAmountIn,
            amountOut
        );
    }

    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256) {
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");
        uint256 currentReserve0 = token0.safeBalanceOf(address(this));
        uint256 currentReserve1 = token1.safeBalanceOf(address(this));
        if (currentReserve0 == 0 || currentReserve1 == 0 || amountIn == 0) {
            return 0;
        }

        return tokenIn == token0
            ? _getAmountOut(currentReserve0, currentReserve1, amountIn)
            : _getAmountOut(currentReserve1, currentReserve0, amountIn);
    }

    function sync() external nonReentrant {
        _updateReserves(
            token0.safeBalanceOf(address(this)),
            token1.safeBalanceOf(address(this))
        );
    }

    function _removeLiquidity(
        address provider,
        uint256 lpTokens,
        uint256 amount0Min,
        uint256 amount1Min,
        address recipient
    ) private returns (uint256 amount0, uint256 amount1) {
        require(
            provider != address(0)
                && recipient != address(0)
                && recipient != address(this),
            "Invalid address"
        );
        require(lpTokens > 0 && liquidity[provider] >= lpTokens, "Insufficient LP tokens");

        RemovalCache memory cache;
        cache.balance0 = token0.safeBalanceOf(address(this));
        cache.balance1 = token1.safeBalanceOf(address(this));
        cache.payout0 = (lpTokens * cache.balance0) / totalLiquidity;
        cache.payout1 = (lpTokens * cache.balance1) / totalLiquidity;
        require(
            cache.payout0 >= amount0Min && cache.payout1 >= amount1Min,
            "Liquidity slippage"
        );
        require(cache.payout0 > 0 && cache.payout1 > 0, "Insufficient withdrawal");

        liquidity[provider] -= lpTokens;
        totalLiquidity -= lpTokens;
        cache.recipientBalance0 = token0.safeBalanceOf(recipient);
        cache.recipientBalance1 = token1.safeBalanceOf(recipient);
        token0.safeTransfer(recipient, cache.payout0);
        token1.safeTransfer(recipient, cache.payout1);
        amount0 = token0.safeBalanceOf(recipient) - cache.recipientBalance0;
        amount1 = token1.safeBalanceOf(recipient) - cache.recipientBalance1;
        require(amount0 >= amount0Min && amount1 >= amount1Min, "Liquidity slippage");
        _updateReserves(
            token0.safeBalanceOf(address(this)),
            token1.safeBalanceOf(address(this))
        );

        emit LiquidityRemoved(provider, recipient, amount0, amount1, lpTokens);
    }

    function _updateReserves(uint256 newReserve0, uint256 newReserve1) private {
        reserve0 = newReserve0;
        reserve1 = newReserve1;
        emit Sync(newReserve0, newReserve1);
    }

    function _getAmountOut(
        uint256 reserveIn,
        uint256 reserveOut,
        uint256 amountIn
    ) private pure returns (uint256) {
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        return
            (amountInWithFee * reserveOut)
                / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    function _sqrt(uint256 x) private pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }
}
