"use client";

import { useState } from "react";

import { CreateReportForm, HunterReportsPanel, ProgramsList } from "./forms";

type Tab = "programs" | "report" | "mine";

export function HunterWorkspace() {
  const [tab, setTab] = useState<Tab>("programs");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Hunter workspace</p>
          <h1>Programas y reportes</h1>
        </div>
        <nav className="tabs">
          <button type="button" className={`tab${tab === "programs" ? " tab-active" : ""}`} onClick={() => setTab("programs")}>Programas</button>
          <button type="button" className={`tab${tab === "report" ? " tab-active" : ""}`} onClick={() => setTab("report")}>Reportar</button>
          <button type="button" className={`tab${tab === "mine" ? " tab-active" : ""}`} onClick={() => setTab("mine")}>Mis reportes</button>
        </nav>
      </div>

      {tab === "programs" ? (
        <ProgramsList onReport={(address) => { setSelectedProgram(address); setTab("report"); }} />
      ) : null}

      {tab === "report" ? (
        <div className="workspace-grid">
          <div className="panel">
            <CreateReportForm
              initialBounty={selectedProgram}
              onSubmitted={() => { setRefreshKey((current) => current + 1); setTab("mine"); }}
            />
          </div>
          <div className="status-rail">
            <div><span>Evidencia</span><strong>Privada off-chain</strong></div>
            <div><span>Autoría</span><strong>Hash verificable</strong></div>
            <div><span>Si rechazan</span><strong>Disputa disponible</strong></div>
          </div>
        </div>
      ) : null}

      {tab === "mine" ? <HunterReportsPanel refreshKey={refreshKey} /> : null}
    </section>
  );
}
