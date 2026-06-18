import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, keccak256, toHex, zeroAddress, getAddress } from "viem";
import { network } from "hardhat";

const DISPUTE_WINDOW = 3 * 24 * 60 * 60;
const REPORT_HASH = keccak256(toHex("test vulnerability report")) as `0x${string}`;
const REWARD = parseEther("1");

const Status = { OPEN: 0, CANCELLED: 1, CLOSED: 2 };
const ReportStatus = { PENDING: 0, ACCEPTED: 1, REJECTED: 2, DISPUTED: 3, RESOLVED: 4 };
const DisputeResult = { UPHELD: 0, DISMISSED: 1 };

describe("Bounty", async function () {
  const { viem } = await network.create();
  const wallets = await viem.getWalletClients();
  const company = wallets[0];
  const hunter1 = wallets[1];
  const hunter2 = wallets[2];
  const publicClient = await viem.getPublicClient();

  async function advanceTime(seconds: number) {
    await (publicClient as any).request({ method: "evm_increaseTime", params: [seconds] });
    await (publicClient as any).request({ method: "evm_mine", params: [] });
  }

  async function setup() {
    const mock = await viem.deployContract("MockDisputeContract");
    const bounty = await viem.deployContract("Bounty", [mock.address], { value: REWARD });
    return { bounty, mock };
  }

  describe("constructor", async function () {
    it("reverts with no ETH", async function () {
      const mock = await viem.deployContract("MockDisputeContract");
      await assert.rejects(
        viem.deployContract("Bounty", [mock.address], { value: 0n }),
      );
    });

    it("reverts with zero address dispute contract", async function () {
      await assert.rejects(
        viem.deployContract("Bounty", [zeroAddress], { value: REWARD }),
      );
    });

    it("initializes state correctly", async function () {
      const { bounty } = await setup();
      assert.equal(await bounty.read.reward(), REWARD);
      assert.equal(await bounty.read.status(), Status.OPEN);
      assert.equal(await bounty.read.reportCount(), 0n);
      assert.equal(await bounty.read.activeReports(), 0);
      assert.equal(await bounty.read.disputedReports(), 0n);
    });
  });

  describe("submitReport", async function () {
    it("submits a report and updates counters", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      assert.equal(await bounty.read.reportCount(), 1n);
      assert.equal(await bounty.read.activeReports(), 1);
    });

    it("reverts if company submits", async function () {
      const { bounty } = await setup();
      await assert.rejects(
        bounty.write.submitReport([REPORT_HASH], { account: company.account }),
      );
    });
  });

  describe("getReport", async function () {
    it("returns correct report data", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      const report = await bounty.read.getReport([0n]);
      assert.equal(getAddress(report.hunter), getAddress(hunter1.account.address));
      assert.equal(report.hash, REPORT_HASH);
      assert.equal(report.status, ReportStatus.PENDING);
    });

    it("reverts for non-existent report", async function () {
      const { bounty } = await setup();
      await assert.rejects(bounty.read.getReport([99n]));
    });
  });

  describe("acceptReport", async function () {
    it("accepts report, pays hunter, and closes bounty", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.acceptReport([0n], { account: company.account });
      assert.equal(await bounty.read.status(), Status.CLOSED);
      assert.equal(await bounty.read.getBalance(), 0n);
    });

    it("reverts while another dispute is active even after the dispute window expires", async function () {
      const { bounty, mock } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.submitReport([REPORT_HASH], { account: hunter2.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await bounty.write.disputeReport([0n], { account: hunter1.account });
      await advanceTime(DISPUTE_WINDOW + 1);

      await assert.rejects(
        bounty.write.acceptReport([1n], { account: company.account }),
      );

      await mock.write.resolveDispute([0n]);
      await bounty.write.acceptReport([1n], { account: company.account });
      assert.equal(await bounty.read.status(), Status.CLOSED);
    });
  });

  describe("cancelBounty", async function () {
    it("cancels after dispute window expires when no dispute was opened", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await advanceTime(DISPUTE_WINDOW + 1);
      await bounty.write.cancelBounty({ account: company.account });
      assert.equal(await bounty.read.status(), Status.CANCELLED);
    });

    it("reverts while a dispute is active", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await bounty.write.disputeReport([0n], { account: hunter1.account });
      await advanceTime(DISPUTE_WINDOW + 1);
      await assert.rejects(
        bounty.write.cancelBounty({ account: company.account }),
      );
    });
  });

  describe("disputeReport", async function () {
    it("opens a dispute and waits for callback resolution", async function () {
      const { bounty, mock } = await setup();
      await mock.write.setResult([DisputeResult.UPHELD]);
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await bounty.write.disputeReport([0n], { account: hunter1.account });

      const reportBefore = await bounty.read.getReport([0n]);
      assert.equal(reportBefore.status, ReportStatus.DISPUTED);
      assert.equal(reportBefore.disputeId, 0n);
      assert.equal(await bounty.read.disputedReports(), 1n);

      const balanceBefore = await publicClient.getBalance({ address: hunter1.account.address });
      await mock.write.resolveDispute([0n]);
      const balanceAfter = await publicClient.getBalance({ address: hunter1.account.address });

      const reportAfter = await bounty.read.getReport([0n]);
      assert.equal(reportAfter.status, ReportStatus.ACCEPTED);
      assert.equal(await bounty.read.status(), Status.CLOSED);
      assert.equal(await bounty.read.disputedReports(), 0n);
      assert.equal(balanceAfter - balanceBefore, REWARD);
    });

    it("dismissed disputes resolve the report and keep the bounty open", async function () {
      const { bounty, mock } = await setup();
      await mock.write.setResult([DisputeResult.DISMISSED]);
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await bounty.write.disputeReport([0n], { account: hunter1.account });
      await mock.write.resolveDispute([0n]);

      const report = await bounty.read.getReport([0n]);
      assert.equal(report.status, ReportStatus.RESOLVED);
      assert.equal(await bounty.read.status(), Status.OPEN);
    });

    it("reverts if caller is not the hunter", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await assert.rejects(
        bounty.write.disputeReport([0n], { account: hunter2.account }),
      );
    });

    it("reverts if dispute window has expired", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await advanceTime(DISPUTE_WINDOW + 1);
      await assert.rejects(
        bounty.write.disputeReport([0n], { account: hunter1.account }),
      );
    });

    it("rejects direct dispute resolution from non dispute contracts", async function () {
      const { bounty } = await setup();
      await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
      await bounty.write.rejectReport([0n], { account: company.account });
      await bounty.write.disputeReport([0n], { account: hunter1.account });

      await assert.rejects(
        bounty.write.resolveDispute([0n, DisputeResult.UPHELD], { account: hunter1.account }),
      );
    });
  });
});
