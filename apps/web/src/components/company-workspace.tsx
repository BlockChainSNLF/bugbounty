"use client";

import { useEffect, useState } from "react";

import { CompanyBountiesPanel, RegisterBountyForm } from "./forms";
import { api } from "../lib/api";

type Session = { address: string; role: string };
type Tab = "programs" | "create";

export function CompanyWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<Tab>("programs");

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
        setSession(null);
        setError(caught instanceof Error ? caught.message : "No pudimos cargar tu sesión de empresa");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) {
    return <section className="workspace-layout"><div className="empty">Cargando workspace de empresa…</div></section>;
  }

  if (!session || !["company", "admin"].includes(session.role)) {
    return (
      <section className="workspace-layout">
        <div className="page-heading">
          <div><p className="eyebrow">Company workspace</p><h1>Programas y recompensas</h1></div>
        </div>
        <div className="empty">
          <h3>Workspace de empresa</h3>
          <p>{!session ? "Conectá una cuenta de empresa aprobada para crear y gestionar programas." : "Esta cuenta no tiene permisos de empresa."}</p>
          {error ? <p className="danger">{error}</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Company workspace</p>
          <h1>Programas y recompensas</h1>
        </div>
        <nav className="tabs">
          <button type="button" className={`tab${tab === "programs" ? " tab-active" : ""}`} onClick={() => setTab("programs")}>Mis programas</button>
          <button type="button" className={`tab${tab === "create" ? " tab-active" : ""}`} onClick={() => setTab("create")}>Crear programa</button>
        </nav>
      </div>

      {tab === "programs" ? <CompanyBountiesPanel refreshKey={refreshKey} /> : null}

      {tab === "create" ? (
        <div className="workspace-grid">
          <div className="panel">
            <RegisterBountyForm onCreated={async () => { setRefreshKey((current) => current + 1); setTab("programs"); }} />
          </div>
          <div className="status-rail">
            <div><span>Escrow</span><strong>Deploy con tu wallet</strong></div>
            <div><span>Validación</span><strong>On-chain</strong></div>
            <div><span>Disputas</span><strong>Arbitraje 3/3</strong></div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
