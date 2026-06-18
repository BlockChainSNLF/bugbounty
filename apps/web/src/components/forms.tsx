"use client";

import { useState } from "react";
import { parseEther } from "viem";

import { api } from "../lib/api";
import { bountyAbi, bountyBytecode } from "../lib/bounty-contract";
import { ensureWalletSession } from "../lib/session";
import { deployContractAction, waitForTransactionReceipt } from "../lib/wallet";

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

export function CreateReportForm() {
  const [payload, setPayload] = useState({ bountyAddress: "", title: "", description: "", poc: "", fileName: "poc.txt", mimeType: "text/plain", content: "" });
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form onSubmit={async (event) => {
      event.preventDefault();
      try {
        setSubmitting(true);
        setResult(null);
        await ensureWalletSession(["hunter", "admin"]);
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
        setResult(`Reporte recibido. Falta la confirmación final para dejar constancia del envío. Código de seguimiento: ${response.reportHash}`);
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
        <span>Contrato del programa</span>
        <input value={payload.bountyAddress} onChange={(event) => setPayload({ ...payload, bountyAddress: event.target.value })} placeholder="0x..." />
      </label>
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
      <button disabled={submitting} type="submit">{submitting ? "Enviando reporte..." : "Enviar reporte"}</button>
      {result ? <p>{result}</p> : null}
    </form>
  );
}
