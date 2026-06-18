import Link from "next/link";

import { UserSessionPill } from "./user-session-pill";

export function RoleLinks() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">BB</span>
        <span>BugBounty Grid</span>
      </Link>
      <div className="topbar-right">
        <nav className="nav" aria-label="Navegacion principal">
          <Link className="nav-link" href="/">Hub</Link>
          <Link className="nav-link" href="/company">Empresa</Link>
          <Link className="nav-link" href="/hunter">Hunter</Link>
          <Link className="nav-link" href="/arbitrator">Árbitro</Link>
        </nav>
        <UserSessionPill />
      </div>
    </header>
  );
}
