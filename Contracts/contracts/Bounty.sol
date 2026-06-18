// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./interfaces/IBountyResolution.sol";
import "./interfaces/IDisputeContract.sol";

contract Bounty is IBountyResolution {
    enum Status { OPEN, CANCELLED, CLOSED }
    enum ReportStatus { PENDING, ACCEPTED, REJECTED, DISPUTED, RESOLVED }

    event BountyCreated(address indexed company, uint256 reward);
    event BountyCancelled();
    event BountyClosed(uint256 indexed reportId, address indexed hunter);
    event ReportSubmitted(uint256 indexed reportId, address indexed hunter);
    event ReportAccepted(uint256 indexed reportId, address indexed hunter);
    event ReportRejected(uint256 indexed reportId, address indexed hunter);
    event ReportDisputed(uint256 indexed reportId, uint256 indexed disputeId, address indexed hunter);
    event DisputeResolved(uint256 indexed reportId, DisputeResult result);

    struct Report {
        address hunter;
        bytes32 hash;
        ReportStatus status;
        uint256 timestamp;
        uint256 rejectedAt;
        uint256 disputeId;
    }

    address public company;
    uint256 public reward;
    Status public status;
    uint8 public activeReports;
    uint256 public disputedReports;
    mapping(uint256 => Report) public reports;
    uint256 public reportCount;
    uint256 public oldestPendingReport;
    uint256 public lastRejectedAt;
    uint256 public constant DISPUTE_WINDOW = 3 days;
    IDisputeContract public disputeContract;


    constructor(address _disputeContract) payable {
        require(msg.value > 0, "Insufficient funds to open bounty");
        require(_disputeContract != address(0), "Invalid dispute contract");
        reward = msg.value;
        company = msg.sender;
        status = Status.OPEN;
        disputeContract = IDisputeContract(_disputeContract);
        emit BountyCreated(msg.sender, msg.value);
    }

    modifier onlyCompany() {
        require(msg.sender == company, "Only the company can perform this action");
        _;
    }

    modifier onlyOldestPending(uint reportId) {
        require(reportId == oldestPendingReport, "Must resolve reports in order");
        _;
    }

    modifier openBounty() {
        require(status == Status.OPEN, "Bounty must be open");
        _;
    }

    modifier onlyDisputeContract() {
        require(msg.sender == address(disputeContract), "Only dispute contract");
        _;
    }

    modifier noActiveDisputes() {
        require(disputedReports == 0, "Active dispute in progress");
        _;
    }

    function cancelBounty() external onlyCompany openBounty {
        require(activeReports == 0, "Cannot cancel with active reports");
        require(disputedReports == 0, "Cannot cancel with active disputes");
        require(block.timestamp > lastRejectedAt + DISPUTE_WINDOW, "Dispute window still active");
        status = Status.CANCELLED;
        emit BountyCancelled();
        payable(company).transfer(address(this).balance);
    }

    function getBalance() external view returns (uint) {
        return address(this).balance;
    }

    function submitReport(bytes32 reportHash) external openBounty {
        require(msg.sender != company, "Company cannot submit reports");
        reports[reportCount] = Report({
            hunter: msg.sender,
            hash: reportHash,
            status: ReportStatus.PENDING,
            timestamp: block.timestamp,
            rejectedAt: 0,
            disputeId: type(uint256).max
        });
        emit ReportSubmitted(reportCount, msg.sender);
        reportCount++;
        activeReports++;
    }

    function getReport(uint reportId) external view returns (Report memory) {
        require(reportId < reportCount, "Report does not exist");
        return reports[reportId];
    }

    function acceptReport(uint reportId) external onlyCompany openBounty onlyOldestPending(reportId) noActiveDisputes {
        Report storage report = reports[reportId];
        require(report.status == ReportStatus.PENDING, "Report must be pending");
        require(block.timestamp > lastRejectedAt + DISPUTE_WINDOW, "Dispute window still active");
        report.status = ReportStatus.ACCEPTED;
        activeReports--;
        oldestPendingReport++;
        status = Status.CLOSED;
        emit ReportAccepted(reportId, report.hunter);
        emit BountyClosed(reportId, report.hunter);
        payable(report.hunter).transfer(reward);
    }

    function rejectReport(uint reportId) external onlyCompany openBounty onlyOldestPending(reportId) noActiveDisputes {
        Report storage report = reports[reportId];
        require(report.status == ReportStatus.PENDING, "Report must be pending");
        report.status = ReportStatus.REJECTED;
        report.rejectedAt = block.timestamp;
        lastRejectedAt = block.timestamp;
        activeReports--;
        oldestPendingReport++;
        emit ReportRejected(reportId, report.hunter);
    }

    function disputeReport(uint reportId) external openBounty {
        Report storage report = reports[reportId];
        require(report.hunter == msg.sender, "Only the hunter can dispute");
        require(report.status == ReportStatus.REJECTED, "Report must be rejected");
        require(block.timestamp <= report.rejectedAt + DISPUTE_WINDOW, "Dispute window has expired");
        report.status = ReportStatus.DISPUTED;
        lastRejectedAt = 0;
        report.disputeId = disputeContract.openDispute(reportId, report.hash, report.hunter);
        disputedReports++;
        emit ReportDisputed(reportId, report.disputeId, msg.sender);
    }

    function resolveDispute(uint256 reportId, DisputeResult result) external onlyDisputeContract {
        require(reportId < reportCount, "Report does not exist");
        Report storage report = reports[reportId];
        require(report.status == ReportStatus.DISPUTED, "Report must be disputed");

        disputedReports--;
        emit DisputeResolved(reportId, result);

        if (result == DisputeResult.UPHELD) {
            report.status = ReportStatus.ACCEPTED;
            status = Status.CLOSED;
            emit ReportAccepted(reportId, report.hunter);
            emit BountyClosed(reportId, report.hunter);
            payable(report.hunter).transfer(reward);
            return;
        }

        report.status = ReportStatus.RESOLVED;
    }

}
