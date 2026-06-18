"use client";

import { CompanyBountiesPanel, RegisterBountyForm } from "./forms";

export function CompanyWorkspace() {
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
