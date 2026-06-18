import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createPublicClient, http } from "viem";

import { bountyAbi } from "@bugbounty/shared/contracts";

import { DatabaseService } from "../db/database.service.js";

@Injectable()
export class BountiesService {
  constructor(private readonly db: DatabaseService) {}

  getDeploySpec() {
    const disputeAddress = process.env.DISPUTE_ADDRESS;
    const chainId = Number(process.env.CHAIN_ID ?? process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);
    if (!disputeAddress) {
      throw new NotFoundException("Dispute contract is not configured");
    }

    return {
      disputeAddress,
      chainId,
    };
  }

  async create(payload: {
    address: string;
    title: string;
    description: string;
    rewardWei: string;
    chainId: number;
    actorAddress: string;
  }) {
    const company = await this.db.query<{ company_approved: boolean }>(
      "select company_approved from users where address = $1",
      [payload.actorAddress],
    );
    if (!company.rows[0]?.company_approved) {
      throw new ForbiddenException("Company address is not approved");
    }

    const client = createPublicClient({
      transport: http(process.env.RPC_URL),
    });
    const [chainId, companyAddress, rewardWei, disputeAddress] = await Promise.all([
      client.getChainId(),
      client.readContract({
        address: payload.address.toLowerCase() as `0x${string}`,
        abi: bountyAbi,
        functionName: "company",
      }),
      client.readContract({
        address: payload.address.toLowerCase() as `0x${string}`,
        abi: bountyAbi,
        functionName: "reward",
      }),
      client.readContract({
        address: payload.address.toLowerCase() as `0x${string}`,
        abi: bountyAbi,
        functionName: "disputeContract",
      }),
    ]);

    if (Number(chainId) !== payload.chainId) {
      throw new ForbiddenException("Bounty chain does not match the selected network");
    }
    if (companyAddress.toLowerCase() !== payload.actorAddress) {
      throw new ForbiddenException("This bounty was not deployed by the current company account");
    }
    if (rewardWei.toString() !== payload.rewardWei) {
      throw new ForbiddenException("Stored reward does not match the deployed bounty value");
    }
    if (String(disputeAddress).toLowerCase() !== String(process.env.DISPUTE_ADDRESS).toLowerCase()) {
      throw new ForbiddenException("Bounty is linked to a different dispute contract");
    }

    await this.db.query(
      `insert into bounties (address, title, description, reward_wei, chain_id, company_address, created_by)
       values ($1, $2, $3, $4, $5, $6, $6)
       on conflict (address) do update
       set title = excluded.title,
           description = excluded.description,
           reward_wei = excluded.reward_wei,
           chain_id = excluded.chain_id`,
      [
        payload.address.toLowerCase(),
        payload.title,
        payload.description,
        payload.rewardWei,
        payload.chainId,
        payload.actorAddress,
      ],
    );

    return this.getByAddress(payload.address);
  }

  async getByAddress(address: string) {
    const result = await this.db.query(
      "select * from bounties where address = $1",
      [address.toLowerCase()],
    );
    if (!result.rows[0]) {
      throw new NotFoundException("Bounty not found");
    }
    return result.rows[0];
  }

  async getReports(address: string) {
    const result = await this.db.query(
      "select * from reports where bounty_address = $1 order by created_at desc",
      [address.toLowerCase()],
    );
    return result.rows;
  }
}
