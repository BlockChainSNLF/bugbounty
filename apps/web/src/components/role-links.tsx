"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDisconnect } from "wagmi";

import { SESSION_EVENT, getStoredSession, refreshSessionAlias } from "../lib/session";
import { getWalletAccounts, promptAccountSelection, watchWalletAccounts } from "../lib/wallet";
import { explorerAddressUrl, shortHash } from "../lib/explorer";

const ROLE_LABELS: Record<string, string> = {
  company: "Company",
  hunter: "Hunter",
  arbitrator: "Arbitrator",
  admin: "Admin",
};

type SessionInfo = { role: string; address: string; alias: string | null };

function initialsFor(alias: string | null, address: string) {
  const base = (alias?.trim() || address.replace(/^0x/i, "")).slice(0, 2);
  return base.toUpperCase();
}

function AliasEditor({ current, onClose }: { current: string | null; onClose: () => void }) {
  const [value, setValue] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="account-edit-form">
      <span className="surface-kicker">Your alias</span>
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Acme Security"
        maxLength={40}
      />
      {error ? <p className="danger" style={{ margin: 0, fontSize: "12px" }}>{error}</p> : null}
      <div className="account-edit-actions">
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
              setError(caught instanceof Error ? caught.message : "Could not save alias");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="secondary" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function AccountSwitcher({ activeAddress }: { activeAddress: string }) {
  const [accounts, setAccounts] = useState<string[]>(() => getWalletAccounts());

  useEffect(() => {
    return watchWalletAccounts(setAccounts);
  }, []);

  const others = accounts.filter((entry) => entry !== activeAddress.toLowerCase());
  if (others.length === 0) {
    return null;
  }

  return (
    <div className="account-switch">
      <span className="surface-kicker">Connected · switch in MetaMask</span>
      {others.map((entry) => (
        <div className="account-switch-row" key={entry}>
          <span className="account-avatar">{initialsFor(null, entry)}</span>
          <span className="account-name">{shortHash(entry)}</span>
        </div>
      ))}
    </div>
  );
}

function AccountMenu({
  session,
  address,
  onDisconnect,
}: {
  session: SessionInfo | null;
  address: string;
  onDisconnect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const alias = session?.alias?.trim();
  const roleLabel = session ? ROLE_LABELS[session.role] ?? session.role : null;

  return (
    <div className="account-menu" onClick={(event) => event.stopPropagation()}>
      <div className="account-menu-head">
        <span className="account-avatar">{initialsFor(session?.alias ?? null, address)}</span>
        <div>
          <div className="account-menu-name">{alias || shortHash(address)}</div>
          <div className="account-menu-net"><span className="account-dot" />{roleLabel ? `${roleLabel} · Sepolia` : "Sepolia"}</div>
        </div>
        <button
          type="button"
          className="account-add-btn"
          title="Connect another account"
          onClick={() => void promptAccountSelection()}
        >
          +
        </button>
      </div>

      {editing ? (
        <AliasEditor current={session?.alias ?? null} onClose={() => setEditing(false)} />
      ) : (
        <>
          <div className="account-addr">
            <span className="mono">{shortHash(address)}</span>
            <button
              type="button"
              className="account-icon-btn"
              title="Copy address"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1400);
                } catch {
                  /* clipboard no disponible */
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <a
              className="account-icon-btn"
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              title="View on explorer"
            >
              View on explorer ↗
            </a>
          </div>

          <AccountSwitcher activeAddress={address} />

          <button type="button" className="account-menu-item" onClick={() => setEditing(true)}>
            Edit alias
          </button>
          <button type="button" className="account-menu-item account-menu-danger" onClick={onDisconnect}>
            Disconnect
          </button>
        </>
      )}
    </div>
  );
}

export function RoleLinks() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { disconnect } = useDisconnect();
  const router = useRouter();

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

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const close = () => setMenuOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuOpen]);

  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark">BB</span>
        <span>BugBounty <span style={{ color: "var(--accent)" }}>Grid</span></span>
      </Link>

      <div className="topbar-right">
        <ConnectButton.Custom>
          {({ account, chain, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            if (!connected) {
              return (
                <button type="button" className="connect-btn" onClick={openConnectModal}>
                  Connect wallet
                </button>
              );
            }
            if (chain.unsupported) {
              return (
                <button type="button" className="connect-btn connect-btn-warn" onClick={openChainModal}>
                  Wrong network
                </button>
              );
            }
            const alias = session?.alias?.trim();
            return (
              <div className="account-pill">
                <button
                  type="button"
                  className="account-main"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpen((value) => !value);
                  }}
                >
                  <span className="account-avatar">{initialsFor(session?.alias ?? null, account.address)}</span>
                  <span className="account-text">
                    <span className="account-name">{alias || shortHash(account.address)}</span>
                    <span className="account-meta">{shortHash(account.address)}</span>
                  </span>
                  <span className={`account-chevron${menuOpen ? " account-chevron-open" : ""}`} aria-hidden>▾</span>
                </button>
                {menuOpen ? (
                  <AccountMenu
                    session={session}
                    address={account.address}
                    onDisconnect={() => {
                      setMenuOpen(false);
                      disconnect();
                      router.push("/");
                    }}
                  />
                ) : null}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
