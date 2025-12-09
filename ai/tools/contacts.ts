import { tool as createTool } from "ai";
import { z } from "zod";

/**
 * Resolve a contact name to their Ethereum address
 * This tool finds a contact by name and returns their address
 * Usage: User says "Send 0.1 ETH to Nikita" -> AI uses this to find Nikita's address -> returns address
 */
export const resolveContactAddressTool = createTool({
  description:
    "Resolve a contact name to their Ethereum address from saved contacts. Returns the address so you can send money to them. Example: User says 'Send to Alice' -> you use this tool to get Alice's address -> use sendTransaction with that address.",
  parameters: z.object({
    contactName: z.string().describe("The name of the contact to find (e.g., 'Nikita', 'Alice', 'Bob')"),
    contacts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      ensName: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })).describe("Array of saved contacts to search through"),
  }),
  execute: async ({ contactName, contacts }) => {
    try {
      // Find contact by name (case-insensitive, exact match first)
      const exactMatch = contacts.find(
        (c) => c.name.toLowerCase() === contactName.toLowerCase()
      );

      if (exactMatch) {
        return {
          status: "success",
          name: exactMatch.name,
          address: exactMatch.address,
          ensName: exactMatch.ensName,
          message: `Found contact "${exactMatch.name}" with address ${exactMatch.address}`,
        };
      }

      // Try partial match if no exact match
      const partialMatch = contacts.find((c) =>
        c.name.toLowerCase().includes(contactName.toLowerCase())
      );

      if (partialMatch) {
        return {
          status: "success",
          name: partialMatch.name,
          address: partialMatch.address,
          ensName: partialMatch.ensName,
          message: `Found contact "${partialMatch.name}" with address ${partialMatch.address}`,
        };
      }

      // Not found - return suggestions
      return {
        status: "not_found",
        error: `Contact "${contactName}" not found`,
        suggestions: contacts.slice(0, 5).map(c => c.name).join(", "),
        message: `I couldn't find a contact named "${contactName}". Available contacts: ${contacts.map(c => c.name).join(", ")}`,
      };
    } catch (error) {
      console.error("Resolve contact address error:", error);
      return {
        status: "error",
        error: "Failed to resolve contact address",
      };
    }
  },
});

/**
 * Get list of all saved contacts
 * This helps the AI understand what contacts are available
 */
export const listContactsTool = createTool({
  description:
    "Get a list of all saved contacts. Use this to understand what contacts are available before trying to send money.",
  parameters: z.object({
    contacts: z.array(z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
      ensName: z.string().optional(),
    })).describe("Array of saved contacts"),
  }),
  execute: async ({ contacts }) => {
    try {
      if (contacts.length === 0) {
        return {
          status: "empty",
          message: "No contacts saved yet",
          count: 0,
        };
      }

      return {
        status: "success",
        count: contacts.length,
        contacts: contacts.map(c => ({
          name: c.name,
          address: c.address.substring(0, 6) + "..." + c.address.substring(c.address.length - 4),
          ensName: c.ensName,
        })),
        message: `You have ${contacts.length} saved contacts: ${contacts.map(c => c.name).join(", ")}`,
      };
    } catch (error) {
      console.error("List contacts error:", error);
      return {
        status: "error",
        error: "Failed to list contacts",
      };
    }
  },
});
