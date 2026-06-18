"use client";

import { useEffect, useState } from "react";

import { SESSION_EVENT, getStoredSession } from "../lib/session";

export function UserSessionPill() {
  const [session, setSession] = useState<{ address: string; role: string } | null>(null);

  useEffect(() => {
    const updateSession = () => {
      const stored = getStoredSession();
      setSession(stored ? { address: stored.address, role: stored.role } : null);
    };

    updateSession();
    window.addEventListener("storage", updateSession);
    window.addEventListener(SESSION_EVENT, updateSession);
    return () => {
      window.removeEventListener("storage", updateSession);
      window.removeEventListener(SESSION_EVENT, updateSession);
    };
  }, []);

  if (!session) {
    return <div className="session-pill session-pill-muted">Sin sesión activa</div>;
  }

  return (
    <div className="session-pill">
      <span className="session-role">{session.role}</span>
      <span className="mono">{session.address}</span>
    </div>
  );
}
