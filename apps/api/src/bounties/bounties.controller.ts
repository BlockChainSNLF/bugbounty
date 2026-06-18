import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";

import { AuthService } from "../auth/auth.service.js";
import { BountiesService } from "./bounties.service.js";

@Controller("bounties")
export class BountiesController {
  constructor(
    private readonly authService: AuthService,
    private readonly bountiesService: BountiesService,
  ) {}

  @Post()
  async create(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { address: string; title: string; description: string; rewardWei: string; chainId: number },
  ) {
    const session = await this.authService.requireRole(authorization, ["company", "admin"]);
    return this.bountiesService.create({ ...body, actorAddress: session.address });
  }

  @Get("deploy-spec")
  async getDeploySpec(@Headers("authorization") authorization: string | undefined) {
    await this.authService.requireRole(authorization, ["company", "admin"]);
    return this.bountiesService.getDeploySpec();
  }

  @Get(":address")
  getOne(@Param("address") address: string) {
    return this.bountiesService.getByAddress(address);
  }

  @Get(":address/reports")
  getReports(@Param("address") address: string) {
    return this.bountiesService.getReports(address);
  }
}
