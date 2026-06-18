import { UnauthorizedException } from "@nestjs/common";

import type { Role, WalletSession } from "@bugbounty/shared";

export type SessionWithRoles = WalletSession & { role: Role };

export function parseBearer(header?: string): string {
  if (!header) {
    throw new UnauthorizedException("Missing Authorization header");
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedException("Invalid Authorization header");
  }

  return token;
}
