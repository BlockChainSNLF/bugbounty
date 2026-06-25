"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

import { CHAIN_ID } from "../lib/wagmi";
import { clearStoredSession, ensureWalletSession, getStoredSession } from "../lib/session";
import { useToast } from "./toast";
import { walletErrorMessage } from "../lib/wallet";

const ROLE_HOME: Record<string, string> = {
  hunter: "/hunter",
  company: "/company",
  arbitrator: "/arbitrator",
};

const PROTECTED_PATHS = ["/hunter", "/company", "/arbitrator"];

export function WalletSessionSync() {
  const { address, chainId, isConnected, status } = useAccount();
  const router = useRouter();
  const pathname = usePathname();
  const lastLoggedIn = useRef<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") {
      return;
    }
    if (!isConnected || !address) {
      lastLoggedIn.current = null;
      clearStoredSession();
      if (PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
        router.replace("/");
      }
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
    // Only redirect to role home on a fresh login (no prior session for this address).
    // If the user already had a session they're navigating intentionally — keep them where they are.
    const alreadyHadSession = stored?.address.toLowerCase() === normalized;
    void ensureWalletSession()
      .then((session) => {
        if (session.role === "admin") {
          const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
          if (adminUrl) {
            window.location.href = adminUrl;
            return;
          }
        }
        if (!alreadyHadSession) {
          router.replace(ROLE_HOME[session.role] ?? "/");
        }
      })
      .catch((caught) => {
        lastLoggedIn.current = null;
        toast.showError(walletErrorMessage(caught, "Login failed. Connect again to continue."));
      });
  }, [address, chainId, isConnected, status, router, pathname, toast]);

  return null;
}
