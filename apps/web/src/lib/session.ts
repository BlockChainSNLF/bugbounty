import { getAccount } from "@wagmi/core";

import { api } from "./api";
import { signMessage } from "./wallet";
import { CHAIN_ID, wagmiConfig } from "./wagmi";

type Session = {
  token: string;
  address: string;
  role: string;
  alias: string | null;
};

const SESSION_EVENT = "bugbounty:session-changed";

function cacheKey(address: string) {
  return `bugbounty.session.${address.toLowerCase()}`;
}

/** Token cacheado por dirección: al volver a una wallet ya logueada no se vuelve a firmar. */
function getCachedSession(address: string): Session | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(cacheKey(address));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  window.localStorage.setItem("bugbounty.token", session.token);
  window.localStorage.setItem("bugbounty.role", session.role);
  window.localStorage.setItem("bugbounty.address", session.address);
  if (session.alias) {
    window.localStorage.setItem("bugbounty.alias", session.alias);
  } else {
    window.localStorage.removeItem("bugbounty.alias");
  }
  // Cache por wallet (persiste aunque cambies de cuenta / desconectes).
  window.localStorage.setItem(cacheKey(session.address), JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("bugbounty.token");
  const role = window.localStorage.getItem("bugbounty.role");
  const address = window.localStorage.getItem("bugbounty.address");
  const alias = window.localStorage.getItem("bugbounty.alias");
  if (!token || !role || !address) {
    return null;
  }

  return { token, role, address, alias };
}

/** The address currently connected through wagmi/RainbowKit, lowercased. */
export function getPreferredWallet() {
  return getAccount(wagmiConfig).address?.toLowerCase() ?? null;
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("bugbounty.token");
  window.localStorage.removeItem("bugbounty.role");
  window.localStorage.removeItem("bugbounty.address");
  window.localStorage.removeItem("bugbounty.alias");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function requireConnectedAddress() {
  const account = getAccount(wagmiConfig);
  if (!account.address) {
    throw new Error("Connect your wallet to continue.");
  }
  if (account.chainId !== CHAIN_ID) {
    throw new Error("Switch to the Sepolia network to continue.");
  }
  return account.address.toLowerCase();
}

export async function loginWithWallet(address: string) {
  const nonce = await api<{ message: string }>("/auth/wallet/nonce", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
  const signature = await signMessage(address, nonce.message);
  const verified = await api<Session>("/auth/wallet/verify", {
    method: "POST",
    body: JSON.stringify({ address, signature }),
  });
  saveSession(verified);
  return verified;
}

// De-dupes concurrent session establishment so two components mounting at once
// never trigger two signature prompts for the same wallet.
let inFlight: { address: string; promise: Promise<Session> } | null = null;

async function establishSession(address: string): Promise<Session> {
  // Reusamos el token cacheado de esta wallet (si lo hay) y solo lo revalidamos
  // contra /me; si sigue vivo, no se vuelve a pedir firma.
  const cached = getCachedSession(address);
  if (cached) {
    saveSession(cached);
    try {
      const verified = await api<Session>("/me");
      if (verified.address.toLowerCase() === address) {
        saveSession(verified);
        return verified;
      }
    } catch {
      // Token vencido o backend reiniciado: firmamos de nuevo abajo.
    }
  }
  return loginWithWallet(address);
}

export async function ensureWalletSession(expectedRoles?: string[]) {
  const address = requireConnectedAddress();

  if (!inFlight || inFlight.address !== address) {
    inFlight = { address, promise: establishSession(address) };
  }

  let session: Session;
  try {
    session = await inFlight.promise;
  } finally {
    inFlight = null;
  }

  if (expectedRoles && !expectedRoles.includes(session.role)) {
    throw new Error("This account doesn't have permission for this action.");
  }

  return session;
}

export async function refreshSessionAlias(alias: string | null) {
  const verified = await api<Session>("/me", {
    method: "PATCH",
    body: JSON.stringify({ alias }),
  });
  saveSession(verified);
  return verified;
}

export { SESSION_EVENT };
