"use client";

import { Button } from "@/components/ui/button";
import { ChatSession, chatHistoryStorage } from "@/lib/chatHistory";
import { Trash2, MessageSquare, Plus } from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";

interface ChatHistoryProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string | null) => void;
  onNewChat: () => void;
  refreshTrigger?: number; // Add trigger to force refresh
}

export const ChatHistory = ({
  currentSessionId,
  onSelectSession,
  onNewChat,
  refreshTrigger,
}: ChatHistoryProps) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadSessions = useCallback(() => {
    const allSessions = chatHistoryStorage.getSessions();
    setSessions(allSessions);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshTrigger]); // Refresh when trigger changes

  const handleDelete = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm("Delete this chat?")) {
      chatHistoryStorage.deleteSession(sessionId);
      loadSessions();
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    }
  }, [currentSessionId, loadSessions, onNewChat]);

  const handleClearAll = useCallback(() => {
    if (confirm("Delete all chat history?")) {
      chatHistoryStorage.clearAll();
      loadSessions();
      onNewChat();
    }
  }, [loadSessions, onNewChat]);

  // Memoize formatDate function to avoid recreation
  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  }, []);

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50"
        variant="outline"
        size="icon"
      >
        <MessageSquare className="h-4 w-4" />
      </Button>

      {/* Sidebar */}
      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-64 bg-gray-50 border-r border-gray-200
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          flex flex-col h-full
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <Button
            onClick={onNewChat}
            className="w-full flex items-center gap-2"
            variant="default"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto p-2">
          {sessions.length === 0 ? (
            <div className="text-center text-gray-500 text-sm mt-4 px-4">
              No chat history yet. Start a conversation!
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session.id);
                    setIsOpen(false);
                  }}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer
                    transition-colors duration-150
                    ${
                      currentSessionId === session.id
                        ? "bg-gray-200"
                        : "hover:bg-gray-100"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(session.updatedAt)}
                      </p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {session.walletAddress.substring(0, 6)}...
                        {session.walletAddress.substring(
                          session.walletAddress.length - 4
                        )}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-500 hover:text-red-700" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {sessions.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Clear All History
            </Button>
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

