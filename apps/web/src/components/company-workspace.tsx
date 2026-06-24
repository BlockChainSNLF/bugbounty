"use client";

import { useEffect, useState } from "react";

import { CompanyBountiesPanel, RegisterBountyForm } from "./forms";
import { api } from "../lib/api";
import { getStoredSession, SESSION_EVENT } from "../lib/session";

type Session = { address: string; role: string };
type Tab = "programs" | "create";

export function CompanyWorkspace() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tab, setTab] = useState<Tab>("programs");

  useEffect(() => {
    let cancelled = false;

    // Re-deriva la sesión cada vez que cambia (login, switch de cuenta, otra
    // pestaña). Sin esto la vista quedaba con la sesión leída al montar y, si
    // perdía la carrera contra WalletSessionSync, mostraba el estado vacío para
    // siempre. Mismo patrón de escucha que RoleLinks (header).
    async function load() {
      try {
        setError(null);
        const stored = getStoredSession();
        if (!stored) {
          if (!cancelled) {
            setSession(null);
            setLoading(false);
          }
          return;
        }
        // Pinta el workspace al instante con el rol cacheado y revalida con /me.
        if (!cancelled) {
          setSession({ address: stored.address, role: stored.role });
          setLoading(false);
        }
        const me = await api<Session>("/me");
        if (!cancelled) {
          setSession(me);
        }
      } catch (caught) {
        if (!cancelled) {
          setSession(null);
          setError(caught instanceof Error ? caught.message : "No pudimos cargar tu sesión de empresa");
          setLoading(false);
        }
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
          <div className="panel" style={{ alignSelf: "start" }}>
            <p className="eyebrow" style={{ margin: "0 0 18px" }}>Qué pasa al publicar</p>
            <div style={{ display: "grid", gap: 16 }}>
              {[
                "Se despliega un contrato con la recompensa bloqueada.",
                "Los hunters ven el programa y envían reportes.",
                "Aceptás para pagar automáticamente o rechazás (puede ir a disputa).",
              ].map((text, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <span style={{ font: "700 13px var(--font-mono)", color: "var(--accent)", minWidth: 22, flexShrink: 0 }}>0{i + 1}</span>
                  <p className="muted" style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
