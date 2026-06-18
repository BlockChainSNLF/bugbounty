export type Role = "admin" | "company" | "hunter" | "arbitrator";

export type WalletSession = {
  token: string;
  address: string;
  role: Role;
  companyApproved: boolean;
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
