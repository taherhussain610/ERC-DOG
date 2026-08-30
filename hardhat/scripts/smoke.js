import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.create();
const registry = await ethers.deployContract("AtlasXAssetRegistry");
await registry.waitForDeployment();

const token = await ethers.deployContract("AtlasXUSDT1155", [
  "https://erc-dog-ca66d82b.gateway.tatum.io/metadata/atlasx-usdt.json",
]);
await token.waitForDeployment();

const transaction = await registry.registerAsset(
  "ATX",
  "ERC Test Asset",
  "https://example.com/atlasx.json"
);
await transaction.wait();

assert.equal(await registry.totalAssets(), 1n);
const asset = await registry.assetAt(0);
assert.equal(asset.symbol, "ATX");
assert.equal(asset.name, "ERC Test Asset");
assert.equal(asset.metadataUri, "https://example.com/atlasx.json");

assert.equal(await token.name(), "ERC USDT TRC20 (ERC-1155 representation)");
assert.equal(await token.symbol(), "USDT");
assert.equal(await token.networkName(), "ERC");
assert.equal(await token.totalSupply(1), 50_000_000n);
assert.equal(
  await token.balanceOf(await (await ethers.getSigners())[0].getAddress(), 1),
  50_000_000n
);
assert.equal(await token.UNIT_VALUE_USD_6DP(), 1_000_000n);
assert.equal(
  await token.uri(1),
  "https://erc-dog-ca66d82b.gateway.tatum.io/metadata/atlasx-usdt.json"
);

console.log(
  `Hardhat registry and ERC USDT ERC-1155 smoke passed at ${await registry.getAddress()} and ${await token.getAddress()}`
);
