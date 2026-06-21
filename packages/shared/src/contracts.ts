import type { Abi } from "viem";

// AUTO-GENERATED from Contracts/artifacts. Do not edit by hand.
// Regenerate after changing the Solidity contracts.

export const bountyAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_disputeContract",
        "type": "address"
      }
    ],
    "stateMutability": "payable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [],
    "name": "BountyCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "BountyClosed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "company",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "reward",
        "type": "uint256"
      }
    ],
    "name": "BountyCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum DisputeResult",
        "name": "result",
        "type": "uint8"
      }
    ],
    "name": "DisputeResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "ReportAccepted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "ReportDisputed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "ReportRejected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "ReportSubmitted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DISPUTE_WINDOW",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      }
    ],
    "name": "acceptReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "activeReports",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "company",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "disputeContract",
    "outputs": [
      {
        "internalType": "contract IDisputeContract",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      }
    ],
    "name": "disputeReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "disputedReports",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      }
    ],
    "name": "getReport",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "hunter",
            "type": "address"
          },
          {
            "internalType": "bytes32",
            "name": "hash",
            "type": "bytes32"
          },
          {
            "internalType": "enum Bounty.ReportStatus",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rejectedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "disputeId",
            "type": "uint256"
          }
        ],
        "internalType": "struct Bounty.Report",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "lastRejectedAt",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oldestPendingReport",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      }
    ],
    "name": "rejectReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reportCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "reports",
    "outputs": [
      {
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "hash",
        "type": "bytes32"
      },
      {
        "internalType": "enum Bounty.ReportStatus",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "rejectedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "internalType": "enum DisputeResult",
        "name": "result",
        "type": "uint8"
      }
    ],
    "name": "resolveDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reward",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "status",
    "outputs": [
      {
        "internalType": "enum Bounty.Status",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "reportHash",
        "type": "bytes32"
      }
    ],
    "name": "submitReport",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const satisfies Abi;

export const disputeAbi = [
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "_voteDuration",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "_arbitratorFee",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "arbitrator",
        "type": "address"
      }
    ],
    "name": "ArbitratorRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "arbitrator",
        "type": "address"
      }
    ],
    "name": "ArbitratorRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address[3]",
        "name": "arbitrators",
        "type": "address[3]"
      }
    ],
    "name": "ArbitratorsAssigned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "bounty",
        "type": "address"
      }
    ],
    "name": "BountyRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum DisputeResult",
        "name": "result",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "votesCast",
        "type": "uint8"
      }
    ],
    "name": "DisputeFinalized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "bounty",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "DisputeOpened",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PoolFunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "PoolWithdrawn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "arbitrator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "enum DisputeResult",
        "name": "vote",
        "type": "uint8"
      }
    ],
    "name": "VoteCast",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "JURY_SIZE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "arbitratorFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "disputeCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "disputes",
    "outputs": [
      {
        "internalType": "address",
        "name": "bounty",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "reportHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "openedAt",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "deadline",
        "type": "uint64"
      },
      {
        "internalType": "uint8",
        "name": "upheldVotes",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "dismissedVotes",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "resolved",
        "type": "bool"
      },
      {
        "internalType": "enum DisputeResult",
        "name": "result",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      }
    ],
    "name": "finalizeDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getArbitrators",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      }
    ],
    "name": "getAssignedArbitrators",
    "outputs": [
      {
        "internalType": "address[3]",
        "name": "",
        "type": "address[3]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAvailablePool",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "hasVoted",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isArbitrator",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "isAssignedArbitrator",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isBounty",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "reportId",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "reportHash",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "hunter",
        "type": "address"
      }
    ],
    "name": "openDispute",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "arbitrator",
        "type": "address"
      }
    ],
    "name": "registerArbitrator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "registerBounty",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "arbitrator",
        "type": "address"
      }
    ],
    "name": "removeArbitrator",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reservedFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "disputeId",
        "type": "uint256"
      },
      {
        "internalType": "enum DisputeResult",
        "name": "voteResult",
        "type": "uint8"
      }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "voteDuration",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdrawExcess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const satisfies Abi;

export const bountyBytecode = "0x6080604052604051612e61380380612e618339818101604052810190610025919061040b565b335f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603610096575f6040517f1e4fbdf700000000000000000000000000000000000000000000000000000000815260040161008d9190610445565b60405180910390fd5b6100a5816102ba60201b60201c565b5060016100c46100b961037b60201b60201c565b6103a460201b60201c565b5f01819055505f341161010c576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610103906104de565b60405180910390fd5b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff160361017a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161017190610546565b60405180910390fd5b346001819055505f60025f6101000a81548160ff021916908360028111156101a5576101a4610564565b5b02179055508060085f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555060085f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16637ff120666040518163ffffffff1660e01b81526004015f604051808303815f87803b158015610250575f5ffd5b505af1158015610262573d5f5f3e3d5ffd5b505050503373ffffffffffffffffffffffffffffffffffffffff167f5cc937fae61d1ffa904ad783044849b94e0161a56db15f6c6fc66a54f17b6aad346040516102ac91906105a9565b60405180910390a2506105c2565b5f5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050815f5f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f5ffd5b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6103da826103b1565b9050919050565b6103ea816103d0565b81146103f4575f5ffd5b50565b5f81519050610405816103e1565b92915050565b5f602082840312156104205761041f6103ad565b5b5f61042d848285016103f7565b91505092915050565b61043f816103d0565b82525050565b5f6020820190506104585f830184610436565b92915050565b5f82825260208201905092915050565b7f496e73756666696369656e742066756e647320746f206f70656e20626f756e745f8201527f7900000000000000000000000000000000000000000000000000000000000000602082015250565b5f6104c860218361045e565b91506104d38261046e565b604082019050919050565b5f6020820190508181035f8301526104f5816104bc565b9050919050565b7f496e76616c6964206469737075746520636f6e747261637400000000000000005f82015250565b5f61053060188361045e565b915061053b826104fc565b602082019050919050565b5f6020820190508181035f83015261055d81610524565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b5f819050919050565b6105a381610591565b82525050565b5f6020820190506105bc5f83018461059a565b92915050565b612892806105cf5f395ff3fe608060405234801561000f575f5ffd5b5060043610610140575f3560e01c8063872c5de3116100b6578063e55e42111161007a578063e55e421114610321578063ec358f051461033d578063f256330b1461035b578063f2fde38b14610377578063f585dc5714610393578063fb2ed345146103b157610140565b8063872c5de31461028a5780638da5cb5b146102a8578063a913eb08146102c6578063c942adf7146102d0578063cacbf9611461030557610140565b80634010b84e116101085780634010b84e146101d85780634e7f9b19146101f65780635d42aebe146102265780636904c94d14610244578063715018a61461026257806371821df91461026c57610140565b806312065fe014610144578063185c6f8414610162578063200d2ed214610180578063228cb7331461019e578063248b0656146101bc575b5f5ffd5b61014c6103cd565b6040516101599190611b23565b60405180910390f35b61016a6103d4565b6040516101779190611b23565b60405180910390f35b6101886103da565b6040516101959190611baf565b60405180910390f35b6101a66103ec565b6040516101b39190611b23565b60405180910390f35b6101d660048036038101906101d19190611bf6565b6103f2565b005b6101e0610786565b6040516101ed9190611c9b565b60405180910390f35b610210600480360381019061020b9190611bf6565b6107ab565b60405161021d9190611dba565b60405180910390f35b61022e6108d0565b60405161023b9190611b23565b60405180910390f35b61024c6108d6565b6040516102599190611de2565b60405180910390f35b61026a6108e4565b005b6102746108f7565b6040516102819190611b23565b60405180910390f35b6102926108fd565b60405161029f9190611b23565b60405180910390f35b6102b0610903565b6040516102bd9190611de2565b60405180910390f35b6102ce61092a565b005b6102ea60048036038101906102e59190611bf6565b610b09565b6040516102fc96959493929190611e19565b60405180910390f35b61031f600480360381019061031a9190611bf6565b610b6c565b005b61033b60048036038101906103369190611e9b565b610eb3565b005b610345611222565b6040516103529190611ef4565b60405180910390f35b61037560048036038101906103709190611bf6565b611235565b005b610391600480360381019061038c9190611f37565b6114ba565b005b61039b61153e565b6040516103a89190611b23565b60405180910390f35b6103cb60048036038101906103c69190611f8c565b611545565b005b5f47905090565b60055481565b60025f9054906101000a900460ff1681565b60015481565b6103fa6117ec565b5f600281111561040d5761040c611b3c565b5b60025f9054906101000a900460ff16600281111561042e5761042d611b3c565b5b1461046e576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161046590612011565b60405180910390fd5b8060065481146104b3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104aa90612079565b60405180910390fd5b5f600354146104f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016104ee906120e1565b60405180910390fd5b6104ff611873565b5f60045f8481526020019081526020015f2090505f600481111561052657610525611b3c565b5b816002015f9054906101000a900460ff16600481111561054957610548611b3c565b5b14610589576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161058090612149565b60405180910390fd5b6203f48060075461059a9190612194565b42116105db576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105d290612211565b60405180910390fd5b6001816002015f6101000a81548160ff0219169083600481111561060257610601611b3c565b5b02179055506002600181819054906101000a900460ff16809291906106269061222f565b91906101000a81548160ff021916908360ff1602179055505060065f81548092919061065190612256565b91905055506002805f6101000a81548160ff0219169083600281111561067a57610679611b3c565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16837f67d19636b49381da7c69449c7ad40fdd4961c2823bb449c2ca20c147498b363460405160405180910390a3805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16837ffd8fb3c1e880315007f9520b97dbfe17dfd3f01a2cc3366472535504b0263c7260405160405180910390a3610779815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16600154611895565b50610782611942565b5050565b60085f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6107b3611ab3565b60055482106107f7576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107ee906122e7565b60405180910390fd5b60045f8381526020019081526020015f206040518060c00160405290815f82015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200160018201548152602001600282015f9054906101000a900460ff16600481111561089557610894611b3c565b5b60048111156108a7576108a6611b3c565b5b815260200160038201548152602001600482015481526020016005820154815250509050919050565b60035481565b5f6108df610903565b905090565b6108ec6117ec565b6108f55f61195c565b565b60075481565b60065481565b5f5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b6109326117ec565b5f600281111561094557610944611b3c565b5b60025f9054906101000a900460ff16600281111561096657610965611b3c565b5b146109a6576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161099d90612011565b60405180910390fd5b6109ae611873565b5f600260019054906101000a900460ff1660ff1614610a02576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109f990612375565b60405180910390fd5b5f60035414610a46576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a3d90612403565b60405180910390fd5b6203f480600754610a579190612194565b4211610a98576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a8f90612211565b60405180910390fd5b600160025f6101000a81548160ff02191690836002811115610abd57610abc611b3c565b5b02179055507f86a5139d39ed69a8bd113a46ed8203278c6c3ebed14a2179e9f8989930eb0a1560405160405180910390a1610aff610af9610903565b47611895565b610b07611942565b565b6004602052805f5260405f205f91509050805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1690806001015490806002015f9054906101000a900460ff16908060030154908060040154908060050154905086565b5f6002811115610b7f57610b7e611b3c565b5b60025f9054906101000a900460ff166002811115610ba057610b9f611b3c565b5b14610be0576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610bd790612011565b60405180910390fd5b5f60045f8381526020019081526020015f2090503373ffffffffffffffffffffffffffffffffffffffff16815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614610c84576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610c7b9061246b565b60405180910390fd5b60026004811115610c9857610c97611b3c565b5b816002015f9054906101000a900460ff166004811115610cbb57610cba611b3c565b5b14610cfb576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610cf2906124d3565b60405180910390fd5b6203f4808160040154610d0e9190612194565b421115610d50576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610d479061253b565b60405180910390fd5b6003816002015f6101000a81548160ff02191690836004811115610d7757610d76611b3c565b5b02179055505f60078190555060085f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663f8bdb7aa838360010154845f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff166040518463ffffffff1660e01b8152600401610e0793929190612559565b6020604051808303815f875af1158015610e23573d5f5f3e3d5ffd5b505050506040513d601f19601f82011682018060405250810190610e4791906125a2565b816005018190555060035f815480929190610e6190612256565b91905055503373ffffffffffffffffffffffffffffffffffffffff168160050154837fc2d29803b07528bf3d067a46c3c9450bf97b7c3f420fef77d5698f6baa31fda560405160405180910390a45050565b60085f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610f42576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f3990612617565b60405180910390fd5b610f4a611873565b6005548210610f8e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f85906122e7565b60405180910390fd5b5f60045f8481526020019081526020015f20905060036004811115610fb657610fb5611b3c565b5b816002015f9054906101000a900460ff166004811115610fd957610fd8611b3c565b5b14611019576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016110109061267f565b60405180910390fd5b60035f81548092919061102b9061269d565b9190505550827f2ffcfee146bc0d5ff304c6b65111a0d485af9456dc64eee7d66ebdcc90b223ea83604051611060919061270a565b60405180910390a25f600181111561107b5761107a611b3c565b5b82600181111561108e5761108d611b3c565b5b036111e8576001816002015f6101000a81548160ff021916908360048111156110ba576110b9611b3c565b5b02179055506002805f6101000a81548160ff021916908360028111156110e3576110e2611b3c565b5b0217905550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16837f67d19636b49381da7c69449c7ad40fdd4961c2823bb449c2ca20c147498b363460405160405180910390a3805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16837ffd8fb3c1e880315007f9520b97dbfe17dfd3f01a2cc3366472535504b0263c7260405160405180910390a36111e2815f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff16600154611895565b50611216565b6004816002015f6101000a81548160ff0219169083600481111561120f5761120e611b3c565b5b0217905550505b61121e611942565b5050565b600260019054906101000a900460ff1681565b61123d6117ec565b5f60028111156112505761124f611b3c565b5b60025f9054906101000a900460ff16600281111561127157611270611b3c565b5b146112b1576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016112a890612011565b60405180910390fd5b8060065481146112f6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016112ed90612079565b60405180910390fd5b5f6003541461133a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401611331906120e1565b60405180910390fd5b5f60045f8481526020019081526020015f2090505f600481111561136157611360611b3c565b5b816002015f9054906101000a900460ff16600481111561138457611383611b3c565b5b146113c4576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016113bb90612149565b60405180910390fd5b6002816002015f6101000a81548160ff021916908360048111156113eb576113ea611b3c565b5b0217905550428160040181905550426007819055506002600181819054906101000a900460ff168092919061141f9061222f565b91906101000a81548160ff021916908360ff1602179055505060065f81548092919061144a90612256565b9190505550805f015f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16837ffb5fd41f9e094bd7f5a0e542002ca95348c4513e994eeeb0e4ba1ae5187d609a60405160405180910390a3505050565b6114c26117ec565b5f73ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1603611532575f6040517f1e4fbdf70000000000000000000000000000000000000000000000000000000081526004016115299190611de2565b60405180910390fd5b61153b8161195c565b50565b6203f48081565b5f600281111561155857611557611b3c565b5b60025f9054906101000a900460ff16600281111561157957611578611b3c565b5b146115b9576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016115b090612011565b60405180910390fd5b6115c1610903565b73ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff160361162e576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016116259061276d565b60405180910390fd5b6040518060c001604052803373ffffffffffffffffffffffffffffffffffffffff1681526020018281526020015f600481111561166e5761166d611b3c565b5b81526020014281526020015f81526020017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff81525060045f60055481526020019081526020015f205f820151815f015f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550602082015181600101556040820151816002015f6101000a81548160ff0219169083600481111561172e5761172d611b3c565b5b0217905550606082015181600301556080820151816004015560a082015181600501559050503373ffffffffffffffffffffffffffffffffffffffff166005547ffe73cf9b793e65d9d707a5bfe3063e5f3a58eb52b27a356478c30fc83f5200f260405160405180910390a360055f8154809291906117ac90612256565b91905055506002600181819054906101000a900460ff16809291906117d09061278b565b91906101000a81548160ff021916908360ff1602179055505050565b6117f4611a1d565b73ffffffffffffffffffffffffffffffffffffffff16611812610903565b73ffffffffffffffffffffffffffffffffffffffff161461187157611835611a1d565b6040517f118cdaa70000000000000000000000000000000000000000000000000000000081526004016118689190611de2565b60405180910390fd5b565b61187b611a24565b600261188d611888611a65565b611a8e565b5f0181905550565b5f8273ffffffffffffffffffffffffffffffffffffffff16826040516118ba906127e0565b5f6040518083038185875af1925050503d805f81146118f4576040519150601f19603f3d011682016040523d82523d5f602084013e6118f9565b606091505b505090508061193d576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016119349061283e565b60405180910390fd5b505050565b600161195461194f611a65565b611a8e565b5f0181905550565b5f5f5f9054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050815f5f6101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055508173ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff167f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e060405160405180910390a35050565b5f33905090565b611a2c611a97565b15611a63576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b565b5f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005f1b905090565b5f819050919050565b5f6002611aaa611aa5611a65565b611a8e565b5f015414905090565b6040518060c001604052805f73ffffffffffffffffffffffffffffffffffffffff1681526020015f81526020015f6004811115611af357611af2611b3c565b5b81526020015f81526020015f81526020015f81525090565b5f819050919050565b611b1d81611b0b565b82525050565b5f602082019050611b365f830184611b14565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b60038110611b7a57611b79611b3c565b5b50565b5f819050611b8a82611b69565b919050565b5f611b9982611b7d565b9050919050565b611ba981611b8f565b82525050565b5f602082019050611bc25f830184611ba0565b92915050565b5f5ffd5b611bd581611b0b565b8114611bdf575f5ffd5b50565b5f81359050611bf081611bcc565b92915050565b5f60208284031215611c0b57611c0a611bc8565b5b5f611c1884828501611be2565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f819050919050565b5f611c63611c5e611c5984611c21565b611c40565b611c21565b9050919050565b5f611c7482611c49565b9050919050565b5f611c8582611c6a565b9050919050565b611c9581611c7b565b82525050565b5f602082019050611cae5f830184611c8c565b92915050565b5f611cbe82611c21565b9050919050565b611cce81611cb4565b82525050565b5f819050919050565b611ce681611cd4565b82525050565b60058110611cfd57611cfc611b3c565b5b50565b5f819050611d0d82611cec565b919050565b5f611d1c82611d00565b9050919050565b611d2c81611d12565b82525050565b611d3b81611b0b565b82525050565b60c082015f820151611d555f850182611cc5565b506020820151611d686020850182611cdd565b506040820151611d7b6040850182611d23565b506060820151611d8e6060850182611d32565b506080820151611da16080850182611d32565b5060a0820151611db460a0850182611d32565b50505050565b5f60c082019050611dcd5f830184611d41565b92915050565b611ddc81611cb4565b82525050565b5f602082019050611df55f830184611dd3565b92915050565b611e0481611cd4565b82525050565b611e1381611d12565b82525050565b5f60c082019050611e2c5f830189611dd3565b611e396020830188611dfb565b611e466040830187611e0a565b611e536060830186611b14565b611e606080830185611b14565b611e6d60a0830184611b14565b979650505050505050565b60028110611e84575f5ffd5b50565b5f81359050611e9581611e78565b92915050565b5f5f60408385031215611eb157611eb0611bc8565b5b5f611ebe85828601611be2565b9250506020611ecf85828601611e87565b9150509250929050565b5f60ff82169050919050565b611eee81611ed9565b82525050565b5f602082019050611f075f830184611ee5565b92915050565b611f1681611cb4565b8114611f20575f5ffd5b50565b5f81359050611f3181611f0d565b92915050565b5f60208284031215611f4c57611f4b611bc8565b5b5f611f5984828501611f23565b91505092915050565b611f6b81611cd4565b8114611f75575f5ffd5b50565b5f81359050611f8681611f62565b92915050565b5f60208284031215611fa157611fa0611bc8565b5b5f611fae84828501611f78565b91505092915050565b5f82825260208201905092915050565b7f426f756e7479206d757374206265206f70656e000000000000000000000000005f82015250565b5f611ffb601383611fb7565b915061200682611fc7565b602082019050919050565b5f6020820190508181035f83015261202881611fef565b9050919050565b7f4d757374207265736f6c7665207265706f72747320696e206f726465720000005f82015250565b5f612063601d83611fb7565b915061206e8261202f565b602082019050919050565b5f6020820190508181035f83015261209081612057565b9050919050565b7f416374697665206469737075746520696e2070726f67726573730000000000005f82015250565b5f6120cb601a83611fb7565b91506120d682612097565b602082019050919050565b5f6020820190508181035f8301526120f8816120bf565b9050919050565b7f5265706f7274206d7573742062652070656e64696e67000000000000000000005f82015250565b5f612133601683611fb7565b915061213e826120ff565b602082019050919050565b5f6020820190508181035f83015261216081612127565b9050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61219e82611b0b565b91506121a983611b0b565b92508282019050808211156121c1576121c0612167565b5b92915050565b7f446973707574652077696e646f77207374696c6c2061637469766500000000005f82015250565b5f6121fb601b83611fb7565b9150612206826121c7565b602082019050919050565b5f6020820190508181035f830152612228816121ef565b9050919050565b5f61223982611ed9565b91505f820361224b5761224a612167565b5b600182039050919050565b5f61226082611b0b565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361229257612291612167565b5b600182019050919050565b7f5265706f727420646f6573206e6f7420657869737400000000000000000000005f82015250565b5f6122d1601583611fb7565b91506122dc8261229d565b602082019050919050565b5f6020820190508181035f8301526122fe816122c5565b9050919050565b7f43616e6e6f742063616e63656c207769746820616374697665207265706f72745f8201527f7300000000000000000000000000000000000000000000000000000000000000602082015250565b5f61235f602183611fb7565b915061236a82612305565b604082019050919050565b5f6020820190508181035f83015261238c81612353565b9050919050565b7f43616e6e6f742063616e63656c207769746820616374697665206469737075745f8201527f6573000000000000000000000000000000000000000000000000000000000000602082015250565b5f6123ed602283611fb7565b91506123f882612393565b604082019050919050565b5f6020820190508181035f83015261241a816123e1565b9050919050565b7f4f6e6c79207468652068756e7465722063616e206469737075746500000000005f82015250565b5f612455601b83611fb7565b915061246082612421565b602082019050919050565b5f6020820190508181035f83015261248281612449565b9050919050565b7f5265706f7274206d7573742062652072656a65637465640000000000000000005f82015250565b5f6124bd601783611fb7565b91506124c882612489565b602082019050919050565b5f6020820190508181035f8301526124ea816124b1565b9050919050565b7f446973707574652077696e646f772068617320657870697265640000000000005f82015250565b5f612525601a83611fb7565b9150612530826124f1565b602082019050919050565b5f6020820190508181035f83015261255281612519565b9050919050565b5f60608201905061256c5f830186611b14565b6125796020830185611dfb565b6125866040830184611dd3565b949350505050565b5f8151905061259c81611bcc565b92915050565b5f602082840312156125b7576125b6611bc8565b5b5f6125c48482850161258e565b91505092915050565b7f4f6e6c79206469737075746520636f6e747261637400000000000000000000005f82015250565b5f612601601583611fb7565b915061260c826125cd565b602082019050919050565b5f6020820190508181035f83015261262e816125f5565b9050919050565b7f5265706f7274206d7573742062652064697370757465640000000000000000005f82015250565b5f612669601783611fb7565b915061267482612635565b602082019050919050565b5f6020820190508181035f8301526126968161265d565b9050919050565b5f6126a782611b0b565b91505f82036126b9576126b8612167565b5b600182039050919050565b600281106126d5576126d4611b3c565b5b50565b5f8190506126e5826126c4565b919050565b5f6126f4826126d8565b9050919050565b612704816126ea565b82525050565b5f60208201905061271d5f8301846126fb565b92915050565b7f436f6d70616e792063616e6e6f74207375626d6974207265706f7274730000005f82015250565b5f612757601d83611fb7565b915061276282612723565b602082019050919050565b5f6020820190508181035f8301526127848161274b565b9050919050565b5f61279582611ed9565b915060ff82036127a8576127a7612167565b5b600182019050919050565b5f81905092915050565b50565b5f6127cb5f836127b3565b91506127d6826127bd565b5f82019050919050565b5f6127ea826127c0565b9150819050919050565b7f5472616e73666572206661696c656400000000000000000000000000000000005f82015250565b5f612828600f83611fb7565b9150612833826127f4565b602082019050919050565b5f6020820190508181035f8301526128558161281c565b905091905056fea26469706673582212207ea2b6934ca28fc1135fb2abff1a293d48044084278ed0c572f580720a98c9b964736f6c634300081c0033" as const;

export const reportStatusLabels = ["PENDING", "ACCEPTED", "REJECTED", "DISPUTED", "RESOLVED"] as const;
export const bountyStatusLabels = ["OPEN", "CANCELLED", "CLOSED"] as const;
export const disputeResultLabels = ["UPHELD", "DISMISSED"] as const;
