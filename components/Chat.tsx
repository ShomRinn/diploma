"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "ai/react";
import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { parseEther, parseUnits, erc20Abi } from "viem";
import { Message } from "ai";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface ChatProps {
  initialMessages: Message[];
  onMessagesChange?: (messages: Message[]) => void;
  initialCommand?: string;
}

export const Chat = ({ initialMessages, onMessagesChange, initialCommand }: ChatProps) => {
  const { address } = useAccount();
  const [contacts, setContacts] = useState<any[]>([]);

  // Load contacts from localStorage
  useEffect(() => {
    try {
      const savedContacts = localStorage.getItem("wallet-agent-contacts");
      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
    } catch (error) {
      console.error("Failed to load contacts:", error);
    }
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, setInput } =
    useChat({
      api: '/api/chat',
      initialMessages,
      body: {
        address, // Include address in the request
        contacts, // Include user's contacts so AI can resolve contact names to addresses
      },
    });

  const { data: hash, sendTransaction } = useSendTransaction();
  const { writeContract, data: tokenHash } = useWriteContract();
  const onMessagesChangeRef = useRef(onMessagesChange);
  const hasAutoSubmitted = useRef(false);
  const isInitialized = useRef(false);
  const [cancelledTransactions, setCancelledTransactions] = useState<Set<string>>(new Set());
  
  // Keep ref updated
  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Initialize messages on mount and when initialMessages change
  useEffect(() => {
    console.log("Chat component - initialMessages:", initialMessages.length);
    console.log("Chat component - current messages:", messages.length);
    
    // Always set messages if we have initialMessages
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
      isInitialized.current = true;
    }
    hasAutoSubmitted.current = false; // Reset on new chat
  }, [initialMessages, setMessages]);

  // Auto-submit initial command if provided
  useEffect(() => {
    if (initialCommand && !hasAutoSubmitted.current && !isLoading) {
      setInput(initialCommand);
      hasAutoSubmitted.current = true;
      // Submit after a short delay to ensure input is set
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
      }, 100);
    }
  }, [initialCommand, isLoading, setInput]);

  // Auto-save messages whenever they change
  useEffect(() => {
    if (messages.length > 0 && onMessagesChangeRef.current) {
      console.log("Calling onMessagesChange with", messages.length, "messages");
      onMessagesChangeRef.current(messages);
    }
  }, [messages]);

  return (
    <div className="w-full space-y-4">
      <div className="border rounded-lg p-4 space-y-4 overflow-y-auto" style={{ minHeight: "400px", maxHeight: "600px" }}>
        {messages.filter(m => m.role !== "system").map((message) => (
          <div key={message.id}>
            {message.role === "user" ? (
              <div className="flex w-full justify-start">
                <div className="w-fit max-w-md bg-gray-800 text-gray-50 rounded-md p-3">
                  <div className="font-semibold text-blue-300 mb-1">You</div>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ) : (
              <div className="flex w-full justify-end">
                <div className="w-fit max-w-2xl bg-gradient-to-br from-blue-50 to-purple-50 text-gray-900 rounded-md p-3 border border-blue-200">
                  <div className="font-semibold text-blue-700 mb-2">AI Assistant</div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                        h3: ({ children }) => <h3 className="font-bold text-base mt-2 mb-1">{children}</h3>,
                        code: ({ children }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
            <div>
              {message.toolInvocations?.map((toolInvocation) => {
                const { toolName, toolCallId, state } = toolInvocation;

                if (state === "result") {
                  // Handle ETH transaction
                  if (toolName === "sendTransaction") {
                    const {
                      result,
                    }: { result: { to: string; amount: string } } =
                      toolInvocation;

                    if (isLoading) {
                      return (
                        <div key={toolCallId}>
                          <p>Loading...</p>
                        </div>
                      );
                    }

                    if (cancelledTransactions.has(toolCallId)) {
                      return (
                        <div key={toolCallId} className="mt-2 p-3 bg-gray-100 rounded-lg border border-gray-300">
                          <p className="text-sm text-gray-600">Transaction cancelled</p>
                        </div>
                      );
                    }

                    return (
                      <div key={toolCallId} className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex gap-2">
                          <Button
                            className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-5 rounded-sm w-fit"
                            onClick={() =>
                              sendTransaction({
                                to: result.to as `0x${string}`,
                                value: parseEther(result.amount),
                              })
                            }
                          >
                            Send {result.amount} ETH
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-300 py-2 px-5 rounded-sm w-fit"
                            onClick={() => {
                              setCancelledTransactions(prev => new Set(prev).add(toolCallId));
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {hash && (
                          <p className="mt-2 text-sm text-green-600">
                            Transaction sent: {hash.slice(0, 10)}...{hash.slice(-8)}
                          </p>
                        )}
                      </div>
                    );
                  }

                  // Handle ERC-20 token transfer
                  if (toolName === "sendToken") {
                    const {
                      result,
                    }: { result: { type: string; tokenAddress: string; to: string; amount: string; decimals: number } } =
                      toolInvocation;

                    if (isLoading) {
                      return (
                        <div key={toolCallId}>
                          <p>Loading...</p>
                        </div>
                      );
                    }

                    if (cancelledTransactions.has(toolCallId)) {
                      return (
                        <div key={toolCallId} className="mt-2 p-3 bg-gray-100 rounded-lg border border-gray-300">
                          <p className="text-sm text-gray-600">Transaction cancelled</p>
                        </div>
                      );
                    }

                    return (
                      <div key={toolCallId} className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex gap-2">
                          <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-5 rounded-sm w-fit"
                            onClick={() =>
                              writeContract({
                                address: result.tokenAddress as `0x${string}`,
                                abi: erc20Abi,
                                functionName: 'transfer',
                                args: [
                                  result.to as `0x${string}`,
                                  parseUnits(result.amount, result.decimals),
                                ],
                              })
                            }
                          >
                            Send {result.amount} Tokens
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-300 py-2 px-5 rounded-sm w-fit"
                            onClick={() => {
                              setCancelledTransactions(prev => new Set(prev).add(toolCallId));
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {tokenHash && (
                          <p className="mt-2 text-sm text-green-600">
                            Transaction sent: {tokenHash.slice(0, 10)}...{tokenHash.slice(-8)}
                          </p>
                        )}
                      </div>
                    );
                  }

                  return null;
                } else {
                  // Loading states for different tools
                  const loadingMessages: Record<string, string> = {
                    displayBalance: "Loading balance...",
                    getTransactionHistory: "Fetching transaction history...",
                    getGasPrice: "Fetching gas prices...",
                    estimateTransactionCost: "Estimating transaction cost...",
                    getTokenBalance: "Loading token balance...",
                    getCryptoPrice: "Fetching price data...",
                    getPortfolioValue: "Calculating portfolio value...",
                    getMarketAnalytics: "Fetching market analytics from CoinGecko...",
                    getTransactionStatus: "Checking transaction status...",
                    getBlockInfo: "Fetching block information...",
                  };

                  return (
                    <div key={toolCallId} className="mt-2 p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 animate-pulse">
                        {loadingMessages[toolName] || "Loading..."}
                      </p>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <form className="flex gap-3" onSubmit={handleSubmit}>
        <Input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
        />
        <Button type="submit">Send</Button>
      </form>
    </div>
  );
};
