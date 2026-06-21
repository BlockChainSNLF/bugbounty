import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { createPublicClient, http } from "viem";

import { disputeAbi } from "@bugbounty/shared";

import { DatabaseService } from "../db/database.service.js";

type DisputeDetails = {
  id: string;
  dispute_id_on_chain: string | number;
  [key: string]: unknown;
};

@Injectable()
export class DisputesService {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const result = await this.db.query(
      `select
         d.*,
         b.title as bounty_title,
         b.description as bounty_description,
         hu.alias as hunter_alias,
         r.id as report_uuid,
         r.title as report_title,
         r.description as report_description,
         r.poc as report_poc,
         r.status as report_status
       from disputes d
       left join bounties b on b.address = d.bounty_address
       left join users hu on hu.address = d.hunter_address
       left join reports r
         on r.bounty_address = d.bounty_address
        and r.report_id_on_chain = d.report_id_on_chain
       order by d.created_at desc`,
    );
    return Promise.all(result.rows.map((row) => this.enrichDispute(row as DisputeDetails)));
  }

  async getById(id: string) {
    const dispute = await this.db.query<DisputeDetails>(
      `select
         d.*,
         b.title as bounty_title,
         b.description as bounty_description,
         hu.alias as hunter_alias,
         r.id as report_uuid,
         r.title as report_title,
         r.description as report_description,
         r.poc as report_poc,
         r.status as report_status
       from disputes d
       left join bounties b on b.address = d.bounty_address
       left join users hu on hu.address = d.hunter_address
       left join reports r
         on r.bounty_address = d.bounty_address
        and r.report_id_on_chain = d.report_id_on_chain
       where d.id = $1`,
      [id],
    );
    if (!dispute.rows[0]) {
      throw new NotFoundException("Dispute not found");
    }
    const votes = await this.db.query(
      "select av.arbitrator_address, u.alias as arbitrator_alias, av.vote_result, av.created_at from arbitrator_votes av left join users u on u.address = av.arbitrator_address where av.dispute_id = $1 order by av.created_at asc",
      [id],
    );
    const enriched = await this.enrichDispute(dispute.rows[0]);
    return { ...enriched, votes: votes.rows };
  }

  async buildVoteIntent(id: string, actorAddress: string, voteResult: number) {
    const dispute = await this.getById(id);
    const assigned = Array.isArray(dispute.assignedArbitrators) ? dispute.assignedArbitrators as string[] : [];
    if (!assigned.includes(actorAddress.toLowerCase())) {
      throw new ForbiddenException("This account is not assigned to this dispute");
    }

    return {
      disputeId: id,
      actorAddress,
      nextAction: {
        contract: process.env.DISPUTE_ADDRESS,
        method: "vote",
        args: [String(dispute.dispute_id_on_chain), voteResult],
      },
    };
  }

  async buildFinalizeIntent(id: string, actorAddress: string) {
    const dispute = await this.getById(id);
    const assigned = Array.isArray(dispute.assignedArbitrators) ? dispute.assignedArbitrators as string[] : [];
    if (!assigned.includes(actorAddress.toLowerCase())) {
      throw new ForbiddenException("This account is not assigned to this dispute");
    }

    return {
      disputeId: id,
      actorAddress,
      nextAction: {
        contract: process.env.DISPUTE_ADDRESS,
        method: "finalizeDispute",
        args: [String(dispute.dispute_id_on_chain)],
      },
    };
  }

  private async enrichDispute(dispute: DisputeDetails) {
    const votes = await this.db.query(
      "select av.arbitrator_address, u.alias as arbitrator_alias, av.vote_result, av.created_at from arbitrator_votes av left join users u on u.address = av.arbitrator_address where av.dispute_id = $1 order by av.created_at asc",
      [dispute.id],
    );
    const assignedArbitrators = await this.getAssignedArbitrators(dispute.dispute_id_on_chain);
    return {
      ...dispute,
      assignedArbitrators,
      votes: votes.rows,
    };
  }

  private async getAssignedArbitrators(disputeId: string | number) {
    const disputeAddress = process.env.DISPUTE_ADDRESS as `0x${string}` | undefined;
    const rpcUrl = process.env.RPC_URL;
    if (!disputeAddress || !rpcUrl) {
      return [] as string[];
    }

    try {
      const client = createPublicClient({
        transport: http(rpcUrl),
      });
      const arbitrators = await client.readContract({
        address: disputeAddress,
        abi: disputeAbi,
        functionName: "getAssignedArbitrators",
        args: [BigInt(disputeId)],
      });
      return arbitrators.map((address) => address.toLowerCase());
    } catch {
      return [] as string[];
    }
  }
}
