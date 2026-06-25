import { encodeFunctionData, type Abi } from "viem";

declare global {
  interface Window {
    ethereum?: {
      selectedAddress?: string | null;
      on?(event: string, listener: (...args: unknown[]) => void): void;
      removeListener?(event: string, listener: (...args: unknown[]) => void): void;
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

function normalizeAccounts(accounts: unknown) {
  return (accounts as string[]).map((entry) => entry.toLowerCase());
}

function getErrorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : String(caught);
}

function normalizeHexQuantity(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    return null;
  }
  return BigInt(value);
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  return connectPreferredWallet();
}

export async function getWalletAccounts() {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return normalizeAccounts(accounts);
}

export async function requestWalletAccounts() {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return normalizeAccounts(accounts);
}

export async function getActiveWalletAccount() {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const selectedAddress = window.ethereum.selectedAddress?.toLowerCase();
  if (selectedAddress) {
    return selectedAddress;
  }

  const accounts = await getWalletAccounts();
  return accounts[0] ?? null;
}

export async function connectPreferredWallet(preferredAddress?: string) {
  await requestWalletAccounts();
  const activeAddress = await getActiveWalletAccount();
  if (!activeAddress) {
    throw new Error("Wallet did not return an account");
  }

  if (preferredAddress) {
    const normalizedPreferred = preferredAddress.toLowerCase();
    if (activeAddress !== normalizedPreferred) {
      throw new Error(`MetaMask is still active on ${activeAddress}. Switch the active account in MetaMask and try again.`);
    }
    return normalizedPreferred;
  }

  return activeAddress;
}

export async function signMessage(address: string, message: string) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  return window.ethereum.request({
    method: "personal_sign",
    params: [message, address],
  }) as Promise<`0x${string}`>;
}

export async function writeContractAction(parameters: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  account: `0x${string}`;
  gas?: bigint;
}) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const data = encodeFunctionData({
    abi: parameters.abi,
    functionName: parameters.functionName,
    args: parameters.args,
  });

  const baseTransaction = {
    from: parameters.account,
    to: parameters.address,
    data,
  };

  let estimatedGas: bigint | null = null;
  try {
    estimatedGas = normalizeHexQuantity(await window.ethereum.request({
      method: "eth_estimateGas",
      params: [baseTransaction],
    }));
  } catch {
    estimatedGas = null;
  }

  const bufferedEstimatedGas = estimatedGas ? (estimatedGas * 12n) / 10n : null;
  const requestedGas = parameters.gas ?? null;
  const gas = requestedGas && bufferedEstimatedGas
    ? requestedGas > bufferedEstimatedGas ? requestedGas : bufferedEstimatedGas
    : requestedGas ?? bufferedEstimatedGas;

  const buildTransaction = (includeGas: boolean) => ({
    ...baseTransaction,
    ...(includeGas && gas ? { gas: `0x${gas.toString(16)}` } : {}),
  });

  let hash: unknown;
  try {
    hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [buildTransaction(Boolean(gas))],
    });
  } catch (caught) {
    const message = getErrorMessage(caught).toLowerCase();
    if (
      !gas ||
      (!message.includes("gas limit too high") &&
        !message.includes("intrinsic gas too low") &&
        !message.includes("out of gas"))
    ) {
      throw caught;
    }

    hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [buildTransaction(false)],
    });
  }

  return hash as `0x${string}`;
}

export async function waitForTransactionReceipt(
  hash: `0x${string}`,
  { timeoutMs = 180_000, intervalMs = 2_000 } = {},
) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }

  // Polleamos el receipt directamente contra MetaMask. El block-watcher de viem
  // sobre el provider inyectado se quedaba colgado esperando confirmación, lo que
  // dejaba el refresco de la UI sin ejecutarse (cambio "fantasma" hasta recargar).
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const receipt = (await window.ethereum.request({
      method: "eth_getTransactionReceipt",
      params: [hash],
    })) as { blockNumber?: string | null; status?: string } | null;

    if (receipt && receipt.blockNumber) {
      if (receipt.status && BigInt(receipt.status) === 0n) {
        throw new Error("The transaction was reverted on-chain.");
      }
      return receipt;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Transaction not confirmed in time. If MetaMask confirmed it, reload the page.");
}
