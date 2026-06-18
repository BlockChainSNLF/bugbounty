import { CompanyWorkspace } from "../../components/company-workspace";

export default function CompanyPage() {
  return (
    <section className="workspace-layout">
      <div className="page-heading">
        <p className="eyebrow">Company workspace</p>
        <h1>Programas y recompensas</h1>
      </div>
      <CompanyWorkspace />
    </section>
  );
}
