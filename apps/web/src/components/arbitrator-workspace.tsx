"use client";

import { ArbitratorPanel } from "./arbitrator-panel";

export function ArbitratorWorkspace() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Arbitrator workspace</p>
          <h1>Disputas asignadas</h1>
        </div>
      </div>
      <ArbitratorPanel />
    </section>
  );
}
