"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";

import { api } from "../lib/api";
import { bountyAbi, bountyBytecode } from "../lib/bounty-contract";
import { ensureWalletSession, getPreferredWallet } from "../lib/session";
import { deployContractAction, waitForTransactionReceipt, writeContractAction } from "../lib/wallet";
import { explorerTxUrl, shortHash } from "../lib/explorer";
import { AddressDisplay } from "./address-display";
import { useToast } from "./toast";

const SEVERITY_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "pill-warn" },
  OFFCHAIN_STORED: { label: "Sin confirmar", cls: "pill-warn" },
  ACCEPTED: { label: "Aceptado", cls: "pill-success" },
  RESOLVED: { label: "Resuelto", cls: "pill-info" },
  REJECTED: { label: "Rechazado", cls: "pill-warn" },
  DISPUTED: { label: "En disputa", cls: "pill-info" },
};

function StatusPill({ status }: { status: string }) {
  const info = SEVERITY_LABEL[status] ?? { label: status, cls: "pill-info" };
  return <span className={`pill ${info.cls}`}>{info.label}</span>;
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
  const [payload, setPayload] = useState({ title: "", description: "", rewardEth: "0.1" });
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
        toast.showTx("Desplegando programa…", deployHash);
        const receipt = await waitForTransactionReceipt(deployHash);
        if (!receipt.contractAddress) {
          throw new Error("No pudimos obtener la dirección del programa desplegado");
        }

        await api<{ address: string }>("/bounties", {
          method: "POST",
          body: JSON.stringify({
            address: receipt.contractAddress,
            title: payload.title,
            description: payload.description,
            rewardWei: rewardWei.toString(),
            chainId: deploySpec.chainId,
          }),
        });
        toast.showSuccess("Programa creado y recompensa bloqueada en escrow.");
        setPayload({ title: "", description: "", rewardEth: "0.1" });
        await onCreated();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos crear el programa");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="surface-kicker">Bounty deploy</span>
        <h3>Crear programa</h3>
      </div>
      <label>
        <span>Nombre del programa</span>
        <input value={payload.title} onChange={(event) => setPayload({ ...payload, title: event.target.value })} placeholder="Portal de clientes" />
      </label>
      <label>
        <span>Alcance</span>
        <textarea value={payload.description} onChange={(event) => setPayload({ ...payload, description: event.target.value })} placeholder="Dominios, sistemas y condiciones del programa" />
      </label>
      <label>
        <span>Recompensa en ETH</span>
        <input value={payload.rewardEth} onChange={(event) => setPayload({ ...payload, rewardEth: event.target.value })} placeholder="0.1" />
      </label>
      <button disabled={submitting} type="submit">{submitting ? "Creando programa…" : "Bloquear escrow y crear programa"}</button>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>La recompensa se bloquea en el contrato al desplegar. Vas a firmar el deploy con tu wallet.</p>
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
      .catch((caught) => { if (mounted) { setError(caught instanceof Error ? caught.message : "No pudimos cargar tus programas"); setLoading(false); } });
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
      toast.showTx(action === "accept" ? "Aceptando reporte…" : "Rechazando reporte…", hash);
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${bountyAddress}/sync`, { method: "POST" });
      toast.showSuccess(action === "accept" ? "Reporte aceptado y recompensa liberada." : "Reporte rechazado.");
      await loadBounties();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos resolver el reporte");
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return <div className="empty">Cargando tus programas…</div>;
  }
  if (error) {
    return <div className="panel"><p className="danger">{error}</p></div>;
  }
  if (!bounties.length) {
    return (
      <div className="empty">
        <h3>Todavía no tenés programas</h3>
        <p>Cuando despliegues un bounty, va a aparecer acá con sus reportes y estados.</p>
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
                <div className="mono" style={{ fontSize: 10, color: "var(--success)" }}>recompensa</div>
              </div>
            </div>

            <div className="dispute-meta" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
              <div><strong>Contrato</strong><AddressDisplay address={bounty.address} /></div>
              <div><strong>Activos</strong><p className="muted" style={{ margin: 0 }}>{activeReports.length} reportes</p></div>
              <div><strong>Resueltos</strong><p className="muted" style={{ margin: 0 }}>{resolvedReports.length} reportes</p></div>
            </div>

            <div className="grid" style={{ marginTop: 16, gap: 10 }}>
              <strong style={{ font: "600 12px var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reportes activos</strong>
              {activeReports.length ? activeReports.map((report) => (
                <div className="list-row" key={report.id}>
                  <div>
                    <strong>{report.title}</strong>
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
                          {pendingAction === `${report.id}:accept` ? "Aceptando…" : "Aceptar"}
                        </button>
                        <button className="secondary" disabled={pendingAction === `${report.id}:reject`} onClick={() => void resolveReport(report.id, "reject", bounty.address as `0x${string}`)} type="button">
                          {pendingAction === `${report.id}:reject` ? "Rechazando…" : "Rechazar"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )) : <p className="muted">Sin reportes activos.</p>}
            </div>

            {resolvedReports.length ? (
              <div className="grid" style={{ marginTop: 16, gap: 10 }}>
                <strong style={{ font: "600 12px var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Resueltos</strong>
                {resolvedReports.map((report) => (
                  <div className="list-row" key={report.id}>
                    <div>
                      <strong>{report.title}</strong>
                      <span style={{ display: "inline-flex", gap: 8, marginTop: 4 }}>
                        hunter <AddressDisplay address={report.author_address} alias={report.author_alias} link={false} />
                        {report.dispute_id ? ` · disputa ${report.dispute_result ?? report.dispute_status ?? "abierta"}` : ""}
                      </span>
                    </div>
                    <StatusPill status={report.status} />
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
      .catch((caught) => { if (mounted) { setError(caught instanceof Error ? caught.message : "No pudimos cargar los programas"); setLoading(false); } });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return <div className="empty">Cargando programas abiertos…</div>;
  }
  if (error) {
    return <div className="panel"><p className="danger">{error}</p></div>;
  }
  if (!bounties.length) {
    return <div className="empty"><h3>No hay programas abiertos</h3><p>Cuando una empresa publique un programa, va a aparecer acá.</p></div>;
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
            <button style={{ width: "auto", padding: "10px 16px" }} onClick={() => onReport(bounty.address)} type="button">Reportar hallazgo</button>
          </div>
        </article>
      ))}
    </div>
  );
}

export function CreateReportForm({ onSubmitted, initialBounty }: { onSubmitted(): void; initialBounty?: string | null }) {
  const [payload, setPayload] = useState({ bountyAddress: initialBounty ?? "", title: "", description: "", poc: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bounties, setBounties] = useState<BountyOption[]>([]);
  const [loadingBounties, setLoadingBounties] = useState(true);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
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
        const response = await api<{ id: string; reportHash: string; nextAction: { method: string } }>("/reports", {
          method: "POST",
          body: JSON.stringify({
            bountyAddress: payload.bountyAddress,
            title: payload.title,
            description: payload.description,
            poc: payload.poc,
            attachments: [{ fileName: "poc.txt", mimeType: "text/plain", contentBase64: btoa(unescape(encodeURIComponent(payload.content || payload.poc))) }],
          }),
        });
        const hash = await writeContractAction({
          address: payload.bountyAddress as `0x${string}`,
          abi: bountyAbi,
          functionName: response.nextAction.method,
          args: [response.reportHash],
          account: session.address as `0x${string}`,
        });
        toast.showTx("Registrando reporte on-chain…", hash);
        await waitForTransactionReceipt(hash);
        try {
          await api(`/bounties/${payload.bountyAddress}/sync`, { method: "POST" });
        } catch (caught) {
          throw new Error(`El reporte quedó confirmado on-chain, pero falló la sincronización: ${caught instanceof Error ? caught.message : "error desconocido"}`);
        }
        toast.showSuccess("Reporte enviado y confirmado on-chain.");
        setPayload({ bountyAddress: "", title: "", description: "", poc: "", content: "" });
        onSubmitted();
        setResult(`Reporte confirmado. Código de seguimiento: ${shortHash(response.reportHash)}`);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos enviar el reporte");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="surface-kicker">Nuevo reporte</span>
        <h3>Reportá un hallazgo</h3>
      </div>
      <label>
        <span>Programa</span>
        <select value={payload.bountyAddress} onChange={(event) => setPayload({ ...payload, bountyAddress: event.target.value })}>
          <option value="">{loadingBounties ? "Cargando programas…" : "Elegí un programa abierto"}</option>
          {bounties.map((bounty) => (
            <option key={bounty.address} value={bounty.address}>
              {bounty.title} · {formatEther(BigInt(bounty.reward_wei))} ETH{bounty.company_alias ? ` · ${bounty.company_alias}` : ""}
            </option>
          ))}
        </select>
      </label>
      {selectedBounty ? (
        <div className="badge"><span>Contrato</span><AddressDisplay address={selectedBounty.address} /></div>
      ) : null}
      {isOwnBounty ? <p className="danger">Ese bounty pertenece a tu wallet. El contrato bloquea el auto-reporte.</p> : null}
      <label>
        <span>Título</span>
        <input value={payload.title} onChange={(event) => setPayload({ ...payload, title: event.target.value })} placeholder="Acceso indebido a información sensible" />
      </label>
      <label>
        <span>Impacto</span>
        <textarea value={payload.description} onChange={(event) => setPayload({ ...payload, description: event.target.value })} placeholder="Qué pasa y por qué importa" />
      </label>
      <label>
        <span>Reproducción</span>
        <textarea value={payload.poc} onChange={(event) => setPayload({ ...payload, poc: event.target.value })} placeholder="Pasos para reproducir el hallazgo" />
      </label>
      <label>
        <span>Proof of Concept <span className="muted" style={{ fontWeight: 400 }}>· opcional</span></span>
        <textarea value={payload.content} onChange={(event) => setPayload({ ...payload, content: event.target.value })} placeholder="Comando, payload o snippet que dispara la vulnerabilidad" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }} />
      </label>
      <button disabled={submitting || isOwnBounty || !payload.bountyAddress} type="submit">{submitting ? "Enviando reporte…" : "Guardar y confirmar on-chain"}</button>
      <p className="muted" style={{ margin: 0, fontSize: 12 }}>La evidencia se guarda privada off-chain y su hash queda registrado on-chain como prueba de autoría.</p>
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
      .catch((caught) => { if (mounted) { setError(caught instanceof Error ? caught.message : "No pudimos cargar tus reportes"); setLoading(false); } });
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
              {report.dispute_id ? ` · disputa ${report.dispute_result ?? report.dispute_status ?? "abierta"}` : ""}
            </span>
          </div>
          <div className="row-actions">
            {report.tx_hash ? <a className="tx-link" href={explorerTxUrl(report.tx_hash)} target="_blank" rel="noopener noreferrer">{shortHash(report.tx_hash)} ↗</a> : null}
            {report.status === "OFFCHAIN_STORED" ? (
              <button disabled={pendingResubmit === report.id} onClick={async () => {
                try { setPendingResubmit(report.id); setError(null); await runIntent(report.id, report.bounty_address as `0x${string}`, "resubmit", "Confirmando on-chain…"); }
                catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos confirmar el reporte"); }
                finally { setPendingResubmit(null); }
              }} type="button">
                {pendingResubmit === report.id ? "Confirmando…" : "Confirmar on-chain"}
              </button>
            ) : null}
            {report.status === "REJECTED" ? (
              <button disabled={pendingDispute === report.id} onClick={async () => {
                try { setPendingDispute(report.id); setError(null); await runIntent(report.id, report.bounty_address as `0x${string}`, "dispute", "Abriendo disputa…"); }
                catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos abrir la disputa"); }
                finally { setPendingDispute(null); }
              }} type="button">
                {pendingDispute === report.id ? "Abriendo…" : "Disputar"}
              </button>
            ) : null}
          </div>
        </div>
      )) : <div className="empty">Todavía no enviaste reportes. Elegí un programa en la pestaña <strong>Programas</strong> para empezar.</div>}
    </div>
  );
}
