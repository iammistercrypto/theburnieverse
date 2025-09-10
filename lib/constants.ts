import { ethers } from "ethers";

// Base mainnet
export const BASE_CHAIN_ID = 8453;

export const BURN_ADDRESS = ethers.getAddress(
  "0x191e37fc681b257a9e5c8edd1dba2bd84ea3fe16"
) as `0x${string}`;

export const VOTE_ABI = [
  "function vote(uint256 proposalId) external",
  "function getVote(uint256 proposalId) external view returns (uint256)",
  "function hasVoted(uint256 proposalId, address account) external view returns (bool)",
] as const;

// Default voting contract (update to your deployed address)
const VOTING_ADDRESS_DEFAULT =
  "0x6246729AE7Bee7ECE9C3A4F77a4D5e2958fdc733";

export const VOTING_ADDRESS = ((): `0x${string}` => {
  try {
    return ethers.getAddress(VOTING_ADDRESS_DEFAULT) as `0x${string}`;
  } catch {
    return "0x0000000000000000000000000000000000000000";
  }
})();
