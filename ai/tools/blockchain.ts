import { tool as createTool } from "ai";
import { z } from "zod";
import { publicClient } from "@/wagmi.config";
import { formatGwei } from "viem";

export const getBlockInfoTool = createTool({
  description: "Get information about the latest or specific block",
  parameters: z.object({
    blockNumber: z.number().optional().describe("Specific block number, or latest if not provided"),
  }),
  execute: async ({ blockNumber }) => {
    try {
      const block = await publicClient.getBlock({
        blockNumber: blockNumber ? BigInt(blockNumber) : undefined,
        blockTag: blockNumber ? undefined : 'latest',
      });

      return {
        number: block.number.toString(),
        timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
        transactions: block.transactions.length,
        gasUsed: block.gasUsed.toString(),
        gasLimit: block.gasLimit.toString(),
        baseFeePerGas: block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : null,
        hash: block.hash,
      };
    } catch (error) {
      console.error('Block info error:', error);
      return {
        error: 'Failed to fetch block information',
      };
    }
  },
});

