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

  async removeCompany(address: string) {
    await this.db.query(
      `update users set role = 'hunter', company_approved = false
       where address = $1 and role = 'company'`,
      [address.toLowerCase()],
    );
    return { address: address.toLowerCase(), removed: true };
  }

  async removeArbitrator(address: string) {
    await this.db.query(
      `delete from users
       where address = $1
         and role = 'arbitrator'`,
      [address.toLowerCase()],
    );

    return {
      address: address.toLowerCase(),
      removed: true,
      nextAction: {
        contract: process.env.DISPUTE_ADDRESS,
        method: "removeArbitrator",
        args: [address.toLowerCase()],
      },
    };
  }

  async sync() {
    return this.contractsService.syncConfiguredContracts();
  }

  async overview() {
    const [companies, arbitrators, bounties, disputes] = await Promise.all([
      this.db.query(
        `select address, role, company_approved, created_at
         from users
         where role = 'company'
         order by company_approved desc, created_at desc`,
      ),
      this.db.query(
        `select address, role, created_at
         from users
         where role = 'arbitrator'
         order by created_at desc`,
      ),
      this.db.query(
        `select
           b.address,
           b.title,
           b.reward_wei,
           b.company_address,
           b.created_at,
           count(r.id)::int as report_count
         from bounties b
         left join reports r on r.bounty_address = b.address
         group by b.address
         order by b.created_at desc`,
      ),
      this.db.query(
        `select
           d.id,
           d.status,
           d.result,
           d.votes_cast,
           d.created_at,
           d.bounty_address,
           d.hunter_address,
           b.title as bounty_title
         from disputes d
         left join bounties b on b.address = d.bounty_address
         order by d.created_at desc
         limit 12`,
      ),
    ]);

    return {
      companies: companies.rows,
      arbitrators: arbitrators.rows,
      bounties: bounties.rows,
      disputes: disputes.rows,
    };
  }
}
