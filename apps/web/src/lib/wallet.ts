import { createPublicClient, createWalletClient, custom, defineChain, encodeFunctionData, type Abi } from "viem";

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
  const signature = await window.ethereum.request({
    method: "personal_sign",
    params: [message, address],
  });
  return signature as `0x${string}`;
}

export async function getConnectedChainId() {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  return Number(chainId);
}

export async function switchToChain(chainId: number) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${chainId.toString(16)}` }],
  });
}

async function getConnectedChain() {
  const chainId = await getConnectedChainId();
  return defineChain({
    id: chainId,
    name: `Connected chain ${chainId}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [],
      },
    },
  });
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

  const buildTransaction = (includeGas: boolean) => ({
    from: parameters.account,
    to: parameters.address,
    data,
    ...(includeGas && parameters.gas ? { gas: `0x${parameters.gas.toString(16)}` } : {}),
  });

  let hash: unknown;
  try {
    hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [buildTransaction(true)],
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : String(caught);
    if (!parameters.gas || !message.toLowerCase().includes("gas limit too high")) {
      throw caught;
    }

    hash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [buildTransaction(false)],
    });
  }

  return hash as `0x${string}`;
}

export async function deployContractAction(parameters: {
  abi: Abi;
  bytecode: `0x${string}`;
  args: readonly unknown[];
  account: `0x${string}`;
  value?: bigint;
}) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const chain = await getConnectedChain();

  const walletClient = createWalletClient({
    account: parameters.account,
    chain,
    transport: custom(window.ethereum),
  });

  return walletClient.deployContract({
    abi: parameters.abi,
    bytecode: parameters.bytecode,
    args: parameters.args,
    account: parameters.account,
    value: parameters.value,
    chain,
  });
}

export async function waitForTransactionReceipt(hash: `0x${string}`) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const publicClient = createPublicClient({
    transport: custom(window.ethereum),
  });

  return publicClient.waitForTransactionReceipt({ hash });
}
