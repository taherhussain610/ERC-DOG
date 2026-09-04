import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.create();
const [deployer, trader, feeRecipient] = await ethers.getSigners();
const deployerAddress = await deployer.getAddress();
const traderAddress = await trader.getAddress();
const feeRecipientAddress = await feeRecipient.getAddress();

const registry = await ethers.deployContract("AtlasXAssetRegistry");
await registry.waitForDeployment();

const multiToken = await ethers.deployContract("AtlasXUSDT1155", [
  "https://erc-dog-ca66d82b.gateway.tatum.io/metadata/atlasx-usdt.json",
]);
await multiToken.waitForDeployment();

await (
  await registry.registerAsset(
    "ATX",
    "ERC Test Asset",
    "https://example.com/atlasx.json",
  )
).wait();

assert.equal(await registry.totalAssets(), 1n);
const asset = await registry.assetAt(0);
assert.equal(asset.symbol, "ATX");
assert.equal(asset.name, "ERC Test Asset");
assert.equal(asset.metadataUri, "https://example.com/atlasx.json");

assert.equal(
  await multiToken.name(),
  "ERC USDT TRC20 (ERC-1155 representation)",
);
assert.equal(await multiToken.symbol(), "USDT");
assert.equal(await multiToken.networkName(), "ERC");
assert.equal(await multiToken.totalSupply(1), 50_000_000n);
assert.equal(await multiToken.balanceOf(deployerAddress, 1), 50_000_000n);
assert.equal(await multiToken.UNIT_VALUE_USD_6DP(), 1_000_000n);
assert.equal(
  await multiToken.uri(1),
  "https://erc-dog-ca66d82b.gateway.tatum.io/metadata/atlasx-usdt.json",
);

await (
  await multiToken.safeTransferFrom(
    deployerAddress,
    traderAddress,
    1,
    100,
    "0x",
  )
).wait();
await (await multiToken.connect(trader).burn(traderAddress, 1, 10)).wait();
assert.equal(await multiToken.balanceOf(traderAddress, 1), 90n);
assert.equal(await multiToken.totalSupply(1), 49_999_990n);

await (await multiToken.pause()).wait();
await assert.rejects(
  multiToken
    .connect(trader)
    .safeTransferFrom(traderAddress, deployerAddress, 1, 1, "0x"),
);
await (await multiToken.unpause()).wait();
await assert.rejects(
  multiToken.safeTransferFrom(
    deployerAddress,
    await registry.getAddress(),
    1,
    1,
    "0x",
  ),
);

const marketplace = await ethers.deployContract("AtlasXMarketplace", [
  feeRecipientAddress,
  250,
]);
await marketplace.waitForDeployment();
const marketplaceAddress = await marketplace.getAddress();
await (await multiToken.setApprovalForAll(marketplaceAddress, true)).wait();

const latestBlock = await ethers.provider.getBlock("latest");
const deadline = BigInt(latestBlock.timestamp + 3_600);
const unitPrice = ethers.parseEther("0.001");
await (
  await marketplace.createListing(
    await multiToken.getAddress(),
    1,
    10,
    unitPrice,
    deadline,
  )
).wait();

const purchasedAmount = 2n;
const totalPrice = unitPrice * purchasedAmount;
const buyerBalanceBefore = await multiToken.balanceOf(traderAddress, 1);
await (
  await marketplace
    .connect(trader)
    .buy(1, purchasedAmount, { value: totalPrice })
).wait();
assert.equal(
  await multiToken.balanceOf(traderAddress, 1),
  buyerBalanceBefore + purchasedAmount,
);
const protocolFee = (totalPrice * 250n) / 10_000n;
assert.equal(
  await marketplace.proceeds(deployerAddress),
  totalPrice - protocolFee,
);
assert.equal(await marketplace.proceeds(feeRecipientAddress), protocolFee);
await (await marketplace.withdrawProceeds()).wait();
assert.equal(await marketplace.proceeds(deployerAddress), 0n);
await (await marketplace.cancelListing(1)).wait();

const tokenA = await ethers.deployContract("AtlasXToken");
const tokenB = await ethers.deployContract("AtlasXToken");
await Promise.all([tokenA.waitForDeployment(), tokenB.waitForDeployment()]);
const tokenAAddress = await tokenA.getAddress();
const tokenBAddress = await tokenB.getAddress();

const factory = await ethers.deployContract("AtlasXFactory");
await factory.waitForDeployment();
const router = await ethers.deployContract("AtlasXRouter", [
  await factory.getAddress(),
]);
await router.waitForDeployment();
const routerAddress = await router.getAddress();

const liquidityAmount = ethers.parseEther("100000");
await (await tokenA.approve(routerAddress, liquidityAmount)).wait();
await (await tokenB.approve(routerAddress, liquidityAmount)).wait();
await (
  await router.addLiquidity({
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    amountADesired: liquidityAmount,
    amountBDesired: liquidityAmount,
    amountAMin: liquidityAmount,
    amountBMin: liquidityAmount,
    minLiquidity: 1,
    recipient: deployerAddress,
    deadline,
  })
).wait();

const pairAddress = await factory.getPair(tokenAAddress, tokenBAddress);
const pair = await ethers.getContractAt("AtlasXPair", pairAddress);
const lpBalance = await pair.liquidity(deployerAddress);
assert.ok(lpBalance > 0n);
assert.equal(await tokenA.balanceOf(routerAddress), 0n);
assert.equal(await tokenB.balanceOf(routerAddress), 0n);

const excessAmount = ethers.parseEther("1000");
const proportionalAmount = ethers.parseEther("10");
await (await tokenA.approve(routerAddress, excessAmount)).wait();
await (await tokenB.approve(routerAddress, proportionalAmount)).wait();
const tokenABeforeImbalancedAdd = await tokenA.balanceOf(deployerAddress);
const tokenBBeforeImbalancedAdd = await tokenB.balanceOf(deployerAddress);
await (
  await router.addLiquidity({
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    amountADesired: excessAmount,
    amountBDesired: proportionalAmount,
    amountAMin: proportionalAmount,
    amountBMin: proportionalAmount,
    minLiquidity: 1,
    recipient: deployerAddress,
    deadline,
  })
).wait();
assert.equal(
  tokenABeforeImbalancedAdd - (await tokenA.balanceOf(deployerAddress)),
  proportionalAmount,
);
assert.equal(
  tokenBBeforeImbalancedAdd - (await tokenB.balanceOf(deployerAddress)),
  proportionalAmount,
);
assert.equal(await tokenA.balanceOf(routerAddress), 0n);
assert.equal(await tokenB.balanceOf(routerAddress), 0n);

const traderFunding = ethers.parseEther("1000");
const swapAmount = ethers.parseEther("10");
await (await tokenA.transfer(traderAddress, traderFunding)).wait();
await (await tokenA.connect(trader).approve(routerAddress, swapAmount)).wait();
const quotedOutput = await router.getAmountOut(
  tokenAAddress,
  tokenBAddress,
  swapAmount,
);
const traderTokenBBefore = await tokenB.balanceOf(traderAddress);
await assert.rejects(
  router.connect(trader).swapExactTokensForTokens({
    tokenIn: tokenAAddress,
    tokenOut: tokenBAddress,
    amountIn: swapAmount,
    amountOutMin: quotedOutput + 1n,
    recipient: traderAddress,
    deadline,
  }),
);
await (
  await router.connect(trader).swapExactTokensForTokens({
    tokenIn: tokenAAddress,
    tokenOut: tokenBAddress,
    amountIn: swapAmount,
    amountOutMin: (quotedOutput * 99n) / 100n,
    recipient: traderAddress,
    deadline,
  })
).wait();
assert.ok((await tokenB.balanceOf(traderAddress)) > traderTokenBBefore);
assert.equal(await tokenA.balanceOf(routerAddress), 0n);
assert.equal(await tokenB.balanceOf(routerAddress), 0n);

const lpBalanceBeforeRemoval = await pair.liquidity(deployerAddress);
const liquidityToRemove = lpBalanceBeforeRemoval / 10n;
await (await pair.approveLiquidity(routerAddress, liquidityToRemove)).wait();
await (
  await router.removeLiquidity({
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    lpTokens: liquidityToRemove,
    amountAMin: 1,
    amountBMin: 1,
    recipient: deployerAddress,
    deadline,
  })
).wait();
assert.equal(
  await pair.liquidity(deployerAddress),
  lpBalanceBeforeRemoval - liquidityToRemove,
);

const staking = await ethers.deployContract("AtlasXStaking", [
  tokenAAddress,
  tokenBAddress,
]);
await staking.waitForDeployment();
const stakingAddress = await staking.getAddress();
const rewardAmount = ethers.parseEther("1000");
const stakeAmount = ethers.parseEther("100");
await (await tokenB.approve(stakingAddress, rewardAmount)).wait();
await (await staking.notifyRewardAmount(rewardAmount, 1_000)).wait();
await (
  await tokenA.connect(trader).approve(stakingAddress, stakeAmount)
).wait();
await (await staking.connect(trader).stake(stakeAmount)).wait();

await ethers.provider.send("evm_increaseTime", [100]);
await ethers.provider.send("evm_mine", []);
assert.ok((await staking.earned(traderAddress)) > 0n);
const rewardsBefore = await tokenB.balanceOf(traderAddress);
await (await staking.connect(trader).getReward()).wait();
assert.ok((await tokenB.balanceOf(traderAddress)) > rewardsBefore);
await (await staking.connect(trader).exit()).wait();
assert.equal(await staking.balanceOf(traderAddress), 0n);

console.log(
  "Hardhat registry, ERC-1155, marketplace, DEX, and staking smoke passed",
);
