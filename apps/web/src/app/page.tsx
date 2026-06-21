"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SESSION_EVENT, getStoredSession } from "../lib/session";

// Cada rol tiene su workspace; el hub es solo para usuarios sin sesión.
const ROLE_HOME: Record<string, string> = {
  hunter: "/hunter",
  company: "/company",
  arbitrator: "/arbitrator",
};

const STEPS = [
  {
    num: "01",
    title: "La empresa fondea",
    body: "Crea un programa y bloquea la recompensa en un smart contract con escrow. Nadie toca los fondos por fuera de las reglas.",
  },
  {
    num: "02",
    title: "El hunter reporta",
    body: "La evidencia queda privada off-chain y su hash se registra on-chain con timestamp. Prueba de autoría y de momento de envío.",
  },
  {
    num: "03",
    title: "Se resuelve solo",
    body: "Si la empresa acepta, el contrato paga automáticamente. Si rechaza, el hunter disputa y 3 árbitros deciden por mayoría.",
  },
];

const ROLES = [
  { href: "/company", title: "Empresa", desc: "Publicá programas, bloqueá recompensas y validá reportes." },
  { href: "/hunter", title: "Hunter", desc: "Encontrá programas abiertos, reportá hallazgos y cobrá sin confiar." },
  { href: "/arbitrator", title: "Árbitro", desc: "Resolvé disputas votando on-chain por mayoría." },
];

export default function HomePage() {
  const { openConnectModal } = useConnectModal();
  const router = useRouter();

  useEffect(() => {
    const redirectIfLoggedIn = () => {
      const session = getStoredSession();
      const dest = session ? ROLE_HOME[session.role] : null;
      if (dest) {
        router.replace(dest);
      }
    };
    redirectIfLoggedIn();
    window.addEventListener(SESSION_EVENT, redirectIfLoggedIn);
    window.addEventListener("storage", redirectIfLoggedIn);
    return () => {
      window.removeEventListener(SESSION_EVENT, redirectIfLoggedIn);
      window.removeEventListener("storage", redirectIfLoggedIn);
    };
  }, [router]);

  return (
    <div className="page-grid">
      <section className="command-strip">
        <div className="hero">
          <div className="hero-badge">
            <span className="hero-dot" />
            Divulgación con escrow on-chain
          </div>
          <h1>
            Reportá. Validá.
            <br />
            <span className="hero-grad">Cobrá sin confiar.</span>
          </h1>
          <p>
            La recompensa queda bloqueada en un contrato antes de que reportes. La autoría se prueba con un hash on-chain y,
            si hay conflicto, deciden árbitros independientes. Sin pagos demorados ni rechazos arbitrarios.
          </p>
          <div className="hero-cta">
            <button type="button" onClick={openConnectModal}>Conectar wallet</button>
            <a href="#como" className="secondary-link button-link">Cómo funciona</a>
          </div>
          <div className="hero-stats">
            <div>
              <div className="stat-value">Escrow</div>
              <div className="stat-label">recompensa bloqueada</div>
            </div>
            <div className="hero-divider" />
            <div>
              <div className="stat-value">Hash</div>
              <div className="stat-label">autoría verificable</div>
            </div>
            <div className="hero-divider" />
            <div>
              <div className="stat-value">3/3</div>
              <div className="stat-label">arbitraje on-chain</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="stack-row">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="avatar" style={{ width: 34, height: 34 }}>BB</span>
              <div>
                <div style={{ font: "600 14px var(--font-body)" }}>BugBounty Grid</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Escrow & arbitraje</div>
              </div>
            </div>
            <span className="pill pill-success">Escrow activo</span>
          </div>
          <div className="empty" style={{ marginTop: 18 }}>
            <div className="surface-kicker">Recompensa bloqueada</div>
            <div style={{ font: "700 34px var(--font-display)", color: "var(--ink)", marginTop: 6 }}>
              5.0 <span style={{ fontSize: 18, color: "var(--muted)" }}>ETH</span>
            </div>
          </div>
          <div className="grid" style={{ marginTop: 16, gap: 9 }}>
            <div className="list-row"><span style={{ color: "var(--ink)" }}>Reporte registrado on-chain</span><span className="pill pill-success">ok</span></div>
            <div className="list-row"><span style={{ color: "var(--ink)" }}>Validado por la empresa</span><span className="pill pill-success">ok</span></div>
            <div className="list-row" style={{ borderColor: "var(--border-strong)" }}><span style={{ color: "var(--ink)" }}>Liberado al hunter</span><span className="pill pill-info">pago</span></div>
          </div>
        </div>
      </section>

      <section id="como">
        <div className="section-kicker">Cómo funciona</div>
        <div className="steps">
          {STEPS.map((step) => (
            <div className="step" key={step.num}>
              <div className="step-num">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-kicker">Entrá según tu rol</div>
        <div className="surface-grid">
          {ROLES.map((role) => (
            <Link key={role.href} href={role.href} className="surface-card">
              <h2>{role.title}</h2>
              <p>{role.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
