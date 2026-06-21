"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

import { CHAIN_ID } from "../lib/wagmi";
import { clearStoredSession, ensureWalletSession, getStoredSession } from "../lib/session";

/**
 * Keeps the backend session aligned with the wallet connected through wagmi.
 * On connect (correct chain) it establishes a backend session once (SIWE-style
 * signature). On disconnect or account switch it clears the stale session.
 */
export function WalletSessionSync() {
  const { address, chainId, isConnected, status } = useAccount();
  const lastLoggedIn = useRef<string | null>(null);

  useEffect(() => {
    // Mientras wagmi restaura la conexión previa al montar, isConnected es
    // brevemente false. No borres la sesión en esa ventana transitoria, o una
    // simple recarga deslogueaería al usuario.
    if (status === "connecting" || status === "reconnecting") {
      return;
    }
    if (!isConnected || !address) {
      lastLoggedIn.current = null;
      clearStoredSession();
      return;
    }

    const normalized = address.toLowerCase();
    const stored = getStoredSession();
    if (stored && stored.address.toLowerCase() !== normalized) {
      clearStoredSession();
    }

    if (chainId !== CHAIN_ID) {
      return;
    }

    if (lastLoggedIn.current === normalized) {
      return;
    }
    lastLoggedIn.current = normalized;
    void ensureWalletSession().catch(() => {
      // User may reject the signature; protected actions will prompt again.
      lastLoggedIn.current = null;
    });
  }, [address, chainId, isConnected, status]);

  return null;
}
