import {
  deployContract,
  getAccount,
  signMessage as wagmiSignMessage,
  waitForTransactionReceipt as wagmiWaitForTransactionReceipt,
  writeContract,
} from "@wagmi/core";
import type { Abi } from "viem";
import { sepolia } from "wagmi/chains";

import { wagmiConfig } from "./wagmi";

export function getActiveWalletAccount() {
  return getAccount(wagmiConfig).address?.toLowerCase() ?? null;
}

type EthereumProvider = { request(args: { method: string; params?: unknown[] | object }): Promise<unknown> };

/** Direcciones ya autorizadas en el provider al que wagmi está conectado. */
export function getWalletAccounts(): string[] {
  return (getAccount(wagmiConfig).addresses ?? []).map((entry) => entry.toLowerCase());
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
