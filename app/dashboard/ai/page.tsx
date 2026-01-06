"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useSearchParams } from "next/navigation";
import { Chat } from "@/components/Chat";
import { Message } from "ai";
import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Trash2 } from "lucide-react";
import { useChatSession } from "@/lib/useChatSession";

export default function AIPage() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const [showChat, setShowChat] = useState(false);
  const [initialCommand, setInitialCommand] = useState<string>("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
  const {
    currentSessionId,
    initialMessages: savedInitialMessages,
    saveMessages,
    loadSession,
    startNewChat,
    refreshTrigger,
  } = useChatSession(address);

  // Check if we need to load a specific chat from URL params
  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId && !isLoadingChat) {
      setIsLoadingChat(true);
      console.log("Loading chat from URL:", chatId);
      loadSession(chatId);
      setShowChat(true);
      setInitialCommand("");
      setIsLoadingChat(false);
    }
    // DO NOT auto-show chat - always show welcome screen first
    // User must click "Start New Conversation" to open chat
  }, [searchParams, loadSession, isLoadingChat]);

  // Use saved messages or create new ones
  const initialMessages: Message[] = savedInitialMessages.length > 0 ? savedInitialMessages : [
    {
      role: "system",
      content: `You are an AI banking assistant for a Web3 wallet application. The user has connected their wallet. IMPORTANT: The user's wallet address is ${address}. When they ask about their balance or any wallet-related queries, use this address: ${address}. CRITICAL: ALWAYS use the provided tools to fetch real-time data. Even if you have previous results in the conversation, ALWAYS call the tools again for fresh data when asked about balances, prices, gas, or transactions. Never use cached conversation data for financial information.`,
      id: "system",
    },
  ];

  console.log("AI Page - savedInitialMessages:", savedInitialMessages.length);
  console.log("AI Page - initialMessages:", initialMessages.length);
  console.log("AI Page - currentSessionId:", currentSessionId);
  console.log("AI Page - showChat:", showChat);

  const exampleCommands = [
    "What is my balance?",
    "Send 0.01 ETH to 0x...",
    "Show me my recent transactions",
    "What's the current gas price?",
  ];

  const handleExampleClick = (command: string) => {
    setInitialCommand(command);
    setShowChat(true);
  };

  const handleNewChat = () => {
    startNewChat();
    setInitialCommand("");
    setShowChat(false);
  };

  const clearAllCache = () => {
    // Clear localStorage cache for API data
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => 
        key.startsWith('price-') || 
        key.startsWith('portfolio-') || 
        key.startsWith('market-')
      );
      cacheKeys.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared ${cacheKeys.length} cache entries`);
      alert(`Cache cleared! ${cacheKeys.length} entries removed. Prices will be fresh now.`);
    }
  };

  if (!showChat) {
    return (
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Assistant</h1>
          <p className="text-gray-600">
            Chat with AI to manage your crypto, get insights, and execute transactions
          </p>
        </div>

        {/* Example Commands */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Try asking:</h3>
          <div className="grid gap-3">
            {exampleCommands.map((command, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(command)}
                className="text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <span className="text-gray-700">{command}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={() => setShowChat(true)}
            size="lg"
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            Start New Conversation
          </Button>
          <Button
            onClick={clearAllCache}
            size="lg"
            variant="outline"
            className="border-red-200 hover:bg-red-50 hover:border-red-300"
            title="Clear cached prices and fetch fresh data"
          >
            <Trash2 className="h-5 w-5 text-red-600" />
          </Button>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-blue-600">$</span>
            </div>
            <h4 className="font-medium mb-1">Check Balance</h4>
            <p className="text-sm text-gray-600">Get instant balance updates</p>
          </div>
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-purple-600">→</span>
            </div>
            <h4 className="font-medium mb-1">Send Crypto</h4>
            <p className="text-sm text-gray-600">Execute transactions easily</p>
          </div>
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-bold text-green-600">↗</span>
            </div>
            <h4 className="font-medium mb-1">Get Insights</h4>
            <p className="text-sm text-gray-600">Receive smart recommendations</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while chat is being loaded
  if (isLoadingChat) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-600">Ask me anything about your wallet</p>
        </div>
        <Button
          variant="outline"
          onClick={handleNewChat}
        >
          New Chat
        </Button>
      </div>

      {initialMessages.length > 0 ? (
        <Chat 
          key={currentSessionId || 'new-chat'} 
          initialMessages={initialMessages} 
          onMessagesChange={saveMessages}
          initialCommand={initialCommand}
        />
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p>No messages to display</p>
        </div>
      )}
    </div>
  );
}

