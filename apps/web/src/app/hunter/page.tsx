import { CreateReportForm } from "../../components/forms";

export default function HunterPage() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <p className="eyebrow">Hunter workspace</p>
        <h1>Reportar hallazgo</h1>
      </div>
      <div className="workspace-grid">
        <div className="panel panel-wide"><CreateReportForm /></div>
        <div className="status-rail">
          <div><span>Evidencia</span><strong>Privada</strong></div>
          <div><span>Autoría</span><strong>Hash verificable</strong></div>
          <div><span>Rechazo</span><strong>Disputa disponible</strong></div>
        </div>
      </div>
    </section>
  );
}
