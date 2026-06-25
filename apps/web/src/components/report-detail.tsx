"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { api, apiBlobUrl } from "../lib/api";
import { bountyAbi } from "../lib/bounty-contract";
import { ensureWalletSession, getStoredSession, SESSION_EVENT } from "../lib/session";
import { waitForTransactionReceipt, walletErrorMessage, writeContractAction } from "../lib/wallet";
import { AddressDisplay } from "./address-display";
import { useToast } from "./toast";

type ReportFile = {
  fileId: string;
  file_name: string;
  mime_type: string;
  sha256: string;
};

type ReportDetailData = {
  id: string;
  bounty_address: string;
  author_address: string;
  company_address: string;
  title: string;
  description: string;
  poc: string;
  status: string;
  files: ReportFile[];
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  OFFCHAIN_STORED: "Unconfirmed",
  ACCEPTED: "Accepted",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
  DISPUTED: "In dispute",
};

const ROLE_HOME: Record<string, string> = {
  hunter: "/hunter",
  company: "/company",
  arbitrator: "/arbitrator",
};

export function ReportDetail({ id }: { id: string }) {
  const [report, setReport] = useState<ReportDetailData | null>(null);
  const [session, setSession] = useState<{ address: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"accept" | "reject" | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const stored = getStoredSession();
      setSession(stored ? { address: stored.address, role: stored.role } : null);
      if (!stored) {
        if (!cancelled) { setLoading(false); setError("Connect your wallet to view the evidence."); }
        return;
      }
      try {
        const response = await api<ReportDetailData>(`/reports/${id}`);
        if (!cancelled) { setReport(response); setError(null); setLoading(false); }
      } catch (caught) {
        if (!cancelled) { setError(caught instanceof Error ? caught.message : "Could not load the report"); setLoading(false); }
      }
    }
    void load();
    window.addEventListener(SESSION_EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, [id, retryCount]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(session ? ROLE_HOME[session.role] ?? "/" : "/");
  }

  async function openFile(file: ReportFile) {
    try {
      setOpeningId(file.fileId);
      setError(null);
      const url = await apiBlobUrl(`/reports/${id}/files/${file.fileId}`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open the file");
    } finally {
      setOpeningId(null);
    }
  }

  async function resolve(action: "accept" | "reject") {
    if (!report) {
      return;
    }
    try {
      setPendingAction(action);
      setError(null);
      const walletSession = await ensureWalletSession(["company", "admin"]);
      const intent = await api<{ nextAction: { contract: `0x${string}`; method: string; args: [bigint | number | string] } }>(`/reports/${id}/${action}`, { method: "POST" });
      const hash = await writeContractAction({
        address: intent.nextAction.contract,
        abi: bountyAbi,
        functionName: intent.nextAction.method,
        args: intent.nextAction.args,
        account: walletSession.address as `0x${string}`,
      });
      toast.showTx(action === "accept" ? "Accepting report…" : "Rejecting report…", hash);
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${report.bounty_address}/sync`, { method: "POST" });
      toast.showSuccess(action === "accept" ? "Report accepted and reward released." : "Report rejected.");
      const refreshed = await api<ReportDetailData>(`/reports/${id}`);
      setReport(refreshed);
    } catch (caught) {
      setError(walletErrorMessage(caught, "Could not resolve the report"));
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return <section className="grid"><div className="empty">Loading report…</div></section>;
  }

  if (error && !report) {
    return (
      <section className="grid">
        <button className="secondary" style={{ width: "auto", padding: "8px 14px", justifySelf: "start" }} onClick={goBack} type="button">← Back</button>
        <div className="panel">
          <h2>Report</h2>
          <p className="danger">{error}</p>
          <button style={{ marginTop: 12, width: "auto", padding: "8px 14px" }} onClick={() => { setLoading(true); setError(null); setRetryCount((c) => c + 1); }} type="button">Try again</button>
        </div>
      </section>
    );
  }

  if (!report) {
    return null;
  }

  const isOwnerCompany = Boolean(
    session && ["company", "admin"].includes(session.role) && report.company_address?.toLowerCase() === session.address.toLowerCase(),
  );
  const canResolve = isOwnerCompany && report.status === "PENDING";

  return (
    <section className="grid">
      <button className="secondary" style={{ width: "auto", padding: "8px 14px", justifySelf: "start" }} onClick={goBack} type="button">← Back</button>

      <div className="panel">
        <div className="stack-row">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>Report</p>
            <h2>{report.title}</h2>
            <span style={{ display: "inline-flex", gap: 8, marginTop: 6 }}>
              hunter <AddressDisplay address={report.author_address} link={false} />
            </span>
          </div>
          <span className="pill pill-info">{STATUS_LABEL[report.status] ?? report.status}</span>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>{report.description}</p>
        {report.poc ? (
          <div style={{ marginTop: 14 }}>
            <strong style={{ font: "600 12px var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reproduction steps</strong>
            <p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{report.poc}</p>
          </div>
        ) : null}
      </div>

      <div className="panel">
        <h3>Attached evidence</h3>
        {error ? <p className="danger">{error}</p> : null}
        {report.files.length ? (
          <div className="grid" style={{ gap: 10, marginTop: 12 }}>
            {report.files.map((file) => (
              <div className="list-row" key={file.fileId}>
                <div>
                  <strong style={{ overflowWrap: "anywhere" }}>{file.file_name}</strong>
                  <span className="mono" style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{file.mime_type}</span>
                </div>
                <button style={{ width: "auto", padding: "8px 14px" }} disabled={openingId === file.fileId} onClick={() => void openFile(file)} type="button">
                  {openingId === file.fileId ? "Opening…" : "View"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>This report has no attached files.</p>
        )}
      </div>

      {isOwnerCompany ? (
        <div className="panel">
          <h3>Resolution</h3>
          {canResolve ? (
            <>
              <p className="muted" style={{ margin: "8px 0 16px", fontSize: 14 }}>You have reviewed the evidence. Accept to release the reward to the hunter, or reject (the hunter may open a dispute).</p>
              <div className="row-actions">
                <button disabled={pendingAction !== null} onClick={() => void resolve("accept")} type="button">
                  {pendingAction === "accept" ? "Accepting…" : "Accept and pay"}
                </button>
                <button className="secondary" disabled={pendingAction !== null} onClick={() => void resolve("reject")} type="button">
                  {pendingAction === "reject" ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
              {report.status === "OFFCHAIN_STORED"
                ? "The hunter hasn't confirmed this report on-chain yet."
                : `This report is already ${(STATUS_LABEL[report.status] ?? report.status).toLowerCase()}.`}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
