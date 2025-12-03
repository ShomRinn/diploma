import { tool as createTool } from "ai";
import { z } from "zod";
import { publicClient } from "@/wagmi.config";
import { formatEther } from "viem";
import { formatTransaction, retryFetch } from "../utils/helpers";

export const sendTransactionTool = createTool({
  description:
    "You're going to provide a button that will initiate a transaction to the wallet address the user provided, you are not going to send the transaction",
  parameters: z.object({
    to: z.string().describe("The wallet address of the user"),
    amount: z.string().describe("The amount of eth the transaction"),
  }),
  execute: async ({ to, amount }) => {
    return { to, amount };
  },
});

export const getTransactionHistoryTool = createTool({
  description: "Get transaction history for the user's wallet address",
  parameters: z.object({
    address: z.string().describe("User's wallet address"),
    limit: z.number().optional().default(10).describe("Number of transactions to fetch"),
  }),
  execute: async ({ address, limit }) => {
    try {
      const apiKey = process.env.ETHERSCAN_API_KEY || '';
      
      // Use Linea Sepolia API
      const response = await retryFetch(() =>
        fetch(
          `https://api-sepolia.lineascan.build/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=${limit}&sort=desc&apikey=${apiKey}`
        ).then(res => res.json())
      );

      if (response.status === '1' && response.result) {
        const transactions = response.result.slice(0, limit).map(formatTransaction);
        return { 
          transactions,
          count: transactions.length,
          address 
        };
      }

      return { 
        transactions: [], 
        count: 0,
        address,
        message: 'No transactions found or API error' 
      };
    } catch (error) {
      console.error('Transaction history error:', error);
      return { 
        transactions: [], 
        count: 0,
        address,
        error: 'Failed to fetch transaction history' 
      };
    }
  },
});

export const getTransactionStatusTool = createTool({
  description: "Get transaction status and details by hash",
  parameters: z.object({
    hash: z.string().describe("Transaction hash"),
  }),
  execute: async ({ hash }) => {
    try {
      const [tx, receipt] = await Promise.all([
        publicClient.getTransaction({ hash: hash as `0x${string}` }),
        publicClient.getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => null),
      ]);

      if (!receipt) {
        return {
          status: 'pending',
          from: tx.from,
          to: tx.to,
          value: formatEther(tx.value),
          hash,
        };
      }

      return {
        status: receipt.status === 'success' ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        from: tx.from,
        to: tx.to,
        value: formatEther(tx.value),
        hash,
      };
    } catch (error) {
      console.error('Transaction status error:', error);
      return {
        status: 'error',
        hash,
        error: 'Failed to fetch transaction status',
      };
    }
  },
});

