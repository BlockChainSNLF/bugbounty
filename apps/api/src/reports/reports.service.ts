import { randomUUID } from "node:crypto";

import { Injectable, NotFoundException } from "@nestjs/common";

import { buildCanonicalReportPayload, buildReportHash, serializeCanonicalReport } from "@bugbounty/shared";

import { DatabaseService } from "../db/database.service.js";
import { StorageService } from "../storage/storage.service.js";

type AttachmentDto = {
  fileName: string;
  mimeType: string;
  contentBase64: string;
};

type ReportDetails = {
  id: string;
  bounty_address: string;
  report_id_on_chain: string | number | null;
  [key: string]: unknown;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly storageService: StorageService,
  ) {}

  async create(payload: {
    bountyAddress: string;
    authorAddress: string;
    title: string;
    description: string;
    poc: string;
    attachments: AttachmentDto[];
  }) {
    const id = randomUUID();
    const bounty = await this.db.query(
      "select address from bounties where address = $1",
      [payload.bountyAddress.toLowerCase()],
    );
    if (!bounty.rows[0]) {
      throw new NotFoundException("Unknown bounty");
    }

    const reportHash = buildReportHash(payload.title, payload.description, payload.poc, payload.attachments);
    const savedAttachments = await this.storageService.persistAttachments(id, payload.attachments);
    const canonical = buildCanonicalReportPayload(payload.title, payload.description, payload.poc, payload.attachments);

    await this.db.query(
      `insert into reports (id, bounty_address, author_address, title, description, poc, report_hash, status)
       values ($1, $2, $3, $4, $5, $6, $7, 'OFFCHAIN_STORED')`,
      [
        id,
        payload.bountyAddress.toLowerCase(),
        payload.authorAddress,
        payload.title,
        payload.description,
        payload.poc,
        reportHash,
      ],
    );

    for (const attachment of savedAttachments) {
      await this.db.query(
        `insert into report_files (report_id, file_name, mime_type, sha256, storage_path)
         values ($1, $2, $3, $4, $5)`,
        [id, attachment.fileName, attachment.mimeType, attachment.sha256, attachment.storagePath],
      );
    }

    return {
      id,
      bountyAddress: payload.bountyAddress.toLowerCase(),
      reportHash,
      canonicalPayload: serializeCanonicalReport(canonical),
      nextAction: {
        contract: payload.bountyAddress.toLowerCase(),
        method: "submitReport",
        args: [reportHash],
      },
    };
  }

  async getById(id: string) {
    const report = await this.db.query<ReportDetails>("select * from reports where id = $1", [id]);
    if (!report.rows[0]) {
      throw new NotFoundException("Report not found");
    }
    const files = await this.db.query("select file_name, mime_type, sha256, storage_path from report_files where report_id = $1", [id]);
    return { ...report.rows[0], files: files.rows };
  }

  async createDisputeIntent(id: string, actorAddress: string) {
    const report = await this.getById(id);
    return {
      reportId: id,
      actorAddress,
      nextAction: {
        contract: report.bounty_address,
        method: "disputeReport",
        args: [BigInt(report.report_id_on_chain ?? 0)],
      },
    };
  }
}
