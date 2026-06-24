"use client";

import { useState } from "react";

import { CreateReportForm, HunterReportsPanel } from "./forms";

export function HunterWorkspace() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="workspace-grid">
        <div className="panel panel-wide"><CreateReportForm onSubmitted={() => { setRefreshKey((current) => current + 1); }} /></div>
        <div className="status-rail">
          <div><span>Evidencia</span><strong>Privada</strong></div>
          <div><span>Autoría</span><strong>Hash verificable</strong></div>
          <div><span>Rechazo</span><strong>Disputa disponible</strong></div>
        </div>
      </div>
      <HunterReportsPanel refreshKey={refreshKey} />
    </>
  );
}
