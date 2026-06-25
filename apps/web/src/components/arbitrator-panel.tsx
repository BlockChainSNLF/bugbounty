"use client";

import { useEffect, useMemo, useState } from "react";

import { disputeResultLabels, disputeAbi } from "@bugbounty/shared/contracts";

import { api } from "../lib/api";
import { waitForTransactionReceipt, walletErrorMessage, writeContractAction } from "../lib/wallet";
import { AddressDisplay } from "./address-display";
import { useToast } from "./toast";

type Session = {
  address: string;
  role: string;
};

type Vote = {
  arbitrator_address: string;
  arbitrator_alias: string | null;
  vote_result: string;
  created_at: string;
};

type Dispute = {
  id: string;
  status: string;
  result: string | null;
  bounty_address?: string | null;
  bounty_title?: string | null;
  report_uuid?: string | null;
  report_title?: string | null;
  report_description?: string | null;
  report_status?: string | null;
  assignedArbitrators: string[];
  votes?: Vote[];
};

export function ArbitratorPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);
  const toast = useToast();

  async function loadDisputes() {
    const allDisputes = await api<Dispute[]>("/disputes");
    setDisputes(allDisputes);
    return allDisputes;
  }

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        const token = window.localStorage.getItem("bugbounty.token");
        if (!token) {
          setSession(null);
          return;
        }

        const me = await api<Session>("/me");
        setSession(me);
        await loadDisputes();
      } catch (caught) {
        window.localStorage.removeItem("bugbounty.token");
        window.localStorage.removeItem("bugbounty.role");
        window.localStorage.removeItem("bugbounty.address");
        setSession(null);
        setError(caught instanceof Error ? caught.message : "No pudimos cargar tus disputas");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const assignedDisputes = useMemo(() => {
    if (!session) {
      return [] as Dispute[];
    }
    const address = session.address.toLowerCase();
    return disputes.filter((dispute) => dispute.assignedArbitrators?.includes(address));
  }, [disputes, session]);

  async function castVote(dispute: Dispute, voteResult: 0 | 1) {
    if (!session) {
      setError("Session not available. Please sign in again.");
      return;
    }

    try {
      setPendingVoteId(dispute.id);
      setError(null);

      const intent = await api<{
        nextAction: {
          contract: `0x${string}`;
          method: string;
          args: [bigint | number | string, bigint | number | string];
        };
      }>(`/disputes/${dispute.id}/vote-intent`, {
        method: "POST",
        body: JSON.stringify({ voteResult }),
      });

      const hash = await writeContractAction({
        address: intent.nextAction.contract,
        abi: disputeAbi,
        functionName: intent.nextAction.method,
        args: intent.nextAction.args,
        account: session.address as `0x${string}`,
      });
      toast.showTx("Registering vote…", hash);
      await waitForTransactionReceipt(hash);

      if (dispute.bounty_address) {
        try {
          await api(`/bounties/${dispute.bounty_address}/sync`, { method: "POST" });
        } catch (caught) {
          console.error("dispute sync after vote failed", caught);
        }
      }
      const updatedDisputes = await loadDisputes();
      const updatedDispute = updatedDisputes.find((entry) => entry.id === dispute.id);
      const upheldVotes = updatedDispute?.votes?.filter((vote) => vote.vote_result === "UPHELD").length ?? 0;
      const dismissedVotes = updatedDispute?.votes?.filter((vote) => vote.vote_result === "DISMISSED").length ?? 0;

      if (updatedDispute && updatedDispute.status !== "FINALIZED" && (upheldVotes >= 2 || dismissedVotes >= 2)) {
        const finalizeIntent = await api<{
          nextAction: {
            contract: `0x${string}`;
            method: string;
            args: [bigint | number | string];
          };
        }>(`/disputes/${updatedDispute.id}/finalize-intent`, {
          method: "POST",
        });
        const finalizeHash = await writeContractAction({
          address: finalizeIntent.nextAction.contract,
          abi: disputeAbi,
          functionName: finalizeIntent.nextAction.method,
          args: finalizeIntent.nextAction.args,
          account: session.address as `0x${string}`,
        });
        toast.showTx("Closing dispute…", finalizeHash);
        await waitForTransactionReceipt(finalizeHash);
        if (updatedDispute.bounty_address) {
          try {
            await api(`/bounties/${updatedDispute.bounty_address}/sync`, { method: "POST" });
          } catch (caught) {
            console.error("dispute sync after finalize failed", caught);
          }
        }
        await loadDisputes();
        toast.showSuccess("Vote registered and dispute closed by majority.");
        return;
      }

      toast.showSuccess("Vote registered.");
    } catch (caught) {
      setError(walletErrorMessage(caught, "Could not register your vote"));
    } finally {
      setPendingVoteId(null);
    }
  }

  if (loading) {
    return <div className="panel"><p className="muted">Loading assigned disputes...</p></div>;
  }

  if (!session) {
    return (
      <div className="panel">
        <h2>Arbitrator panel</h2>
        <p className="muted">Sign in with your assigned account to view your cases and vote.</p>
        {error ? <p className="danger">{error}</p> : null}
      </div>
    );
  }

  if (session.role !== "arbitrator") {
    return (
      <div className="panel">
        <h2>Arbitrator panel</h2>
        <p className="muted">This account doesn't have arbitration permissions.</p>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="panel">
        <div className="stack-row">
          <div>
            <h3>Arbitrator panel</h3>
            <p className="muted" style={{ margin: "6px 0 0" }}>Review assigned cases and cast your decision from this screen.</p>
          </div>
          <div className="badge"><span>Account</span><AddressDisplay address={session.address} link={false} /></div>
        </div>
      </div>

      {error ? <div className="panel"><p className="danger">{error}</p></div> : null}

      {assignedDisputes.length === 0 ? (
        <div className="empty">
          <h3>No assigned disputes</h3>
          <p>When a case is assigned to you, it will appear here with evidence and voting options.</p>
        </div>
      ) : (
        assignedDisputes.map((dispute) => {
          const myVote = dispute.votes?.find((vote) => vote.arbitrator_address.toLowerCase() === session.address.toLowerCase());
          const isFinalized = dispute.status === "FINALIZED";
          const votingDisabled = pendingVoteId === dispute.id || isFinalized || Boolean(myVote);
          return (
          <article className="panel grid" key={dispute.id}>
            <div className="stack-row">
              <div>
                <h3>{dispute.report_title ?? "Untitled dispute"}</h3>
                <p className="muted">{dispute.bounty_title ?? "Unnamed bounty"}</p>
              </div>
              <div className="row-actions">
                {dispute.report_uuid ? <a className="tx-link" href={`/reports/${dispute.report_uuid}`}>View evidence</a> : null}
                <div className="badge">
                  <span>Status</span>
                  <span>{dispute.status}</span>
                </div>
              </div>
            </div>

            <p>{dispute.report_description ?? "No description available."}</p>

            <div className="grid dispute-meta">
              <div>
                <strong>Report</strong>
                <p className="muted">{dispute.report_status ?? "No status"}</p>
              </div>
              <div>
                <strong>Result</strong>
                <p className="muted">{dispute.result ?? "Pending"}</p>
              </div>
              <div>
                <strong>Reference</strong>
                <p className="mono">{dispute.id}</p>
              </div>
            </div>

            <div className="grid">
              <strong>Registered votes</strong>
              {dispute.votes && dispute.votes.length > 0 ? (
                dispute.votes.map((vote) => (
                  <div className="list-row" key={`${dispute.id}-${vote.arbitrator_address}`}>
                    <AddressDisplay address={vote.arbitrator_address} alias={vote.arbitrator_alias} link={false} />
                    <span className={`pill ${vote.vote_result === "UPHELD" ? "pill-success" : "pill-warn"}`}>{vote.vote_result}</span>
                  </div>
                ))
              ) : (
                <p className="muted">No votes confirmed for this case yet.</p>
              )}
            </div>

            {myVote ? (
              <p className="muted" style={{ margin: 0 }}>You already voted on this case. Waiting for the rest of the panel.</p>
            ) : isFinalized ? (
              <p className="muted" style={{ margin: 0 }}>This case is closed.</p>
            ) : null}

            <div className="vote-actions">
              <button
                disabled={votingDisabled}
                onClick={() => void castVote(dispute, 0)}
              >
                {pendingVoteId === dispute.id ? "Submitting vote..." : `Favor hunter (${disputeResultLabels[0]})`}
              </button>
              <button
                className="secondary"
                disabled={votingDisabled}
                onClick={() => void castVote(dispute, 1)}
              >
                {pendingVoteId === dispute.id ? "Submitting vote..." : `Favor company (${disputeResultLabels[1]})`}
              </button>
            </div>
          </article>
          );
        })
      )}
    </section>
  );
}
