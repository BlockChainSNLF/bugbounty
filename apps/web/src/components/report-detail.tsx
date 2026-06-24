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
  PENDING: "Pendiente",
  OFFCHAIN_STORED: "Sin confirmar",
  ACCEPTED: "Aceptado",
  RESOLVED: "Resuelto",
  REJECTED: "Rechazado",
  DISPUTED: "En disputa",
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
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const stored = getStoredSession();
      setSession(stored ? { address: stored.address, role: stored.role } : null);
      if (!stored) {
        if (!cancelled) { setLoading(false); setError("Conectá tu wallet para ver la evidencia."); }
        return;
      }
      try {
        const response = await api<ReportDetailData>(`/reports/${id}`);
        if (!cancelled) { setReport(response); setError(null); setLoading(false); }
      } catch (caught) {
        if (!cancelled) { setError(caught instanceof Error ? caught.message : "No pudimos cargar el reporte"); setLoading(false); }
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
  }, [id]);

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
      setError(caught instanceof Error ? caught.message : "No pudimos abrir el archivo");
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
      toast.showTx(action === "accept" ? "Aceptando reporte…" : "Rechazando reporte…", hash);
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${report.bounty_address}/sync`, { method: "POST" });
      toast.showSuccess(action === "accept" ? "Reporte aceptado y recompensa liberada." : "Reporte rechazado.");
      const refreshed = await api<ReportDetailData>(`/reports/${id}`);
      setReport(refreshed);
    } catch (caught) {
      setError(walletErrorMessage(caught, "No pudimos resolver el reporte"));
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return <section className="grid"><div className="empty">Cargando reporte…</div></section>;
  }

  if (error && !report) {
    return (
      <section className="grid">
        <button className="secondary" style={{ width: "auto", padding: "8px 14px", justifySelf: "start" }} onClick={goBack} type="button">← Volver</button>
        <div className="panel"><h2>Reporte</h2><p className="danger">{error}</p></div>
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
      <button className="secondary" style={{ width: "auto", padding: "8px 14px", justifySelf: "start" }} onClick={goBack} type="button">← Volver</button>

      <div className="panel">
        <div className="stack-row">
          <div>
            <p className="eyebrow" style={{ margin: "0 0 8px" }}>Reporte</p>
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
            <strong style={{ font: "600 12px var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)" }}>Reproducción</strong>
            <p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{report.poc}</p>
          </div>
        ) : null}
      </div>

      <div className="panel">
        <h3>Evidencia adjunta</h3>
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
                  {openingId === file.fileId ? "Abriendo…" : "Ver"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ marginTop: 12 }}>Este reporte no tiene archivos adjuntos.</p>
        )}
      </div>

      {isOwnerCompany ? (
        <div className="panel">
          <h3>Resolución</h3>
          {canResolve ? (
            <>
              <p className="muted" style={{ margin: "8px 0 16px", fontSize: 14 }}>Revisaste la evidencia. Aceptá para liberar la recompensa al hunter, o rechazá (el hunter puede abrir una disputa).</p>
              <div className="row-actions">
                <button disabled={pendingAction !== null} onClick={() => void resolve("accept")} type="button">
                  {pendingAction === "accept" ? "Aceptando…" : "Aceptar y pagar"}
                </button>
                <button className="secondary" disabled={pendingAction !== null} onClick={() => void resolve("reject")} type="button">
                  {pendingAction === "reject" ? "Rechazando…" : "Rechazar"}
                </button>
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
              {report.status === "OFFCHAIN_STORED"
                ? "El hunter todavía no confirmó este reporte on-chain."
                : `Este reporte ya está ${(STATUS_LABEL[report.status] ?? report.status).toLowerCase()}.`}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
