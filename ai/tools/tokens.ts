import { tool as createTool } from "ai";
import { z } from "zod";
import { publicClient } from "@/wagmi.config";
import { erc20Abi, formatUnits } from "viem";

export const getTokenBalanceTool = createTool({
  description: "Get ERC-20 token balance for user's wallet",
  parameters: z.object({
    address: z.string().describe("User's wallet address"),
    tokenAddress: z.string().describe("ERC-20 token contract address"),
    tokenSymbol: z.string().optional().describe("Token symbol (e.g., USDC)"),
  }),
  execute: async ({ address, tokenAddress, tokenSymbol }) => {
    try {
      const [balance, decimals, symbol] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
      ]);

      return {
        balance: formatUnits(balance as bigint, decimals as number),
        symbol: symbol as string,
        tokenAddress,
        decimals: decimals as number,
      };
    } catch (error) {
      console.error('Token balance error:', error);
      return {
        balance: '0',
        symbol: tokenSymbol || 'UNKNOWN',
        tokenAddress,
        error: 'Failed to fetch token balance. Please verify the token address.',
      };
    }
  },
});

export const sendTokenTool = createTool({
  description: "Prepare ERC-20 token transfer (user must confirm)",
  parameters: z.object({
    tokenAddress: z.string().describe("ERC-20 token contract address"),
    to: z.string().describe("Recipient wallet address"),
    amount: z.string().describe("Amount of tokens to send"),
    decimals: z.number().optional().default(18).describe("Token decimals"),
  }),
  execute: async ({ tokenAddress, to, amount, decimals }) => {
    return {
      type: 'erc20-transfer',
      tokenAddress,
      to,
      amount,
      decimals,
    };
  },
});

