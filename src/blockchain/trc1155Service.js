"use strict";
/**
 * TRC-1155 Service
 * Wraps the TRC1155 multi-token contracts deployed on TRON-compatible networks
 * (or any EVM-compatible chain via ethers).  The interface mirrors ERC1155Service
 * so the two can be used interchangeably in higher-level code.
 */

const { ethers } = require("ethers");

// Minimal ABI covering the ITRC1155 + metadata extension + optional mint/burn
const TRC1155_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address account, address operator) view returns (bool)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)",
  "function uri(uint256 id) view returns (string)",
  "function mint(address to, uint256 id, uint256 amount, bytes data)",
  "function mintBatch(address to, uint256[] ids, uint256[] amounts, bytes data)",
  "function burn(address from, uint256 id, uint256 amount)",
  "function burnBatch(address from, uint256[] ids, uint256[] amounts)",
  "function totalSupply(uint256 id) view returns (uint256)",
  "function exists(uint256 id) view returns (bool)",
  "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
  "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)",
  "event ApprovalForAll(address indexed account, address indexed operator, bool approved)",
  "event URI(string value, uint256 indexed id)",
];

class TRC1155Service {
  constructor() {
    this.provider = null;
    this.abi = TRC1155_ABI;
  }

  /**
   * Initialize provider.
   * Falls back to ETH_RPC_URL because TRC-1155 contracts compile to EVM bytecode
   * and can be deployed on any EVM-compatible chain.
   */
  initialize(rpcUrl = null) {
    try {
      const url = rpcUrl || process.env.ETH_RPC_URL || "https://ethereum.publicnode.com";
      this.provider = new ethers.JsonRpcProvider(url);
      return { success: true, message: "TRC-1155 service initialized" };
    } catch (error) {
      console.error("TRC-1155 initialization error:", error.message);
      return { success: false, error: error.message };
    }
  }

  _provider() {
    if (!this.provider) {
      this.initialize();
    }
    return this.provider;
  }

  _contract(address, signerOrProvider = null) {
    if (!ethers.isAddress(address)) {
      throw new Error(`Invalid contract address: ${address}`);
    }
    return new ethers.Contract(address, this.abi, signerOrProvider || this._provider());
  }

  // ── Read operations ──────────────────────────────────────────────────────

  async balanceOf(contractAddress, account, tokenId) {
    try {
      const contract = this._contract(contractAddress);
      const balance = await contract.balanceOf(account, tokenId);
      return { success: true, balance: balance.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async balanceOfBatch(contractAddress, accounts, tokenIds) {
    try {
      const contract = this._contract(contractAddress);
      const balances = await contract.balanceOfBatch(accounts, tokenIds);
      return { success: true, balances: balances.map((b) => b.toString()) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async isApprovedForAll(contractAddress, account, operator) {
    try {
      const contract = this._contract(contractAddress);
      const approved = await contract.isApprovedForAll(account, operator);
      return { success: true, approved };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getUri(contractAddress, tokenId) {
    try {
      const contract = this._contract(contractAddress);
      const uri = await contract.uri(tokenId);
      return { success: true, uri };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async totalSupply(contractAddress, tokenId) {
    try {
      const contract = this._contract(contractAddress);
      const supply = await contract.totalSupply(tokenId);
      return { success: true, totalSupply: supply.toString() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exists(contractAddress, tokenId) {
    try {
      const contract = this._contract(contractAddress);
      const exists = await contract.exists(tokenId);
      return { success: true, exists };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ── Write operations (require a signer) ──────────────────────────────────

  async setApprovalForAll(contractAddress, signer, operator, approved) {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.setApprovalForAll(operator, approved);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async safeTransferFrom(contractAddress, signer, from, to, tokenId, amount, data = "0x") {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.safeTransferFrom(from, to, tokenId, amount, data);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async safeBatchTransferFrom(contractAddress, signer, from, to, tokenIds, amounts, data = "0x") {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.safeBatchTransferFrom(from, to, tokenIds, amounts, data);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async mint(contractAddress, signer, to, tokenId, amount, data = "0x") {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.mint(to, tokenId, amount, data);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async mintBatch(contractAddress, signer, to, tokenIds, amounts, data = "0x") {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.mintBatch(to, tokenIds, amounts, data);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async burn(contractAddress, signer, from, tokenId, amount) {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.burn(from, tokenId, amount);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async burnBatch(contractAddress, signer, from, tokenIds, amounts) {
    try {
      const contract = this._contract(contractAddress, signer);
      const tx = await contract.burnBatch(from, tokenIds, amounts);
      const receipt = await tx.wait();
      return { success: true, txHash: receipt.hash };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = TRC1155Service;
