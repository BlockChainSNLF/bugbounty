declare global {
  interface Window {
    ethereum?: {
      request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
    };
  }
}

export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  const address = (accounts as string[])[0];
  if (!address) {
    throw new Error("Wallet did not return an account");
  }
  return address.toLowerCase();
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
