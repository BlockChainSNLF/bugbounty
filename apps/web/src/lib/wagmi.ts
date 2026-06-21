import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

// Solo wallet inyectada (MetaMask/Brave) sobre Sepolia. No usamos WalletConnect:
// así no dependemos de un projectId de WalletConnect Cloud y evitamos el preload
// del modal de WalletConnect, que crasheaba con projectId inválido
// (getRecomendedWallets → Object.values(undefined)) y además metía ruido de
// indexedDB/pino-pretty en el SSR.
const connectors = connectorsForWallets(
  [{ groupName: "Wallets", wallets: [injectedWallet] }],
  { appName: "BugBounty Grid", projectId: "bugbounty-grid" },
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
  },
  ssr: true,
});
