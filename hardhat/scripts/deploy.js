// Deploy all AtlasX contracts to local Hardhat node
import hardhat from "hardhat";

const { ethers } = hardhat;
const [deployer] = await ethers.getSigners();
console.log(`Deploying from: ${deployer.address}`);

// 1. Deploy AtlasX Token
const AtlasXToken = await ethers.deployContract("AtlasXToken");
await AtlasXToken.waitForDeployment();
const tokenAddr = await AtlasXToken.getAddress();
console.log(`AtlasXToken deployed: ${tokenAddr}`);

// 2. Deploy USDT representation
const AtlasXUSDT = await ethers.deployContract("AtlasXUSDT1155", [
  "https://erc-dog-ca66d82b.gateway.tatum.io/metadata/atlasx-usdt.json",
]);
await AtlasXUSDT.waitForDeployment();
const usdtAddr = await AtlasXUSDT.getAddress();
console.log(`AtlasXUSDT1155 deployed: ${usdtAddr}`);

// 3. Deploy Asset Registry
const Registry = await ethers.deployContract("AtlasXAssetRegistry");
await Registry.waitForDeployment();
const registryAddr = await Registry.getAddress();
console.log(`AtlasXAssetRegistry deployed: ${registryAddr}`);

// 4. Deploy Factory
const Factory = await ethers.deployContract("AtlasXFactory");
await Factory.waitForDeployment();
const factoryAddr = await Factory.getAddress();
console.log(`AtlasXFactory deployed: ${factoryAddr}`);

// 5. Deploy Router
const Router = await ethers.deployContract("AtlasXRouter", [factoryAddr]);
await Router.waitForDeployment();
const routerAddr = await Router.getAddress();
console.log(`AtlasXRouter deployed: ${routerAddr}`);

// 6. Register ATX in registry
await (await Registry.registerAsset("ATX", "AtlasX Token", "https://erc-dog-ca66d82b.gateway.tatum.io/metadata/atx.json")).wait();
console.log(`ATX registered in registry`);

console.log("\n=== AtlasX DEX Deployment Complete ===");
console.log(JSON.stringify({
  AtlasXToken: tokenAddr,
  AtlasXUSDT1155: usdtAddr,
  AtlasXAssetRegistry: registryAddr,
  AtlasXFactory: factoryAddr,
  AtlasXRouter: routerAddr,
}, null, 2));
