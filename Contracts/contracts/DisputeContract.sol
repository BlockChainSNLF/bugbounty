// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IBountyResolution.sol";
import "./interfaces/IDisputeContract.sol";

contract DisputeContract is IDisputeContract, Ownable, ReentrancyGuard {
    uint256 public constant JURY_SIZE = 3;

    struct Dispute {
        address bounty;
        address hunter;
        bytes32 reportHash;
        uint256 reportId;
        uint64 openedAt;
        uint64 deadline;
        uint8 upheldVotes;
        uint8 dismissedVotes;
        bool resolved;
        DisputeResult result;
    }

    event ArbitratorRegistered(address indexed arbitrator);
    event ArbitratorRemoved(address indexed arbitrator);
    event BountyRegistered(address indexed bounty);
    event PoolFunded(address indexed sender, uint256 amount);
    event PoolWithdrawn(address indexed owner, uint256 amount);
    event DisputeOpened(uint256 indexed disputeId, address indexed bounty, uint256 indexed reportId, address hunter);
    event ArbitratorsAssigned(uint256 indexed disputeId, address[3] arbitrators);
    event VoteCast(uint256 indexed disputeId, address indexed arbitrator, DisputeResult vote);
    event DisputeFinalized(uint256 indexed disputeId, DisputeResult result, uint8 votesCast);

    uint64 public immutable voteDuration;
    uint256 public immutable arbitratorFee;
    uint256 public reservedFees;
    uint256 public disputeCount;

    address[] private arbitrators;
    mapping(address => bool) public isArbitrator;
    mapping(address => bool) public isBounty;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => address[3]) private disputeArbitrators;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    modifier onlyBounty() {
        require(isBounty[msg.sender], "Only registered bounty");
        _;
    }

    modifier onlyAssigned(uint256 disputeId) {
        require(_isAssigned(disputeId, msg.sender), "Arbitrator not assigned");
        _;
    }

    constructor(uint64 _voteDuration, uint256 _arbitratorFee) Ownable(msg.sender) {
        require(_voteDuration > 0, "Invalid vote duration");
        voteDuration = _voteDuration;
        arbitratorFee = _arbitratorFee;
    }

    receive() external payable {
        emit PoolFunded(msg.sender, msg.value);
    }

    /// @notice Bounties self-register on deployment so only they can open disputes.
    function registerBounty() external {
        if (!isBounty[msg.sender]) {
            isBounty[msg.sender] = true;
            emit BountyRegistered(msg.sender);
        }
    }

    function registerArbitrator(address arbitrator) external onlyOwner {
        require(arbitrator != address(0), "Invalid arbitrator");
        require(!isArbitrator[arbitrator], "Already registered");
        isArbitrator[arbitrator] = true;
        arbitrators.push(arbitrator);
        emit ArbitratorRegistered(arbitrator);
    }

    function removeArbitrator(address arbitrator) external onlyOwner {
        require(isArbitrator[arbitrator], "Arbitrator not found");
        isArbitrator[arbitrator] = false;

        uint256 lastIndex = arbitrators.length - 1;
        for (uint256 i = 0; i < arbitrators.length; i++) {
            if (arbitrators[i] == arbitrator) {
                if (i != lastIndex) {
                    arbitrators[i] = arbitrators[lastIndex];
                }
                arbitrators.pop();
                emit ArbitratorRemoved(arbitrator);
                return;
            }
        }

        revert("Arbitrator not found");
    }

    function withdrawExcess(uint256 amount) external onlyOwner nonReentrant {
        require(amount <= getAvailablePool(), "Insufficient available pool");
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Withdraw failed");
        emit PoolWithdrawn(owner(), amount);
    }

    function getArbitrators() external view returns (address[] memory) {
        return arbitrators;
    }

    function getAssignedArbitrators(uint256 disputeId) external view returns (address[3] memory) {
        return disputeArbitrators[disputeId];
    }

    function isAssignedArbitrator(uint256 disputeId, address account) external view returns (bool) {
        return _isAssigned(disputeId, account);
    }

    function getAvailablePool() public view returns (uint256) {
        return address(this).balance - reservedFees;
    }

    function openDispute(
        uint256 reportId,
        bytes32 reportHash,
        address hunter
    ) external onlyBounty returns (uint256 disputeId) {
        require(arbitrators.length >= JURY_SIZE, "Not enough arbitrators");
        uint256 requiredReserve = arbitratorFee * JURY_SIZE;
        require(getAvailablePool() >= requiredReserve, "Insufficient arbitration pool");

        disputeId = disputeCount++;
        reservedFees += requiredReserve;

        Dispute storage dispute = disputes[disputeId];
        dispute.bounty = msg.sender;
        dispute.hunter = hunter;
        dispute.reportHash = reportHash;
        dispute.reportId = reportId;
        dispute.openedAt = uint64(block.timestamp);
        dispute.deadline = uint64(block.timestamp + voteDuration);

        address[3] memory selected = _selectArbitrators(reportId, disputeId);
        disputeArbitrators[disputeId] = selected;

        emit DisputeOpened(disputeId, msg.sender, reportId, hunter);
        emit ArbitratorsAssigned(disputeId, selected);
    }

    function vote(uint256 disputeId, DisputeResult voteResult) external onlyAssigned(disputeId) {
        Dispute storage dispute = disputes[disputeId];
        require(!dispute.resolved, "Dispute already resolved");
        require(block.timestamp <= dispute.deadline, "Voting window closed");
        require(!hasVoted[disputeId][msg.sender], "Vote already cast");

        hasVoted[disputeId][msg.sender] = true;
        if (voteResult == DisputeResult.UPHELD) {
            dispute.upheldVotes++;
        } else {
            dispute.dismissedVotes++;
        }

        emit VoteCast(disputeId, msg.sender, voteResult);
    }

    function finalizeDispute(uint256 disputeId) external nonReentrant {
        Dispute storage dispute = disputes[disputeId];
        require(dispute.bounty != address(0), "Dispute does not exist");
        require(!dispute.resolved, "Dispute already resolved");

        bool decisive = _hasDecisiveMajority(dispute);
        require(decisive || block.timestamp > dispute.deadline, "Dispute still active");

        DisputeResult result = _computeResult(dispute);
        dispute.resolved = true;
        dispute.result = result;
        reservedFees -= arbitratorFee * JURY_SIZE;

        IBountyResolution(dispute.bounty).resolveDispute(dispute.reportId, result);
        _payParticipatingArbitrators(disputeId);

        emit DisputeFinalized(disputeId, result, dispute.upheldVotes + dispute.dismissedVotes);
    }

    function _hasDecisiveMajority(Dispute storage dispute) private view returns (bool) {
        return dispute.upheldVotes >= 2 || dispute.dismissedVotes >= 2;
    }

    function _computeResult(Dispute storage dispute) private view returns (DisputeResult) {
        if (dispute.upheldVotes > dispute.dismissedVotes) {
            return DisputeResult.UPHELD;
        }
        return DisputeResult.DISMISSED;
    }

    function _isAssigned(uint256 disputeId, address account) private view returns (bool) {
        address[3] memory selected = disputeArbitrators[disputeId];
        return account == selected[0] || account == selected[1] || account == selected[2];
    }

    function _payParticipatingArbitrators(uint256 disputeId) private {
        if (arbitratorFee == 0) {
            return;
        }

        address[3] memory selected = disputeArbitrators[disputeId];
        for (uint256 i = 0; i < JURY_SIZE; i++) {
            address arbitrator = selected[i];
            if (!hasVoted[disputeId][arbitrator]) {
                continue;
            }

            (bool success, ) = payable(arbitrator).call{value: arbitratorFee}("");
            require(success, "Arbitrator payment failed");
        }
    }

    function _selectArbitrators(uint256 reportId, uint256 disputeId) private view returns (address[3] memory selected) {
        address[] memory pool = arbitrators;
        uint256 available = pool.length;

        for (uint256 i = 0; i < JURY_SIZE; i++) {
            uint256 randomIndex = uint256(
                keccak256(
                    abi.encode(
                        block.prevrandao,
                        block.timestamp,
                        msg.sender,
                        reportId,
                        disputeId,
                        i
                    )
                )
            ) % available;

            selected[i] = pool[randomIndex];
            pool[randomIndex] = pool[available - 1];
            available--;
        }
    }
}
