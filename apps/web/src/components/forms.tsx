"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";

import { api } from "../lib/api";
import { bountyAbi, bountyBytecode } from "../lib/bounty-contract";
import { ensureWalletSession, getPreferredWallet } from "../lib/session";
import { deployContractAction, waitForTransactionReceipt, writeContractAction } from "../lib/wallet";

const SUBMIT_REPORT_GAS_LIMIT = 180_000n;

export function RegisterBountyForm() {
  const [payload, setPayload] = useState({ title: "", description: "", rewardEth: "0.1" });
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setSubmitting(true);
        setResult(null);

        const session = await ensureWalletSession(["company", "admin"], getPreferredWallet() ?? undefined);
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
        const receipt = await waitForTransactionReceipt(deployHash);
        if (!receipt.contractAddress) {
          throw new Error("No pudimos obtener la dirección del programa desplegado");
        }

        const response = await api<{ address: string }>("/bounties", {
          method: "POST",
          body: JSON.stringify({
            address: receipt.contractAddress,
            title: payload.title,
            description: payload.description,
            rewardWei: rewardWei.toString(),
            chainId: deploySpec.chainId,
          }),
        });
        setResult(`Programa creado y registrado: ${response.address}`);
      } catch (caught) {
        setResult(caught instanceof Error ? caught.message : "No pudimos crear el programa");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="surface-kicker">Bounty deploy</span>
        <h3>Crear programa</h3>
      </div>
      <label>
        <span>Nombre</span>
        <input value={payload.title} onChange={(event) => setPayload({ ...payload, title: event.target.value })} placeholder="Portal de clientes" />
      </label>
      <label>
        <span>Alcance</span>
        <textarea value={payload.description} onChange={(event) => setPayload({ ...payload, description: event.target.value })} placeholder="Dominios, sistemas y condiciones" />
      </label>
      <label>
        <span>Recompensa en ETH</span>
        <input value={payload.rewardEth} onChange={(event) => setPayload({ ...payload, rewardEth: event.target.value })} placeholder="0.1" />
      </label>
      <button disabled={submitting} type="submit">{submitting ? "Creando programa..." : "Crear programa"}</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}

function trimAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function CompanyBountiesPanel() {
  const [bounties, setBounties] = useState<Array<{
    address: string;
    title: string;
    description: string;
    reward_wei: string;
    created_at: string;
    reports: Array<{
      id: string;
      author_address: string;
      title: string;
      status: string;
      created_at: string;
      dispute_id: string | null;
      dispute_status: string | null;
      dispute_result: string | null;
      votes_cast: number | null;
    }>;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function loadBounties() {
    const response = await ensureWalletSession(["company", "admin"], getPreferredWallet() ?? undefined)
      .then(() => api<typeof bounties>("/bounties/mine"));
    setBounties(response);
    setError(null);
    return response;
  }

  useEffect(() => {
    let mounted = true;

    void loadBounties()
      .then((response) => {
        if (!mounted) {
          return;
        }
        setBounties(response);
        setLoading(false);
      })
      .catch((caught) => {
        if (!mounted) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "No pudimos cargar tus programas");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function resolveReport(reportId: string, action: "accept" | "reject", bountyAddress: `0x${string}`) {
    try {
      setPendingAction(`${reportId}:${action}`);
      const session = await ensureWalletSession(["company", "admin"], getPreferredWallet() ?? undefined);
      const intent = await api<{
        nextAction: {
          contract: `0x${string}`;
          method: string;
          args: [bigint | number | string];
        };
      }>(`/reports/${reportId}/${action}`, { method: "POST" });

      const hash = await writeContractAction({
        address: intent.nextAction.contract,
        abi: bountyAbi,
        functionName: intent.nextAction.method,
        args: intent.nextAction.args,
        account: session.address as `0x${string}`,
      });
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${bountyAddress}/sync`, { method: "POST" });
      await loadBounties();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos resolver el reporte");
    } finally {
      setPendingAction(null);
    }
  }

  if (loading) {
    return <div className="panel"><p className="muted">Cargando programas de empresa...</p></div>;
  }

  if (error) {
    return <div className="panel"><p className="danger">{error}</p></div>;
  }

  if (!bounties.length) {
    return (
      <div className="panel">
        <h3>Todavía no tenés programas registrados</h3>
        <p className="muted">Cuando despliegues un bounty, va a aparecer acá con sus reportes y estados.</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {bounties.map((bounty) => {
        const activeReports = bounty.reports.filter((report) => !["ACCEPTED", "RESOLVED"].includes(report.status));
        const resolvedReports = bounty.reports.filter((report) => ["ACCEPTED", "RESOLVED"].includes(report.status));

        return (
          <article className="panel grid" key={bounty.address}>
            <div className="stack-row">
              <div>
                <h3>{bounty.title}</h3>
                <p className="muted">{bounty.description}</p>
              </div>
              <div className="badge">
                <span>Reward</span>
                <span>{formatEther(BigInt(bounty.reward_wei))} ETH</span>
              </div>
            </div>

            <div className="grid dispute-meta">
              <div>
                <strong>Contrato</strong>
                <p className="mono">{bounty.address}</p>
              </div>
              <div>
                <strong>Activos</strong>
                <p className="muted">{activeReports.length} reportes</p>
              </div>
              <div>
                <strong>Resueltos</strong>
                <p className="muted">{resolvedReports.length} reportes</p>
              </div>
            </div>

            <div className="grid">
              <strong>Reportes activos</strong>
              {activeReports.length ? activeReports.map((report) => (
                <div className="list-row" key={report.id}>
                  <div>
                    <strong>{report.title}</strong>
                    <span>{report.status} · hunter {trimAddress(report.author_address)}</span>
                  </div>
                  <div className="session-cluster">
                    <span>{new Date(report.created_at).toLocaleDateString("es-AR")}</span>
                    {report.status === "PENDING" ? (
                      <>
                        <button
                          disabled={pendingAction === `${report.id}:accept`}
                          onClick={() => void resolveReport(report.id, "accept", bounty.address as `0x${string}`)}
                          type="button"
                        >
                          {pendingAction === `${report.id}:accept` ? "Aceptando..." : "Aceptar"}
                        </button>
                        <button
                          className="secondary"
                          disabled={pendingAction === `${report.id}:reject`}
                          onClick={() => void resolveReport(report.id, "reject", bounty.address as `0x${string}`)}
                          type="button"
                        >
                          {pendingAction === `${report.id}:reject` ? "Rechazando..." : "Rechazar"}
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              )) : <p className="muted">Sin reportes activos.</p>}
            </div>

            <div className="grid">
              <strong>Resueltos</strong>
              {resolvedReports.length ? resolvedReports.map((report) => (
                <div className="list-row" key={report.id}>
                  <div>
                    <strong>{report.title}</strong>
                    <span>
                      {report.status} · hunter {trimAddress(report.author_address)}
                      {report.dispute_id ? ` · disputa ${report.dispute_result ?? report.dispute_status ?? "abierta"}` : ""}
                    </span>
                  </div>
                  <span>{new Date(report.created_at).toLocaleDateString("es-AR")}</span>
                </div>
              )) : <p className="muted">Sin reportes resueltos.</p>}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function CreateReportForm() {
  const [payload, setPayload] = useState({ bountyAddress: "", title: "", description: "", poc: "", fileName: "poc.txt", mimeType: "text/plain", content: "" });
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bounties, setBounties] = useState<Array<{
    address: string;
    title: string;
    description: string;
    reward_wei: string;
    company_address: string;
  }>>([]);
  const [loadingBounties, setLoadingBounties] = useState(true);
  const [bountiesError, setBountiesError] = useState<string | null>(null);
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);

  useEffect(() => {
    const preferred = getPreferredWallet();
    if (preferred) {
      setSessionAddress(preferred.toLowerCase());
    }
  }, []);

  const selectedBounty = bounties.find((bounty) => bounty.address === payload.bountyAddress);
  const isOwnBounty = Boolean(
    selectedBounty &&
    sessionAddress &&
    selectedBounty.company_address.toLowerCase() === sessionAddress,
  );

  useEffect(() => {
    let mounted = true;

    void api<Array<{
      address: string;
      title: string;
      description: string;
      reward_wei: string;
      company_address: string;
    }>>("/bounties")
      .then((response) => {
        if (!mounted) {
          return;
        }
        setBounties(response);
        setLoadingBounties(false);
      })
      .catch((caught) => {
        if (!mounted) {
          return;
        }
        setBountiesError(caught instanceof Error ? caught.message : "No pudimos cargar los programas");
        setLoadingBounties(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setSubmitting(true);
        setResult(null);
        const session = await ensureWalletSession(["hunter", "admin"], getPreferredWallet() ?? undefined);
        setSessionAddress(session.address.toLowerCase());
        if (selectedBounty && selectedBounty.company_address.toLowerCase() === session.address.toLowerCase()) {
          throw new Error("No podés reportar vulnerabilidades en un bounty de tu propia wallet empresa.");
        }
        const response = await api<{ id: string; reportHash: string; nextAction: { method: string } }>("/reports", {
          method: "POST",
          body: JSON.stringify({
            bountyAddress: payload.bountyAddress,
            title: payload.title,
            description: payload.description,
            poc: payload.poc,
            attachments: [
              {
                fileName: payload.fileName,
                mimeType: payload.mimeType,
                contentBase64: btoa(payload.content),
              },
            ],
          }),
        });
        const hash = await writeContractAction({
          address: payload.bountyAddress as `0x${string}`,
          abi: bountyAbi,
          functionName: response.nextAction.method,
          args: [response.reportHash],
          account: session.address as `0x${string}`,
          gas: SUBMIT_REPORT_GAS_LIMIT,
        });
        await waitForTransactionReceipt(hash);
        await api(`/bounties/${payload.bountyAddress}/sync`, { method: "POST" });
        setResult(`Reporte enviado y confirmado on-chain. Código de seguimiento: ${response.reportHash}`);
      } catch (caught) {
        setResult(caught instanceof Error ? caught.message : "No pudimos enviar el reporte");
      } finally {
        setSubmitting(false);
      }
    }}>
      <div className="form-header">
        <span className="surface-kicker">Disclosure intake</span>
        <h3>Nuevo reporte</h3>
      </div>
      <label>
        <span>Programa abierto</span>
        <select
          value={payload.bountyAddress}
          onChange={(event) => setPayload({ ...payload, bountyAddress: event.target.value })}
        >
          <option value="">{loadingBounties ? "Cargando programas..." : "Elegí un bounty"}</option>
          {bounties.map((bounty) => (
            <option key={bounty.address} value={bounty.address}>
              {bounty.title} · {formatEther(BigInt(bounty.reward_wei))} ETH · {bounty.address.slice(0, 6)}...{bounty.address.slice(-4)}
            </option>
          ))}
        </select>
      </label>
      {bountiesError ? <p className="danger">{bountiesError}</p> : null}
      {payload.bountyAddress ? (
        <div className="badge">
          <span>Contrato seleccionado</span>
          <span className="mono">{payload.bountyAddress}</span>
        </div>
      ) : null}
      <label>
        <span>Contrato del programa</span>
        <input value={payload.bountyAddress} onChange={(event) => setPayload({ ...payload, bountyAddress: event.target.value })} placeholder="0x..." />
      </label>
      {payload.bountyAddress ? (
        <p className="muted">
          {bounties.find((bounty) => bounty.address === payload.bountyAddress)?.description ?? "Podés pegar otra dirección manualmente si ya la conocés."}
        </p>
      ) : null}
      {isOwnBounty ? (
        <p className="danger">Ese bounty pertenece a la misma wallet que estás usando como hunter. El contrato lo bloquea.</p>
      ) : null}
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
        <span>Adjunto</span>
        <textarea value={payload.content} onChange={(event) => setPayload({ ...payload, content: event.target.value })} placeholder="Contenido del archivo adjunto" />
      </label>
      <button disabled={submitting || isOwnBounty} type="submit">{submitting ? "Enviando reporte..." : "Enviar reporte"}</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}

export function HunterReportsPanel() {
  const [reports, setReports] = useState<Array<{
    id: string;
    bounty_address: string;
    bounty_title: string;
    title: string;
    status: string;
    report_hash: string;
    created_at: string;
    dispute_id: string | null;
    dispute_status: string | null;
    dispute_result: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDispute, setPendingDispute] = useState<string | null>(null);
  const [pendingResubmit, setPendingResubmit] = useState<string | null>(null);

  async function loadReports() {
    const response = await ensureWalletSession(["hunter", "admin"], getPreferredWallet() ?? undefined)
      .then(() => api<typeof reports>("/reports/mine/list"));
    setReports(response);
    setError(null);
    return response;
  }

  useEffect(() => {
    let mounted = true;

    void loadReports()
      .then((response) => {
        if (!mounted) {
          return;
        }
        setReports(response);
        setLoading(false);
      })
      .catch((caught) => {
        if (!mounted) {
          return;
        }
        setError(caught instanceof Error ? caught.message : "No pudimos cargar tus reportes");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function openDispute(reportId: string, bountyAddress: `0x${string}`) {
    try {
      setPendingDispute(reportId);
      const session = await ensureWalletSession(["hunter", "admin"], getPreferredWallet() ?? undefined);
      const intent = await api<{
        nextAction: {
          contract: `0x${string}`;
          method: string;
          args: [bigint | number | string];
        };
      }>(`/reports/${reportId}/dispute`, { method: "POST" });

      const hash = await writeContractAction({
        address: intent.nextAction.contract,
        abi: bountyAbi,
        functionName: intent.nextAction.method,
        args: intent.nextAction.args,
        account: session.address as `0x${string}`,
        gas: SUBMIT_REPORT_GAS_LIMIT,
      });
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${bountyAddress}/sync`, { method: "POST" });
      await loadReports();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos abrir la disputa");
    } finally {
      setPendingDispute(null);
    }
  }

  async function resubmitReport(reportId: string, bountyAddress: `0x${string}`) {
    try {
      setPendingResubmit(reportId);
      const session = await ensureWalletSession(["hunter", "admin"], getPreferredWallet() ?? undefined);
      const intent = await api<{
        nextAction: {
          contract: `0x${string}`;
          method: string;
          args: [string];
        };
      }>(`/reports/${reportId}/resubmit`, { method: "POST" });

      const hash = await writeContractAction({
        address: intent.nextAction.contract,
        abi: bountyAbi,
        functionName: intent.nextAction.method,
        args: intent.nextAction.args,
        account: session.address as `0x${string}`,
      });
      await waitForTransactionReceipt(hash);
      await api(`/bounties/${bountyAddress}/sync`, { method: "POST" });
      await loadReports();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos confirmar el reporte on-chain");
    } finally {
      setPendingResubmit(null);
    }
  }

  if (loading) {
    return <div className="panel"><p className="muted">Cargando tus reportes...</p></div>;
  }

  return (
    <div className="panel grid">
      <div className="form-header">
        <span className="surface-kicker">My reports</span>
        <h3>Seguimiento del hunter</h3>
      </div>
      {error ? <p className="danger">{error}</p> : null}
      {reports.length ? reports.map((report) => (
        <div className="list-row" key={report.id}>
          <div>
            <strong>{report.title}</strong>
            <span>
              {report.bounty_title} · {report.status}
              {report.dispute_id ? ` · disputa ${report.dispute_result ?? report.dispute_status ?? "abierta"}` : ""}
            </span>
          </div>
          <div className="session-cluster">
            <span>{new Date(report.created_at).toLocaleDateString("es-AR")}</span>
            {report.status === "OFFCHAIN_STORED" ? (
              <button
                disabled={pendingResubmit === report.id}
                onClick={() => void resubmitReport(report.id, report.bounty_address as `0x${string}`)}
                type="button"
              >
                {pendingResubmit === report.id ? "Confirmando..." : "Confirmar on-chain"}
              </button>
            ) : null}
            {report.status === "REJECTED" ? (
              <button
                disabled={pendingDispute === report.id}
                onClick={() => void openDispute(report.id, report.bounty_address as `0x${string}`)}
                type="button"
              >
                {pendingDispute === report.id ? "Abriendo..." : "Disputar"}
              </button>
            ) : null}
          </div>
        </div>
      )) : <p className="muted">Todavía no enviaste reportes.</p>}
    </div>
  );
}
