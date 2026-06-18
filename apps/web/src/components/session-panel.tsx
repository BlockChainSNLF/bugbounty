"use client";

import { useEffect, useState } from "react";

import { ensureWalletSession, getStoredSession } from "../lib/session";

export function SessionPanel() {
  const [session, setSession] = useState<{ address: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    setHasProvider(typeof window !== "undefined" && Boolean(window.ethereum));
    const stored = getStoredSession();
    if (stored) {
      setSession({ role: stored.role, address: stored.address });
    }
  }, []);

  async function login() {
    try {
      setError(null);
      const verified = await ensureWalletSession();
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
