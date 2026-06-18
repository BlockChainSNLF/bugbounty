import { parseAbi } from "viem";

export const bountyAbi = parseAbi([
  "function company() view returns (address)",
  "function reward() view returns (uint256)",
  "function status() view returns (uint8)",
  "function reportCount() view returns (uint256)",
  "function disputeContract() view returns (address)",
  "function getReport(uint256 reportId) view returns ((address hunter, bytes32 hash, uint8 status, uint256 timestamp, uint256 rejectedAt, uint256 disputeId))",
  "function submitReport(bytes32 reportHash)",
  "function acceptReport(uint256 reportId)",
  "function rejectReport(uint256 reportId)",
  "function disputeReport(uint256 reportId)",
  "event BountyCreated(address indexed company, uint256 reward)",
  "event BountyCancelled()",
  "event BountyClosed(uint256 indexed reportId, address indexed hunter)",
  "event ReportSubmitted(uint256 indexed reportId, address indexed hunter)",
  "event ReportAccepted(uint256 indexed reportId, address indexed hunter)",
  "event ReportRejected(uint256 indexed reportId, address indexed hunter)",
  "event ReportDisputed(uint256 indexed reportId, uint256 indexed disputeId, address indexed hunter)",
  "event DisputeResolved(uint256 indexed reportId, uint8 result)"
]);

export const disputeAbi = parseAbi([
  "function owner() view returns (address)",
  "function voteDuration() view returns (uint64)",
  "function arbitratorFee() view returns (uint256)",
  "function disputeCount() view returns (uint256)",
  "function getArbitrators() view returns (address[])",
  "function getAssignedArbitrators(uint256 disputeId) view returns (address[3])",
  "function registerArbitrator(address arbitrator)",
  "function vote(uint256 disputeId, uint8 voteResult)",
  "function finalizeDispute(uint256 disputeId)",
  "event ArbitratorRegistered(address indexed arbitrator)",
  "event ArbitratorRemoved(address indexed arbitrator)",
  "event PoolFunded(address indexed sender, uint256 amount)",
  "event DisputeOpened(uint256 indexed disputeId, address indexed bounty, uint256 indexed reportId, address hunter)",
  "event ArbitratorsAssigned(uint256 indexed disputeId, address[3] arbitrators)",
  "event VoteCast(uint256 indexed disputeId, address indexed arbitrator, uint8 vote)",
  "event DisputeFinalized(uint256 indexed disputeId, uint8 result, uint8 votesCast)"
]);

export const reportStatusLabels = ["PENDING", "ACCEPTED", "REJECTED", "DISPUTED", "RESOLVED"] as const;
export const bountyStatusLabels = ["OPEN", "CANCELLED", "CLOSED"] as const;
export const disputeResultLabels = ["UPHELD", "DISMISSED"] as const;
