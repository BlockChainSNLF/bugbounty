"use client";

import { useEffect, useState } from "react";

import { CompanyBountiesPanel, RegisterBountyForm } from "./forms";
import { api } from "../lib/api";

type Session = {
  address: string;
  role: string;
};

export function CompanyWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (caught) {
        window.localStorage.removeItem("bugbounty.token");
        window.localStorage.removeItem("bugbounty.role");
        window.localStorage.removeItem("bugbounty.address");
        setSession(null);
        setError(caught instanceof Error ? caught.message : "No pudimos cargar tu sesión de empresa");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  if (loading) {
    return <div className="panel"><p className="muted">Cargando workspace de empresa...</p></div>;
  }

  if (!session) {
    return (
      <div className="panel">
        <h2>Workspace de empresa</h2>
        <p className="muted">Ingresá con una cuenta de empresa aprobada para crear y gestionar bounties.</p>
        {error ? <p className="danger">{error}</p> : null}
      </div>
    );
  }

  if (!["company", "admin"].includes(session.role)) {
    return (
      <div className="panel">
        <h2>Workspace de empresa</h2>
        <p className="muted">Esta cuenta no tiene permisos de empresa.</p>
      </div>
    );
  }

  return (
    <>
      <div className="workspace-grid">
        <div className="panel panel-wide"><RegisterBountyForm /></div>
        <div className="status-rail">
          <div><span>Escrow</span><strong>Deploy con wallet</strong></div>
          <div><span>Validacion</span><strong>On-chain</strong></div>
          <div><span>Disputas</span><strong>Arbitraje 3/3</strong></div>
        </div>
      </div>
      <CompanyBountiesPanel />
    </>
  );
}
