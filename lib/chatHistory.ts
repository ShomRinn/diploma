import { Message } from "ai";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  walletAddress: string;
}

const STORAGE_KEY = "wallet-agent-chat-history";

export const chatHistoryStorage = {
  // Get all chat sessions
  getSessions(): ChatSession[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Get a specific session by ID
  getSession(id: string): ChatSession | null {
    const sessions = this.getSessions();
    return sessions.find((session) => session.id === id) || null;
  },

  // Save a new session or update existing
  saveSession(session: ChatSession): void {
    if (typeof window === "undefined") return;
    const sessions = this.getSessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);

    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session); // Add to beginning
    }

    // Keep only last 50 sessions
    const limitedSessions = sessions.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedSessions));
  },

  // Delete a session
  deleteSession(id: string): void {
    if (typeof window === "undefined") return;
    const sessions = this.getSessions();
    const filtered = sessions.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  // Clear all sessions
  clearAll(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  },

  // Generate a title from the first user message
  generateTitle(messages: Message[]): string {
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (!firstUserMessage) return "New Chat";

    const content = firstUserMessage.content.trim();
    return content.length > 50 ? content.substring(0, 47) + "..." : content;
  },
};



