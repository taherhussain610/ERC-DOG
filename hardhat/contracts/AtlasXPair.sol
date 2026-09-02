// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

/**
 * @title AtlasXPair
 * @dev Constant-product AMM pair (x*y=k) for AtlasX DEX with TWAP oracle.
 *
 * TWAP (Time-Weighted Average Price) oracle:
 *   - Cumulative prices accumulate UQ112x112 fixed-point values each second.
 *   - Anyone can call `updateTWAP()` to checkpoint the accumulators.
 *   - `consultTWAP(tokenIn, amountIn)` returns the average output amount
 *     over the window between the two most recently stored checkpoints.
 */
contract AtlasXPair {
    // ── AMM state ────────────────────────────────────────────────────────────
    address public factory;
    address public token0;
    address public token1;
    address public owner;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    uint256 public constant FEE_NUMERATOR   = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    // ── TWAP oracle ──────────────────────────────────────────────────────────
    // Fixed-point Q112.112 multiplier
    uint256 private constant Q112 = 2**112;

    // Cumulative price × time (UQ112x112 · seconds)
    uint256 public price0CumulativeLast; // token1 per token0
    uint256 public price1CumulativeLast; // token0 per token1
    uint32  public blockTimestampLast;   // last update timestamp (mod 2^32)

    // TWAP checkpoint ring-buffer (size 2 so we can compute a window)
    struct TWAPCheckpoint {
        uint256 price0Cumulative;
        uint256 price1Cumulative;
        uint32  timestamp;
    }
    TWAPCheckpoint public twapCheckpointOld;
    TWAPCheckpoint public twapCheckpointNew;

    // ── Events ───────────────────────────────────────────────────────────────
    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut);
    event Sync(uint256 reserve0, uint256 reserve1);
    event TWAPUpdated(uint32 timestamp, uint256 price0Cumulative, uint256 price1Cumulative);

    modifier onlyFactory() {
        require(msg.sender == factory, "Not factory");
        _;
    }

    constructor(address _token0, address _token1, address _owner) {
        factory = msg.sender;
        token0  = _token0;
        token1  = _token1;
        owner   = _owner;
    }

    // ── Internal helpers ─────────────────────────────────────────────────────

    /**
     * @dev Accumulate cumulative prices since the last update.
     *      Must be called *before* reserves are updated.
     */
    function _updateCumulativePrices(uint256 r0, uint256 r1) private {
        uint32 blockTs = uint32(block.timestamp % 2**32);
        uint32 elapsed = blockTs - blockTimestampLast;
        if (elapsed > 0 && r0 > 0 && r1 > 0) {
            // UQ112x112 fraction * elapsed seconds
            price0CumulativeLast += (r1 * Q112 / r0) * elapsed;
            price1CumulativeLast += (r0 * Q112 / r1) * elapsed;
        }
        blockTimestampLast = blockTs;
    }

    // ── TWAP oracle ──────────────────────────────────────────────────────────

    /**
     * @notice Save a TWAP checkpoint.  Anyone can call; typically called by
     *         a keeper every ~30 minutes so the oracle stays fresh.
     */
    function updateTWAP() external {
        _updateCumulativePrices(reserve0, reserve1);
        twapCheckpointOld = twapCheckpointNew;
        twapCheckpointNew = TWAPCheckpoint({
            price0Cumulative: price0CumulativeLast,
            price1Cumulative: price1CumulativeLast,
            timestamp:        blockTimestampLast
        });
        emit TWAPUpdated(blockTimestampLast, price0CumulativeLast, price1CumulativeLast);
    }

    /**
     * @notice Return the TWAP output amount for `amountIn` of `tokenIn`
     *         averaged over the period between the two stored checkpoints.
     * @param tokenIn  token0 or token1.
     * @param amountIn Amount of tokenIn.
     */
    function consultTWAP(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");
        TWAPCheckpoint memory n = twapCheckpointNew;
        TWAPCheckpoint memory o = twapCheckpointOld;
        uint32 elapsed = n.timestamp - o.timestamp;
        require(elapsed > 0, "No TWAP window yet — call updateTWAP() twice");

        if (tokenIn == token0) {
            // price0Cumulative = token1/token0 ratio · time
            uint256 priceCumDelta = n.price0Cumulative - o.price0Cumulative;
            uint256 avgPrice = priceCumDelta / elapsed; // UQ112x112
            amountOut = (avgPrice * amountIn) / Q112;
        } else {
            uint256 priceCumDelta = n.price1Cumulative - o.price1Cumulative;
            uint256 avgPrice = priceCumDelta / elapsed;
            amountOut = (avgPrice * amountIn) / Q112;
        }
    }

    // ── Liquidity management ─────────────────────────────────────────────────

    function addLiquidity(uint256 amount0, uint256 amount1) external returns (uint256 lpTokens) {
        IERC20Min(token0).transferFrom(msg.sender, address(this), amount0);
        IERC20Min(token1).transferFrom(msg.sender, address(this), amount1);

        if (totalLiquidity == 0) {
            lpTokens = _sqrt(amount0 * amount1);
        } else {
            lpTokens = _min(
                (amount0 * totalLiquidity) / reserve0,
                (amount1 * totalLiquidity) / reserve1
            );
        }
        require(lpTokens > 0, "Insufficient liquidity");

        _updateCumulativePrices(reserve0, reserve1);

        liquidity[msg.sender] += lpTokens;
        totalLiquidity += lpTokens;
        reserve0 += amount0;
        reserve1 += amount1;

        emit LiquidityAdded(msg.sender, amount0, amount1, lpTokens);
        emit Sync(reserve0, reserve1);
    }

    function removeLiquidity(uint256 lpTokens) external returns (uint256 amount0, uint256 amount1) {
        require(liquidity[msg.sender] >= lpTokens, "Insufficient LP tokens");
        amount0 = (lpTokens * reserve0) / totalLiquidity;
        amount1 = (lpTokens * reserve1) / totalLiquidity;

        _updateCumulativePrices(reserve0, reserve1);

        liquidity[msg.sender] -= lpTokens;
        totalLiquidity -= lpTokens;
        reserve0 -= amount0;
        reserve1 -= amount1;

        IERC20Min(token0).transfer(msg.sender, amount0);
        IERC20Min(token1).transfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, lpTokens);
        emit Sync(reserve0, reserve1);
    }

    function swap(address tokenIn, uint256 amountIn) external returns (uint256 amountOut) {
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");
        bool isToken0In = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut, address tokenOut) = isToken0In
            ? (reserve0, reserve1, token1)
            : (reserve1, reserve0, token0);

        require(reserveIn > 0 && reserveOut > 0, "No liquidity");

        IERC20Min(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);

        require(amountOut > 0, "Insufficient output");
        IERC20Min(tokenOut).transfer(msg.sender, amountOut);

        _updateCumulativePrices(reserve0, reserve1);

        if (isToken0In) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
        emit Sync(reserve0, reserve1);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256) {
        require(tokenIn == token0 || tokenIn == token1, "Invalid token");
        bool isToken0In = tokenIn == token0;
        (uint256 reserveIn, uint256 reserveOut) = isToken0In ? (reserve0, reserve1) : (reserve1, reserve0);
        if (reserveIn == 0 || reserveOut == 0) return 0;
        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
        return (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) { y = z; z = (x / z + z) / 2; }
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) { return a < b ? a : b; }
}
