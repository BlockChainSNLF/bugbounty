import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

export default buildModule("BountyModule", (m) => {
  const mockDisputeContract = m.contract("MockDisputeContract");

  const bounty = m.contract("Bounty", [mockDisputeContract], {
    value: parseEther("1"),
  });

  return { bounty, mockDisputeContract };
});
