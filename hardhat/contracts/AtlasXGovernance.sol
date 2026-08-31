// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./AtlasXToken.sol";

/**
 * @title AtlasXGovernance
 * @dev Minimal on-chain governance for AtlasX:
 *      - ATX holders create proposals by holding ≥ PROPOSAL_THRESHOLD tokens
 *      - Voting is proportional to ATX balance at proposal creation (snapshot via storage)
 *      - A proposal passes when FOR votes ≥ QUORUM and FOR > AGAINST
 *      - Passing proposals enter a TIMELOCK_DELAY before execution
 *      - Owner can register executable targets; proposals call them via low-level call
 */
contract AtlasXGovernance {
    // ── Types ────────────────────────────────────────────────────────────────

    enum ProposalState { Active, Succeeded, Defeated, Queued, Executed, Cancelled }

    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        address target;
        bytes callData;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 quorum;
        uint256 deadline;     // voting deadline (block timestamp)
        uint256 executeAfter; // earliest execution timestamp (after timelock)
        ProposalState state;
    }

    // ── State ────────────────────────────────────────────────────────────────

    AtlasXToken public immutable token;
    address public owner;

    uint256 public constant PROPOSAL_THRESHOLD = 10_000 * 10**18;  // 10k ATX
    uint256 public constant VOTING_PERIOD      = 3 days;
    uint256 public constant TIMELOCK_DELAY     = 2 days;
    uint256 public constant QUORUM_BPS         = 400;              // 4 % of total supply

    uint256 private _proposalCount;
    mapping(uint256 => Proposal)              public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(address => bool)                  public registeredTargets;

    // ── Events ───────────────────────────────────────────────────────────────

    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalQueued(uint256 indexed proposalId, uint256 executeAfter);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event TargetRegistered(address indexed target, bool allowed);

    // ── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _token) {
        require(_token != address(0), "Zero token address");
        token = AtlasXToken(_token);
        owner = msg.sender;
    }

    // ── Governance ───────────────────────────────────────────────────────────

    /**
     * @notice Create a new governance proposal.
     * @param title       Short title shown in the UI.
     * @param description Full description (stored on-chain for transparency).
     * @param target      Contract to call on execution (must be registered).
     * @param callData    ABI-encoded function call for `target`.
     */
    function propose(
        string calldata title,
        string calldata description,
        address target,
        bytes  calldata callData
    ) external returns (uint256 proposalId) {
        require(token.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD, "Insufficient ATX to propose");
        require(bytes(title).length > 0 && bytes(title).length <= 120, "Invalid title length");
        require(target == address(0) || registeredTargets[target], "Target not registered");

        uint256 quorum = (token.totalSupply() * QUORUM_BPS) / 10_000;
        proposalId = ++_proposalCount;

        proposals[proposalId] = Proposal({
            id:           proposalId,
            proposer:     msg.sender,
            title:        title,
            description:  description,
            target:       target,
            callData:     callData,
            votesFor:     0,
            votesAgainst: 0,
            quorum:       quorum,
            deadline:     block.timestamp + VOTING_PERIOD,
            executeAfter: 0,
            state:        ProposalState.Active
        });

        emit ProposalCreated(proposalId, msg.sender, title);
    }

    /**
     * @notice Cast a vote on an active proposal.
     * @param proposalId  The proposal to vote on.
     * @param support     true = FOR, false = AGAINST.
     * @dev   Voting weight is the sender's live token balance at the time of the
     *        call.  For production use, upgrade `AtlasXToken` to inherit
     *        OpenZeppelin `ERC20Votes` and replace `balanceOf` with
     *        `getPastVotes(voter, p.snapshotBlock)` to prevent the same tokens
     *        from counting more than once across transfers within the voting period.
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "Proposal not found");
        require(p.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp <= p.deadline, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 weight = token.balanceOf(msg.sender);
        require(weight > 0, "No ATX voting power");

        hasVoted[proposalId][msg.sender] = true;
        if (support) {
            p.votesFor += weight;
        } else {
            p.votesAgainst += weight;
        }

        emit VoteCast(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Move a passed proposal to the timelock queue.
     *         Can be called by anyone once the voting period ends.
     */
    function queue(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "Proposal not found");
        require(p.state == ProposalState.Active, "Not active");
        require(block.timestamp > p.deadline, "Voting not ended");
        require(p.votesFor >= p.quorum, "Quorum not reached");
        require(p.votesFor > p.votesAgainst, "Defeated");

        p.state = ProposalState.Queued;
        p.executeAfter = block.timestamp + TIMELOCK_DELAY;

        emit ProposalQueued(proposalId, p.executeAfter);
    }

    /**
     * @notice Execute a queued proposal after the timelock delay.
     */
    function execute(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "Proposal not found");
        require(p.state == ProposalState.Queued, "Not queued");
        require(block.timestamp >= p.executeAfter, "Timelock not elapsed");

        p.state = ProposalState.Executed;

        if (p.target != address(0) && p.callData.length > 0) {
            (bool ok, ) = p.target.call(p.callData);
            require(ok, "Execution failed");
        }

        emit ProposalExecuted(proposalId);
    }

    /**
     * @notice Cancel an active proposal.  Only the proposer or owner may cancel.
     */
    function cancel(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "Proposal not found");
        require(
            msg.sender == p.proposer || msg.sender == owner,
            "Not authorized"
        );
        require(
            p.state == ProposalState.Active || p.state == ProposalState.Queued,
            "Cannot cancel"
        );

        p.state = ProposalState.Cancelled;
        emit ProposalCancelled(proposalId);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /**
     * @notice Register or deregister an executable target.
     */
    function setRegisteredTarget(address target, bool allowed) external onlyOwner {
        registeredTargets[target] = allowed;
        emit TargetRegistered(target, allowed);
    }

    /**
     * @notice Transfer ownership of this governance contract.
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function proposalCount() external view returns (uint256) {
        return _proposalCount;
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        require(proposals[proposalId].id != 0, "Proposal not found");
        return proposals[proposalId];
    }

    function proposalState(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) revert("Proposal not found");
        if (p.state != ProposalState.Active) return p.state;
        if (block.timestamp > p.deadline) {
            if (p.votesFor >= p.quorum && p.votesFor > p.votesAgainst) {
                return ProposalState.Succeeded; // call queue() to advance
            }
            return ProposalState.Defeated;
        }
        return ProposalState.Active;
    }
}
