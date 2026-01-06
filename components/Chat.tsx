"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChat } from "ai/react";
import { useAccount, useSendTransaction, useWriteContract } from "wagmi";
import { parseEther, parseUnits, erc20Abi } from "viem";
import { Message } from "ai";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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

  // Debounced auto-save messages
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (messages.length > 0 && onMessagesChangeRef.current) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Debounce save by 500ms
      saveTimeoutRef.current = setTimeout(() => {
        console.log("Calling onMessagesChange with", messages.length, "messages");
        onMessagesChangeRef.current?.(messages);
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [messages]);

  // Memoize filtered messages to avoid recalculation on every render
  // Filter out empty assistant messages that are created during streaming initialization
  const visibleMessages = useMemo(() => {
    const filtered = messages.filter(m => {
      if (m.role === "system") return false;
      // Filter out completely empty assistant messages (they're created at the start of streaming)
      // But keep messages with any content, even if minimal
      if (m.role === "assistant" && (!m.content || m.content.trim().length === 0)) {
        return false;
      }
      return true;
    });
    return filtered;
  }, [messages]);

  // Check if AI is currently streaming a response
  // Check the original messages array to catch empty messages that indicate streaming has started
  const isStreaming = useMemo(() => {
    if (!isLoading) return false;
    // Check the original messages array, not filtered, to catch empty messages too
    const lastMessage = messages[messages.length - 1];
    // If last message is from assistant (even if empty, it means streaming started)
    return lastMessage?.role === "assistant";
  }, [isLoading, messages]);

  // Memoize markdown components to avoid recreation
  const markdownComponents = useMemo(() => ({
    p: ({ children }: { children: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }: { children: React.ReactNode }) => <strong className="font-bold text-gray-900">{children}</strong>,
    em: ({ children }: { children: React.ReactNode }) => <em className="italic">{children}</em>,
    ul: ({ children }: { children: React.ReactNode }) => <ul className="list-disc ml-4 mb-2 space-y-1">{children}</ul>,
    ol: ({ children }: { children: React.ReactNode }) => <ol className="list-decimal ml-4 mb-2 space-y-1">{children}</ol>,
    li: ({ children }: { children: React.ReactNode }) => <li className="text-sm">{children}</li>,
    h3: ({ children }: { children: React.ReactNode }) => <h3 className="font-bold text-base mt-2 mb-1">{children}</h3>,
    code: ({ children }: { children: React.ReactNode }) => <code className="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
  }), []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isLoading]);

  return (
    <div className="w-full space-y-4">
      <div className="border rounded-lg p-4 space-y-4 overflow-y-auto scroll-smooth" style={{ minHeight: "400px", maxHeight: "600px" }}>
        {visibleMessages.map((message, index) => (
          <div 
            key={message.id} 
            className={`${message.role === "user" ? "message-user" : "message-assistant"} message-enter`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {message.role === "user" ? (
              <div className="flex w-full justify-start mb-4">
                <div className="w-fit max-w-md bg-gradient-to-br from-gray-800 to-gray-900 text-gray-50 rounded-2xl rounded-bl-md p-4 shadow-lg transform transition-all hover:scale-[1.02]">
                  <div className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                    You
                  </div>
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                </div>
              </div>
            ) : (
              <div className="flex w-full justify-end mb-4">
                <div className="w-fit max-w-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 rounded-2xl rounded-br-md p-4 border border-blue-200 shadow-lg transform transition-all hover:scale-[1.01]">
                  <div className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      AI
                    </div>
                    AI Assistant
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown components={markdownComponents}>
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
                      <div key={toolCallId} className="mt-2 p-4 bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg border-2 border-blue-200 shadow-md transform transition-all hover:scale-[1.02]">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white py-2 px-5 rounded-lg w-fit shadow-lg transform transition-all hover:scale-105"
                            onClick={() =>
                              sendTransaction({
                                to: result.to as `0x${string}`,
                                value: parseEther(result.amount),
                              })
                            }
                          >
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              Send {result.amount} ETH
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-300 hover:bg-gray-100 py-2 px-5 rounded-lg w-fit transition-all"
                            onClick={() => {
                              setCancelledTransactions(prev => new Set(prev).add(toolCallId));
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {hash && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Transaction sent: {hash.slice(0, 10)}...{hash.slice(-8)}
                            </p>
                          </div>
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
                      <div key={toolCallId} className="mt-2 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 shadow-md transform transition-all hover:scale-[1.02]">
                        <div className="flex gap-2 flex-wrap">
                          <Button
                            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-2 px-5 rounded-lg w-fit shadow-lg transform transition-all hover:scale-105"
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
                            <span className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                              Send {result.amount} Tokens
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            className="border-gray-300 hover:bg-gray-100 py-2 px-5 rounded-lg w-fit transition-all"
                            onClick={() => {
                              setCancelledTransactions(prev => new Set(prev).add(toolCallId));
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                        {tokenHash && (
                          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Transaction sent: {tokenHash.slice(0, 10)}...{tokenHash.slice(-8)}
                            </p>
                          </div>
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
                    <div key={toolCallId} className="mt-2 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 animate-pulse">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                        <p className="text-sm text-gray-600 font-medium">
                          {loadingMessages[toolName] || "Loading..."}
                        </p>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        ))}
        
        {/* Typing Indicator - only show if not streaming (no assistant message being written) */}
        {isLoading && !isStreaming && (
          <div className="flex w-full justify-end mb-4 message-assistant">
            <div className="w-fit max-w-2xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900 rounded-2xl rounded-br-md p-4 border border-blue-200 shadow-lg">
              <div className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  AI
                </div>
                AI Assistant
              </div>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form 
        className="flex gap-3 relative" 
        onSubmit={handleSubmit}
      >
        <div className="flex-1 relative">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything about your wallet..."
            className="pr-12 transition-all focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-6 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Send
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
          )}
        </Button>
      </form>
    </div>
  );
};
