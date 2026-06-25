import { randomBytes } from "node:crypto";

import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { recoverMessageAddress } from "viem";

import type { Role, WalletSession } from "@bugbounty/shared";

import { DatabaseService } from "../db/database.service.js";
import { parseBearer } from "../common/session.js";

@Injectable()
export class AuthService {
  private readonly nonces = new Map<string, { nonce: string; expiresAt: number }>();
  private readonly sessions = new Map<string, WalletSession>();
  private readonly NONCE_TTL_MS = 5 * 60 * 1000;

  constructor(private readonly db: DatabaseService) {}

  createNonce(address: string) {
    const now = Date.now();
    for (const [key, value] of this.nonces) {
      if (value.expiresAt < now) this.nonces.delete(key);
    }
    const nonce = randomBytes(16).toString("hex");
    this.nonces.set(address.toLowerCase(), { nonce, expiresAt: now + this.NONCE_TTL_MS });
    return { nonce, message: `BugBounty login nonce: ${nonce}` };
  }

  async verify(address: string, signature: `0x${string}`) {
    const normalizedAddress = address.toLowerCase();
    const nonceEntry = this.nonces.get(normalizedAddress);
    if (!nonceEntry || nonceEntry.expiresAt < Date.now()) {
      this.nonces.delete(normalizedAddress);
      throw new UnauthorizedException("Nonce not found or expired");
    }

    const recovered = await recoverMessageAddress({
      message: `BugBounty login nonce: ${nonceEntry.nonce}`,
      signature,
    });

    if (recovered.toLowerCase() !== normalizedAddress) {
      throw new UnauthorizedException("Signature does not match address");
    }

    this.nonces.delete(normalizedAddress);
    const role = await this.resolveRole(normalizedAddress);
    await this.db.query(
      `insert into users (address, role)
       values ($1, $2)
       on conflict (address) do nothing`,
      [normalizedAddress, role],
    );
    const session: WalletSession = {
      token: randomBytes(24).toString("hex"),
      address: normalizedAddress,
      role,
      isAdmin: this.isAdminWallet(normalizedAddress),
      companyApproved: await this.isCompanyApproved(normalizedAddress),
      alias: await this.getAlias(normalizedAddress),
    };
    this.sessions.set(session.token, session);
    // Persistimos el token para que sobreviva reinicios de la API: así no hay que
    // volver a firmar al cambiar de cuenta cada vez que el server se reinicia.
    await this.db.query(
      `insert into sessions (token, address) values ($1, $2)
       on conflict (token) do nothing`,
      [session.token, normalizedAddress],
    );

    return session;
  }

  async requireSession(authHeader?: string) {
    const token = parseBearer(authHeader);
    const cached = this.sessions.get(token);
    if (cached) {
      return cached;
    }
    const session = await this.restoreSession(token);
    if (!session) {
      throw new UnauthorizedException("Invalid session");
    }
    return session;
  }

  /** Reconstruye una sesión desde la DB (token persistido) cuando no está en memoria. */
  private async restoreSession(token: string): Promise<WalletSession | undefined> {
    const result = await this.db.query<{ address: string }>(
      "select address from sessions where token = $1",
      [token],
    );
    const address = result.rows[0]?.address;
    if (!address) {
      return undefined;
    }
    const session: WalletSession = {
      token,
      address,
      role: await this.resolveRole(address),
      isAdmin: this.isAdminWallet(address),
      companyApproved: await this.isCompanyApproved(address),
      alias: await this.getAlias(address),
    };
    this.sessions.set(token, session);
    return session;
  }

  /** Returns the session with the alias refreshed from the database. */
  async me(authHeader?: string) {
    const session = await this.requireSession(authHeader);
    const alias = await this.getAlias(session.address);
    session.alias = alias;
    return { ...session, alias };
  }

  async updateProfile(authHeader: string | undefined, alias: string | null) {
    const session = await this.requireSession(authHeader);
    const normalizedAlias = alias?.trim() ? alias.trim() : null;
    await this.db.query("update users set alias = $2 where address = $1", [session.address, normalizedAlias]);
    session.alias = normalizedAlias;
    return { ...session, alias: normalizedAlias };
  }

  private async getAlias(address: string) {
    const result = await this.db.query<{ alias: string | null }>(
      "select alias from users where address = $1",
      [address],
    );
    return result.rows[0]?.alias ?? null;
  }

  async requireRole(authHeader: string | undefined, roles: Role[]) {
    const session = await this.requireSession(authHeader);
    // El admin (ADMIN_WALLET) es superusuario: pasa cualquier gate de rol.
    if (!session.isAdmin && !roles.includes(session.role)) {
      throw new ForbiddenException("Insufficient role");
    }
    return session;
  }

  private isAdminWallet(address: string) {
    const adminWallet = process.env.ADMIN_WALLET?.toLowerCase();
    return Boolean(adminWallet) && adminWallet === address.toLowerCase();
  }

  private async resolveRole(address: string): Promise<Role> {
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
