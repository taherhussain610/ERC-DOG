const { ethers } = require("ethers");

/**
 * Ethereum and BSC Blockchain Service
 * Handles Web3 interactions for Ethereum and BSC networks
 */

class EthereumService {
  constructor(rpcUrl, apiKey = "") {
    this.rpcUrl = rpcUrl;
    this.apiKey = apiKey;
    this.provider = null;
    this.initProvider();
  }

  /**
   * Initialize Web3 provider
   */
  initProvider() {
    try {
      const url = this.apiKey ? `${this.rpcUrl}?apiKey=${this.apiKey}` : this.rpcUrl;
      this.provider = new ethers.JsonRpcProvider(url);
    } catch (error) {
      console.error("Failed to initialize Ethereum provider:", error);
      throw error;
    }
  }

  /**
   * Get current block number
   * @returns {Promise<number>} Current block number
   */
  async getBlockNumber() {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get balance of an address
   * @param {string} address - Wallet address
   * @returns {Promise<string>} Balance in ETH/BNB
   */
  async getBalance(address) {
    const balance = await this.provider.getBalance(address);
    return ethers.formatEther(balance);
  }

  /**
   * Get transaction by hash
   * @param {string} txHash - Transaction hash
   * @returns {Promise<object>} Transaction details
   */
  async getTransaction(txHash) {
    return await this.provider.getTransaction(txHash);
  }

  /**
   * Get transaction receipt
   * @param {string} txHash - Transaction hash
   * @returns {Promise<object>} Transaction receipt
   */
  async getTransactionReceipt(txHash) {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Get gas price
   * @returns {Promise<string>} Gas price in Gwei
   */
  async getGasPrice() {
    const feeData = await this.provider.getFeeData();
    return ethers.formatUnits(feeData.gasPrice, "gwei");
  }

  /**
   * Estimate gas for transaction
   * @param {object} transaction - Transaction object
   * @returns {Promise<string>} Estimated gas
   */
  async estimateGas(transaction) {
    const estimate = await this.provider.estimateGas(transaction);
    return estimate.toString();
  }

  /**
   * Send native token (ETH/BNB)
   * @param {string} privateKey - Sender's private key
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in ETH/BNB
   * @returns {Promise<object>} Transaction receipt
   */
  async sendNativeToken(privateKey, to, amount) {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount)
    });
    return await tx.wait();
  }

  /**
   * Get ERC20 token balance
   * @param {string} tokenAddress - Token contract address
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<string>} Token balance
   */
  async getTokenBalance(tokenAddress, walletAddress) {
    const abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)"
    ];
    const contract = new ethers.Contract(tokenAddress, abi, this.provider);
    const balance = await contract.balanceOf(walletAddress);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  }

  /**
   * Get ERC20 token info
   * @param {string} tokenAddress - Token contract address
   * @returns {Promise<object>} Token information
   */
  async getTokenInfo(tokenAddress) {
    const abi = [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)"
    ];
    const contract = new ethers.Contract(tokenAddress, abi, this.provider);
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);

    return {
      name,
      symbol,
      decimals,
      totalSupply: ethers.formatUnits(totalSupply, decimals)
    };
  }

  /**
   * Transfer ERC20 tokens
   * @param {string} privateKey - Sender's private key
   * @param {string} tokenAddress - Token contract address
   * @param {string} to - Recipient address
   * @param {string} amount - Amount to transfer
   * @returns {Promise<object>} Transaction receipt
   */
  async transferToken(privateKey, tokenAddress, to, amount) {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    const abi = [
      "function decimals() view returns (uint8)",
      "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const contract = new ethers.Contract(tokenAddress, abi, wallet);
    const decimals = await contract.decimals();
    const value = ethers.parseUnits(amount, decimals);
    const tx = await contract.transfer(to, value);
    return await tx.wait();
  }

  /**
   * Call smart contract method (read-only)
   * @param {string} contractAddress - Contract address
   * @param {Array} abi - Contract ABI
   * @param {string} method - Method name
   * @param {Array} params - Method parameters
   * @returns {Promise<any>} Method result
   */
  async callContractMethod(contractAddress, abi, method, params = []) {
    const contract = new ethers.Contract(contractAddress, abi, this.provider);
    return await contract[method](...params);
  }

  /**
   * Execute smart contract transaction
   * @param {string} privateKey - Sender's private key
   * @param {string} contractAddress - Contract address
   * @param {Array} abi - Contract ABI
   * @param {string} method - Method name
   * @param {Array} params - Method parameters
   * @returns {Promise<object>} Transaction receipt
   */
  async executeContractMethod(privateKey, contractAddress, abi, method, params = []) {
    const wallet = new ethers.Wallet(privateKey, this.provider);
    const contract = new ethers.Contract(contractAddress, abi, wallet);
    const tx = await contract[method](...params);
    return await tx.wait();
  }

  /**
   * Decode transaction input data
   * @param {string} data - Transaction input data
   * @param {Array} abi - Contract ABI
   * @returns {object} Decoded data
   */
  decodeTransactionData(data, abi) {
    const iface = new ethers.Interface(abi);
    return iface.parseTransaction({ data });
  }

  /**
   * Verify message signature
   * @param {string} message - Original message
   * @param {string} signature - Signature to verify
   * @returns {string} Signer address
   */
  verifySignature(message, signature) {
    return ethers.verifyMessage(message, signature);
  }

  /**
   * Sign message
   * @param {string} privateKey - Private key
   * @param {string} message - Message to sign
   * @returns {Promise<string>} Signature
   */
  async signMessage(privateKey, message) {
    const wallet = new ethers.Wallet(privateKey);
    return await wallet.signMessage(message);
  }
}

module.exports = EthereumService;
