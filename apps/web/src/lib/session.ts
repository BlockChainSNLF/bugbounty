import { api } from "./api";
import { connectPreferredWallet, signMessage } from "./wallet";

type Session = {
  token: string;
  address: string;
  role: string;
};

const SESSION_EVENT = "bugbounty:session-changed";
const PREFERRED_WALLET_KEY = "bugbounty.preferred-wallet";

function saveSession(session: Session) {
  window.localStorage.setItem("bugbounty.token", session.token);
  window.localStorage.setItem("bugbounty.role", session.role);
  window.localStorage.setItem("bugbounty.address", session.address);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const token = window.localStorage.getItem("bugbounty.token");
  const role = window.localStorage.getItem("bugbounty.role");
  const address = window.localStorage.getItem("bugbounty.address");
  if (!token || !role || !address) {
    return null;
  }

  return { token, role, address };
}

export function getPreferredWallet() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(PREFERRED_WALLET_KEY);
}

export function setPreferredWallet(address: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!address) {
    window.localStorage.removeItem(PREFERRED_WALLET_KEY);
  } else {
    window.localStorage.setItem(PREFERRED_WALLET_KEY, address.toLowerCase());
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  clearStoredAuthSession();
  window.localStorage.removeItem(PREFERRED_WALLET_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

function clearStoredAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("bugbounty.token");
  window.localStorage.removeItem("bugbounty.role");
  window.localStorage.removeItem("bugbounty.address");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export async function loginWithWallet(preferredAddress?: string) {
  const address = await connectPreferredWallet(preferredAddress);
  setPreferredWallet(address);
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

export async function ensureWalletSession(expectedRoles?: string[], preferredAddress?: string) {
  const connectedAddress = await connectPreferredWallet(preferredAddress ?? getPreferredWallet() ?? undefined);
  const stored = getStoredSession();

  if (
    stored &&
    stored.address.toLowerCase() === connectedAddress.toLowerCase() &&
    (!expectedRoles || expectedRoles.includes(stored.role))
  ) {
    try {
      const verified = await api<Session>("/me");
      if (verified.address.toLowerCase() === connectedAddress.toLowerCase()) {
        saveSession(verified);
        return verified;
      }
      clearStoredAuthSession();
    } catch {
      clearStoredAuthSession();
    }
  }

  const verified = await loginWithWallet(connectedAddress);
  if (verified.address.toLowerCase() !== connectedAddress.toLowerCase()) {
    throw new Error("La cuenta conectada no coincide con la sesión actual.");
  }
  if (expectedRoles && !expectedRoles.includes(verified.role)) {
    throw new Error("Esta cuenta no tiene permisos para esta acción.");
  }

  return verified;
}

export { SESSION_EVENT };
