// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AtlasXSecurity.sol";

contract AtlasXStaking is Ownable2Step, ReentrancyGuard {
    using SafeToken for address;

    uint256 private constant REWARD_PRECISION = 1e18;
    uint256 public constant MAX_REWARD_DURATION = 365 days;

    address public immutable stakingToken;
    address public immutable rewardsToken;
    uint256 public totalStaked;
    uint256 public rewardRate;
    uint256 public periodFinish;
    uint256 public lastUpdateTime;
    uint256 public rewardPerTokenStored;
    bool public paused;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public userRewardPerTokenPaid;
    mapping(address => uint256) public rewards;

    event Staked(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event RewardPaid(address indexed account, uint256 reward);
    event RewardAdded(uint256 reward, uint256 duration);
    event PauseChanged(bool paused);
    event TokenRecovered(address indexed token, address indexed recipient, uint256 amount);

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    constructor(address stakingToken_, address rewardsToken_) {
        require(
            stakingToken_.code.length > 0 && rewardsToken_.code.length > 0,
            "Invalid token"
        );
        stakingToken = stakingToken_;
        rewardsToken = rewardsToken_;
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        return rewardPerTokenStored
            + (
                (lastTimeRewardApplicable() - lastUpdateTime)
                    * rewardRate
                    * REWARD_PRECISION
            ) / totalStaked;
    }

    function earned(address account) public view returns (uint256) {
        return (
            balanceOf[account]
                * (rewardPerToken() - userRewardPerTokenPaid[account])
        ) / REWARD_PRECISION + rewards[account];
    }

    function stake(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        require(!paused, "Staking paused");
        require(amount > 0, "Zero amount");

        uint256 balanceBefore = stakingToken.safeBalanceOf(address(this));
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = stakingToken.safeBalanceOf(address(this)) - balanceBefore;
        require(received > 0, "No tokens received");

        totalStaked += received;
        balanceOf[msg.sender] += received;
        emit Staked(msg.sender, received);
    }

    function withdraw(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        _withdraw(msg.sender, amount);
    }

    function getReward() external nonReentrant updateReward(msg.sender) {
        _payReward(msg.sender);
    }

    function exit() external nonReentrant updateReward(msg.sender) {
        _withdraw(msg.sender, balanceOf[msg.sender]);
        _payReward(msg.sender);
    }

    function notifyRewardAmount(
        uint256 amount,
        uint256 duration
    ) external onlyOwner nonReentrant updateReward(address(0)) {
        require(amount > 0, "Zero reward");
        require(duration > 0 && duration <= MAX_REWARD_DURATION, "Invalid duration");

        uint256 balanceBefore = rewardsToken.safeBalanceOf(address(this));
        rewardsToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = rewardsToken.safeBalanceOf(address(this)) - balanceBefore;
        require(received > 0, "No rewards received");

        uint256 reward = received;
        if (block.timestamp < periodFinish) {
            reward += (periodFinish - block.timestamp) * rewardRate;
        }

        rewardRate = reward / duration;
        require(rewardRate > 0, "Reward rate is zero");

        uint256 availableRewards = rewardsToken.safeBalanceOf(address(this));
        if (rewardsToken == stakingToken) {
            require(availableRewards >= totalStaked, "Staked principal missing");
            availableRewards -= totalStaked;
        }
        require(rewardRate * duration <= availableRewards, "Insufficient rewards");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + duration;
        emit RewardAdded(received, duration);
    }

    function setPaused(bool paused_) external onlyOwner {
        paused = paused_;
        emit PauseChanged(paused_);
    }

    function recoverToken(
        address token,
        address recipient,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(token != stakingToken && token != rewardsToken, "Protected token");
        require(recipient != address(0), "Zero recipient");
        token.safeTransfer(recipient, amount);
        emit TokenRecovered(token, recipient, amount);
    }

    function _withdraw(address account, uint256 amount) private {
        require(amount > 0 && balanceOf[account] >= amount, "Invalid withdrawal");
        balanceOf[account] -= amount;
        totalStaked -= amount;
        stakingToken.safeTransfer(account, amount);
        emit Withdrawn(account, amount);
    }

    function _payReward(address account) private {
        uint256 reward = rewards[account];
        if (reward == 0) {
            return;
        }
        rewards[account] = 0;
        rewardsToken.safeTransfer(account, reward);
        emit RewardPaid(account, reward);
    }
}
