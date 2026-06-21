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

function saveSession(session: Session) {
  window.localStorage.setItem("bugbounty.token", session.token);
  window.localStorage.setItem("bugbounty.role", session.role);
  window.localStorage.setItem("bugbounty.address", session.address);
  if (session.alias) {
    window.localStorage.setItem("bugbounty.alias", session.alias);
  } else {
    window.localStorage.removeItem("bugbounty.alias");
  }
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
    throw new Error("Conectá tu wallet para continuar.");
  }
  if (account.chainId !== CHAIN_ID) {
    throw new Error("Cambiá tu wallet a la red Sepolia para continuar.");
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
  const stored = getStoredSession();
  if (stored && stored.address.toLowerCase() === address) {
    try {
      const verified = await api<Session>("/me");
      if (verified.address.toLowerCase() === address) {
        saveSession(verified);
        return verified;
      }
    } catch {
      clearStoredSession();
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
    throw new Error("Esta cuenta no tiene permisos para esta acción.");
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
