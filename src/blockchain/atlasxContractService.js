const { ethers } = require("ethers");

class AtlasXContractService {
  constructor(defaultRpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545") {
    this.defaultRpcUrl = defaultRpcUrl;
    this.providers = new Map();
    this.erc20Abi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function decimals() external view returns (uint8)",
    ];
    this.routerAbi = [
      "function getAmountOut(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256)",
      "function swapExactTokensForTokens(address tokenIn, address tokenOut, uint256 amountIn) external returns (uint256 amountOut)",
    ];
    this.erc1155MintAbi = [
      "function mint(address to, uint256 id, uint256 amount, bytes data) external",
    ];
  }

  getProvider(rpcUrl) {
    const resolvedUrl = rpcUrl || this.defaultRpcUrl;
    if (!this.providers.has(resolvedUrl)) {
      this.providers.set(resolvedUrl, new ethers.JsonRpcProvider(resolvedUrl));
    }
    return this.providers.get(resolvedUrl);
  }

  getSigner(privateKey, rpcUrl) {
    if (!privateKey || !String(privateKey).startsWith("0x")) {
      throw new Error("Invalid privateKey format");
    }
    return new ethers.Wallet(privateKey, this.getProvider(rpcUrl));
  }

  async mintNft({ contractAddress, privateKey, to, tokenId, amount = 1, rpcUrl }) {
    if (!ethers.isAddress(contractAddress)) throw new Error("Invalid contractAddress");
    if (!ethers.isAddress(to)) throw new Error("Invalid recipient address");
    const signer = this.getSigner(privateKey, rpcUrl);
    const contract = new ethers.Contract(contractAddress, this.erc1155MintAbi, signer);
    const tx = await contract.mint(to, BigInt(tokenId), BigInt(amount), "0x");
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash,
      contractAddress,
      to,
      tokenId: String(tokenId),
      amount: String(amount),
    };
  }

  async getSwapQuote({ routerAddress, tokenIn, tokenOut, amountIn, rpcUrl }) {
    if (!ethers.isAddress(routerAddress)) throw new Error("Invalid routerAddress");
    if (!ethers.isAddress(tokenIn) || !ethers.isAddress(tokenOut)) {
      throw new Error("Invalid token address");
    }
    const provider = this.getProvider(rpcUrl);
    const router = new ethers.Contract(routerAddress, this.routerAbi, provider);
    const tokenInContract = new ethers.Contract(tokenIn, this.erc20Abi, provider);
    const tokenOutContract = new ethers.Contract(tokenOut, this.erc20Abi, provider);
    const [decimalsIn, decimalsOut] = await Promise.all([
      tokenInContract.decimals(),
      tokenOutContract.decimals(),
    ]);
    const amountInAtomic = ethers.parseUnits(String(amountIn), Number(decimalsIn));
    const amountOutAtomic = await router.getAmountOut(tokenIn, tokenOut, amountInAtomic);
    return {
      success: true,
      routerAddress,
      tokenIn,
      tokenOut,
      amountIn: String(amountIn),
      amountOut: ethers.formatUnits(amountOutAtomic, Number(decimalsOut)),
      amountInAtomic: amountInAtomic.toString(),
      amountOutAtomic: amountOutAtomic.toString(),
      decimalsIn: Number(decimalsIn),
      decimalsOut: Number(decimalsOut),
    };
  }

  async executeSwap({ routerAddress, tokenIn, tokenOut, amountIn, privateKey, rpcUrl }) {
    if (!ethers.isAddress(routerAddress)) throw new Error("Invalid routerAddress");
    if (!ethers.isAddress(tokenIn) || !ethers.isAddress(tokenOut)) {
      throw new Error("Invalid token address");
    }
    const signer = this.getSigner(privateKey, rpcUrl);
    const router = new ethers.Contract(routerAddress, this.routerAbi, signer);
    const tokenInContract = new ethers.Contract(tokenIn, this.erc20Abi, signer);
    const tokenOutContract = new ethers.Contract(tokenOut, this.erc20Abi, signer.provider);
    const [decimalsIn, decimalsOut] = await Promise.all([
      tokenInContract.decimals(),
      tokenOutContract.decimals(),
    ]);
    const amountInAtomic = ethers.parseUnits(String(amountIn), Number(decimalsIn));
    const approveTx = await tokenInContract.approve(routerAddress, amountInAtomic);
    await approveTx.wait();
    const swapTx = await router.swapExactTokensForTokens(tokenIn, tokenOut, amountInAtomic);
    const swapReceipt = await swapTx.wait();
    const quoteOut = await router.getAmountOut(tokenIn, tokenOut, amountInAtomic).catch(() => 0n);
    return {
      success: true,
      approveHash: approveTx.hash,
      transactionHash: swapReceipt.hash,
      amountIn: String(amountIn),
      amountInAtomic: amountInAtomic.toString(),
      estimatedAmountOut: ethers.formatUnits(quoteOut, Number(decimalsOut)),
      tokenIn,
      tokenOut,
      routerAddress,
    };
  }

  async transferToken({ tokenAddress, privateKey, to, amount, rpcUrl }) {
    if (!ethers.isAddress(tokenAddress)) throw new Error("Invalid tokenAddress");
    if (!ethers.isAddress(to)) throw new Error("Invalid recipient address");
    const signer = this.getSigner(privateKey, rpcUrl);
    const token = new ethers.Contract(tokenAddress, this.erc20Abi, signer);
    const decimals = await token.decimals();
    const amountAtomic = ethers.parseUnits(String(amount), Number(decimals));
    const tx = await token.transfer(to, amountAtomic);
    const receipt = await tx.wait();
    return {
      success: true,
      transactionHash: receipt.hash,
      tokenAddress,
      to,
      amount: String(amount),
      amountAtomic: amountAtomic.toString(),
      decimals: Number(decimals),
    };
  }
}

module.exports = AtlasXContractService;
