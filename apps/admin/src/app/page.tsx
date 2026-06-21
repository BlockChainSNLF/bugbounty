"use client";

import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { disputeAbi } from "@bugbounty/shared/contracts";
import { connectPreferredWallet, getActiveWalletAccount, getWalletAccounts, requestWalletAccounts, signMessage } from "../lib/wallet";
import { waitForTransactionReceipt, writeContractAction } from "../lib/wallet";

type Session = {
  address: string;
  role: string;
};

type Overview = {
  companies: Array<{ address: string; company_approved: boolean; created_at: string }>;
  arbitrators: Array<{ address: string; created_at: string }>;
  bounties: Array<{ address: string; title: string; reward_wei: string; company_address: string; report_count: number; created_at: string }>;
  disputes: Array<{ id: string; status: string; result: string | null; votes_cast: number; bounty_title: string | null; hunter_address: string; created_at: string }>;
};

function AdminLogin({ onSession }: { onSession(session: Session): void }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      return;
    }

    const syncWalletState = (walletAccounts: string[]) => {
      setAccounts(walletAccounts);
      const activeAddress = window.ethereum?.selectedAddress?.toLowerCase();
      setSelectedAddress(activeAddress ?? walletAccounts[0] ?? "");
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
      setLoading(true);
      setError(null);
      const walletAccounts = accounts.length > 0 ? accounts : await requestWalletAccounts();
      setAccounts(walletAccounts);
      const activeAddress = await getActiveWalletAccount();
      const address = await connectPreferredWallet(selectedAddress || activeAddress || walletAccounts[0]);
      const nonce = await api<{ message: string }>("/auth/wallet/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      const signature = await signMessage(address, nonce.message);
      const verified = await api<{ token: string; address: string; role: string; isAdmin: boolean }>("/auth/wallet/verify", {
        method: "POST",
        body: JSON.stringify({ address, signature }),
      });
      if (!verified.isAdmin) {
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
        {accounts.length > 1 ? (
          <label>
            <span>Wallet activa</span>
            <select value={selectedAddress} onChange={(event) => setSelectedAddress(event.target.value)}>
              {accounts.map((address) => (
                <option key={address} value={address}>{address}</option>
              ))}
            </select>
          </label>
        ) : null}
        {accounts.length > 1 ? (
          <p className="muted">La consola firma con la cuenta activa de MetaMask. Si querés usar otra, cambiala en la extensión antes de entrar.</p>
        ) : null}
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

function RegisterArbitratorForm({ onRegistered }: { onRegistered(): Promise<unknown> }) {
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setSubmitting(true);
        setError(null);
        const sessionAddress = window.localStorage.getItem("bugbounty.admin.address");
        if (!sessionAddress) {
          throw new Error("No hay sesión admin activa.");
        }
        const response = await api<{
          address: string;
          nextAction: { contract: `0x${string}`; method: string; args: [string] };
        }>("/admin/arbitrators", {
          method: "POST",
          body: JSON.stringify({ address }),
        });
        const hash = await writeContractAction({
          address: response.nextAction.contract,
          abi: disputeAbi,
          functionName: response.nextAction.method,
          args: response.nextAction.args,
          account: sessionAddress as `0x${string}`,
        });
        await waitForTransactionReceipt(hash);
        try {
          await api("/admin/sync", { method: "POST" });
        } catch (caught) {
          console.error("admin sync after arbitrator register failed", caught);
        }
        setAddress("");
        await onRegistered();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos incorporar al árbitro");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="eyebrow">Jury access</span>
        <h2>Incorporar árbitro</h2>
      </div>
      <label>
        <span>Wallet</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." />
      </label>
      <button disabled={submitting} type="submit">{submitting ? "Incorporando..." : "Incorporar"}</button>
      {error ? <p className="danger">{error}</p> : null}
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
        try {
          const response = await api<{ synced: boolean; bountyLogs?: number; disputeLogs?: number; reason?: string }>("/admin/sync", { method: "POST" });
          setStatus(response.synced ? `${response.bountyLogs ?? 0} programas, ${response.disputeLogs ?? 0} disputas` : response.reason ?? "Configuración incompleta");
        } catch (caught) {
          setStatus(caught instanceof Error ? caught.message : "No pudimos sincronizar");
        }
      }}>Actualizar estado</button>
      {status ? <p>{status}</p> : null}
    </div>
  );
}

function trimAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function DataPanel({
  title,
  eyebrow,
  empty,
  children,
}: {
  title: string;
  eyebrow: string;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel data-panel">
      <div className="form-header">
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children || (empty ? <p>{empty}</p> : null)}
    </div>
  );
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [pendingArbitratorRemoval, setPendingArbitratorRemoval] = useState<string | null>(null);

  async function loadOverview() {
    const response = await api<Overview>("/admin/overview");
    setOverview(response);
    setOverviewError(null);
    return response;
  }

  useEffect(() => {
    const token = window.localStorage.getItem("bugbounty.admin.token");
    const address = window.localStorage.getItem("bugbounty.admin.address");
    if (token && address) {
      setSession({ address, role: "admin" });
    }
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }

    let mounted = true;
    void loadOverview()
      .then((response) => {
        if (mounted) {
          setOverview(response);
        }
      })
      .catch((caught) => {
        if (mounted) {
          setOverviewError(caught instanceof Error ? caught.message : "No pudimos cargar el estado");
        }
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  async function removeArbitrator(address: string) {
    try {
      setPendingArbitratorRemoval(address);
      setOverviewError(null);
      const sessionAddress = window.localStorage.getItem("bugbounty.admin.address");
      if (!sessionAddress) {
        throw new Error("No hay sesión admin activa.");
      }
      const response = await api<{
        address: string;
        nextAction: { contract: `0x${string}`; method: string; args: [string] };
      }>(`/admin/arbitrators/${address}`, { method: "DELETE" });
      const hash = await writeContractAction({
        address: response.nextAction.contract,
        abi: disputeAbi,
        functionName: response.nextAction.method,
        args: response.nextAction.args,
        account: sessionAddress as `0x${string}`,
      });
      await waitForTransactionReceipt(hash);
      try {
        await api("/admin/sync", { method: "POST" });
      } catch (caught) {
        setOverviewError(caught instanceof Error ? `Árbitro quitado on-chain, pero la sincronización quedó pendiente: ${caught.message}` : "Árbitro quitado on-chain, pero la sincronización quedó pendiente");
      }
      await loadOverview();
    } catch (caught) {
      setOverviewError(caught instanceof Error ? caught.message : "No pudimos quitar al árbitro");
    } finally {
      setPendingArbitratorRemoval(null);
    }
  }

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
        <div className="session-cluster">
          <div className="session-pill">{session.address}</div>
          <button
            className="session-exit"
            onClick={() => {
              window.localStorage.removeItem("bugbounty.admin.token");
              window.localStorage.removeItem("bugbounty.admin.address");
              setOverview(null);
              setOverviewError(null);
              setSession(null);
            }}
            type="button"
          >
            Salir
          </button>
        </div>
      </header>
      {overviewError ? <p className="danger">{overviewError}</p> : null}
      <section className="ops-grid">
        <div className="panel critical"><ApproveCompanyForm /></div>
        <div className="panel critical"><RegisterArbitratorForm onRegistered={loadOverview} /></div>
        <SyncPanel />
      </section>
      <section className="dashboard-grid">
        <DataPanel title="Empresas" eyebrow="Companies">
          <div className="list-grid">
            {overview?.companies.length ? overview.companies.map((company) => (
              <div className="list-row" key={company.address}>
                <div>
                  <strong>{trimAddress(company.address)}</strong>
                  <span>{company.company_approved ? "Aprobada" : "Pendiente"}</span>
                </div>
                <time>{new Date(company.created_at).toLocaleDateString("es-AR")}</time>
              </div>
            )) : <p>Sin empresas registradas.</p>}
          </div>
        </DataPanel>
        <DataPanel title="Árbitros" eyebrow="Jury">
          <div className="list-grid">
            {overview?.arbitrators.length ? overview.arbitrators.map((arbitrator) => (
              <div className="list-row" key={arbitrator.address}>
                <div>
                  <strong>{trimAddress(arbitrator.address)}</strong>
                  <span>Activo</span>
                </div>
                <div className="session-cluster">
                  <time>{new Date(arbitrator.created_at).toLocaleDateString("es-AR")}</time>
                  <button
                    className="secondary"
                    disabled={pendingArbitratorRemoval === arbitrator.address}
                    onClick={() => void removeArbitrator(arbitrator.address)}
                    type="button"
                  >
                    {pendingArbitratorRemoval === arbitrator.address ? "Quitando..." : "Quitar"}
                  </button>
                </div>
              </div>
            )) : <p>Sin árbitros registrados.</p>}
          </div>
        </DataPanel>
        <DataPanel title="Programas" eyebrow="Bounties">
          <div className="list-grid">
            {overview?.bounties.length ? overview.bounties.map((bounty) => (
              <div className="list-row" key={bounty.address}>
                <div>
                  <strong>{bounty.title}</strong>
                  <span>{trimAddress(bounty.company_address)} · {bounty.report_count} reportes</span>
                </div>
                <span>{bounty.reward_wei} wei</span>
              </div>
            )) : <p>Sin programas registrados.</p>}
          </div>
        </DataPanel>
        <DataPanel title="Disputas recientes" eyebrow="Disputes">
          <div className="list-grid">
            {overview?.disputes.length ? overview.disputes.map((dispute) => (
              <div className="list-row" key={dispute.id}>
                <div>
                  <strong>{dispute.bounty_title ?? "Programa sin nombre"}</strong>
                  <span>{dispute.status} · {dispute.result ?? "Pendiente"} · {trimAddress(dispute.hunter_address)}</span>
                </div>
                <span>{dispute.votes_cast} votos</span>
              </div>
            )) : <p>Sin disputas registradas.</p>}
          </div>
        </DataPanel>
      </section>
    </main>
  );
}
