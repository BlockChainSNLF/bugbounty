import { Injectable, OnModuleInit } from "@nestjs/common";
import { Pool } from "pg";
import type { QueryResultRow } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required");
    }

    this.pool = new Pool({ connectionString });
  }

  async onModuleInit() {
    await this.query(`
      create table if not exists users (
        address text primary key,
        role text not null,
        company_approved boolean not null default false,
        created_at timestamptz not null default now()
      );

      create table if not exists bounties (
        address text primary key,
        title text not null,
        description text not null,
        reward_wei text not null,
        chain_id integer not null,
        company_address text not null references users(address),
        created_by text not null references users(address),
        created_at timestamptz not null default now()
      );

      create table if not exists reports (
        id text primary key,
        bounty_address text not null references bounties(address),
        author_address text not null references users(address),
        title text not null,
        description text not null,
        poc text not null,
        report_hash text not null,
        report_id_on_chain bigint,
        tx_hash text,
        status text not null,
        created_at timestamptz not null default now()
      );

      create table if not exists report_files (
        id bigserial primary key,
        report_id text not null references reports(id) on delete cascade,
        file_name text not null,
        mime_type text not null,
        sha256 text not null,
        storage_path text not null
      );

      create table if not exists disputes (
        id text primary key,
        dispute_id_on_chain bigint not null,
        bounty_address text not null,
        report_id_on_chain bigint not null,
        hunter_address text not null,
        result text,
        status text not null,
        votes_cast integer not null default 0,
        created_at timestamptz not null default now(),
        finalized_at timestamptz
      );

      create table if not exists arbitrator_votes (
        id bigserial primary key,
        dispute_id text not null references disputes(id) on delete cascade,
        arbitrator_address text not null,
        vote_result text not null,
        created_at timestamptz not null default now(),
        unique (dispute_id, arbitrator_address)
      );

      create table if not exists contract_events (
        id bigserial primary key,
        contract_address text not null,
        event_name text not null,
        block_number bigint not null,
        tx_hash text not null,
        payload jsonb not null,
        created_at timestamptz not null default now(),
        unique (contract_address, tx_hash, event_name)
      );

      create table if not exists contract_sync_state (
        contract_address text primary key,
        last_block bigint not null default 0
      );
    `);
  }

  async query<T extends QueryResultRow = QueryResultRow>(text: string, values?: unknown[]) {
    return this.pool.query<T>(text, values);
  }
}
