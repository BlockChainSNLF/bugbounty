"use client";

import { useEffect, useRef, useState } from "react";
import { formatEther, parseEther } from "viem";

import {
  MAX_ATTACHMENTS_PER_REPORT,
  MAX_ATTACHMENT_BYTES,
  isAllowedAttachmentMime,
} from "@bugbounty/shared/attachments";

import { api } from "../lib/api";
import { bountyAbi, bountyBytecode } from "../lib/bounty-contract";
import { ensureWalletSession, getPreferredWallet } from "../lib/session";
import { deployContractAction, waitForTransactionReceipt, walletErrorMessage, writeContractAction } from "../lib/wallet";
import { explorerTxUrl, shortHash } from "../lib/explorer";
import { AddressDisplay } from "./address-display";
import { useToast } from "./toast";

const SEVERITY_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "pill-warn" },
  OFFCHAIN_STORED: { label: "Unconfirmed", cls: "pill-warn" },
  ACCEPTED: { label: "Accepted", cls: "pill-success" },
  RESOLVED: { label: "Resolved", cls: "pill-info" },
  REJECTED: { label: "Rejected", cls: "pill-warn" },
  DISPUTED: { label: "In dispute", cls: "pill-info" },
};

function StatusPill({ status }: { status: string }) {
  const info = SEVERITY_LABEL[status] ?? { label: status, cls: "pill-info" };
  return <span className={`pill ${info.cls}`}>{info.label}</span>;
}

const ATTACHMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read "${file.name}"`));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

function validateFiles(files: File[]): string | null {
  if (files.length > MAX_ATTACHMENTS_PER_REPORT) {
    return `You can attach up to ${MAX_ATTACHMENTS_PER_REPORT} files.`;
  }
  const maxMb = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));
  for (const file of files) {
    if (file.type && !isAllowedAttachmentMime(file.type)) {
      return `File type not allowed (${file.name}). We accept PDFs, images, and text.`;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return `"${file.name}" exceeds the ${maxMb}MB limit per file.`;
    }
  }
  return null;
}

type BountyOption = {
  address: string;
  title: string;
  description: string;
  reward_wei: string;
  company_address: string;
  company_alias?: string | null;
};

export function RegisterBountyForm({ onCreated }: { onCreated(): Promise<unknown> }) {
  const [payload, setPayload] = useState({ title: "", description: "", outOfScope: "", rewardEth: "1.0" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setSubmitting(true);
        setError(null);

        const session = await ensureWalletSession(["company", "admin"]);
        const companyAddress = session.address;
        const deploySpec = await api<{ disputeAddress: `0x${string}`; chainId: number }>("/bounties/deploy-spec");
        const rewardWei = parseEther(payload.rewardEth);
        const deployHash = await deployContractAction({
          abi: bountyAbi,
          bytecode: bountyBytecode,
          args: [deploySpec.disputeAddress],
          account: companyAddress as `0x${string}`,
          value: rewardWei,
        });
        toast.showTx("Deploying bounty…", deployHash);
        const receipt = await waitForTransactionReceipt(deployHash);
        if (!receipt.contractAddress) {
          throw new Error("Could not get the deployed bounty address");
        }

        await api<{ address: string }>("/bounties", {
          method: "POST",
          body: JSON.stringify({
            address: receipt.contractAddress,
            title: payload.title,
            description: payload.description,
            outOfScope: payload.outOfScope,
            rewardWei: rewardWei.toString(),
            chainId: deploySpec.chainId,
          }),
        });
        toast.showSuccess("Bounty created and reward locked in escrow.");
        setPayload({ title: "", description: "", outOfScope: "", rewardEth: "1.0" });
        await onCreated();
      } catch (caught) {
        setError(walletErrorMessage(caught, "Could not create the bounty"));
      } finally {
        setSubmitting(false);
      }
    }}>
      <p className="eyebrow" style={{ margin: "0 0 18px" }}>New bounty</p>
      <label>
        <span>Bounty name</span>
        <input value={payload.title} onChange={(event) => setPayload({ ...payload, title: event.target.value })} placeholder="Customer portal" />
      </label>
      <label>
        <span>In scope</span>
        <textarea value={payload.description} onChange={(event) => setPayload({ ...payload, description: event.target.value })} placeholder="Domains, contracts, and systems you accept for testing" />
      </label>
      <label>
        <span>Out of scope <span className="muted" style={{ fontWeight: 400 }}>· what you don't accept</span></span>
        <textarea value={payload.outOfScope} onChange={(event) => setPayload({ ...payload, outOfScope: event.target.value })} placeholder="Phishing, DoS, scanner findings without PoC, staging environments…" />
      </label>
      <label>
        <span>Reward in ETH <span className="muted" style={{ fontWeight: 400 }}>(locked in escrow)</span></span>
        <input value={payload.rewardEth} onChange={(event) => setPayload({ ...payload, rewardEth: event.target.value })} placeholder="1.0" />
      </label>
      <button disabled={submitting} type="submit">{submitting ? "Deploying…" : "Publish bounty"}</button>
      {error ? <p className="danger">{error}</p> : null}
    </form>
  );
}

type CompanyReport = {
  id: string;
  author_address: string;
  author_alias: string | null;
  title: string;
  status: string;
  created_at: string;
  tx_hash: string | null;
  dispute_id: string | null;
  dispute_status: string | null;
  dispute_result: string | null;
};

type CompanyBounty = {
  address: string;
  title: string;
  description: string;
  reward_wei: string;
  created_at: string;
  reports: CompanyReport[];
};

export function CompanyBountiesPanel({ refreshKey }: { refreshKey: number }) {
  const [bounties, setBounties] = useState<CompanyBounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const toast = useToast();

  async function loadBounties() {
    await ensureWalletSession(["company", "admin"]);
    const response = await api<CompanyBounty[]>("/bounties/mine");
    setBounties(response);
    setError(null);
    return response;
  }

  useEffect(() => {
    let mounted = true;
    void loadBounties()
      .then((response) => { if (mounted) { setBounties(response); setLoading(false); } })
      .catch((caught) => { if (mounted) { setError(caught instanceof Error ? caught.message : "Could not load your bounties"); setLoading(false); } });
    return () => { mounted = false; };
  }, [refreshKey]);

  async function resolveReport(reportId: string, action: "accept" | "reject", bountyAddress: `0x${string}`) {
    try {
      setPendingAction(`${reportId}:${action}`);
      const session = await ensureWalletSession(["company", "admin"]);
      const intent = await api<{ nextAction: { contract: `0x${string}`; method: string; args: [bigint | number | string] } }>(`/reports/${reportId}/${action}`, { method: "POST" });
      const hash = await writeContractAction({
        address: intent.nextAction.contract,
        abi: bountyAbi,
        functionName: intent.nextAction.method,
        args: intent.nextAction.args,
        account: session.address as `0x${string}`,
      });
      toast.showTx(action === "accept" ? "Accepting report…" : "Rejecting report…", hash);
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${bountyAddress}/sync`, { method: "POST" });
      toast.showSuccess(action === "accept" ? "Report accepted and reward released." : "Report rejected.");
      await loadBounties();
    } catch (caught) {
      setError(walletErrorMessage(caught, "Could not resolve the report"));
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return <div className="empty">Loading your bounties…</div>;
  }
  if (error) {
    return <div className="panel"><p className="danger">{error}</p></div>;
  }
  if (!bounties.length) {
    return (
      <div className="empty">
        <h3>No bounties yet</h3>
        <p>Once you deploy a bounty, it will appear here with its reports and status.</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {bounties.map((bounty) => {
        const activeReports = bounty.reports.filter((report) => !["ACCEPTED", "RESOLVED"].includes(report.status));
        const resolvedReports = bounty.reports.filter((report) => ["ACCEPTED", "RESOLVED"].includes(report.status));
        return (
          <article className="program-card" key={bounty.address}>
            <div className="stack-row">
              <div>
                <h3>{bounty.title}</h3>
                <p className="muted" style={{ margin: "6px 0 0", maxWidth: "60ch" }}>{bounty.description}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ font: "700 20px var(--font-display)", color: "var(--ink)" }}>{formatEther(BigInt(bounty.reward_wei))} ETH</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--success)" }}>reward</div>
              </div>
            </div>

            <div className="dispute-meta" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div><strong>Contract</strong><AddressDisplay address={bounty.address} /></div>
              <div><strong>Active</strong><p className="muted" style={{ margin: 0 }}>{activeReports.length} reports</p></div>
              <div><strong>Resolved</strong><p className="muted" style={{ margin: 0 }}>{resolvedReports.length} reports</p></div>
            </div>

            <div className="grid" style={{ marginTop: 16, gap: 10 }}>
              <strong style={{ font: "600 12px var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Active reports</strong>
              {activeReports.length ? activeReports.map((report) => (
                <div className="list-row" key={report.id}>
                  <div>
                    <a href={`/reports/${report.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}>{report.title}</a>
                    <span style={{ display: "inline-flex", gap: 8, marginTop: 4 }}>
                      hunter <AddressDisplay address={report.author_address} alias={report.author_alias} link={false} />
                    </span>
                  </div>
                  <div className="row-actions">
                    <StatusPill status={report.status} />
                    {report.tx_hash ? <a className="tx-link" href={explorerTxUrl(report.tx_hash)} target="_blank" rel="noopener noreferrer">{shortHash(report.tx_hash)} ↗</a> : null}
                    {report.status === "PENDING" ? (
                      <>
                        <button disabled={pendingAction === `${report.id}:accept`} onClick={() => void resolveReport(report.id, "accept", bounty.address as `0x${string}`)} type="button">
                          {pendingAction === `${report.id}:accept` ? "Accepting…" : "Accept"}
                        </button>
                        <button className="secondary" disabled={pendingAction === `${report.id}:reject`} onClick={() => void resolveReport(report.id, "reject", bounty.address as `0x${string}`)} type="button">
                          {pendingAction === `${report.id}:reject` ? "Rejecting…" : "Reject"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )) : <p className="muted">No active reports.</p>}
            </div>

            {resolvedReports.length ? (
              <div className="grid" style={{ marginTop: 16, gap: 10 }}>
                <strong style={{ font: "600 12px var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Resolved</strong>
                {resolvedReports.map((report) => (
                  <div className="list-row" key={report.id}>
                    <div>
                      <a href={`/reports/${report.id}`} style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 600 }}>{report.title}</a>
                      <span style={{ display: "inline-flex", gap: 8, marginTop: 4 }}>
                        hunter <AddressDisplay address={report.author_address} alias={report.author_alias} link={false} />
                        {report.dispute_id ? ` · dispute ${report.dispute_result ?? report.dispute_status ?? "open"}` : ""}
                      </span>
                    </div>
                    <div className="row-actions">
                      <StatusPill status={report.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function ProgramsList({ onReport }: { onReport(address: string): void }) {
  const [bounties, setBounties] = useState<BountyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void api<BountyOption[]>("/bounties")
      .then((response) => { if (mounted) { setBounties(response); setLoading(false); } })
      .catch((caught) => { if (mounted) { setError(caught instanceof Error ? caught.message : "Could not load bounties"); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="empty">Loading open bounties…</div>;
  }
  if (error) {
    return <div className="panel"><p className="danger">{error}</p></div>;
  }
  if (!bounties.length) {
    return <div className="empty"><h3>No open bounties</h3><p>When a company publishes a bounty, it will appear here.</p></div>;
  }

  return (
    <div className="two-col">
      {bounties.map((bounty) => (
        <article className="program-card" key={bounty.address}>
          <div className="stack-row">
            <div>
              <h3 style={{ marginBottom: 4 }}>{bounty.title}</h3>
              <AddressDisplay address={bounty.company_address} alias={bounty.company_alias} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ font: "700 20px var(--font-display)", color: "var(--ink)" }}>{formatEther(BigInt(bounty.reward_wei))} ETH</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--success)" }}>recompensa</div>
            </div>
          </div>
          <p className="muted" style={{ margin: "14px 0 0", flex: 1, font: "400 13px/1.55 var(--font-body)" }}>{bounty.description}</p>
          <div className="stack-row" style={{ alignItems: "center", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <AddressDisplay address={bounty.address} />
            <button style={{ width: "auto", padding: "10px 16px" }} onClick={() => onReport(bounty.address)} type="button">Report finding</button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CreateReportForm({ onSubmitted, initialBounty }: { onSubmitted(): void; initialBounty?: string | null }) {
  const [payload, setPayload] = useState({ bountyAddress: initialBounty ?? "", title: "", description: "", poc: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bounties, setBounties] = useState<BountyOption[]>([]);
  const [loadingBounties, setLoadingBounties] = useState(true);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    setSessionAddress(getPreferredWallet());
  }, []);

  useEffect(() => {
    if (initialBounty) {
      setPayload((current) => ({ ...current, bountyAddress: initialBounty }));
    }
  }, [initialBounty]);

  useEffect(() => {
    let mounted = true;
    void api<BountyOption[]>("/bounties")
      .then((response) => { if (mounted) { setBounties(response); setLoadingBounties(false); } })
      .catch(() => { if (mounted) { setLoadingBounties(false); } });
    return () => { mounted = false; };
  }, []);

  const selectedBounty = bounties.find((bounty) => bounty.address === payload.bountyAddress);
  const isOwnBounty = Boolean(selectedBounty && sessionAddress && selectedBounty.company_address.toLowerCase() === sessionAddress);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setSubmitting(true);
        setResult(null);
        setError(null);
        const session = await ensureWalletSession(["hunter", "admin"]);
        setSessionAddress(session.address.toLowerCase());
        if (selectedBounty && selectedBounty.company_address.toLowerCase() === session.address.toLowerCase()) {
          throw new Error("No podés reportar en un bounty de tu propia wallet empresa.");
        }
        const filesError = validateFiles(files);
        if (filesError) {
          throw new Error(filesError);
        }
        const attachments = await Promise.all(
          files.map(async (file) => ({
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
            contentBase64: await readFileAsBase64(file),
          })),
        );
        const response = await api<{ id: string; reportHash: string; nextAction: { method: string } }>("/reports", {
          method: "POST",
          body: JSON.stringify({
            bountyAddress: payload.bountyAddress,
            title: payload.title,
            description: payload.description,
            poc: payload.poc,
            attachments,
          }),
        });
        const hash = await writeContractAction({
          address: payload.bountyAddress as `0x${string}`,
          abi: bountyAbi,
          functionName: response.nextAction.method,
          args: [response.reportHash],
          account: session.address as `0x${string}`,
        });
        toast.showTx("Registering report on-chain…", hash);
        await waitForTransactionReceipt(hash);
        try {
          await api(`/bounties/${payload.bountyAddress}/sync`, { method: "POST" });
        } catch (caught) {
          throw new Error(`Report confirmed on-chain, but sync failed: ${caught instanceof Error ? caught.message : "unknown error"}`);
        }
        toast.showSuccess("Report submitted and confirmed on-chain.");
        setPayload({ bountyAddress: "", title: "", description: "", poc: "" });
        setFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onSubmitted();
        setResult(`Report confirmed. Tracking code: ${shortHash(response.reportHash)}`);
      } catch (caught) {
        setError(walletErrorMessage(caught, "Could not submit the report"));
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="surface-kicker">New report</span>
        <h3>Report a finding</h3>
      </div>
      <label>
        <span>Bounty</span>
        <select value={payload.bountyAddress} onChange={(event) => setPayload({ ...payload, bountyAddress: event.target.value })}>
          <option value="">{loadingBounties ? "Loading bounties…" : "Choose an open bounty"}</option>
          {bounties.map((bounty) => (
            <option key={bounty.address} value={bounty.address}>
              {bounty.title} · {formatEther(BigInt(bounty.reward_wei))} ETH{bounty.company_alias ? ` · ${bounty.company_alias}` : ""}
            </option>
          ))}
        </select>
      </label>
      {selectedBounty ? (
        <div className="badge"><span>Contract</span><AddressDisplay address={selectedBounty.address} /></div>
      ) : null}
      {isOwnBounty ? <p className="danger">This bounty belongs to your wallet. The contract blocks self-reporting.</p> : null}
      <label>
        <span>Title</span>
        <input value={payload.title} onChange={(event) => setPayload({ ...payload, title: event.target.value })} placeholder="Unauthorized access to sensitive data" />
      </label>
      <label>
        <span>Impact</span>
        <textarea value={payload.description} onChange={(event) => setPayload({ ...payload, description: event.target.value })} placeholder="What happens and why it matters" />
      </label>
      <label>
        <span>Reproduction steps</span>
        <textarea value={payload.poc} onChange={(event) => setPayload({ ...payload, poc: event.target.value })} placeholder="Steps to reproduce the finding" />
      </label>
      <label>
        <span>Evidence <span className="muted" style={{ fontWeight: 400 }}>· PDF, images or text · up to {Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))}MB each</span></span>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            setError(validateFiles(selected));
            setFiles(selected);
          }}
        />
      </label>
      {files.length ? (
        <div className="grid" style={{ gap: 6, margin: "0 0 4px" }}>
          {files.map((file) => (
            <div className="list-row" key={`${file.name}-${file.size}`}>
              <span style={{ overflowWrap: "anywhere" }}>{file.name}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{(file.size / 1024).toFixed(0)} KB</span>
            </div>
          ))}
        </div>
      ) : null}
      <button disabled={submitting || isOwnBounty || !payload.bountyAddress} type="submit">{submitting ? "Submitting…" : "Submit and confirm on-chain"}</button>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>Evidence is stored privately off-chain; its hash is registered on-chain as proof of authorship.</p>
      {result ? <p style={{ color: "var(--success)" }}>{result}</p> : null}
      {error ? <p className="danger">{error}</p> : null}
    </form>
  );
}

type HunterReport = {
  id: string;
  bounty_address: string;
  bounty_title: string;
  company_address: string | null;
  company_alias: string | null;
  title: string;
  status: string;
  report_hash: string;
  tx_hash: string | null;
  created_at: string;
  dispute_id: string | null;
  dispute_status: string | null;
  dispute_result: string | null;
};

export function HunterReportsPanel({ refreshKey }: { refreshKey: number }) {
  const [reports, setReports] = useState<HunterReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDispute, setPendingDispute] = useState<string | null>(null);
  const [pendingResubmit, setPendingResubmit] = useState<string | null>(null);
  const toast = useToast();

  async function loadReports() {
    await ensureWalletSession(["hunter", "admin"]);
    const response = await api<HunterReport[]>("/reports/mine/list");
    setReports(response);
    setError(null);
    return response;
  }

  useEffect(() => {
    let mounted = true;
    void loadReports()
      .then((response) => { if (mounted) { setReports(response); setLoading(false); } })
      .catch((caught) => { if (mounted) { setError(caught instanceof Error ? caught.message : "Could not load your reports"); setLoading(false); } });
    return () => { mounted = false; };
  }, [refreshKey]);

  async function runIntent(reportId: string, bountyAddress: `0x${string}`, endpoint: string, label: string) {
    const session = await ensureWalletSession(["hunter", "admin"]);
    const intent = await api<{ nextAction: { contract: `0x${string}`; method: string; args: [bigint | number | string] } }>(`/reports/${reportId}/${endpoint}`, { method: "POST" });
    const hash = await writeContractAction({
      address: intent.nextAction.contract,
      abi: bountyAbi,
      functionName: intent.nextAction.method,
      args: intent.nextAction.args,
      account: session.address as `0x${string}`,
    });
    toast.showTx(label, hash);
    await waitForTransactionReceipt(hash);
    await api(`/bounties/${bountyAddress}/sync`, { method: "POST" });
    await loadReports();
  }

  if (loading) {
    return <div className="empty">Cargando tus reportes…</div>;
  }

  return (
    <div className="grid">
      {error ? <p className="danger">{error}</p> : null}
      {reports.length ? reports.map((report) => (
        <div className="list-row" key={report.id}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <strong>{report.title}</strong>
              <StatusPill status={report.status} />
            </div>
            <span style={{ display: "inline-flex", gap: 6, marginTop: 4, alignItems: "center" }}>
              {report.bounty_title} · <AddressDisplay address={report.company_address ?? report.bounty_address} alias={report.company_alias} link={false} />
              {report.dispute_id ? ` · dispute ${report.dispute_result ?? report.dispute_status ?? "open"}` : ""}
            </span>
          </div>
          <div className="row-actions">
            <a className="tx-link" href={`/reports/${report.id}`}>View evidence</a>
            {report.tx_hash ? <a className="tx-link" href={explorerTxUrl(report.tx_hash)} target="_blank" rel="noopener noreferrer">{shortHash(report.tx_hash)} ↗</a> : null}
            {report.status === "OFFCHAIN_STORED" ? (
              <button disabled={pendingResubmit === report.id} onClick={async () => {
                try { setPendingResubmit(report.id); setError(null); await runIntent(report.id, report.bounty_address as `0x${string}`, "resubmit", "Confirming on-chain…"); }
                catch (caught) { setError(walletErrorMessage(caught, "Could not confirm the report")); }
                finally { setPendingResubmit(null); }
              }} type="button">
                {pendingResubmit === report.id ? "Confirming…" : "Confirm on-chain"}
              </button>
            ) : null}
            {report.status === "REJECTED" ? (
              <button disabled={pendingDispute === report.id} onClick={async () => {
                try { setPendingDispute(report.id); setError(null); await runIntent(report.id, report.bounty_address as `0x${string}`, "dispute", "Opening dispute…"); }
                catch (caught) { setError(walletErrorMessage(caught, "Could not open the dispute")); }
                finally { setPendingDispute(null); }
              }} type="button">
                {pendingDispute === report.id ? "Opening…" : "Dispute"}
              </button>
            ) : null}
          </div>
        </div>
      )) : <div className="empty">No reports submitted yet. Choose a bounty in the <strong>Bounties</strong> tab to get started.</div>}
    </div>
  );
}
