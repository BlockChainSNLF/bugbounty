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
          <h1>Bounties and reports</h1>
        </div>
        <nav className="tabs">
          <button type="button" className={`tab${tab === "programs" ? " tab-active" : ""}`} onClick={() => setTab("programs")}>Bounties</button>
          <button type="button" className={`tab${tab === "report" ? " tab-active" : ""}`} onClick={() => setTab("report")}>Report</button>
          <button type="button" className={`tab${tab === "mine" ? " tab-active" : ""}`} onClick={() => setTab("mine")}>My reports</button>
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
            <div><span>Evidence</span><strong>Private off-chain</strong></div>
            <div><span>Authorship</span><strong>Verifiable hash</strong></div>
            <div><span>If rejected</span><strong>Dispute available</strong></div>
          </div>
        </div>
      ) : null}

      {tab === "mine" ? <HunterReportsPanel refreshKey={refreshKey} /> : null}
    </section>
  );
}
