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
    outOfScope: string;
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
      `insert into bounties (address, title, description, out_of_scope, reward_wei, chain_id, company_address, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $7)
       on conflict (address) do update
       set title = excluded.title,
           description = excluded.description,
           out_of_scope = excluded.out_of_scope,
           reward_wei = excluded.reward_wei,
           chain_id = excluded.chain_id`,
      [
        payload.address.toLowerCase(),
        payload.title,
        payload.description,
        payload.outOfScope ?? "",
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

  async listAvailable() {
    const result = await this.db.query<{
      address: string;
      title: string;
      description: string;
      out_of_scope: string;
      reward_wei: string;
      chain_id: number;
      company_address: string;
      company_alias: string | null;
      created_at: string;
    }>(
      `select b.address, b.title, b.description, b.out_of_scope, b.reward_wei, b.chain_id, b.company_address,
              cu.alias as company_alias, b.created_at
       from bounties b
       left join users cu on cu.address = b.company_address
       order by b.created_at desc`,
    );

    if (!result.rows.length) {
      return [];
    }

    const client = createPublicClient({
      transport: http(process.env.RPC_URL),
    });

    const withStatus = await Promise.all(
      result.rows.map(async (bounty) => {
        try {
          const status = await client.readContract({
            address: bounty.address as `0x${string}`,
            abi: bountyAbi,
            functionName: "status",
          });

          return {
            ...bounty,
            status: Number(status),
          };
        } catch {
          return {
            ...bounty,
            status: null,
          };
        }
      }),
    );

    return withStatus.filter((bounty) => bounty.status === 0);
  }

  async listForActor(actorAddress: string) {
    const bounties = await this.db.query<{
      address: string;
      title: string;
      description: string;
      reward_wei: string;
      chain_id: number;
      company_address: string;
      company_alias: string | null;
      created_at: string;
    }>(
      `select b.address, b.title, b.description, b.reward_wei, b.chain_id, b.company_address,
              cu.alias as company_alias, b.created_at
       from bounties b
       left join users cu on cu.address = b.company_address
       where b.company_address = $1
       order by b.created_at desc`,
      [actorAddress.toLowerCase()],
    );

    const reports = await this.db.query<{
      id: string;
      bounty_address: string;
      author_address: string;
      author_alias: string | null;
      title: string;
      status: string;
      report_hash: string;
      tx_hash: string | null;
      created_at: string;
      dispute_id: string | null;
      dispute_status: string | null;
      dispute_result: string | null;
      votes_cast: number | null;
    }>(
      `select
         r.id,
         r.bounty_address,
         r.author_address,
         au.alias as author_alias,
         r.title,
         r.status,
         r.report_hash,
         r.tx_hash,
         r.created_at,
         d.id as dispute_id,
         d.status as dispute_status,
         d.result as dispute_result,
         d.votes_cast
       from reports r
       join bounties b on b.address = r.bounty_address
       left join users au on au.address = r.author_address
       left join disputes d
         on d.bounty_address = r.bounty_address
        and d.report_id_on_chain = r.report_id_on_chain
       where b.company_address = $1
       order by r.created_at desc`,
      [actorAddress.toLowerCase()],
    );

    const reportsByBounty = new Map<string, typeof reports.rows>();
    for (const report of reports.rows) {
      const key = report.bounty_address.toLowerCase();
      const existing = reportsByBounty.get(key);
      if (existing) {
        existing.push(report);
      } else {
        reportsByBounty.set(key, [report]);
      }
    }

    return bounties.rows.map((bounty) => ({
      ...bounty,
      reports: reportsByBounty.get(bounty.address.toLowerCase()) ?? [],
    }));
  }

  async getReports(address: string) {
    const result = await this.db.query(
      "select * from reports where bounty_address = $1 order by created_at desc",
      [address.toLowerCase()],
    );
    return result.rows;
  }
}
