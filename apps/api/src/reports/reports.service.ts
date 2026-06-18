import { randomUUID } from "node:crypto";

import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";

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
    const bounty = await this.db.query<{ address: string; company_address: string }>(
      "select address, company_address from bounties where address = $1",
      [payload.bountyAddress.toLowerCase()],
    );
    if (!bounty.rows[0]) {
      throw new NotFoundException("Unknown bounty");
    }
    if (bounty.rows[0].company_address.toLowerCase() === payload.authorAddress.toLowerCase()) {
      throw new ForbiddenException("La empresa no puede reportar vulnerabilidades en su propio bounty.");
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

  async listByAuthor(authorAddress: string) {
    const reports = await this.db.query(
      `select
         r.id,
         r.bounty_address,
         r.title,
         r.status,
         r.report_hash,
         r.created_at,
         r.report_id_on_chain,
         b.title as bounty_title,
         d.id as dispute_id,
         d.status as dispute_status,
         d.result as dispute_result
       from reports r
       join bounties b on b.address = r.bounty_address
       left join disputes d
         on d.bounty_address = r.bounty_address
        and d.report_id_on_chain = r.report_id_on_chain
       where r.author_address = $1
       order by r.created_at desc`,
      [authorAddress.toLowerCase()],
    );
    return reports.rows;
  }

  async createDisputeIntent(id: string, actorAddress: string) {
    const report = await this.getById(id);
    return {
      reportId: id,
      actorAddress,
      nextAction: {
        contract: report.bounty_address,
        method: "disputeReport",
        args: [String(report.report_id_on_chain ?? 0)],
      },
    };
  }

  async createSubmitIntent(id: string, actorAddress: string) {
    const report = await this.db.query<{
      id: string;
      bounty_address: string;
      author_address: string;
      report_hash: string;
      report_id_on_chain: string | number | null;
      status: string;
    }>(
      `select id, bounty_address, author_address, report_hash, report_id_on_chain, status
       from reports
       where id = $1`,
      [id],
    );

    const row = report.rows[0];
    if (!row) {
      throw new NotFoundException("Report not found");
    }
    if (row.author_address.toLowerCase() !== actorAddress.toLowerCase()) {
      throw new NotFoundException("Report not found for this hunter");
    }
    const bounty = await this.db.query<{ company_address: string }>(
      "select company_address from bounties where address = $1",
      [row.bounty_address.toLowerCase()],
    );
    if (bounty.rows[0]?.company_address?.toLowerCase() === actorAddress.toLowerCase()) {
      throw new ForbiddenException("La empresa no puede reportar vulnerabilidades en su propio bounty.");
    }
    if (row.report_id_on_chain !== null || row.status !== "OFFCHAIN_STORED") {
      throw new NotFoundException("This report does not need on-chain resubmission");
    }

    return {
      reportId: id,
      actorAddress,
      nextAction: {
        contract: row.bounty_address,
        method: "submitReport",
        args: [row.report_hash],
      },
    };
  }

  async createResolutionIntent(id: string, actorAddress: string, action: "accept" | "reject") {
    const report = await this.db.query<{
      id: string;
      bounty_address: string;
      report_id_on_chain: string | number | null;
      company_address: string;
      status: string;
    }>(
      `select r.id, r.bounty_address, r.report_id_on_chain, r.status, b.company_address
       from reports r
       join bounties b on b.address = r.bounty_address
       where r.id = $1`,
      [id],
    );

    const row = report.rows[0];
    if (!row) {
      throw new NotFoundException("Report not found");
    }
    if (row.company_address.toLowerCase() !== actorAddress.toLowerCase()) {
      throw new NotFoundException("Report not found for this company");
    }
    if (row.report_id_on_chain === null) {
      throw new NotFoundException("Report is not indexed on-chain yet");
    }
    if (row.status !== "PENDING") {
      throw new NotFoundException("Only pending reports can be resolved");
    }

    return {
      reportId: id,
      actorAddress,
      nextAction: {
        contract: row.bounty_address,
        method: action === "accept" ? "acceptReport" : "rejectReport",
        args: [String(row.report_id_on_chain)],
      },
    };
  }
}
