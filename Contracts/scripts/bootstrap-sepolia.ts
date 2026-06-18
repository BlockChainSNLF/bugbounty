import { artifacts, network } from "hardhat";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

const { viem } = await network.create({ network: "sepolia" });

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const ownerKey = process.env.SEPOLIA_PRIVATE_KEY as `0x${string}` | undefined;
const companyKeyValue = process.env.SEPOLIA_COMPANY_PRIVATE_KEY?.trim();
const companyKey =
  companyKeyValue && companyKeyValue.length > 0
    ? (companyKeyValue as `0x${string}`)
    : ownerKey;

if (!rpcUrl || !ownerKey) {
  throw new Error("SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY are required");
}

const resolvedCompanyKey = companyKey ?? ownerKey;

const arbitratorAddresses = (process.env.ARBITRATOR_ADDRESSES ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

if (arbitratorAddresses.length < 3) {
  throw new Error("ARBITRATOR_ADDRESSES must contain at least 3 comma-separated addresses");
}

const owner = privateKeyToAccount(ownerKey);
const company = privateKeyToAccount(resolvedCompanyKey);
const publicClient = createPublicClient({
  transport: http(rpcUrl),
});

const chain = await publicClient.getChainId();
if (chain !== 11155111) {
  throw new Error(`Expected Sepolia (11155111), got ${chain}`);
}

const ownerClient = createWalletClient({
  account: owner,
  chain: sepolia,
  transport: http(rpcUrl),
});

const companyClient = createWalletClient({
  account: company,
  chain: sepolia,
  transport: http(rpcUrl),
});

const disputeArtifact = await artifacts.readArtifact("DisputeContract");
const bountyArtifact = await artifacts.readArtifact("Bounty");

const arbitratorFee = parseEther(process.env.ARBITRATOR_FEE_ETH ?? "0.01");
const arbitrationPool = parseEther(process.env.ARBITRATION_POOL_ETH ?? "1");
const bountyReward = parseEther(process.env.BOUNTY_REWARD_ETH ?? "0.1");

const disputeHash = await ownerClient.deployContract({
  abi: disputeArtifact.abi,
  bytecode: disputeArtifact.bytecode as `0x${string}`,
  args: [3600n, arbitratorFee],
});
const disputeReceipt = await publicClient.waitForTransactionReceipt({ hash: disputeHash });
const disputeAddress = disputeReceipt.contractAddress;
if (!disputeAddress) {
  throw new Error("Dispute contract deployment returned no address");
}

for (const arbitrator of arbitratorAddresses) {
  const registerHash = await ownerClient.writeContract({
    address: disputeAddress,
    abi: disputeArtifact.abi,
    functionName: "registerArbitrator",
    args: [arbitrator as `0x${string}`],
  });
  await publicClient.waitForTransactionReceipt({ hash: registerHash });
}

const fundHash = await ownerClient.sendTransaction({
  chain: sepolia,
  to: disputeAddress,
  value: arbitrationPool,
});
await publicClient.waitForTransactionReceipt({ hash: fundHash });

const bountyHash = await companyClient.deployContract({
  abi: bountyArtifact.abi,
  bytecode: bountyArtifact.bytecode as `0x${string}`,
  args: [disputeAddress],
  value: bountyReward,
});
const bountyReceipt = await publicClient.waitForTransactionReceipt({ hash: bountyHash });
const bountyAddress = bountyReceipt.contractAddress;
if (!bountyAddress) {
  throw new Error("Bounty deployment returned no address");
}

console.log(
  JSON.stringify(
    {
      chainId: chain,
      startBlock: Number(disputeReceipt.blockNumber),
      owner: owner.address,
      company: company.address,
      disputeAddress,
      bountyAddress,
      arbitrators: arbitratorAddresses,
      arbitratorFeeWei: arbitratorFee.toString(),
      arbitrationPoolWei: arbitrationPool.toString(),
      bountyRewardWei: bountyReward.toString(),
    },
    null,
    2,
  ),
);
