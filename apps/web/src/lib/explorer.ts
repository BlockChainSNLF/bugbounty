import { CHAIN_ID } from "./wagmi";

const EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  11155111: "https://sepolia.etherscan.io",
  5: "https://goerli.etherscan.io",
  137: "https://polygonscan.com",
};

export function explorerBase(chainId: number = CHAIN_ID) {
  return EXPLORERS[chainId] ?? EXPLORERS[11155111];
}

export function explorerTxUrl(hash: string, chainId: number = CHAIN_ID) {
  return `${explorerBase(chainId)}/tx/${hash}`;
}

export function explorerAddressUrl(address: string, chainId: number = CHAIN_ID) {
  return `${explorerBase(chainId)}/address/${address}`;
}

export function shortHash(value: string) {
  if (!value) {
    return "";
  }
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}
