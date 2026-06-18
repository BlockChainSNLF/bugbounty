import { HunterWorkspace } from "../../components/hunter-workspace";

export default function HunterPage() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <p className="eyebrow">Hunter workspace</p>
        <h1>Reportar hallazgo</h1>
      </div>
      <HunterWorkspace />
    </section>
  );
}
