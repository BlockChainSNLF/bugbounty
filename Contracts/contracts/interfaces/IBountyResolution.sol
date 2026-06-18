// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

enum DisputeResult { UPHELD, DISMISSED }

interface IBountyResolution {
    function resolveDispute(uint256 reportId, DisputeResult result) external;
}
