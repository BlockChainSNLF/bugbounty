"use client";

import { CreateReportForm, HunterReportsPanel } from "./forms";

export function HunterWorkspace() {
  return (
    <>
      <div className="workspace-grid">
        <div className="panel panel-wide"><CreateReportForm /></div>
        <div className="status-rail">
          <div><span>Evidencia</span><strong>Privada</strong></div>
          <div><span>Autoría</span><strong>Hash verificable</strong></div>
          <div><span>Rechazo</span><strong>Disputa disponible</strong></div>
        </div>
      </div>
      <HunterReportsPanel />
    </>
  );
}
