import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";

import { AuthService } from "../auth/auth.service.js";
import { DisputesService } from "./disputes.service.js";

@Controller("disputes")
export class DisputesController {
  constructor(
    private readonly authService: AuthService,
    private readonly disputesService: DisputesService,
  ) {}

  @Get()
  list() {
    return this.disputesService.list();
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.disputesService.getById(id);
  }

  @Post(":id/vote-intent")
  async voteIntent(
    @Headers("authorization") authorization: string | undefined,
    @Param("id") id: string,
    @Body() body: { voteResult: number },
  ) {
    const session = await this.authService.requireRole(authorization, ["arbitrator", "admin"]);
    return this.disputesService.buildVoteIntent(id, session.address, body.voteResult);
  }
}
