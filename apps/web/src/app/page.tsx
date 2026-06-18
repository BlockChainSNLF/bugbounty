import Link from "next/link";

import { SessionPanel } from "../components/session-panel";

export default function HomePage() {
  return (
    <div className="page-grid">
      <section className="command-strip">
        <div>
          <p className="eyebrow">Secure disclosure network</p>
          <h1>BugBounty Grid</h1>
        </div>
        <SessionPanel />
      </section>

      <section className="surface-grid">
        <div className="surface-card user-surface">
          <span className="surface-kicker">Participant workspace</span>
          <h2>Usuarios externos</h2>
          <div className="role-grid">
            <Link href="/company">Empresa</Link>
            <Link href="/hunter">Hunter</Link>
            <Link href="/arbitrator">Árbitro</Link>
          </div>
        </div>
        <div className="surface-card">
          <span className="surface-kicker">Disclosure flow</span>
          <h2>Reportes, escrow y arbitraje</h2>
          <p>Programas con recompensa bloqueada, reportes privados y resolución verificable cuando aparece un conflicto.</p>
        </div>
      </section>
    </div>
  );
}
