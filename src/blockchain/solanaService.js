const {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair
} = require("@solana/web3.js");

/**
 * Solana Blockchain Service
 * Handles Solana Web3 interactions
 */

class SolanaService {
  constructor(rpcUrl, apiKey = "") {
    this.rpcUrl = rpcUrl;
    this.apiKey = apiKey;
    this.connection = null;
    this.initConnection();
  }

  /**
   * Initialize Solana connection
   */
  initConnection() {
    try {
      const url = this.apiKey ? `${this.rpcUrl}?apiKey=${this.apiKey}` : this.rpcUrl;
      this.connection = new Connection(url, "confirmed");
    } catch (error) {
      console.error("Failed to initialize Solana connection:", error);
      throw error;
    }
  }

  /**
   * Get current slot (similar to block number)
   * @returns {Promise<number>} Current slot
   */
  async getSlot() {
    return await this.connection.getSlot();
  }

  /**
   * Get balance of an address
   * @param {string} address - Wallet address
   * @returns {Promise<number>} Balance in SOL
   */
  async getBalance(address) {
    const pubKey = new PublicKey(address);
    const balance = await this.connection.getBalance(pubKey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get account info
   * @param {string} address - Account address
   * @returns {Promise<object>} Account information
   */
  async getAccountInfo(address) {
    const pubKey = new PublicKey(address);
    return await this.connection.getAccountInfo(pubKey);
  }

  /**
   * Get transaction details
   * @param {string} signature - Transaction signature
   * @returns {Promise<object>} Transaction details
   */
  async getTransaction(signature) {
    return await this.connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });
  }

  /**
   * Get transaction confirmation status
   * @param {string} signature - Transaction signature
   * @returns {Promise<object>} Confirmation status
   */
  async getSignatureStatus(signature) {
    return await this.connection.getSignatureStatus(signature);
  }

  /**
   * Get recent blockhash
   * @returns {Promise<object>} Recent blockhash info
   */
  async getRecentBlockhash() {
    return await this.connection.getLatestBlockhash();
  }

  /**
   * Send SOL tokens
   * @param {string} fromSecretKey - Sender's secret key (hex)
   * @param {string} toAddress - Recipient address
   * @param {number} amount - Amount in SOL
   * @returns {Promise<string>} Transaction signature
   */
  async sendSol(fromSecretKey, toAddress, amount) {
    const fromKeypair = Keypair.fromSecretKey(Buffer.from(fromSecretKey, "hex"));
    const toPubKey = new PublicKey(toAddress);
    const lamports = amount * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubKey,
        lamports
      })
    );

    const signature = await this.connection.sendTransaction(transaction, [fromKeypair]);
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Get SPL token balance
   * @param {string} walletAddress - Wallet address
   * @param {string} tokenMintAddress - Token mint address
   * @returns {Promise<number>} Token balance
   */
  async getTokenBalance(walletAddress, tokenMintAddress) {
    try {
      const walletPubKey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubKey,
        { mint: new PublicKey(tokenMintAddress) }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance;
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }

  /**
   * Get all token accounts for a wallet
   * @param {string} walletAddress - Wallet address
   * @returns {Promise<Array>} List of token accounts
   */
  async getTokenAccounts(walletAddress) {
    try {
      const walletPubKey = new PublicKey(walletAddress);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletPubKey,
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
      );

      return tokenAccounts.value.map(account => ({
        mint: account.account.data.parsed.info.mint,
        amount: account.account.data.parsed.info.tokenAmount.uiAmount,
        decimals: account.account.data.parsed.info.tokenAmount.decimals
      }));
    } catch (error) {
      console.error("Error getting token accounts:", error);
      return [];
    }
  }

  /**
   * Get recent transactions for an address
   * @param {string} address - Wallet address
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise<Array>} List of transactions
   */
  async getRecentTransactions(address, limit = 10) {
    try {
      const pubKey = new PublicKey(address);
      const signatures = await this.connection.getSignaturesForAddress(pubKey, { limit });
      
      const transactions = await Promise.all(
        signatures.map(async sig => {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          return {
            signature: sig.signature,
            slot: sig.slot,
            timestamp: sig.blockTime,
            err: sig.err,
            ...tx
          };
        })
      );

      return transactions;
    } catch (error) {
      console.error("Error getting recent transactions:", error);
      return [];
    }
  }

  /**
   * Airdrop SOL (devnet/testnet only)
   * @param {string} address - Recipient address
   * @param {number} amount - Amount in SOL
   * @returns {Promise<string>} Transaction signature
   */
  async airdrop(address, amount = 1) {
    const pubKey = new PublicKey(address);
    const signature = await this.connection.requestAirdrop(
      pubKey,
      amount * LAMPORTS_PER_SOL
    );
    await this.connection.confirmTransaction(signature);
    return signature;
  }

  /**
   * Validate address
   * @param {string} address - Address to validate
   * @returns {boolean} True if valid
   */
  isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get transaction fee
   * @param {string} message - Transaction message
   * @returns {Promise<number>} Fee in lamports
   */
  async getTransactionFee(message) {
    return await this.connection.getFeeForMessage(message);
  }

  /**
   * Get current epoch info
   * @returns {Promise<object>} Epoch information
   */
  async getEpochInfo() {
    return await this.connection.getEpochInfo();
  }

  /**
   * Get performance samples
   * @param {number} limit - Number of samples
   * @returns {Promise<Array>} Performance samples
   */
  async getRecentPerformanceSamples(limit = 10) {
    return await this.connection.getRecentPerformanceSamples(limit);
  }
}

module.exports = SolanaService;
