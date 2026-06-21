import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther, zeroHash } from "viem";

const REPORT_HASH = zeroHash;
const REWARD = parseEther("1");
const ARBITRATOR_FEE = parseEther("0.1");

const Status = { OPEN: 0, CANCELLED: 1, CLOSED: 2 };
const ReportStatus = { PENDING: 0, ACCEPTED: 1, REJECTED: 2, DISPUTED: 3, RESOLVED: 4 };
const DisputeResult = { UPHELD: 0, DISMISSED: 1 };

describe("DisputeContract", async function () {
  const { viem } = await network.create();
  const publicClient = await viem.getPublicClient();
  const testClient = await viem.getTestClient();

  async function deploySystem() {
    const [owner, company, hunter1, hunter2, arb1, arb2, arb3, arb4] = await viem.getWalletClients();

    const disputeContract = await viem.deployContract(
      "DisputeContract",
      [3600n, ARBITRATOR_FEE],
      { client: { wallet: owner } },
    );

    for (const arbitrator of [arb1, arb2, arb3, arb4]) {
      await disputeContract.write.registerArbitrator([arbitrator.account.address], {
        account: owner.account,
      });
    }

    await owner.sendTransaction({
      to: disputeContract.address,
      value: parseEther("2"),
    });

    const bounty = await viem.deployContract(
      "Bounty",
      [disputeContract.address],
      { client: { wallet: company }, value: REWARD },
    );

    return { owner, company, hunter1, hunter2, arb1, arb2, arb3, arb4, disputeContract, bounty };
  }

  it("selects arbitrators and resolves an upheld dispute by callback", async function () {
    const { hunter1, arb1, arb2, arb3, arb4, disputeContract, bounty } = await deploySystem();

    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n]);
    await bounty.write.disputeReport([0n], { account: hunter1.account });

    const assigned = await disputeContract.read.getAssignedArbitrators([0n]);
    assert.equal(new Set(assigned.map((address) => address.toLowerCase())).size, 3);

    const arbitratorMap = new Map(
      [arb1, arb2, arb3, arb4].map((wallet) => [wallet.account.address.toLowerCase(), wallet]),
    );

    const first = arbitratorMap.get(assigned[0].toLowerCase());
    const second = arbitratorMap.get(assigned[1].toLowerCase());
    assert.ok(first);
    assert.ok(second);

    await disputeContract.write.vote([0n, DisputeResult.UPHELD], { account: first.account });
    await disputeContract.write.vote([0n, DisputeResult.UPHELD], { account: second.account });

    const hunterBalanceBefore = await publicClient.getBalance({
      address: hunter1.account.address,
    });

    await disputeContract.write.finalizeDispute([0n]);

    const hunterBalanceAfter = await publicClient.getBalance({
      address: hunter1.account.address,
    });
    const report = await bounty.read.getReport([0n]);
    assert.equal(report.status, ReportStatus.ACCEPTED);
    assert.equal(await bounty.read.status(), Status.CLOSED);
    assert.equal(hunterBalanceAfter - hunterBalanceBefore, REWARD);
  });

  it("rejects openDispute from a caller that is not a registered bounty", async function () {
    const { hunter1, disputeContract } = await deploySystem();

    await assert.rejects(
      disputeContract.write.openDispute([0n, REPORT_HASH, hunter1.account.address], {
        account: hunter1.account,
      }),
    );
  });

  it("keeps FIFO frozen until a dismissed dispute is finalized", async function () {
    const { hunter1, hunter2, arb1, arb2, arb3, arb4, disputeContract, bounty } = await deploySystem();

    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.submitReport([REPORT_HASH], { account: hunter2.account });
    await bounty.write.rejectReport([0n]);
    await bounty.write.disputeReport([0n], { account: hunter1.account });

    await assert.rejects(
      bounty.write.acceptReport([1n]),
    );

    const assigned = await disputeContract.read.getAssignedArbitrators([0n]);
    const arbitratorMap = new Map(
      [arb1, arb2, arb3, arb4].map((wallet) => [wallet.account.address.toLowerCase(), wallet]),
    );

    const voter = arbitratorMap.get(assigned[0].toLowerCase());
    assert.ok(voter);

    await disputeContract.write.vote([0n, DisputeResult.DISMISSED], { account: voter.account });
    await testClient.increaseTime({ seconds: 3601 });
    await testClient.mine({ blocks: 1 });
    await disputeContract.write.finalizeDispute([0n]);

    const report = await bounty.read.getReport([0n]);
    assert.equal(report.status, ReportStatus.RESOLVED);
    assert.equal(await bounty.read.status(), Status.OPEN);

    await bounty.write.acceptReport([1n]);
    assert.equal(await bounty.read.status(), Status.CLOSED);
  });

  it("pays only the arbitrators that actually voted", async function () {
    const { hunter1, arb1, arb2, arb3, arb4, disputeContract, bounty } = await deploySystem();

    await bounty.write.submitReport([REPORT_HASH], { account: hunter1.account });
    await bounty.write.rejectReport([0n]);
    await bounty.write.disputeReport([0n], { account: hunter1.account });

    const assigned = await disputeContract.read.getAssignedArbitrators([0n]);
    const arbitratorMap = new Map(
      [arb1, arb2, arb3, arb4].map((wallet) => [wallet.account.address.toLowerCase(), wallet]),
    );

    const first = arbitratorMap.get(assigned[0].toLowerCase());
    assert.ok(first);

    await disputeContract.write.vote([0n, DisputeResult.DISMISSED], { account: first.account });
    await testClient.increaseTime({ seconds: 3601 });
    await testClient.mine({ blocks: 1 });
    await disputeContract.write.finalizeDispute([0n]);

    const availablePool = await disputeContract.read.getAvailablePool();
    assert.equal(availablePool, parseEther("1.9"));
  });
});
