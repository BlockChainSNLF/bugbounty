"use client";

import { ArbitratorPanel } from "./arbitrator-panel";

export function ArbitratorWorkspace() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Arbitrator workspace</p>
          <h1>Assigned disputes</h1>
        </div>
      </div>
      <ArbitratorPanel />
    </section>
  );
}
