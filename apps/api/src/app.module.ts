import { Module } from "@nestjs/common";

import { AdminController } from "./admin/admin.controller.js";
import { AdminService } from "./admin/admin.service.js";
import { AuthController } from "./auth/auth.controller.js";
import { AuthService } from "./auth/auth.service.js";
import { BountiesController } from "./bounties/bounties.controller.js";
import { BountiesService } from "./bounties/bounties.service.js";
import { ContractsService } from "./contracts/contracts.service.js";
import { DatabaseService } from "./db/database.service.js";
import { DisputesController } from "./disputes/disputes.controller.js";
import { DisputesService } from "./disputes/disputes.service.js";
import { ReportsController } from "./reports/reports.controller.js";
import { ReportsService } from "./reports/reports.service.js";
import { StorageService } from "./storage/storage.service.js";

@Module({
  controllers: [
    AdminController,
    AuthController,
    BountiesController,
    DisputesController,
    ReportsController,
  ],
  providers: [
    AdminService,
    AuthService,
    BountiesService,
    ContractsService,
    DatabaseService,
    DisputesService,
    ReportsService,
    StorageService,
  ],
})
export class AppModule {}
