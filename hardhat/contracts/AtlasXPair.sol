// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Min {
    function balanceOf(address) external view returns (uint256);
    function transfer(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
}

/**
 * @title AtlasXPair
 * @dev Constant-product AMM pair (x*y=k) for AtlasX DEX
 */
contract AtlasXPair {
    address public factory;
    address public token0;
    address public token1;
    address public owner;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalLiquidity;
    mapping(address => uint256) public liquidity;

    uint256 public constant FEE_NUMERATOR = 997;
    uint256 public constant FEE_DENOMINATOR = 1000;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpTokens);
    event Swap(address indexed trader, address tokenIn, uint256 amountIn, uint256 amountOut);
    event Sync(uint256 reserve0, uint256 reserve1);

    modifier onlyFactory() {
        require(msg.sender == factory, "Not factory");
        _;
    }

    constructor(address _token0, address _token1, address _owner) {
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        owner = _owner;
    }

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
