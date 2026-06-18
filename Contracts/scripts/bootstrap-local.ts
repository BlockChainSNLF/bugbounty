import { network } from "hardhat";
import { parseEther } from "viem";

const { viem } = await network.getOrCreate("localhost");
const [owner, company, , , arb1, arb2, arb3, arb4] = await viem.getWalletClients();

const disputeContract = await viem.deployContract(
  "DisputeContract",
  [3600n, parseEther("0.01")],
  { client: { wallet: owner } },
);

for (const arbitrator of [arb1, arb2, arb3, arb4]) {
  await disputeContract.write.registerArbitrator([arbitrator.account.address], {
    account: owner.account,
  });
}

await owner.sendTransaction({
  to: disputeContract.address,
  value: parseEther("1"),
});

const bounty = await viem.deployContract(
  "Bounty",
  [disputeContract.address],
  { client: { wallet: company }, value: parseEther("1") },
);

console.log(JSON.stringify({
  chainId: 31337,
  disputeAddress: disputeContract.address,
  bountyAddress: bounty.address,
  owner: owner.account.address,
  company: company.account.address,
  arbitrators: [arb1, arb2, arb3, arb4].map((wallet) => wallet.account.address),
}, null, 2));
