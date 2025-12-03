"use client";

import { useState, useEffect, useCallback } from "react";
import { Message } from "ai";
import { ChatSession, chatHistoryStorage } from "./chatHistory";

export const useChatSession = (walletAddress: string | undefined) => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Generate system message
  const getSystemMessage = useCallback((): Message => {
    return {
      role: "system",
      content: `You have connected your wallet successfully. Your wallet address is ${walletAddress}`,
      id: "system",
    };
  }, [walletAddress]);

  // Initialize with system message
  useEffect(() => {
    if (walletAddress) {
      setInitialMessages([getSystemMessage()]);
    }
  }, [walletAddress, getSystemMessage]);

  // Save messages to current session
  const saveMessages = useCallback(
    (messages: Message[]) => {
      if (!walletAddress || messages.length <= 1) return; // Don't save if only system message

      const now = Date.now();
      
      setCurrentSessionId((prevSessionId) => {
        let sessionId = prevSessionId;
        
        // Create new session if none exists
        if (!sessionId) {
          sessionId = `session-${now}`;
        }

        const session: ChatSession = {
          id: sessionId,
          title: chatHistoryStorage.generateTitle(messages),
          messages,
          createdAt: prevSessionId ? 
            (chatHistoryStorage.getSession(sessionId)?.createdAt || now) : 
            now,
          updatedAt: now,
          walletAddress,
        };

        chatHistoryStorage.saveSession(session);
        console.log("Chat saved:", sessionId, "Messages:", messages.length);
        
        // Trigger refresh of chat history
        setRefreshTrigger((prev) => prev + 1);
        
        return sessionId;
      });
    },
    [walletAddress]
  );

  // Load a session
  const loadSession = useCallback(
    (sessionId: string | null) => {
      if (!sessionId) return;
      const session = chatHistoryStorage.getSession(sessionId);
      if (session) {
        setCurrentSessionId(sessionId);
        setInitialMessages(session.messages);
      }
    },
    []
  );

  // Start a new chat
  const startNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setInitialMessages([getSystemMessage()]);
  }, [getSystemMessage]);

  return {
    currentSessionId,
    initialMessages,
    saveMessages,
    loadSession,
    startNewChat,
    refreshTrigger,
  };
};

