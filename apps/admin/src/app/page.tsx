"use client";

import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { connectWallet, signMessage } from "../lib/wallet";

type Session = {
  address: string;
  role: string;
};

function AdminLogin({ onSession }: { onSession(session: Session): void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function login() {
    try {
      setLoading(true);
      setError(null);
      const address = await connectWallet();
      const nonce = await api<{ message: string }>("/auth/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      const signature = await signMessage(address, nonce.message);
      const verified = await api<{ token: string; address: string; role: string }>("/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature }),
      });
      if (verified.role !== "admin") {
        throw new Error("Esta cuenta no tiene permisos de administrador.");
      }
      window.localStorage.setItem("bugbounty.admin.token", verified.token);
      window.localStorage.setItem("bugbounty.admin.address", verified.address);
      onSession({ address: verified.address, role: verified.role });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-screen">
      <div className="login-panel">
        <span className="eyebrow">Internal grid</span>
        <h1>Admin Console</h1>
        <button disabled={loading} onClick={login}>{loading ? "Validando..." : "Entrar con wallet admin"}</button>
        {error ? <p className="danger">{error}</p> : null}
      </div>
    </section>
  );
}

function ApproveCompanyForm() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const response = await api<{ address: string }>("/admin/companies/" + address + "/approve", { method: "POST" });
      setResult(`Empresa aprobada: ${response.address}`);
    }}>
      <div className="form-header">
        <span className="eyebrow">Company access</span>
        <h2>Aprobar empresa</h2>
      </div>
      <label>
        <span>Wallet</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." />
      </label>
      <button type="submit">Aprobar</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}

function RegisterArbitratorForm() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      const response = await api<{ address: string }>("/admin/arbitrators", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      setResult(`Árbitro incorporado: ${response.address}`);
    }}>
      <div className="form-header">
        <span className="eyebrow">Jury access</span>
        <h2>Incorporar árbitro</h2>
      </div>
      <label>
        <span>Wallet</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." />
      </label>
      <button type="submit">Incorporar</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}

function SyncPanel() {
  const [status, setStatus] = useState<string | null>(null);

  return (
    <div className="panel">
      <div className="form-header">
        <span className="eyebrow">Indexer</span>
        <h2>Sincronizar</h2>
      </div>
      <button onClick={async () => {
        const response = await api<{ synced: boolean; bountyLogs?: number; disputeLogs?: number }>("/admin/sync", { method: "POST" });
        setStatus(response.synced ? `${response.bountyLogs ?? 0} programas, ${response.disputeLogs ?? 0} disputas` : "Configuración incompleta");
      }}>Actualizar estado</button>
      {status ? <p>{status}</p> : null}
    </div>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const token = window.localStorage.getItem("bugbounty.admin.token");
    const address = window.localStorage.getItem("bugbounty.admin.address");
    if (token && address) {
      setSession({ address, role: "admin" });
    }
  }, []);

  if (!session) {
    return <AdminLogin onSession={setSession} />;
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <span className="eyebrow">Admin only</span>
          <h1>Control room</h1>
        </div>
        <div className="session-pill">{session.address}</div>
      </header>
      <section className="ops-grid">
        <div className="panel critical"><ApproveCompanyForm /></div>
        <div className="panel critical"><RegisterArbitratorForm /></div>
        <SyncPanel />
      </section>
    </main>
  );
}
