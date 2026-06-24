import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createPublicClient, decodeEventLog, http } from "viem";

import { bountyAbi, disputeAbi, disputeResultLabels, reportStatusLabels } from "@bugbounty/shared";

import { DatabaseService } from "../db/database.service.js";

@Injectable()
export class ContractsService implements OnModuleInit {
  private readonly logger = new Logger(ContractsService.name);
  private readonly pollIntervalMs = Number(process.env.SYNC_INTERVAL_MS ?? 30000);
  private readonly maxLogRange = BigInt(process.env.MAX_LOG_RANGE ?? 9);
  private readonly maxChunksPerSync = Number(process.env.MAX_CHUNKS_PER_SYNC ?? 20);
  private timer?: NodeJS.Timeout;
  private syncPromise: Promise<{ synced: boolean; bountyLogs?: number; disputeLogs?: number; reason?: string }> | null = null;

  constructor(private readonly db: DatabaseService) {}

  onModuleInit() {
    if (process.env.DISPUTE_ADDRESS) {
      this.timer = setInterval(() => {
        void this.syncConfiguredContracts().catch((error: unknown) => {
          this.logger.error(`sync failed: ${String(error)}`);
        });
      }, this.pollIntervalMs);
    }
  }

  async syncConfiguredContracts() {
    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.performConfiguredSync();
    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  private async performConfiguredSync() {
    const disputeAddress = process.env.DISPUTE_ADDRESS as `0x${string}` | undefined;
    if (!disputeAddress) {
      return { synced: false, reason: "DISPUTE_ADDRESS missing" };
    }

    const client = createPublicClient({
      transport: http(process.env.RPC_URL),
    });

    const bountyRows = await this.db.query<{ address: string }>(
      "select address from bounties order by created_at asc",
    );
    const latestBlock = await client.getBlockNumber();

    let bountyLogs = 0;
    for (const row of bountyRows.rows) {
      bountyLogs += await this.syncContract(client, row.address as `0x${string}`, bountyAbi, latestBlock);
      await this.reconcileBountyReports(client, row.address as `0x${string}`);
    }
    const disputeLogs = await this.syncContract(client, disputeAddress, disputeAbi, latestBlock);
    await this.reconcileArbitrators(client, disputeAddress);

    return {
      synced: true,
      bountyLogs,
      disputeLogs,
    };
  }

  async syncBountyAddress(bountyAddress: `0x${string}`) {
    const disputeAddress = process.env.DISPUTE_ADDRESS as `0x${string}` | undefined;
    if (!disputeAddress) {
      return { synced: false, reason: "DISPUTE_ADDRESS missing" };
    }

    const client = createPublicClient({
      transport: http(process.env.RPC_URL),
    });
    const latestBlock = await client.getBlockNumber();

    const bountyLogs = await this.syncContract(client, bountyAddress, bountyAbi, latestBlock);
    await this.reconcileBountyReports(client, bountyAddress);
    const disputeLogs = await this.syncContract(client, disputeAddress, disputeAbi, latestBlock);
    await this.reconcileArbitrators(client, disputeAddress);

    return {
      synced: true,
      bountyLogs,
      disputeLogs,
    };
  }

  private async syncContract(
    client: ReturnType<typeof createPublicClient>,
    address: `0x${string}`,
    abi: typeof bountyAbi | typeof disputeAbi,
    latestBlock: bigint,
  ) {
    const state = await this.db.query<{ last_block: string }>(
      "select last_block from contract_sync_state where contract_address = $1",
      [address.toLowerCase()],
    );
    const hasState = Boolean(state.rows[0]);
    const previousLastBlock = BigInt(state.rows[0]?.last_block ?? process.env.START_BLOCK ?? 0);
    let cursor = hasState ? previousLastBlock + 1n : previousLastBlock;
    let lastProcessedBlock = previousLastBlock;
    const logs = [];

    if (cursor > latestBlock) {
      return 0;
    }

    for (let chunks = 0; cursor <= latestBlock && chunks < this.maxChunksPerSync; chunks += 1) {
      const toBlock = cursor + (this.maxLogRange - 1n) > latestBlock
        ? latestBlock
        : cursor + (this.maxLogRange - 1n);

      let chunk;
      try {
        chunk = await client.getLogs({
          address,
          fromBlock: cursor,
          toBlock,
        });
      } catch (error) {
        if (!this.isRateLimitError(error)) {
          throw error;
        }
        this.logger.warn(`sync throttled for ${address} at blocks ${cursor}-${toBlock}`);
        break;
      }

      logs.push(...chunk);
      lastProcessedBlock = toBlock;
      cursor = toBlock + 1n;
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
      [address.toLowerCase(), lastProcessedBlock.toString()],
    );

    return logs.length;
  }

  private isRateLimitError(error: unknown) {
    const message = String(error).toLowerCase();
    return message.includes("429") || message.includes("too many requests");
  }

  private async projectState(address: string, eventName: string, args: Record<string, unknown>) {
    switch (eventName) {
      case "ArbitratorRegistered":
        await this.db.query(
          `insert into users (address, role, company_approved)
           values ($1, 'arbitrator', false)
           on conflict (address) do update
           set role = 'arbitrator'`,
          [String(args.arbitrator).toLowerCase()],
        );
        break;
      case "ArbitratorRemoved":
        await this.db.query(
          `delete from users
           where address = $1
             and role = 'arbitrator'`,
          [String(args.arbitrator).toLowerCase()],
        );
        break;
      case "ReportSubmitted":
        await this.db.query(
          `with candidate as (
             select id
             from reports
             where bounty_address = $3
               and lower(author_address) = $4
               and report_id_on_chain is null
             order by created_at asc
             limit 1
           )
           update reports
           set report_id_on_chain = $1,
               status = $2
           where id in (select id from candidate)`,
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
        {
          const dispute = await this.db.query<{ id: string }>(
            "select id from disputes where dispute_id_on_chain = $1",
            [Number(args.disputeId)],
          );
          if (!dispute.rows[0]) {
            break;
          }
        await this.db.query(
          `insert into arbitrator_votes (dispute_id, arbitrator_address, vote_result)
           values ($1, $2, $3)
           on conflict (dispute_id, arbitrator_address) do nothing`,
          [
            dispute.rows[0].id,
            String(args.arbitrator).toLowerCase(),
            disputeResultLabels[Number(args.vote)],
          ],
        );
        }
        break;
      case "DisputeFinalized":
        await this.db.query(
          `update disputes
           set result = $1,
               status = 'FINALIZED',
               votes_cast = $2,
               finalized_at = now()
           where dispute_id_on_chain = $3`,
          [
            disputeResultLabels[Number(args.result)],
            Number(args.votesCast),
            Number(args.disputeId),
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

  private async reconcileArbitrators(
    client: ReturnType<typeof createPublicClient>,
    disputeAddress: `0x${string}`,
  ) {
    const onChainArbitrators = (await client.readContract({
      address: disputeAddress,
      abi: disputeAbi,
      functionName: "getArbitrators",
    })).map((address) => address.toLowerCase());

    const localArbitrators = await this.db.query<{ address: string }>(
      `select address
       from users
       where role = 'arbitrator'`,
    );
    const localSet = new Set(localArbitrators.rows.map((row) => row.address.toLowerCase()));
    const onChainSet = new Set(onChainArbitrators);

    for (const address of onChainArbitrators) {
      await this.db.query(
        `insert into users (address, role, company_approved)
         values ($1, 'arbitrator', false)
         on conflict (address) do update
         set role = 'arbitrator'`,
        [address],
      );
    }

    for (const address of localSet) {
      if (!onChainSet.has(address)) {
        await this.db.query(
          `delete from users
           where address = $1
             and role = 'arbitrator'`,
          [address],
        );
      }
    }
  }

  private async reconcileBountyReports(
    client: ReturnType<typeof createPublicClient>,
    bountyAddress: `0x${string}`,
  ) {
    const reportCount = await client.readContract({
      address: bountyAddress,
      abi: bountyAbi,
      functionName: "reportCount",
    });

    for (let reportId = 0n; reportId < reportCount; reportId += 1n) {
      const report = await client.readContract({
        address: bountyAddress,
        abi: bountyAbi,
        functionName: "getReport",
        args: [reportId],
      });

      const hunterAddress = report.hunter.toLowerCase();
      const reportHash = report.hash.toLowerCase();
      const status = reportStatusLabels[Number(report.status)];

      await this.db.query(
        `with candidate as (
           select id
           from reports
           where bounty_address = $1
             and lower(author_address) = $2
             and lower(report_hash) = $3
             and (
               report_id_on_chain is null
               or report_id_on_chain = $4
             )
           order by created_at asc
           limit 1
         )
         update reports
         set report_id_on_chain = $4,
             status = $5
         where id in (select id from candidate)`,
        [
          bountyAddress.toLowerCase(),
          hunterAddress,
          reportHash,
          Number(reportId),
          status,
        ],
      );
    }
  }
}
