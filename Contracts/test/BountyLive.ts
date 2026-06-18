import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEther, keccak256, toHex } from "viem";
import { network } from "hardhat";

const DISPUTE_WINDOW = 3 * 24 * 60 * 60;
const REPORT_HASH = keccak256(toHex("test vulnerability report")) as `0x${string}`;
const REWARD = parseEther("1");

const Status       = { OPEN: 0, CANCELLED: 1, CLOSED: 2 };
const ReportStatus = { PENDING: 0, ACCEPTED: 1, REJECTED: 2, DISPUTED: 3, RESOLVED: 4 };
const DisputeResult = { UPHELD: 0, DISMISSED: 1 };

describe("Bounty live tests", async function () {
  const { viem } = await network.getOrCreate("localhost");
  const wallets = await viem.getWalletClients();
  const company = wallets[0];
  const hunter1 = wallets[1];
  const hunter2 = wallets[2];
  const publicClient = await viem.getPublicClient();

  async function setup() {
    const mock = await viem.deployContract("MockDisputeContract");
    const bounty = await viem.deployContract("Bounty", [mock.address], { value: REWARD });
    return { bounty, mock };
  }

  async function advanceTime(seconds: number) {
    await (publicClient as any).request({ method: "evm_increaseTime", params: [seconds] });
    await (publicClient as any).request({ method: "evm_mine", params: [] });
  }

  it("submit → accept: hunter gets paid, bounty closes", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    const balanceBefore = await publicClient.getBalance({ address: hunter1.account.address });
    await bounty.write.acceptReport([0n], { account: company.account });
    const balanceAfter = await publicClient.getBalance({ address: hunter1.account.address });
    assert.equal(await bounty.read.status(), Status.CLOSED);
    assert.equal(await bounty.read.getBalance(), 0n);
    assert.ok(balanceAfter > balanceBefore);
  });


  it("submit → reject: report marked rejected, activeReports back to 0", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    const report = await bounty.read.getReport([0n]);
    assert.equal(report.status, ReportStatus.REJECTED);
    assert.equal(await bounty.read.activeReports(), 0);
  });


  it("submit → reject → dispute UPHELD: hunter gets paid, bounty closes", async function () {
    const { bounty, mock } = await setup();
    await mock.write.setResult([DisputeResult.UPHELD]);
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    const balanceBefore = await publicClient.getBalance({ address: hunter1.account.address });
    await bounty.write.disputeReport([0n], { account: hunter1.account });
    await mock.write.resolveDispute([0n]);
    const balanceAfter = await publicClient.getBalance({ address: hunter1.account.address });
    assert.equal(await bounty.read.status(), Status.CLOSED);
    assert.equal(await bounty.read.getBalance(), 0n);
    assert.ok(balanceAfter > balanceBefore);
  });

  it("submit → reject → dispute DISMISSED: report resolved, bounty stays open", async function () {
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

  it("dispute after window expires: reverts", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    await advanceTime(DISPUTE_WINDOW + 1);
    await assert.rejects(
      bounty.write.disputeReport([0n], { account: hunter1.account })
    );
  });

  it("submit → reject → [window expires] → cancel: company refunded", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    await advanceTime(DISPUTE_WINDOW + 1);
    await bounty.write.cancelBounty({ account: company.account });
    assert.equal(await bounty.read.status(), Status.CANCELLED);
    assert.equal(await bounty.read.getBalance(), 0n);
  });

  it("company cannot accept next report during dispute window", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.submitReport([REPORT_HASH], { account: hunter2.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    await assert.rejects(
      bounty.write.acceptReport([1n], { account: company.account })
    );
  });

  it("company cannot cancel during dispute window", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    await assert.rejects(
      bounty.write.cancelBounty({ account: company.account })
    );
  });

  it("company cannot accept next report after dispute window expires if the dispute is still active", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.submitReport([REPORT_HASH], { account: hunter2.account });
    await bounty.write.rejectReport([0n], { account: company.account });
    await bounty.write.disputeReport([0n], { account: hunter1.account });
    await advanceTime(DISPUTE_WINDOW + 1);
    await assert.rejects(
      bounty.write.acceptReport([1n], { account: company.account })
    );
  });


  it("company must process reports in order", async function () {
    const { bounty } = await setup();
    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.submitReport([REPORT_HASH], { account: hunter2.account });
    await assert.rejects(
      bounty.write.acceptReport([1n], { account: company.account })
    );
    await assert.rejects(
      bounty.write.rejectReport([1n], { account: company.account })
    );
  });
});
