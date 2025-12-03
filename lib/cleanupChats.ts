/**
 * Cleanup utility for chat sessions
 * Removes corrupted or invalid chat sessions from localStorage
 */

import { chatHistoryStorage } from './chatHistory';

/**
 * Remove chat sessions that only have system messages or are corrupted
 */
export function cleanupCorruptedChats(walletAddress: string | undefined) {
  if (!walletAddress || typeof window === 'undefined') return;

  const sessions = chatHistoryStorage.getSessions(walletAddress);
  let cleaned = 0;

  sessions.forEach((session) => {
    // Check if session has only system messages or no real messages
    const hasRealMessages = session.messages.some(
      (m) => m.role === 'user' || m.role === 'assistant'
    );

    if (!hasRealMessages || session.messages.length <= 1) {
      chatHistoryStorage.deleteSession(session.id);
      cleaned++;
      console.log('Cleaned corrupted session:', session.id);
    }
  });

  if (cleaned > 0) {
    console.log(`Cleaned ${cleaned} corrupted chat session(s)`);
  }

  return cleaned;
}

/**
 * Remove all chat sessions for current wallet
 */
export function clearAllChats(walletAddress: string | undefined) {
  if (!walletAddress || typeof window === 'undefined') return;

  const sessions = chatHistoryStorage.getSessions(walletAddress);
  sessions.forEach((session) => {
    chatHistoryStorage.deleteSession(session.id);
  });

  console.log(`Cleared ${sessions.length} chat session(s)`);
  return sessions.length;
}

