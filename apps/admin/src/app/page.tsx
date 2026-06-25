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
        throw new Error("This account doesn't have admin permissions.");
      }
      window.localStorage.setItem("bugbounty.admin.token", verified.token);
      window.localStorage.setItem("bugbounty.admin.address", verified.address);
      onSession({ address: verified.address, role: verified.role });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in");
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
            <span>Active wallet</span>
            <select value={selectedAddress} onChange={(event) => setSelectedAddress(event.target.value)}>
              {accounts.map((address) => (
                <option key={address} value={address}>{address}</option>
              ))}
            </select>
          </label>
        ) : null}
        {accounts.length > 1 ? (
          <p className="muted">The console signs with the active MetaMask account. To use a different one, switch it in the extension before logging in.</p>
        ) : null}
        <button disabled={loading} onClick={login}>{loading ? "Validating…" : "Sign in with admin wallet"}</button>
        {error ? <p className="danger">{error}</p> : null}
      </div>
    </section>
  );
}

function ApproveCompanyForm() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setError(null);
        const response = await api<{ address: string }>("/admin/companies/" + address + "/approve", { method: "POST" });
        setResult(`Company approved: ${response.address}`);
        setAddress("");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not approve company");
      }
    }}>
      <div className="form-header">
        <span className="eyebrow">Company access</span>
        <h2>Approve company</h2>
      </div>
      <label>
        <span>Wallet</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." />
      </label>
      <button type="submit">Approve</button>
      {result ? <p style={{ color: "var(--success)" }}>{result}</p> : null}
      {error ? <p className="danger">{error}</p> : null}
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
          throw new Error("No active admin session.");
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
        setError(caught instanceof Error ? caught.message : "Could not add arbitrator");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="eyebrow">Jury access</span>
        <h2>Add arbitrator</h2>
      </div>
      <label>
        <span>Wallet</span>
        <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="0x..." />
      </label>
      <button disabled={submitting} type="submit">{submitting ? "Adding…" : "Add"}</button>
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
        <h2>Sync</h2>
      </div>
      <button onClick={async () => {
        try {
          const response = await api<{ synced: boolean; bountyLogs?: number; disputeLogs?: number; reason?: string }>("/admin/sync", { method: "POST" });
          setStatus(response.synced ? `${response.bountyLogs ?? 0} bounties, ${response.disputeLogs ?? 0} disputes` : response.reason ?? "Configuration incomplete");
        } catch (caught) {
          setStatus(caught instanceof Error ? caught.message : "Could not sync");
        }
      }}>Sync now</button>
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

function clearAdminSession() {
  window.localStorage.removeItem("bugbounty.admin.token");
  window.localStorage.removeItem("bugbounty.admin.address");
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [pendingArbitratorRemoval, setPendingArbitratorRemoval] = useState<string | null>(null);
  const [pendingCompanyRemoval, setPendingCompanyRemoval] = useState<string | null>(null);

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
        if (!mounted) return;
        const msg = caught instanceof Error ? caught.message : "";
        if (msg.includes("401") || msg.toLowerCase().includes("unauthorized")) {
          clearAdminSession();
          setSession(null);
        } else {
          setOverviewError(msg || "Could not load overview");
        }
      });

    return () => {
      mounted = false;
    };
  }, [session]);

  async function removeCompany(address: string) {
    try {
      setPendingCompanyRemoval(address);
      setOverviewError(null);
      await api(`/admin/companies/${address}`, { method: "DELETE" });
      await loadOverview();
    } catch (caught) {
      setOverviewError(caught instanceof Error ? caught.message : "Could not remove company");
    } finally {
      setPendingCompanyRemoval(null);
    }
  }

  async function removeArbitrator(address: string) {
    try {
      setPendingArbitratorRemoval(address);
      setOverviewError(null);
      const sessionAddress = window.localStorage.getItem("bugbounty.admin.address");
      if (!sessionAddress) {
        throw new Error("No active admin session.");
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
        setOverviewError(caught instanceof Error ? `Arbitrator removed on-chain, but sync is pending: ${caught.message}` : "Arbitrator removed on-chain, but sync is pending");
      }
      await loadOverview();
    } catch (caught) {
      setOverviewError(caught instanceof Error ? caught.message : "Could not remove arbitrator");
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
              clearAdminSession();
              setOverview(null);
              setOverviewError(null);
              setSession(null);
            }}
            type="button"
          >
            Sign out
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
        <DataPanel title="Companies" eyebrow="Companies">
          <div className="list-grid">
            {overview?.companies.length ? overview.companies.map((company) => (
              <div className="list-row" key={company.address}>
                <div>
                  <strong>{trimAddress(company.address)}</strong>
                  <span>{company.company_approved ? "Approved" : "Pending"}</span>
                </div>
                <div className="session-cluster">
                  <time>{new Date(company.created_at).toLocaleDateString("en-US")}</time>
                  {company.company_approved ? (
                    <button
                      className="session-exit"
                      disabled={pendingCompanyRemoval === company.address}
                      onClick={() => void removeCompany(company.address)}
                      type="button"
                    >
                      {pendingCompanyRemoval === company.address ? "Removing…" : "Remove"}
                    </button>
                  ) : null}
                </div>
              </div>
            )) : <p>No companies registered.</p>}
          </div>
        </DataPanel>
        <DataPanel title="Arbitrators" eyebrow="Jury">
          <div className="list-grid">
            {overview?.arbitrators.length ? overview.arbitrators.map((arbitrator) => (
              <div className="list-row" key={arbitrator.address}>
                <div>
                  <strong>{trimAddress(arbitrator.address)}</strong>
                  <span>Active</span>
                </div>
                <div className="session-cluster">
                  <time>{new Date(arbitrator.created_at).toLocaleDateString("en-US")}</time>
                  <button
                    className="secondary"
                    disabled={pendingArbitratorRemoval === arbitrator.address}
                    onClick={() => void removeArbitrator(arbitrator.address)}
                    type="button"
                  >
                    {pendingArbitratorRemoval === arbitrator.address ? "Removing…" : "Remove"}
                  </button>
                </div>
              </div>
            )) : <p>No arbitrators registered.</p>}
          </div>
        </DataPanel>
        <DataPanel title="Bounties" eyebrow="Bounties">
          <div className="list-grid">
            {overview?.bounties.length ? overview.bounties.map((bounty) => (
              <div className="list-row" key={bounty.address}>
                <div>
                  <strong>{bounty.title}</strong>
                  <span>{trimAddress(bounty.company_address)} · {bounty.report_count} reports</span>
                </div>
                <span>{bounty.reward_wei} wei</span>
              </div>
            )) : <p>No bounties registered.</p>}
          </div>
        </DataPanel>
        <DataPanel title="Recent disputes" eyebrow="Disputes">
          <div className="list-grid">
            {overview?.disputes.length ? overview.disputes.map((dispute) => (
              <div className="list-row" key={dispute.id}>
                <div>
                  <strong>{dispute.bounty_title ?? "Unnamed bounty"}</strong>
                  <span>{dispute.status} · {dispute.result ?? "Pending"} · {trimAddress(dispute.hunter_address)}</span>
                </div>
                <span>{dispute.votes_cast} votes</span>
              </div>
            )) : <p>No disputes registered.</p>}
          </div>
        </DataPanel>
      </section>
    </main>
  );
}
