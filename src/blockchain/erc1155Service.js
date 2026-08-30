const { ethers } = require("ethers");

/**
 * ERC-1155 Multi-Token Standard Service
 * Supports both fungible and non-fungible tokens in a single contract
 */
class ERC1155Service {
  constructor() {
    this.provider = null;
    this.erc1155ABI = [
      // Standard ERC-1155 Interface
      "function balanceOf(address account, uint256 id) view returns (uint256)",
      "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
      "function setApprovalForAll(address operator, bool approved)",
      "function isApprovedForAll(address account, address operator) view returns (bool)",
      "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
      "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",

      // Metadata Extension
      "function uri(uint256 id) view returns (string)",

      // Events
      "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
      "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
      "event ApprovalForAll(address indexed account, address indexed operator, bool approved)",
      "event URI(string value, uint256 indexed id)",

      // Optional: Minting functions (if contract supports)
      "function mint(address to, uint256 id, uint256 amount, bytes data)",
      "function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data)",
      "function burn(address from, uint256 id, uint256 amount)",
      "function burnBatch(address from, uint256[] ids, uint256[] amounts)",

      // Common query functions
      "function totalSupply(uint256 id) view returns (uint256)",
      "function exists(uint256 id) view returns (bool)",
      "function name() view returns (string)",
      "function symbol() view returns (string)",
    ];
  }

  /**
   * Initialize provider
   */
  initialize(rpcUrl = null) {
    try {
      const providerUrl = rpcUrl || process.env.ETH_RPC_URL || "https://ethereum.publicnode.com";
      this.provider = new ethers.JsonRpcProvider(providerUrl);
      return { success: true, message: "ERC-1155 service initialized" };
    } catch (error) {
      console.error("ERC-1155 initialization error:", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contract instance
   */
  getContract(contractAddress, signerOrProvider = null) {
    if (!ethers.isAddress(contractAddress)) {
      throw new Error("Invalid contract address");
    }

    const providerOrSigner = signerOrProvider || this.provider;
    return new ethers.Contract(contractAddress, this.erc1155ABI, providerOrSigner);
  }

  /**
   * Get signer from private key
   */
  getSigner(privateKey) {
    if (!privateKey || !privateKey.startsWith("0x")) {
      throw new Error("Invalid private key format");
    }
    return new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Get balance of a specific token ID for an account
   */
  async getBalance(contractAddress, accountAddress, tokenId) {
    try {
      const contract = this.getContract(contractAddress);
      const balance = await contract.balanceOf(accountAddress, tokenId);

      return {
        success: true,
        contractAddress,
        accountAddress,
        tokenId: tokenId.toString(),
        balance: balance.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get balances of multiple token IDs for multiple accounts (batch)
   */
  async getBalanceBatch(contractAddress, accounts, tokenIds) {
    try {
      if (accounts.length !== tokenIds.length) {
        throw new Error("Accounts and token IDs arrays must have the same length");
      }

      const contract = this.getContract(contractAddress);
      const balances = await contract.balanceOfBatch(accounts, tokenIds);

      const results = balances.map((balance, index) => ({
        account: accounts[index],
        tokenId: tokenIds[index].toString(),
        balance: balance.toString(),
      }));

      return {
        success: true,
        contractAddress,
        balances: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get token metadata URI
   */
  async getTokenURI(contractAddress, tokenId) {
    try {
      const contract = this.getContract(contractAddress);
      const uri = await contract.uri(tokenId);

      // Fetch metadata if it's an HTTP(S) URL
      let metadata = null;
      if (uri.startsWith("http://") || uri.startsWith("https://")) {
        try {
          const response = await fetch(uri);
          metadata = await response.json();
        } catch (e) {
          console.warn("Failed to fetch metadata:", e.message);
        }
      }

      return {
        success: true,
        contractAddress,
        tokenId: tokenId.toString(),
        uri,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if operator is approved for all tokens
   */
  async isApprovedForAll(contractAddress, owner, operator) {
    try {
      const contract = this.getContract(contractAddress);
      const approved = await contract.isApprovedForAll(owner, operator);

      return {
        success: true,
        owner,
        operator,
        approved,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set approval for all tokens to an operator
   */
  async setApprovalForAll(contractAddress, privateKey, operator, approved) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      const tx = await contract.setApprovalForAll(operator, approved);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        operator,
        approved,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transfer single token
   */
  async safeTransferFrom(contractAddress, privateKey, from, to, tokenId, amount, data = "0x") {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      // Ensure amount is a BigInt
      const amountBN = BigInt(amount);

      const tx = await contract.safeTransferFrom(from, to, tokenId, amountBN, data);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        from,
        to,
        tokenId: tokenId.toString(),
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Transfer multiple tokens (batch)
   */
  async safeBatchTransferFrom(
    contractAddress,
    privateKey,
    from,
    to,
    tokenIds,
    amounts,
    data = "0x"
  ) {
    try {
      if (tokenIds.length !== amounts.length) {
        throw new Error("Token IDs and amounts arrays must have the same length");
      }

      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      // Convert amounts to BigInt array
      const amountsBN = amounts.map((amt) => BigInt(amt));

      const tx = await contract.safeBatchTransferFrom(from, to, tokenIds, amountsBN, data);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        from,
        to,
        tokenIds: tokenIds.map((id) => id.toString()),
        amounts: amounts.map((amt) => amt.toString()),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mint new tokens (if contract supports minting)
   */
  async mint(contractAddress, privateKey, to, tokenId, amount, data = "0x") {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      const amountBN = BigInt(amount);

      const tx = await contract.mint(to, tokenId, amountBN, data);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        to,
        tokenId: tokenId.toString(),
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mint multiple tokens (batch)
   */
  async mintBatch(contractAddress, privateKey, to, tokenIds, amounts, data = "0x") {
    try {
      if (tokenIds.length !== amounts.length) {
        throw new Error("Token IDs and amounts arrays must have the same length");
      }

      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      const amountsBN = amounts.map((amt) => BigInt(amt));

      const tx = await contract.mintBatch(to, tokenIds, amountsBN, data);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        to,
        tokenIds: tokenIds.map((id) => id.toString()),
        amounts: amounts.map((amt) => amt.toString()),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Burn tokens
   */
  async burn(contractAddress, privateKey, from, tokenId, amount) {
    try {
      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      const amountBN = BigInt(amount);

      const tx = await contract.burn(from, tokenId, amountBN);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        from,
        tokenId: tokenId.toString(),
        amount: amount.toString(),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Burn multiple tokens (batch)
   */
  async burnBatch(contractAddress, privateKey, from, tokenIds, amounts) {
    try {
      if (tokenIds.length !== amounts.length) {
        throw new Error("Token IDs and amounts arrays must have the same length");
      }

      const signer = this.getSigner(privateKey);
      const contract = this.getContract(contractAddress, signer);

      const amountsBN = amounts.map((amt) => BigInt(amt));

      const tx = await contract.burnBatch(from, tokenIds, amountsBN);
      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.hash,
        from,
        tokenIds: tokenIds.map((id) => id.toString()),
        amounts: amounts.map((amt) => amt.toString()),
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get total supply of a token ID (if supported)
   */
  async getTotalSupply(contractAddress, tokenId) {
    try {
      const contract = this.getContract(contractAddress);
      const supply = await contract.totalSupply(tokenId);

      return {
        success: true,
        contractAddress,
        tokenId: tokenId.toString(),
        totalSupply: supply.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if token ID exists
   */
  async exists(contractAddress, tokenId) {
    try {
      const contract = this.getContract(contractAddress);
      const exists = await contract.exists(tokenId);

      return {
        success: true,
        contractAddress,
        tokenId: tokenId.toString(),
        exists,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get contract name and symbol (if supported)
   */
  async getContractInfo(contractAddress) {
    try {
      const contract = this.getContract(contractAddress);

      let name = "Unknown";
      let symbol = "Unknown";

      try {
        name = await contract.name();
      } catch {
        console.warn("Contract does not support name()");
      }

      try {
        symbol = await contract.symbol();
      } catch {
        console.warn("Contract does not support symbol()");
      }

      return {
        success: true,
        contractAddress,
        name,
        symbol,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Estimate gas for transfer
   */
  async estimateTransferGas(contractAddress, from, to, tokenId, amount) {
    try {
      const contract = this.getContract(contractAddress);
      const gasEstimate = await contract.safeTransferFrom.estimateGas(
        from,
        to,
        tokenId,
        BigInt(amount),
        "0x"
      );

      return {
        success: true,
        gasEstimate: gasEstimate.toString(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return {
          success: false,
          error: "Transaction not found",
        };
      }

      return {
        success: true,
        receipt: {
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status === 1 ? "success" : "failed",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse transfer events from transaction receipt
   */
  parseTransferEvents(receipt) {
    try {
      const contract = this.getContract(receipt.to);
      const events = [];

      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog(log);
          if (parsedLog.name === "TransferSingle" || parsedLog.name === "TransferBatch") {
            events.push({
              event: parsedLog.name,
              args: parsedLog.args,
            });
          }
        } catch {
          // Not an ERC-1155 event, skip
        }
      }

      return {
        success: true,
        events,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = ERC1155Service;
