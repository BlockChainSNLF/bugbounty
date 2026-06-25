import {
  deployContract,
  getAccount,
  signMessage as wagmiSignMessage,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
  watchAccount,
  writeContract,
} from "@wagmi/core";
import type { Abi } from "viem";
import { sepolia } from "wagmi/chains";

import { wagmiConfig } from "./wagmi";

export function getActiveWalletAccount() {
  return getAccount(wagmiConfig).address?.toLowerCase() ?? null;
}

/**
 * Traduce los errores de wallet/viem a un mensaje corto y legible.
 * Los errores crudos de viem traen el dump completo de la transacción (value,
 * data hex de cientos de chars, etc.); mostrarlos tal cual desbordaba la UI.
 */
export function walletErrorMessage(caught: unknown, fallback: string): string {
  const raw = caught instanceof Error ? caught.message : "";
  const text = raw.toLowerCase();
  if (
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("rejected the request")
  ) {
    return "You cancelled the wallet operation.";
  }
  if (text.includes("insufficient funds")) {
    return "Insufficient wallet funds to cover the reward and gas.";
  }
  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  const reasonIndex = lines.findIndex((line) => /reverted with the following reason:?$/i.test(line));
  if (reasonIndex !== -1 && lines[reasonIndex + 1]) {
    return lines[reasonIndex + 1];
  }
  const revertedLine = lines.find((line) => /reverted/i.test(line));
  return revertedLine || lines[0] || fallback;
}

type EthereumProvider = { request(args: { method: string; params?: unknown[] | object }): Promise<unknown> };

/** Direcciones ya autorizadas en el provider al que wagmi está conectado. */
export function getWalletAccounts(): string[] {
  return (getAccount(wagmiConfig).addresses ?? []).map((entry) => entry.toLowerCase());
}

/** Suscribe a cambios de cuentas autorizadas; devuelve unsubscribe. */
export function watchWalletAccounts(onChange: (accounts: string[]) => void): () => void {
  return watchAccount(wagmiConfig, {
    onChange(acc) {
      onChange((acc.addresses ?? []).map((a) => a.toLowerCase()));
    },
  });
}

/**
 * Conecta una cuenta más al dapp (popup de MetaMask, una sola vez por cuenta).
 * Para ALTERNAR entre cuentas ya conectadas no hace falta esto: se cambia en MetaMask
 * y wagmi lo toma vía accountsChanged, sin popup.
 */
export async function promptAccountSelection(): Promise<void> {
  const provider = (await getAccount(wagmiConfig).connector?.getProvider()) as EthereumProvider | undefined;
  if (!provider) {
    return;
  }
  await provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
}

export function isWalletConnected() {
  return getAccount(wagmiConfig).isConnected;
}

export async function signMessage(address: string, message: string) {
  return wagmiSignMessage(wagmiConfig, {
    account: address as `0x${string}`,
    message,
  });
}

export async function writeContractAction(parameters: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  account: `0x${string}`;
}) {
  return writeContract(wagmiConfig, {
    address: parameters.address,
    abi: parameters.abi,
    functionName: parameters.functionName,
    args: parameters.args,
    account: parameters.account,
    chainId: sepolia.id,
  });
}

export async function deployContractAction(parameters: {
  abi: Abi;
  bytecode: `0x${string}`;
  args: readonly unknown[];
  account: `0x${string}`;
  value?: bigint;
}) {
  return deployContract(wagmiConfig, {
    abi: parameters.abi,
    bytecode: parameters.bytecode,
    args: parameters.args,
    account: parameters.account,
    value: parameters.value,
    chainId: sepolia.id,
  });
}

export async function waitForTransactionReceipt(hash: `0x${string}`) {
  return wagmiWaitForTransactionReceipt(wagmiConfig, { hash, chainId: sepolia.id });
}
