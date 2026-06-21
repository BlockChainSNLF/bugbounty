// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./interfaces/IBountyResolution.sol";
import "./interfaces/IDisputeContract.sol";

contract MockDisputeContract is IDisputeContract {
    DisputeResult private _result = DisputeResult.DISMISSED;
    uint256 public disputeCount;

    struct PendingDispute {
        address bounty;
        uint256 reportId;
        bool resolved;
    }

    mapping(uint256 => PendingDispute) public disputes;

    function setResult(DisputeResult result) external {
        _result = result;
    }

    function registerBounty() external {}

    function openDispute(uint256 reportId, bytes32, address) external returns (uint256 disputeId) {
        disputeId = disputeCount++;
        disputes[disputeId] = PendingDispute({
            bounty: msg.sender,
            reportId: reportId,
            resolved: false
        });
    }

    function resolveDispute(uint256 disputeId) external {
        PendingDispute storage dispute = disputes[disputeId];
        require(dispute.bounty != address(0), "Dispute does not exist");
        require(!dispute.resolved, "Dispute already resolved");
        dispute.resolved = true;
        IBountyResolution(dispute.bounty).resolveDispute(dispute.reportId, _result);
    }
}
