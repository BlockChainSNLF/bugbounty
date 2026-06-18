import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";

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

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.reportsService.getById(id);
  }

  @Post(":id/dispute")
  async disputeIntent(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
  ) {
    const session = await this.authService.requireRole(authorization, ["hunter", "admin"]);
    return this.reportsService.createDisputeIntent(id, session.address);
  }
}
