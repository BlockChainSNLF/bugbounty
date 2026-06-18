import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createPublicClient, decodeEventLog, http } from "viem";

import { bountyAbi, disputeAbi, disputeResultLabels, reportStatusLabels } from "@bugbounty/shared";

import { DatabaseService } from "../db/database.service.js";

@Injectable()
export class ContractsService implements OnModuleInit {
  private readonly logger = new Logger(ContractsService.name);
  private readonly pollIntervalMs = Number(process.env.SYNC_INTERVAL_MS ?? 10000);
  private readonly maxLogRange = BigInt(process.env.MAX_LOG_RANGE ?? 10);
  private timer?: NodeJS.Timeout;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    if (process.env.BOUNTY_ADDRESS && process.env.DISPUTE_ADDRESS) {
      this.timer = setInterval(() => {
        void this.syncConfiguredContracts().catch((error: unknown) => {
          this.logger.error(`sync failed: ${String(error)}`);
        });
      }, this.pollIntervalMs);
    }
  }

  async syncConfiguredContracts() {
    const bountyAddress = process.env.BOUNTY_ADDRESS as `0x${string}` | undefined;
    const disputeAddress = process.env.DISPUTE_ADDRESS as `0x${string}` | undefined;
    if (!bountyAddress || !disputeAddress) {
      return { synced: false, reason: "BOUNTY_ADDRESS or DISPUTE_ADDRESS missing" };
    }

    const client = createPublicClient({
      transport: http(process.env.RPC_URL),
    });

    const bountyLogs = await this.syncContract(client, bountyAddress, bountyAbi);
    const disputeLogs = await this.syncContract(client, disputeAddress, disputeAbi);

    return {
      synced: true,
      bountyLogs,
      disputeLogs,
    };
  }

  private async syncContract(client: ReturnType<typeof createPublicClient>, address: `0x${string}`, abi: typeof bountyAbi | typeof disputeAbi) {
    const state = await this.db.query<{ last_block: string }>(
      "select last_block from contract_sync_state where contract_address = $1",
      [address.toLowerCase()],
    );
    const fromBlock = BigInt(state.rows[0]?.last_block ?? process.env.START_BLOCK ?? 0);
    const latestBlock = await client.getBlockNumber();
    const logs = [];

    for (let cursor = fromBlock; cursor <= latestBlock; cursor += this.maxLogRange) {
      const toBlock = cursor + (this.maxLogRange - 1n) > latestBlock
        ? latestBlock
        : cursor + (this.maxLogRange - 1n);

      const chunk = await client.getLogs({
        address,
        fromBlock: cursor,
        toBlock,
      });

      logs.push(...chunk);
    }

    for (const log of logs) {
      const decoded = decodeEventLog({
        abi,
        data: log.data,
        topics: log.topics,
      });

      await this.db.query(
        `insert into contract_events (contract_address, event_name, block_number, tx_hash, payload)
         values ($1, $2, $3, $4, $5)
         on conflict do nothing`,
        [
          address.toLowerCase(),
          decoded.eventName,
          Number(log.blockNumber),
          log.transactionHash,
          JSON.stringify(this.normalizeArgs(decoded.args as Record<string, unknown>)),
        ],
      );

      await this.projectState(address, decoded.eventName, decoded.args as Record<string, unknown>);
    }

    await this.db.query(
      `insert into contract_sync_state (contract_address, last_block)
       values ($1, $2)
       on conflict (contract_address) do update set last_block = excluded.last_block`,
      [address.toLowerCase(), latestBlock.toString()],
    );

    return logs.length;
  }

  private async projectState(address: string, eventName: string, args: Record<string, unknown>) {
    switch (eventName) {
      case "ReportSubmitted":
        await this.db.query(
          `update reports
           set report_id_on_chain = $1,
               status = $2
           where bounty_address = $3
             and author_address = $4
             and report_id_on_chain is null`,
          [
            Number(args.reportId),
            reportStatusLabels[0],
            address.toLowerCase(),
            String(args.hunter).toLowerCase(),
          ],
        );
        break;
      case "ReportAccepted":
        await this.db.query(
          "update reports set status = 'ACCEPTED' where bounty_address = $1 and report_id_on_chain = $2",
          [address.toLowerCase(), Number(args.reportId)],
        );
        break;
      case "ReportRejected":
        await this.db.query(
          "update reports set status = 'REJECTED' where bounty_address = $1 and report_id_on_chain = $2",
          [address.toLowerCase(), Number(args.reportId)],
        );
        break;
      case "ReportDisputed":
        await this.db.query(
          "update reports set status = 'DISPUTED' where bounty_address = $1 and report_id_on_chain = $2",
          [address.toLowerCase(), Number(args.reportId)],
        );
        break;
      case "DisputeResolved":
        await this.db.query(
          "update reports set status = $1 where bounty_address = $2 and report_id_on_chain = $3",
          [disputeResultLabels[Number(args.result)] === "UPHELD" ? "ACCEPTED" : "RESOLVED", address.toLowerCase(), Number(args.reportId)],
        );
        break;
      case "DisputeOpened":
        await this.db.query(
          `insert into disputes (id, dispute_id_on_chain, bounty_address, report_id_on_chain, hunter_address, status)
           values ($1, $2, $3, $4, $5, 'OPEN')
           on conflict (id) do nothing`,
          [
            `${String(args.bounty).toLowerCase()}:${String(args.disputeId)}`,
            Number(args.disputeId),
            String(args.bounty).toLowerCase(),
            Number(args.reportId),
            String(args.hunter).toLowerCase(),
          ],
        );
        break;
      case "VoteCast":
        await this.db.query(
          `insert into arbitrator_votes (dispute_id, arbitrator_address, vote_result)
           values ($1, $2, $3)
           on conflict (dispute_id, arbitrator_address) do nothing`,
          [
            `${String(process.env.BOUNTY_ADDRESS).toLowerCase()}:${String(args.disputeId)}`,
            String(args.arbitrator).toLowerCase(),
            disputeResultLabels[Number(args.vote)],
          ],
        );
        break;
      case "DisputeFinalized":
        await this.db.query(
          `update disputes
           set result = $1,
               status = 'FINALIZED',
               votes_cast = $2,
               finalized_at = now()
           where id = $3`,
          [
            disputeResultLabels[Number(args.result)],
            Number(args.votesCast),
            `${String(process.env.BOUNTY_ADDRESS).toLowerCase()}:${String(args.disputeId)}`,
          ],
        );
        break;
      default:
        break;
    }
  }

  private normalizeArgs(args: Record<string, unknown>) {
    return JSON.parse(
      JSON.stringify(args, (_, value) => (typeof value === "bigint" ? value.toString() : value)),
    ) as Record<string, unknown>;
  }
}
