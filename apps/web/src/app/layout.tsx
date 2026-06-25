import "./globals.css";

import type { ReactNode } from "react";

import { Providers } from "./providers";
import { RoleLinks } from "../components/role-links";
import { ToastProvider } from "../components/toast";
import { WalletSessionSync } from "../components/wallet-session-sync";

export const metadata = {
  title: "BugBounty Grid",
  description: "On-chain escrow vulnerability disclosure with verifiable arbitration.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ToastProvider>
            <WalletSessionSync />
            <main>
              <RoleLinks />
              {children}
            </main>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
