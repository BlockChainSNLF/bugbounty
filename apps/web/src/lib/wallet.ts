import { createPublicClient, createWalletClient, custom, type Abi } from "viem";

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

export async function writeContractAction(parameters: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  account: `0x${string}`;
}) {
  if (!window.ethereum) {
    throw new Error("No wallet provider found");
  }

  const walletClient = createWalletClient({
    account: parameters.account,
    transport: custom(window.ethereum),
  });

  return walletClient.writeContract({
    address: parameters.address,
    abi: parameters.abi,
    functionName: parameters.functionName,
    args: parameters.args,
    account: parameters.account,
    chain: undefined,
  });
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

  const walletClient = createWalletClient({
    account: parameters.account,
    transport: custom(window.ethereum),
  });

  return walletClient.deployContract({
    abi: parameters.abi,
    bytecode: parameters.bytecode,
    args: parameters.args,
    account: parameters.account,
    value: parameters.value,
    chain: undefined,
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
