import { ArbitratorPanel } from "../../components/arbitrator-panel";

export default function ArbitratorPage() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <p className="eyebrow">Arbitrator workspace</p>
        <h1>Disputas asignadas</h1>
      </div>
      <ArbitratorPanel />
    </section>
  );
}
