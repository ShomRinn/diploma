"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import {
  MessageCircle,
  Search,
  Plus,
  Send,
  QrCode,
  UserPlus,
  Bot,
  User as UserIcon,
  Trash2,
  Edit2,
  MoreVertical,
  X,
} from "lucide-react";
import { Contact, ChatMessage } from "@/lib/types";
import { ChatSession, chatHistoryStorage } from "@/lib/chatHistory";

type ChatType = "ai" | "contact";

export default function ChatsPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [chatType, setChatType] = useState<ChatType>("ai");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedAIChat, setSelectedAIChat] = useState<ChatSession | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [messageInput, setMessageInput] = useState("");
  
  // AI Chat History
  const [aiChats, setAiChats] = useState<ChatSession[]>([]);
  
  // User Contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Modals
  const [showAddContact, setShowAddContact] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  
  // Contact form
  const [contactForm, setContactForm] = useState({
    name: "",
    address: "",
    ensName: "",
  });

  const [messages] = useState<ChatMessage[]>([]);

  // Load AI chat history
  useEffect(() => {
    const loadAIChats = () => {
      const sessions = chatHistoryStorage.getSessions();
      setAiChats(sessions);
    };
    loadAIChats();
    
    // Refresh every 2 seconds to catch new chats
    const interval = setInterval(loadAIChats, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load contacts from localStorage
  useEffect(() => {
    const loadContacts = () => {
      if (typeof window === "undefined") return;
      const saved = localStorage.getItem("wallet-agent-contacts");
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    };
    loadContacts();
  }, []);

  // Save contacts to localStorage
  const saveContacts = (newContacts: Contact[]) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("wallet-agent-contacts", JSON.stringify(newContacts));
    setContacts(newContacts);
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAIChats = aiChats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAIChatClick = (chat: ChatSession) => {
    // Navigate with chat ID as URL param
    router.push(`/dashboard/ai?chatId=${chat.id}`);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // TODO: Implement message sending
    setMessageInput("");
  };

  const handleDeleteChat = (chatId: string) => {
    chatHistoryStorage.deleteSession(chatId);
    setAiChats(chatHistoryStorage.getSessions());
    setShowDeleteConfirm(null);
  };

  const handleAddContact = () => {
    if (!contactForm.name.trim() || !contactForm.address.trim()) {
      alert("Name and address are required");
      return;
    }

    const newContact: Contact = {
      id: `contact-${Date.now()}`,
      name: contactForm.name.trim(),
      address: contactForm.address.trim(),
      ensName: contactForm.ensName.trim() || undefined,
      lastMessage: "No messages yet",
      lastMessageTime: Date.now(),
    };

    saveContacts([...contacts, newContact]);
    setContactForm({ name: "", address: "", ensName: "" });
    setShowAddContact(false);
  };

  const handleEditContact = () => {
    if (!editingContact || !contactForm.name.trim() || !contactForm.address.trim()) {
      alert("Name and address are required");
      return;
    }

    const updated = contacts.map(c =>
      c.id === editingContact.id
        ? { ...c, name: contactForm.name, address: contactForm.address, ensName: contactForm.ensName || undefined }
        : c
    );
    saveContacts(updated);
    setEditingContact(null);
    setContactForm({ name: "", address: "", ensName: "" });
  };

  const handleDeleteContact = (contactId: string) => {
    saveContacts(contacts.filter(c => c.id !== contactId));
    setShowDeleteConfirm(null);
    if (selectedContact?.id === contactId) {
      setSelectedContact(null);
    }
  };

  const openEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      name: contact.name,
      address: contact.address,
      ensName: contact.ensName || "",
    });
  };

  return (
    <div className="h-[calc(100vh-6rem)]">
      <div className="flex h-full gap-6">
        {/* Contacts List */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Chats</h2>
              {chatType === "contact" && (
                <Button 
                  size="sm" 
                  className="bg-blue-600"
                  onClick={() => setShowAddContact(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {/* Chat Type Toggle */}
            <div className="flex gap-2 mb-3">
              <Button
                variant={chatType === "ai" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setChatType("ai")}
              >
                <Bot className="h-4 w-4 mr-2" />
                AI Assistant
              </Button>
              <Button
                variant={chatType === "contact" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setChatType("contact")}
              >
                <UserIcon className="h-4 w-4 mr-2" />
                Contacts
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={chatType === "ai" ? "Search AI chats..." : "Search contacts..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {chatType === "ai" ? (
              // AI Chat History
              filteredAIChats.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Bot className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">No AI conversations yet</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => router.push("/dashboard/ai")}
                  >
                    Start AI Chat
                  </Button>
                </div>
              ) : (
                <div className="p-2">
                  {filteredAIChats.map((chat) => (
                    <div
                      key={chat.id}
                      className="group relative w-full p-3 rounded-lg text-left transition-colors mb-1 hover:bg-gray-50"
                    >
                      <button
                        onClick={() => handleAIChatClick(chat)}
                        className="w-full"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                            <Bot className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium truncate">{chat.title}</p>
                              <span className="text-xs text-gray-500">
                                {new Date(chat.updatedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {chat.messages.length} messages
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(chat.id);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete chat"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ) : (
              // User Contacts
              filteredContacts.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 mb-4">No contacts yet</p>
                  <Button size="sm" variant="outline">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </div>
              ) : (
                <div className="p-2">
                  {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className={`group relative w-full p-3 rounded-lg text-left transition-colors mb-1 ${
                      selectedContact?.id === contact.id
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <button
                      onClick={() => setSelectedContact(contact)}
                      className="w-full"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {contact.name[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {contact.name}
                              {contact.ensName && (
                                <span className="text-xs text-blue-600 ml-1">
                                  {contact.ensName}
                                </span>
                              )}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatTime(contact.lastMessageTime || 0)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate">
                            {contact.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditContact(contact);
                        }}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit contact"
                      >
                        <Edit2 className="h-4 w-4 text-blue-600" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(contact.id);
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete contact"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* Add Contact Options (only for contacts) */}
          {chatType === "contact" && (
            <div className="p-4 border-t border-gray-200 space-y-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full justify-start"
              onClick={() => setShowAddContact(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              By Address
            </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" disabled>
                <QrCode className="h-4 w-4 mr-2" />
                Scan QR Code
              </Button>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          {chatType === "ai" ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Bot className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg mb-2">AI Chat History</p>
                <p className="text-sm text-gray-400 mb-4">
                  Click on any chat to continue the conversation
                </p>
                <Button onClick={() => router.push("/dashboard/ai")}>
                  Go to AI Assistant
                </Button>
              </div>
            </div>
          ) : selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {selectedContact.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{selectedContact.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedContact.ensName || 
                        `${selectedContact.address.substring(0, 6)}...${selectedContact.address.substring(selectedContact.address.length - 4)}`
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md px-4 py-2 rounded-2xl ${
                        message.sender === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p>{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.sender === "user" ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} className="bg-blue-600">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-lg">Select a contact to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Contact Modal */}
        {(showAddContact || editingContact) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">
                  {editingContact ? "Edit Contact" : "Add Contact"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddContact(false);
                    setEditingContact(null);
                    setContactForm({ name: "", address: "", ensName: "" });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    placeholder="Contact name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Wallet Address *</label>
                  <Input
                    placeholder="0x..."
                    value={contactForm.address}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">ENS Name (Optional)</label>
                  <Input
                    placeholder="vitalik.eth"
                    value={contactForm.ensName}
                    onChange={(e) => setContactForm({ ...contactForm, ensName: e.target.value })}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddContact(false);
                      setEditingContact(null);
                      setContactForm({ name: "", address: "", ensName: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600"
                    onClick={editingContact ? handleEditContact : handleAddContact}
                  >
                    {editingContact ? "Save Changes" : "Add Contact"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Confirm Delete</h3>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this {chatType === "ai" ? "chat" : "contact"}? 
                This action cannot be undone.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    if (chatType === "ai") {
                      handleDeleteChat(showDeleteConfirm);
                    } else {
                      handleDeleteContact(showDeleteConfirm);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

