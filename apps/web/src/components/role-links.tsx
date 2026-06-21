"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { SESSION_EVENT, getStoredSession, refreshSessionAlias } from "../lib/session";
import { shortHash } from "../lib/explorer";

const ROLE_LABELS: Record<string, string> = {
  company: "Empresa",
  hunter: "Hunter",
  arbitrator: "Árbitro",
  admin: "Admin",
};

const NAV = [
  { href: "/", label: "Hub" },
  { href: "/company", label: "Empresa" },
  { href: "/hunter", label: "Hunter" },
  { href: "/arbitrator", label: "Árbitro" },
];

function AliasEditor({ current, onClose }: { current: string | null; onClose: () => void }) {
  const [value, setValue] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="alias-pop" onClick={(event) => event.stopPropagation()}>
      <span className="surface-kicker">Tu alias</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Acme Security"
        maxLength={40}
      />
      {error ? <p className="danger" style={{ margin: 0, fontSize: "12px" }}>{error}</p> : null}
      <div className="alias-pop-actions">
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);
              setError(null);
              await refreshSessionAlias(value.trim() || null);
              onClose();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : "No pudimos guardar el alias");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

export function RoleLinks() {
  const pathname = usePathname();
  const [session, setSession] = useState<{ role: string; address: string; alias: string | null } | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const update = () => {
      const stored = getStoredSession();
      setSession(stored ? { role: stored.role, address: stored.address, alias: stored.alias } : null);
    };
    update();
    window.addEventListener(SESSION_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(SESSION_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">BB</span>
        <span>BugBounty <span style={{ color: "var(--accent)" }}>Grid</span></span>
      </Link>

      <nav className="nav" aria-label="Navegación principal">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link key={item.href} className={`nav-link${active ? " nav-link-active" : ""}`} href={item.href}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="topbar-right">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            if (!connected) {
              return (
                <button type="button" className="connect-btn" onClick={openConnectModal}>
                  Conectar wallet
                </button>
              );
            }
            if (chain.unsupported) {
              return (
                <button type="button" className="connect-btn connect-btn-warn" onClick={openChainModal}>
                  Red incorrecta
                </button>
              );
            }
            const alias = session?.alias?.trim();
            return (
              <div className="account-cluster">
                <div className="account-pill" style={{ position: "relative" }}>
                  <button type="button" className="account-main" onClick={openAccountModal}>
                    <span className="account-dot" />
                    <span className="account-text">
                      <span className="account-name">{alias || shortHash(account.address)}</span>
                      <span className="account-meta">
                        {session ? ROLE_LABELS[session.role] ?? session.role : "—"} · {account.displayBalance ?? shortHash(account.address)}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="account-edit"
                    title="Editar alias"
                    onClick={() => setEditing((value) => !value)}
                  >
                    ✎
                  </button>
                  {editing ? (
                    <AliasEditor current={session?.alias ?? null} onClose={() => setEditing(false)} />
                  ) : null}
                </div>
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
