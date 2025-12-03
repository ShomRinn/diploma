import { tool as createTool } from "ai";
import { z } from "zod";
import { publicClient } from "@/wagmi.config";
import { formatEther, formatGwei, parseEther } from "viem";
import { GAS_MULTIPLIERS } from "../utils/constants";

export const getGasPriceTool = createTool({
  description: "Get current gas prices (slow, standard, fast)",
  parameters: z.object({}),
  execute: async () => {
    try {
      const gasPrice = await publicClient.getGasPrice();
      const block = await publicClient.getBlock({ blockTag: 'latest' });

      // Calculate different speeds
      const slow = (gasPrice * BigInt(Math.floor(GAS_MULTIPLIERS.SLOW * 100))) / 100n;
      const standard = gasPrice;
      const fast = (gasPrice * BigInt(Math.floor(GAS_MULTIPLIERS.FAST * 100))) / 100n;

      return {
        slow: formatGwei(slow),
        standard: formatGwei(standard),
        fast: formatGwei(fast),
        baseFee: block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : null,
        unit: 'gwei',
      };
    } catch (error) {
      console.error('Gas price error:', error);
      return {
        error: 'Failed to fetch gas prices',
      };
    }
  },
});

export const estimateTransactionCostTool = createTool({
  description: "Estimate the total cost (gas + value) for a transaction",
  parameters: z.object({
    from: z.string().describe("Sender address"),
    to: z.string().describe("Recipient address"),
    value: z.string().describe("Amount in ETH"),
  }),
  execute: async ({ from, to, value }) => {
    try {
      const gasEstimate = await publicClient.estimateGas({
        account: from as `0x${string}`,
        to: to as `0x${string}`,
        value: parseEther(value),
      });

      const gasPrice = await publicClient.getGasPrice();
      const gasCost = gasEstimate * gasPrice;
      const totalCost = gasCost + parseEther(value);

      return {
        gasEstimate: gasEstimate.toString(),
        gasCostGwei: formatGwei(gasPrice),
        gasCostEth: formatEther(gasCost),
        totalCostEth: formatEther(totalCost),
        valueEth: value,
      };
    } catch (error) {
      console.error('Gas estimation error:', error);
      return {
        error: 'Failed to estimate gas cost. Please check the addresses and amount.',
      };
    }
  },
});

