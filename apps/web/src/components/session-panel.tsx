"use client";

import { useEffect, useState } from "react";

import { ensureWalletSession, getPreferredWallet, getStoredSession } from "../lib/session";
import { getActiveWalletAccount, getWalletAccounts, requestWalletAccounts } from "../lib/wallet";

export function SessionPanel() {
  const [session, setSession] = useState<{ address: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  useEffect(() => {
    setHasProvider(typeof window !== "undefined" && Boolean(window.ethereum));
    const stored = getStoredSession();
    if (stored) {
      setSession({ role: stored.role, address: stored.address });
    }
    const preferred = getPreferredWallet();
    if (preferred) {
      setSelectedAddress(preferred);
    }

    if (typeof window === "undefined" || !window.ethereum) {
      return;
    }

    const syncWalletState = (walletAccounts: string[]) => {
      setAccounts(walletAccounts);
      const activeAddress = window.ethereum?.selectedAddress?.toLowerCase();
      setSelectedAddress(activeAddress ?? preferred ?? walletAccounts[0] ?? "");
    };

    void getWalletAccounts().then(syncWalletState).catch(() => undefined);

    const handleAccountsChanged = (nextAccounts: unknown) => {
      syncWalletState((nextAccounts as string[]).map((entry) => entry.toLowerCase()));
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  async function login() {
    try {
      setError(null);
      const walletAccounts = accounts.length > 0 ? accounts : await requestWalletAccounts();
      setAccounts(walletAccounts);
      const activeAddress = await getActiveWalletAccount();
      const preferred = selectedAddress || activeAddress || walletAccounts[0];
      if (!preferred) {
        throw new Error("No encontramos cuentas disponibles en la wallet.");
      }
      const verified = await ensureWalletSession(undefined, preferred);
      setSession(verified);
      setSelectedAddress(verified.address.toLowerCase());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos conectar la wallet");
    }
  }

  return (
    <div className="session-panel">
      <div>
        <span className="surface-kicker">Cuenta</span>
        <h3>Acceso</h3>
      </div>
      {accounts.length > 1 ? (
        <label>
          <span>Wallet activa</span>
          <select
            value={selectedAddress}
            onChange={(event) => setSelectedAddress(event.target.value)}
          >
            {accounts.map((address) => (
              <option key={address} value={address}>{address}</option>
            ))}
          </select>
        </label>
      ) : null}
      {accounts.length > 1 ? (
        <p className="muted">La app solo puede firmar con la cuenta activa de MetaMask. Si elegís otra, cambiala también en la extensión antes de conectar.</p>
      ) : null}
      <button disabled={!hasProvider} onClick={login}>
        {hasProvider ? "Conectar cuenta" : "Sin extension"}
      </button>
      {!hasProvider ? (
        <p className="muted">Instala o habilita una wallet compatible.</p>
      ) : null}
      {session ? <div className="badge"><span>{session.role}</span><span className="mono">{session.address}</span></div> : null}
      {error ? <p className="danger">{error}</p> : null}
    </div>
  );
}
