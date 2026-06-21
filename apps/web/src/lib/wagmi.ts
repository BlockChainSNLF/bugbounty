import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

// WalletConnect projectId is required by RainbowKit's getDefaultConfig. Injected
// wallets (MetaMask) work without a real one; set NEXT_PUBLIC_WC_PROJECT_ID to a
// free WalletConnect Cloud id to enable WalletConnect/mobile wallets.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "bugbounty-grid-local";

export const wagmiConfig = getDefaultConfig({
  appName: "BugBounty Grid",
  projectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
  },
  ssr: true,
});
