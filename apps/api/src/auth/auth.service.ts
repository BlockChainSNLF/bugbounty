import { randomBytes } from "node:crypto";

import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { recoverMessageAddress } from "viem";

import type { Role, WalletSession } from "@bugbounty/shared";

import { DatabaseService } from "../db/database.service.js";
import { parseBearer } from "../common/session.js";

@Injectable()
export class AuthService {
  private readonly nonces = new Map<string, string>();
  private readonly sessions = new Map<string, WalletSession>();

  constructor(private readonly db: DatabaseService) {}

  createNonce(address: string) {
    const nonce = randomBytes(16).toString("hex");
    this.nonces.set(address.toLowerCase(), nonce);
    return { nonce, message: `BugBounty login nonce: ${nonce}` };
  }

  async verify(address: string, signature: `0x${string}`) {
    const normalizedAddress = address.toLowerCase();
    const nonce = this.nonces.get(normalizedAddress);
    if (!nonce) {
      throw new UnauthorizedException("Nonce not found");
    }

    const recovered = await recoverMessageAddress({
      message: `BugBounty login nonce: ${nonce}`,
      signature,
    });

    if (recovered.toLowerCase() !== normalizedAddress) {
      throw new UnauthorizedException("Signature does not match address");
    }

    this.nonces.delete(normalizedAddress);
    const role = await this.resolveRole(normalizedAddress);
    const session: WalletSession = {
      token: randomBytes(24).toString("hex"),
      address: normalizedAddress,
      role,
      companyApproved: await this.isCompanyApproved(normalizedAddress),
    };
    this.sessions.set(session.token, session);
    await this.db.query(
      `insert into users (address, role)
       values ($1, $2)
       on conflict (address) do nothing`,
      [normalizedAddress, role],
    );

    return session;
  }

  async requireSession(authHeader?: string) {
    const token = parseBearer(authHeader);
    const session = this.sessions.get(token);
    if (!session) {
      throw new UnauthorizedException("Invalid session");
    }
    return session;
  }

  async requireRole(authHeader: string | undefined, roles: Role[]) {
    const session = await this.requireSession(authHeader);
    if (!roles.includes(session.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return session;
  }

  private async resolveRole(address: string): Promise<Role> {
    const adminWallet = process.env.ADMIN_WALLET?.toLowerCase();
    if (adminWallet && adminWallet === address) {
      return "admin";
    }

    const existing = await this.db.query<{ role: Role }>(
      "select role from users where address = $1",
      [address],
    );
    return existing.rows[0]?.role ?? "hunter";
  }

  private async isCompanyApproved(address: string) {
    const result = await this.db.query<{ company_approved: boolean }>(
      "select company_approved from users where address = $1",
      [address],
    );
    return result.rows[0]?.company_approved ?? false;
  }
}
