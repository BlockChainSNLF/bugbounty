import type { Abi } from "viem";

export const bountyAbi = [
  {
    type: "constructor",
    stateMutability: "payable",
    inputs: [{ name: "disputeContract", type: "address" }],
  },
  {
    type: "function",
    name: "company",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "reward",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "status",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "reportCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "disputeContract",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "getReport",
    stateMutability: "view",
    inputs: [{ name: "reportId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "hunter", type: "address" },
          { name: "hash", type: "bytes32" },
          { name: "status", type: "uint8" },
          { name: "timestamp", type: "uint256" },
          { name: "rejectedAt", type: "uint256" },
          { name: "disputeId", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "submitReport",
    stateMutability: "nonpayable",
    inputs: [{ name: "reportHash", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptReport",
    stateMutability: "nonpayable",
    inputs: [{ name: "reportId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "rejectReport",
    stateMutability: "nonpayable",
    inputs: [{ name: "reportId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "disputeReport",
    stateMutability: "nonpayable",
    inputs: [{ name: "reportId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "BountyCreated",
    inputs: [
      { name: "company", type: "address", indexed: true },
      { name: "reward", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "BountyCancelled",
    inputs: [],
    anonymous: false,
  },
  {
    type: "event",
    name: "BountyClosed",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReportSubmitted",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReportAccepted",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReportRejected",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ReportDisputed",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DisputeResolved",
    inputs: [
      { name: "reportId", type: "uint256", indexed: true },
      { name: "result", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
] as const satisfies Abi;

export const disputeAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "voteDuration",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "arbitratorFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "disputeCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getArbitrators",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    name: "getAssignedArbitrators",
    stateMutability: "view",
    inputs: [{ name: "disputeId", type: "uint256" }],
    outputs: [{ type: "address[3]" }],
  },
  {
    type: "function",
    name: "registerArbitrator",
    stateMutability: "nonpayable",
    inputs: [{ name: "arbitrator", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeArbitrator",
    stateMutability: "nonpayable",
    inputs: [{ name: "arbitrator", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "disputeId", type: "uint256" },
      { name: "voteResult", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeDispute",
    stateMutability: "nonpayable",
    inputs: [{ name: "disputeId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "ArbitratorRegistered",
    inputs: [{ name: "arbitrator", type: "address", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "ArbitratorRemoved",
    inputs: [{ name: "arbitrator", type: "address", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "PoolFunded",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DisputeOpened",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "bounty", type: "address", indexed: true },
      { name: "reportId", type: "uint256", indexed: true },
      { name: "hunter", type: "address", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "ArbitratorsAssigned",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "arbitrators", type: "address[3]", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "arbitrator", type: "address", indexed: true },
      { name: "vote", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "DisputeFinalized",
    inputs: [
      { name: "disputeId", type: "uint256", indexed: true },
      { name: "result", type: "uint8", indexed: false },
      { name: "votesCast", type: "uint8", indexed: false },
    ],
    anonymous: false,
  },
] as const satisfies Abi;

export const reportStatusLabels = ["PENDING", "ACCEPTED", "REJECTED", "DISPUTED", "RESOLVED"] as const;
export const bountyStatusLabels = ["OPEN", "CANCELLED", "CLOSED"] as const;
export const disputeResultLabels = ["UPHELD", "DISMISSED"] as const;
