import { Injectable } from "@nestjs/common";

import { DatabaseService } from "../db/database.service.js";
import { ContractsService } from "../contracts/contracts.service.js";

@Injectable()
export class AdminService {
  constructor(
    private readonly db: DatabaseService,
    private readonly contractsService: ContractsService,
  ) {}

  async approveCompany(address: string) {
    await this.db.query(
      `insert into users (address, role, company_approved)
       values ($1, 'company', true)
       on conflict (address) do update
       set role = 'company',
           company_approved = true`,
      [address.toLowerCase()],
    );
    return { address: address.toLowerCase(), approved: true };
  }

  async registerArbitrator(address: string) {
    await this.db.query(
      `insert into users (address, role, company_approved)
       values ($1, 'arbitrator', false)
       on conflict (address) do update
       set role = 'arbitrator'`,
      [address.toLowerCase()],
    );
    return {
      address: address.toLowerCase(),
      role: "arbitrator",
      nextAction: {
        contract: process.env.DISPUTE_ADDRESS,
        method: "registerArbitrator",
        args: [address.toLowerCase()],
      },
    };
  }

  async sync() {
    return this.contractsService.syncConfiguredContracts();
  }
}
