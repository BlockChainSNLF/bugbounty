import "./globals.css";

import type { ReactNode } from "react";

import { Providers } from "./providers";
import { RoleLinks } from "../components/role-links";
import { ToastProvider } from "../components/toast";
import { WalletSessionSync } from "../components/wallet-session-sync";

export const metadata = {
  title: "BugBounty Grid",
  description: "Divulgación de vulnerabilidades con escrow on-chain y arbitraje verificable.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
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
