"use client";

import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { SESSION_EVENT, getStoredSession } from "../lib/session";

const ROLE_HOME: Record<string, string> = {
  hunter: "/hunter",
  company: "/company",
  arbitrator: "/arbitrator",
};

const STEPS = [
  {
    num: "01",
    title: "Company funds the bounty",
    body: "Create a bounty and lock the reward in a smart contract escrow. Funds only move according to the rules — no exceptions.",
  },
  {
    num: "02",
    title: "Hunter submits a report",
    body: "Evidence stays private off-chain; its hash is recorded on-chain with a timestamp. Proof of authorship and time of submission.",
  },
  {
    num: "03",
    title: "Resolved automatically",
    body: "If the company accepts, the contract pays out automatically. If rejected, the hunter can dispute and 3 arbitrators decide by majority.",
  },
];

const ROLES = [
  { href: "/company", title: "Company", desc: "Publish bounties, lock rewards, and validate reports." },
  { href: "/hunter", title: "Hunter", desc: "Find open bounties, report findings, and get paid trustlessly." },
  { href: "/arbitrator", title: "Arbitrator", desc: "Resolve disputes by voting on-chain by majority." },
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
            On-chain escrow disclosure
          </div>
          <h1>
            Report. Validate.
            <br />
            <span className="hero-grad">Get paid trustlessly.</span>
          </h1>
          <p>
            The reward is locked in a contract before you report. Authorship is proven with an on-chain hash, and if
            there&apos;s a dispute, independent arbitrators decide. No delayed payments, no arbitrary rejections.
          </p>
          <div className="hero-cta">
            <button type="button" onClick={openConnectModal}>Connect wallet</button>
          </div>
          <div className="hero-stats">
            <div>
              <div className="stat-value">Escrow</div>
              <div className="stat-label">reward locked</div>
            </div>
            <div className="hero-divider" />
            <div>
              <div className="stat-value">Hash</div>
              <div className="stat-label">verifiable authorship</div>
            </div>
            <div className="hero-divider" />
            <div>
              <div className="stat-value">3/3</div>
              <div className="stat-label">on-chain arbitration</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="stack-row">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="avatar" style={{ width: 34, height: 34 }}>BB</span>
              <div>
                <div style={{ font: "600 14px var(--font-body)" }}>BugBounty Grid</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>Escrow & arbitration</div>
              </div>
            </div>
            <span className="pill pill-success">Escrow active</span>
          </div>
          <div className="empty" style={{ marginTop: 18 }}>
            <div className="surface-kicker">Reward locked</div>
            <div style={{ font: "700 34px var(--font-display)", color: "var(--ink)", marginTop: 6 }}>
              5.0 <span style={{ fontSize: 18, color: "var(--muted)" }}>ETH</span>
            </div>
          </div>
          <div className="grid" style={{ marginTop: 16, gap: 9 }}>
            <div className="list-row"><span style={{ color: "var(--ink)" }}>Report registered on-chain</span><span className="pill pill-success">ok</span></div>
            <div className="list-row"><span style={{ color: "var(--ink)" }}>Validated by company</span><span className="pill pill-success">ok</span></div>
            <div className="list-row" style={{ borderColor: "var(--border-strong)" }}><span style={{ color: "var(--ink)" }}>Released to hunter</span><span className="pill pill-info">paid</span></div>
          </div>
        </div>
      </section>

      <section id="how-it-works">
        <div className="section-kicker">How it works</div>
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
        <div className="section-kicker">Enter by role</div>
        <div className="surface-grid">
          {ROLES.map((role) => (
            <div key={role.title} className="surface-card">
              <h2>{role.title}</h2>
              <p>{role.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
