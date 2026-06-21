export type Role = "admin" | "company" | "hunter" | "arbitrator";

export type WalletSession = {
  token: string;
  address: string;
  role: Role;
  /** Superusuario (ADMIN_WALLET). Independiente del rol real; solo lo usa la consola admin. */
  isAdmin: boolean;
  companyApproved: boolean;
  alias: string | null;
};

export type BountyRecord = {
  address: string;
  title: string;
  description: string;
  rewardWei: string;
  chainId: number;
  companyAddress: string;
};

export type ReportRecord = {
  id: string;
  bountyAddress: string;
  authorAddress: string;
  reportHash: string;
  reportIdOnChain: number | null;
  status: string;
};
