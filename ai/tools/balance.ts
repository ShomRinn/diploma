import { tool as createTool } from "ai";
import { z } from "zod";
import { publicClient } from "@/wagmi.config";
import { formatEther } from "viem";

export const balanceTool = createTool({
  description: "Request the account balance of the user",
  parameters: z.object({
    address: z.string().describe("The address of the user"),
  }),

  execute: async ({ address }) => {
    try {
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      return { balance: formatEther(balance) };
    } catch (error) {
      console.error(error);
      return { balance: "0" };
    }
  },
});

