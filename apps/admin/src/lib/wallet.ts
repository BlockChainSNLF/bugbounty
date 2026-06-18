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
      throw new Error(`MetaMask sigue activa en ${activeAddress}. Cambiá la cuenta activa en MetaMask y volvé a intentar.`);
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
