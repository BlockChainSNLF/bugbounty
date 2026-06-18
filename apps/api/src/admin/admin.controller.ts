import { Body, Controller, Delete, Get, Headers, Param, Post } from "@nestjs/common";

import { AuthService } from "../auth/auth.service.js";
import { AdminService } from "./admin.service.js";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly authService: AuthService,
    private readonly adminService: AdminService,
  ) {}

  @Get("overview")
  async overview(@Headers("authorization") authorization: string | undefined) {
    await this.authService.requireRole(authorization, ["admin"]);
    return this.adminService.overview();
  }

  @Post("companies/:address/approve")
  async approveCompany(
    @Headers("authorization") authorization: string | undefined,
    @Param("address") address: string,
  ) {
    await this.authService.requireRole(authorization, ["admin"]);
    return this.adminService.approveCompany(address);
  }

  @Post("arbitrators")
  async registerArbitrator(
    @Headers("authorization") authorization: string | undefined,
    @Body() body: { address: string },
  ) {
    await this.authService.requireRole(authorization, ["admin"]);
    return this.adminService.registerArbitrator(body.address);
  }

  @Delete("arbitrators/:address")
  async removeArbitrator(
    @Headers("authorization") authorization: string | undefined,
    @Param("address") address: string,
  ) {
    await this.authService.requireRole(authorization, ["admin"]);
    return this.adminService.removeArbitrator(address);
  }

  @Post("sync")
  async sync(@Headers("authorization") authorization: string | undefined) {
    await this.authService.requireRole(authorization, ["admin"]);
    return this.adminService.sync();
  }
}
