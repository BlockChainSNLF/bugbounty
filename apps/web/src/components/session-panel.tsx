"use client";

import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { connectWallet, signMessage } from "../lib/wallet";

export function SessionPanel() {
  const [session, setSession] = useState<{ address: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    setHasProvider(typeof window !== "undefined" && Boolean(window.ethereum));
    const savedRole = window.localStorage.getItem("bugbounty.role");
    const savedAddress = window.localStorage.getItem("bugbounty.address");
    if (savedRole && savedAddress) {
      setSession({ role: savedRole, address: savedAddress });
    }
  }, []);

  async function login() {
    try {
      setError(null);
      const address = await connectWallet();
      const nonce = await api<{ nonce: string; message: string }>("/auth/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      const signature = await signMessage(address, nonce.message);
      const verified = await api<{ token: string; address: string; role: string }>("/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature }),
      });
      window.localStorage.setItem("bugbounty.token", verified.token);
      window.localStorage.setItem("bugbounty.role", verified.role);
      window.localStorage.setItem("bugbounty.address", verified.address);
      setSession(verified);
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
