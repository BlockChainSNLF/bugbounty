import { createReadStream } from "node:fs";

import { Body, Controller, Get, Headers, Param, Post, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";

import { AuthService } from "../auth/auth.service.js";
import { ReportsService } from "./reports.service.js";

@Controller("reports")
export class ReportsController {
  constructor(
    private readonly authService: AuthService,
    private readonly reportsService: ReportsService,
  ) {}

  @Post()
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: {
      bountyAddress: string;
      title: string;
      description: string;
      poc: string;
      attachments: Array<{ fileName: string; mimeType: string; contentBase64: string }>;
    },
  ) {
    const session = await this.authService.requireRole(authorization, ["hunter", "admin"]);
    return this.reportsService.create({ ...body, authorAddress: session.address });
  }

  @Get("mine/list")
  async listMine(@Headers("authorization") authorization: string | undefined) {
    const session = await this.authService.requireRole(authorization, ["hunter", "admin"]);
    return this.reportsService.listByAuthor(session.address);
  }

  @Get(":id")
  async getOne(@Headers("authorization") authorization: string | undefined, @Param("id") id: string) {
    const session = await this.authService.requireSession(authorization);
    await this.reportsService.assertCanViewReport(session, id);
    return this.reportsService.getById(id);
  }

  @Get(":id/files/:fileId")
  async downloadFile(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Param("fileId") fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.requireSession(authorization);
    await this.reportsService.assertCanViewReport(session, id);
    const file = await this.reportsService.getFileForDownload(id, fileId);
    res.setHeader("Content-Type", file.mime_type);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.file_name)}"`);
    return new StreamableFile(createReadStream(file.storage_path));
  }

  @Post(":id/dispute")
  async disputeIntent(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const session = await this.authService.requireRole(authorization, ["hunter", "admin"]);
    return this.reportsService.createDisputeIntent(id, session.address);
  }

  @Post(":id/resubmit")
  async resubmitIntent(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const session = await this.authService.requireRole(authorization, ["hunter", "admin"]);
    return this.reportsService.createSubmitIntent(id, session.address);
  }

  @Post(":id/accept")
  async acceptIntent(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const session = await this.authService.requireRole(authorization, ["company", "admin"]);
    return this.reportsService.createResolutionIntent(id, session.address, "accept");
  }

  @Post(":id/reject")
  async rejectIntent(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const session = await this.authService.requireRole(authorization, ["company", "admin"]);
    return this.reportsService.createResolutionIntent(id, session.address, "reject");
  }
}
