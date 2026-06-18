import "./globals.css";

import type { ReactNode } from "react";

import { ChainGuard } from "../components/chain-guard";
import { RoleLinks } from "../components/role-links";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main>
          <RoleLinks />
          <ChainGuard />
          {children}
        </main>
      </body>
    </html>
  );
}
