import { network } from "hardhat";
import { keccak256, toHex } from "viem";

const { viem } = await network.getOrCreate("localhost");

const BOUNTY_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const MOCK_ADDRESS   = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const bounty = await viem.getContractAt("Bounty", BOUNTY_ADDRESS);
const mock   = await viem.getContractAt("MockDisputeContract", MOCK_ADDRESS);

const [, hunter] = await viem.getWalletClients();

await bounty.write.submitReport(
  [keccak256(toHex("my vulnerability report"))],
  { account: hunter.account }
);

console.log("reward:      ", await bounty.read.reward());
console.log("status:      ", await bounty.read.status());
console.log("reportCount: ", await bounty.read.reportCount());
console.log("company:     ", await bounty.read.company());
