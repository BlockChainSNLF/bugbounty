import { api } from "./api";
import { connectWallet, signMessage } from "./wallet";

type Session = {
  token: string;
  address: string;
  role: string;
};

const SESSION_EVENT = "bugbounty:session-changed";

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

export function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem("bugbounty.token");
  window.localStorage.removeItem("bugbounty.role");
  window.localStorage.removeItem("bugbounty.address");
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export async function loginWithWallet() {
  const address = await connectWallet();
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

export async function ensureWalletSession(expectedRoles?: string[]) {
  const connectedAddress = await connectWallet();
  const stored = getStoredSession();

  if (
    stored &&
    stored.address.toLowerCase() === connectedAddress.toLowerCase() &&
    (!expectedRoles || expectedRoles.includes(stored.role))
  ) {
    return stored;
  }

  const verified = await loginWithWallet();
  if (verified.address.toLowerCase() !== connectedAddress.toLowerCase()) {
    throw new Error("La cuenta conectada no coincide con la sesión actual.");
  }
  if (expectedRoles && !expectedRoles.includes(verified.role)) {
    throw new Error("Esta cuenta no tiene permisos para esta acción.");
  }

  return verified;
}

export { SESSION_EVENT };
