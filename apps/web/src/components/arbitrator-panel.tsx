"use client";

import { useEffect, useMemo, useState } from "react";

import { disputeResultLabels, disputeAbi } from "@bugbounty/shared/contracts";

import { api } from "../lib/api";
import { writeContractAction } from "../lib/wallet";

type Session = {
  address: string;
  role: string;
};

type Vote = {
  arbitrator_address: string;
  vote_result: string;
  created_at: string;
};

type Dispute = {
  id: string;
  status: string;
  result: string | null;
  bounty_title?: string | null;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingVoteId, setPendingVoteId] = useState<string | null>(null);

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

        const allDisputes = await api<Dispute[]>("/disputes");
        setDisputes(allDisputes);
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
      setError("Tu sesión no está disponible. Volvé a ingresar con tu cuenta.");
      return;
    }

    try {
      setPendingVoteId(dispute.id);
      setError(null);
      setNotice(null);

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

      setNotice(`Voto enviado correctamente. Referencia: ${hash}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos registrar tu voto");
    } finally {
      setPendingVoteId(null);
    }
  }

  if (loading) {
    return <div className="panel"><p className="muted">Cargando disputas asignadas...</p></div>;
  }

  if (!session) {
    return (
      <div className="panel">
        <h2>Panel del árbitro</h2>
        <p className="muted">Ingresá con la cuenta asignada para ver tus casos y votar.</p>
        {error ? <p className="danger">{error}</p> : null}
      </div>
    );
  }

  if (session.role !== "arbitrator") {
    return (
      <div className="panel">
        <h2>Panel del árbitro</h2>
        <p className="muted">Esta cuenta no tiene permisos de arbitraje.</p>
      </div>
    );
  }

  return (
    <section className="grid">
      <div className="panel">
        <h2>Panel del árbitro</h2>
        <p className="muted">Revisá los casos asignados y emití tu decisión desde esta pantalla.</p>
        <div className="badge">
          <span>Cuenta activa</span>
          <span className="mono">{session.address}</span>
        </div>
      </div>

      {notice ? <div className="panel"><p>{notice}</p></div> : null}
      {error ? <div className="panel"><p className="danger">{error}</p></div> : null}

      {assignedDisputes.length === 0 ? (
        <div className="panel">
          <h3>Sin disputas asignadas</h3>
          <p className="muted">Cuando se te asigne un caso, va a aparecer acá con su evidencia resumida y las opciones para votar.</p>
        </div>
      ) : (
        assignedDisputes.map((dispute) => (
          <article className="panel grid" key={dispute.id}>
            <div className="stack-row">
              <div>
                <h3>{dispute.report_title ?? "Disputa sin título"}</h3>
                <p className="muted">{dispute.bounty_title ?? "Programa sin nombre"}</p>
              </div>
              <div className="badge">
                <span>Estado</span>
                <span>{dispute.status}</span>
              </div>
            </div>

            <p>{dispute.report_description ?? "Sin descripción disponible."}</p>

            <div className="grid dispute-meta">
              <div>
                <strong>Reporte</strong>
                <p className="muted">{dispute.report_status ?? "Sin estado"}</p>
              </div>
              <div>
                <strong>Resultado</strong>
                <p className="muted">{dispute.result ?? "Pendiente"}</p>
              </div>
              <div>
                <strong>Referencia</strong>
                <p className="mono">{dispute.id}</p>
              </div>
            </div>

            <div className="grid">
              <strong>Votos registrados</strong>
              {dispute.votes && dispute.votes.length > 0 ? (
                dispute.votes.map((vote) => (
                  <div className="badge" key={`${dispute.id}-${vote.arbitrator_address}`}>
                    <span className="mono">{vote.arbitrator_address}</span>
                    <span>{vote.vote_result}</span>
                  </div>
                ))
              ) : (
                <p className="muted">Todavía no hay votos confirmados para este caso.</p>
              )}
            </div>

            <div className="vote-actions">
              <button
                disabled={pendingVoteId === dispute.id || dispute.status === "FINALIZED"}
                onClick={() => void castVote(dispute, 0)}
              >
                {pendingVoteId === dispute.id ? "Enviando voto..." : `Favorecer al hunter (${disputeResultLabels[0]})`}
              </button>
              <button
                className="secondary"
                disabled={pendingVoteId === dispute.id || dispute.status === "FINALIZED"}
                onClick={() => void castVote(dispute, 1)}
              >
                {pendingVoteId === dispute.id ? "Enviando voto..." : `Favorecer a la empresa (${disputeResultLabels[1]})`}
              </button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}
