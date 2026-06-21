// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

interface IDisputeContract {
    function registerBounty() external;
    function openDispute(uint256 reportId, bytes32 reportHash, address hunter) external returns (uint256 disputeId);
}
