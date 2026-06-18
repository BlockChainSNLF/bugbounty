import { ArbitratorWorkspace } from "../../components/arbitrator-workspace";

export default function ArbitratorPage() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <p className="eyebrow">Arbitrator workspace</p>
        <h1>Disputas asignadas</h1>
      </div>
      <ArbitratorWorkspace />
    </section>
  );
}
